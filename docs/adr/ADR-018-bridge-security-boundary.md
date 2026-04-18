# ADR-018 — Bridge Security Boundary

**Status:** Proposed
**Date:** 2026-04-18
**Deciders:** Helena (IT Manager), Román (Tech Lead)
**Deadline co-sign:** 2026-04-23 (jueves). Bloqueante para Tier 2 en staging.
**Related:** ADR-003 (PHP Compatibility Strategy), ADR-008 (PHP-WASM Extension Matrix), ADR-017 (Tier 2 Bridge Surface — Román, pendiente)

## Context

NodePress ejecuta plugins PHP via `@php-wasm/node` en Tier 2 (content-only). La VM PHP-WASM corre dentro del proceso Node.js — no en un proceso separado, no en un contenedor. Esto significa que un fallo de seguridad en el bridge no está contenido por el OS: compromete directamente el proceso Node.js del servidor.

Los tres pilotos actuales son:

- **Footnotes** (MCI Footnotes, ~50KB) — shortcode `[footnote]`, pcre + string functions, output HTML
- **Shortcodes Ultimate** (~300KB) — shortcodes UI (buttons, tabs, boxes), HTML output, sin network ni DB
- **Display Posts Shortcode** (~80KB) — `[display-posts]`, datos de posts inyectados desde JS vía bridge

Los tres son content-only: sin HTTP propio, sin `$wpdb`, sin filesystem writes. Esta característica es la que hace viable el bridge en Sprint 2. Cualquier plugin que salga de este perfil requiere un ADR nuevo antes de proceder.

Este ADR define el contrato de seguridad que el código del bridge DEBE respetar. No define la API del bridge (ADR-017) ni la observability (ADR pendiente, Sprint 2 semana 1).

## Decision

El bridge PHP-WASM opera bajo un modelo de **sandbox estático de datos**: el único flujo de información permitido es contenido de posts (IN) → HTML renderizado (OUT). La VM PHP-WASM no tiene acceso a red, no tiene acceso a filesystem real, no tiene acceso a la base de datos de Node.js, y no puede ejecutar código nativo del OS.

Cualquier función PHP que intente salir de este perímetro es interceptada en el bootstrap del bridge y sustituida por un stub que devuelve un valor seguro (vacío o `null`) y registra el intento con nivel `warn`. No se lanza excepción: los plugins existentes no deben romper, pero el intento queda auditado.

La VM es stateless entre invocaciones: cada shortcode render parte de un estado PHP limpio. No hay estado PHP persistente entre requests.

## Attack Surface

| Vector                                      | Descripción                                                                                                                             | Mitigación                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RCE via PHP functions**                   | `exec()`, `system()`, `shell_exec()`, `passthru()`, `popen()` — ejecutan comandos del OS desde PHP                                      | Stubbing en bootstrap: reemplazados por función que devuelve `""` y loguea `[BRIDGE WARN] blocked: exec`                                                                                                                                                                                                                                                                                        |
| **SSRF via cURL**                           | `curl_exec()`, `file_get_contents(URL)`, `wp_remote_get()` — cURL presente en bundle (confirmado día 2), sincrónico, bloquea event loop | `curl_exec` stubbed. `wp_remote_get` / `wp_remote_post` stubbed. `file_get_contents` con URL scheme (`http://`, `https://`, `ftp://`) interceptado en `allow_url_fopen = Off` (php.ini override en bootstrap). Logging de cada intento.                                                                                                                                                         |
| **Filesystem read/write**                   | `file_put_contents()`, `fopen()` en modo escritura, `unlink()`, `rename()` — acceso al FS del servidor                                  | `open_basedir` restricción en bootstrap: directorio temporal efímero de solo-lectura. Writes bloqueados a nivel PHP ini.                                                                                                                                                                                                                                                                        |
| **Email exfiltration**                      | `wp_mail()`, `mail()` — envío de datos hacia exterior                                                                                   | `wp_mail` y `mail()` stubbed: devuelven `false`, loguean payload (sin enviar).                                                                                                                                                                                                                                                                                                                  |
| **Memory exhaustion (DoS)**                 | Plugin con loop O(n) o regex catastrophic backtracking — consume memoria ilimitada                                                      | `memory_limit` en php.ini del bridge: **32MB por invocación** (configurable, default conservador). `max_execution_time`: **2 segundos**. Superado → excepción PHP, capturada por bridge, devuelve error estructurado.                                                                                                                                                                           |
| **CPU exhaustion (DoS)**                    | Loop infinito o regex exponencial bloquea el event loop de Node                                                                         | `max_execution_time = 2` (PHP internal timer). Adicionalmente, timeout externo en el wrapper JS: si `php.run()` no resuelve en **3 segundos**, se cancela la invocación y se registra timeout.                                                                                                                                                                                                  |
| **Plugin cross-contamination**              | Plugin A modifica estado PHP global (superglobales, define(), variable global) que plugin B lee                                         | VM stateless: `php.run()` ejecuta con contexto reiniciado entre shortcodes. No hay instancia PHP compartida entre plugins distintos en la misma request. Implementación: cada bridge call usa un scope PHP aislado (ver ADR-017 §VM lifecycle).                                                                                                                                                 |
| **Data injection via shortcode attributes** | Atributos del shortcode contienen PHP injection, XSS, SQL injection — el código PHP los procesa sin sanitizar                           | Los atributos se pasan como array PHP serializado (no como string raw interpolado en código PHP). El bridge NO construye código PHP dinámicamente a partir de atributos. El plugin PHP recibe los atributos como `$atts` array, lo cual es el patrón WP estándar. La sanitización del output HTML es responsabilidad del bridge wrapper (DOMPurify o equivalente antes de devolver al cliente). |
| **PHP object injection**                    | `unserialize()` en PHP puede instanciar clases arbitrarias si el input es controlado por el atacante                                    | `unserialize()` no se usa en el bridge. Si un plugin lo llama, se permite (no stubbed) pero los datos de entrada (post content, atributos) se validan como UTF-8 texto plano antes de entrar al bridge. No se pasa input binario al bridge.                                                                                                                                                     |
| **Information disclosure via error output** | PHP `E_WARNING` / `E_NOTICE` con rutas internas del servidor o valores de variables en stack trace                                      | `display_errors = Off` en php.ini del bridge. `log_errors = On` dirigido al logger del bridge (nunca al output HTML). El bridge captura stderr PHP y lo redirige a logging interno, nunca a la respuesta del cliente.                                                                                                                                                                           |

## Accepted Risks

**R1 — cURL presente pero no completamente bloqueada a nivel de extensión.**
cURL está en el bundle de `@php-wasm/node@3.1.20`. El stub de `curl_exec` intercepta la función a nivel PHP, pero la extensión sigue cargada. Un plugin suficientemente sofisticado que llame directamente a las primitivas C de cURL vía FFI teórico no sería interceptado. Riesgo aceptado porque: (a) los 3 pilotos no usan cURL, (b) FFI no está habilitado en el bridge php.ini, (c) este vector requiere conocimiento del entorno interno improbable en un plugin WP estándar. Revisión en Sprint 3 si se añaden plugins con cURL legítimo.

**R2 — Aislamiento en-proceso, no en-contenedor.**
La VM PHP-WASM corre en el mismo proceso Node.js. Un bug catastrófico en el runtime WASM (no en el código PHP) podría afectar el proceso. Riesgo aceptado para Tier 2 Proof of Concept. Producción a escala requiere evaluación de process isolation (worker_threads o subprocess). Documentado como deuda técnica Sprint 4+.

**R3 — Timeout de 3 segundos puede bloquear el event loop si el wrapper no está correctamente implementado.**
Si el bridge llama `php.run()` de forma sincrónica (sin Worker Thread), un plugin que tarde 2.9 segundos bloquea el event loop 2.9 segundos. Riesgo aceptado para Sprint 2 piloto (carga baja, contenido controlado). Worker Thread isolation es requisito antes de producción con carga real. Gate: ADR-017 debe especificar si el bridge es sync o async.

**R4 — Output HTML no sanitizado si el consumidor no aplica DOMPurify.**
El bridge devuelve HTML string. Si el caller lo inyecta directamente en el DOM sin sanitizar, hay XSS. El bridge NO puede garantizar que el caller sanitice. Mitigación documentada: el bridge DEBE documentar que el output es HTML confiado condicionalmente (el PHP plugin que lo generó es código de terceros). Responsabilidad de sanitización: capa de renderizado del admin/frontend, no el bridge.

## Constraints

Restricciones que el código del bridge DEBE respetar. Son non-negotiable para Sprint 2:

1. **Funciones PHP prohibidas (stubbing obligatorio en bootstrap):**
   - `exec`, `system`, `shell_exec`, `passthru`, `popen`, `proc_open`
   - `mail` (nativo PHP)
   - `curl_exec`, `curl_multi_exec` (HTTP directo — cURL presente en bundle, debe ser stubbed)
   - `wp_mail`, `wp_remote_get`, `wp_remote_post`, `wp_remote_request` (WP HTTP API)
   - `file_put_contents`, `fwrite`, `unlink`, `rename`, `mkdir`, `rmdir` (filesystem writes)
   - `eval` — prohibido absolutamente. No hay caso de uso legítimo en un plugin WP content-only.

2. **php.ini overrides obligatorios en bootstrap del bridge:**

   ```ini
   display_errors = Off
   log_errors = On
   allow_url_fopen = Off
   allow_url_include = Off
   open_basedir = /tmp/nodepress-bridge-{invocation-id}
   memory_limit = 32M
   max_execution_time = 2
   disable_functions = exec,system,shell_exec,passthru,popen,proc_open,mail,eval
   ```

3. **Datos que pueden entrar al bridge (IN):**
   - `post_content`: string UTF-8, texto plano o HTML. Longitud máxima: 1MB (configurable).
   - `shortcode_attributes`: objeto key-value con strings. Valores sanitizados como strings planos antes de serializar. Sin objetos PHP, sin código.
   - `plugin_config`: array de configuración estática del plugin (equivalente a las opciones WP que se inyectan). Sin funciones callable.
   - NO se pasan: credenciales de DB, tokens de sesión, datos de usuario, variables de entorno del proceso Node.js.

4. **Datos que pueden salir del bridge (OUT):**
   - `html`: string HTML resultado del render. Único campo de salida de datos.
   - `warnings`: array de strings con los stubs que se dispararon (para logging). Nunca datos de usuario.
   - `error`: objeto estructurado si el bridge falló (tipo de error, sin stack trace PHP en producción).
   - NO sale: output de `var_dump`, `print_r`, stack traces PHP, rutas internas del servidor.

5. **Aislamiento entre plugins:**
   - Cada invocación bridge crea un scope PHP limpio. No hay variables globales PHP persistentes entre invocaciones de plugins distintos.
   - `define()` PHP scoped: las constantes definidas por Plugin A no son visibles en Plugin B.
   - Si múltiples plugins procesan el mismo post, cada uno recibe una invocación independiente.

6. **Logging obligatorio por invocación:**
   - Nivel `info`: plugin_id, shortcode_tag, input_length (bytes), output_length (bytes), duration_ms.
   - Nivel `warn`: cada función stubbed que se intentó llamar (nombre de función + argumento resumido, sin datos de usuario).
   - Nivel `error`: timeout, memory_limit exceeded, PHP fatal.
   - Los logs de bridge deben incluir `trace_id` compatible con el sistema de observability del servidor (preparación para ADR Bridge Observability, Sprint 2 semana 1).
   - **Nunca loguear**: post_content completo, atributos de shortcode con datos potencialmente PII, output HTML.

7. **Timeout externo en el wrapper JS:**
   - `Promise.race([php.run(...), timeout(3000)])` — si la VM PHP no devuelve en 3 segundos, el bridge rechaza con error `BRIDGE_TIMEOUT` y loguea.

## Out of Scope

Este ADR NO cubre:

- **Autenticación y autorización del endpoint que invoca el bridge.** Eso es responsabilidad de la capa REST de Node.js. El bridge asume que quien lo llama tiene permiso.
- **Sanitización del output HTML hacia el cliente final.** El bridge devuelve HTML crudo. La capa de presentación (admin React, frontend) es responsable de DOMPurify o equivalente si el HTML se inyecta en el DOM sin CSP estricto.
- **API surface del bridge** (qué funciones WP se mockean vs. se implementan realmente). Eso es ADR-017 (Román).
- **Observability detallada (tracing, spans, métricas de latencia por plugin).** Eso es el ADR Bridge Observability, Sprint 2 semana 1.
- **cURL legítimo en Tier 2** (plugins que hacen HTTP de forma controlada). Fuera de scope hasta Fase B (si outreach valida demanda). Este ADR trata cURL como vector de ataque a stub.
- **`$wpdb` y acceso a base de datos real.** Fuera de scope permanentemente para los 3 pilotos. Ver D-008.
- **Tier 3 full WP orchestration.** Rechazado en D-008. Este ADR no aplica ni lo considera.
- **Plugins fuera de los 3 pilotos.** Cada plugin nuevo que entre a Tier 2 requiere evaluación de viabilidad contra los criterios de ADR-008 y los constraints de este ADR. No hay aprobación en bloque.

## Consequences

### Lo que cambia en el sistema con esta decisión

1. **El bridge no puede implementarse sin el bootstrap de php.ini.** Cualquier implementación de bridge que no aplique los overrides de la sección Constraints §2 no pasa code review. Esto es un gate explícito en el checklist de PR para `packages/bridge/**`.

2. **Los stubs PHP son código de producción, no mocks de test.** Deben existir en `packages/bridge/src/php-stubs/` y cubrirse con tests que verifiquen que (a) el stub se activa, (b) el log `warn` se emite, (c) el valor de retorno es el seguro documentado. Coverage mínima: 90% en stubs.

3. **El modelo de datos IN/OUT del bridge queda congelado para Sprint 2.** Cambios al contrato de datos requieren actualizar este ADR (nueva sección "Revisions") y co-firma de Román antes de implementar.

4. **El logging de bridge es obligatorio desde el día 1 de implementación.** No es deuda técnica para Sprint 3. Si la invocación no loguea, no está operativa. El ADR de Observability añadirá tracing sobre esta base, no lo sustituirá.

5. **Los 3 pilotos quedan aprobados bajo este boundary.** Footnotes, Shortcodes Ultimate y Display Posts pueden proceder a integración en Sprint 2 una vez Román co-firme este ADR y ADR-017 esté disponible. No requieren ADR individual adicional de seguridad.

6. **Plugins que salen del perfil content-only requieren nuevo ADR de seguridad.** Ejemplo: si en Sprint 3 se añade un plugin que use cURL legítimamente, el async wrapper + su modelo de seguridad necesitan un ADR propio antes de código.

### Positivo

- Boundary documentado elimina ambigüedad sobre qué puede hacer un plugin PHP en NodePress.
- Los stubs son observables: cada intento de salir del sandbox queda registrado. Esto convierte intentos de abuso en señal auditable.
- Stateless VM elimina la clase entera de ataques de contaminación entre plugins.

### Negativo

- El stubbing de funciones en PHP bootstrap añade complejidad al setup de la VM. Raúl debe validar que los stubs no rompen los 3 pilotos (test de humo obligatorio Sprint 2 día 1).
- `memory_limit = 32M` puede ser demasiado bajo para Shortcodes Ultimate con contenido denso. El valor es ajustable por plugin via configuración, pero el default conservador puede provocar errores en pruebas iniciales. Monitorizar en Sprint 2.
- El timeout de 3 segundos en el wrapper JS requiere que `php.run()` sea cancelable o que se implemente con Worker Thread. Si el bridge actual es sincrónico, el timeout no es efectivo. Gate: Román confirma en ADR-017 el modelo de ejecución antes de que este constraint sea implementable.

## References

- ADR-003: PHP Compatibility Strategy
- ADR-005: Hook System Semantics (sync filters, el bridge debe respetar esto — no puede llamar applyFilters async desde PHP)
- ADR-008: PHP-WASM Extension Matrix (inventario de extensiones confirmadas, incluyendo cURL)
- ADR-014: Developer Quickstart Invariant
- ADR-017: Tier 2 Bridge Surface (Román — pendiente, deadline lunes 2026-04-22)
- D-008: CMS nativo Node, NO orquestador WP
- `@php-wasm/node@3.1.20` — runtime PHP-WASM utilizado
- OWASP: [Server-Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- PHP Manual: [disable_functions](https://www.php.net/manual/en/ini.core.php#ini.disable-functions), [open_basedir](https://www.php.net/manual/en/ini.core.php#ini.open-basedir)
