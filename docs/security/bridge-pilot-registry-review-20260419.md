# Security Review — Bridge Pilot Registry

**Fecha:** 2026-04-19
**Revisor:** Helena (IT Manager)
**Commit:** b91802b + 0049fb4
**ADR:** ADR-017 (amendment), ADR-018

---

## Resultado: ✅ APPROVED WITH CONDITIONS

Dos condiciones de severidad MEDIA deben resolverse antes del primer despliegue en staging. No hay bloqueantes de severidad ALTA. El sistema mantiene las garantías fundamentales de ADR-018.

---

## Hallazgos

| #   | Severidad | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Mitigación requerida                                                                                                                                                                                                                |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-1 | MEDIA     | `su_do_nested_shortcodes` llama a `do_shortcode($content)` sin límite de profundidad. Un shortcode con contenido que incluya otro shortcode del mismo tipo puede causar recursión hasta que `max_execution_time=2s` corte la ejecución, pero el timeout de 5s en Node (Promise.race) es el único guardia real. Con contenido malicioso podría consumir el 32M de memoria antes del corte.                                                                                                                                                                                | Añadir contador de profundidad global en PHP (`$np_recursion_depth`, límite 10) antes de producción. Workaround actual (2s php limit + 5s Promise.race) es suficiente para staging.                                                 |
| H-2 | MEDIA     | `su_add_shortcode` llama a `add_shortcode('su_' . $args['id'], ...)` donde `$args['id']` viene del array de argumentos del shortcode. Si un atacante puede controlar el valor de `id` en el array de stubs (no el contenido del post, sino el código del piloto), podría registrar un shortcode con nombre arbitrario prefijado por `su_`. En el modelo actual el código del piloto es estático y no acepta input externo, por lo que el riesgo es teórico. Sin embargo, si en el futuro `$args` se construyera desde datos del post, sería un vector de sobreescritura. | Documentar en ADR-017 que `su_add_shortcode` solo puede recibir `$args` hardcoded en el piloto. Añadir test que verifique que un `su_` shortcode no puede sobreescribir `do_shortcode`, `add_shortcode` u otras funciones del core. |
| H-3 | BAJA      | El piloto CF7 emite `<input type="hidden" name="_wpcf7_version" value="5.9" />`. Esta información de versión en el HTML del formulario podría usarse para fingerprinting. No es un riesgo de ejecución pero sí de exposición de información.                                                                                                                                                                                                                                                                                                                             | Eliminar el campo `_wpcf7_version` del output o parametrizarlo. Pendiente Sprint 3.                                                                                                                                                 |
| H-4 | BAJA      | El piloto SU incluye `su_get_plugin_url()` que devuelve `http://localhost:3000/wp-content/plugins/shortcodes-ultimate/`. Esta URL hardcoded con `http://` (no `https://`) aparecerá en el HTML si algún shortcode la usa para cargar assets. En producción generaría mixed-content.                                                                                                                                                                                                                                                                                      | Cambiar a URL relativa o parametrizar con una constante de configuración. Pendiente Sprint 3.                                                                                                                                       |
| H-5 | INFO      | `wp_kses_post` es stub que devuelve el contenido sin sanitizar, con un warning. Esto es correcto para Tier 2 (todo el output es HTML generado por stubs controlados, no por el usuario), pero debe documentarse explícitamente como decisión de diseño. Si en el futuro un piloto procesa contenido de usuario directamente (no solo atributos de shortcode), este stub debe ser reemplazado por implementación real.                                                                                                                                                    | Añadir nota en ADR-018 §Constraints: `wp_kses_post` es no-op en Tier 2. Piloto responsable de escapar sus outputs individuales.                                                                                                     |

---

## Análisis por área

### 1. `shortcodes-ultimate.ts` — stubs SU

**Filesystem / network / exec:** Ninguno de los 15 stubs abre superficie de ataque. Todas las funciones devuelven strings constantes, arrays vacíos o booleanos. `su_get_plugin_url()` devuelve una string (hallazgo H-4). `su_query_asset()` devuelve `false`. Sin acceso a funciones de sistema.

**`su_add_shortcode` y sobreescritura de shortcodes de sistema:** El prefijo `su_` hardcoded en el stub limita el namespace. Sin embargo, `add_shortcode` en el bootstrap NO valida que el tag sea diferente de funciones del core PHP ni de los tags de sistema del bridge. Un tag `su_do_shortcode` podría registrarse, pero el engine solo llama shortcodes como callbacks del array `$np_shortcodes`, no como funciones globales. El riesgo de sobreescribir funciones de sistema PHP es inexistente por diseño del engine. Riesgo documentado en H-2.

**`su_do_nested_shortcodes`:** Llama a `do_shortcode($content)` sin limitación de profundidad. Ver H-1. El `max_execution_time=2s` es el control primario; el timeout Node de 5s es el secundario. Sin ambos, sería un bloqueante ALTO. Con ambos activos, se degrada a MEDIA.

### 2. `contact-form-7.ts` — piloto CF7

**Datos sensibles en stubs `WPCF7_ContactForm`:** No existe clase `WPCF7_ContactForm` en este piloto. El piloto es exclusivamente HTML rendering de formulario estático. Sin acceso a DB, sin lectura de usuarios, sin datos de sesión.

**`wp_mail` bloqueado:** Confirmado. `wp_mail` está stubbed en el bootstrap (`buildBootstrapCode`) devolviendo `false` y emitiendo warning. El piloto CF7 no llama a `wp_mail` en ningún path de código — su scope es únicamente render de `<form>`. La presencia del piloto CF7 no altera la efectividad del bloqueo de `wp_mail` en bootstrap.

### 3. `bridge/index.ts` — punto de inyección

**Orden de inyección del pilotCode:** Verificado. El orden exacto en `renderShortcodes()` es:

```
runnerCode = bootstrapCode          ← scope reset ($np_shortcodes = []) ocurre aquí
           + "\n"
           + pilotCode              ← pilots se registran DESPUÉS del scope reset
           + "\nnp_bridge_return(do_shortcode($postContent));\n"  ← ejecución DESPUÉS
```

El scope reset (`$np_shortcodes = []`, `$np_warnings = []`, `$np_filters = []`) ocurre en `buildBootstrapCode` en las primeras líneas. `pilotCode` se concatena después, por lo que los pilots registran sus shortcodes en un array limpio. `do_shortcode($postContent)` se ejecuta como argumento de `np_bridge_return`, último paso. El orden es correcto.

**`memory_limit` y `max_execution_time` con pilotos cargados:** Los `ini_set` están al inicio del bootstrap, antes de cualquier código de piloto. PHP aplica `ini_set('memory_limit', '32M')` e `ini_set('max_execution_time', '2')` antes de que se ejecute una sola línea de piloto. Los límites se aplican correctamente.

**Inyección de pilotos arbitrarios por el caller:** Imposible. `ACTIVE_PILOTS` es el único source. No existe parámetro en `BridgeInput` ni en `renderShortcodes` para inyectar pilotos. La función `buildBootstrapCode` solo acepta `postContent` y `context` — ninguno de los dos modifica el array de pilotos. Opción C (caller-injectable pilots) correctamente rechazada y no presente en el código.

### 4. `pilots/index.ts` — registry

**`ACTIVE_PILOTS` modificable en runtime:** No. Declarado como `export const ACTIVE_PILOTS: readonly BridgePilot[] = [...]`. TypeScript `readonly` impide reasignación del array. Los elementos del array son objetos con campos `readonly id` y `readonly buildPhpCode`. En runtime JavaScript, `const` impide reasignación de la binding; `readonly` en TypeScript no produce Object.freeze, por lo que técnicamente un módulo externo podría hacer `(ACTIVE_PILOTS as any[]).push(...)` en runtime JS. Sin embargo, no existe API pública ni mecanismo para que código externo obtenga la referencia mutable.

**Mecanismo de adición de pilotos externos:** No existe. El array se inicializa en el módulo en tiempo de carga. No hay función `registerPilot()` ni export de escritura. El único mecanismo de cambio es modificar el fichero fuente y recompilar. Correcto per ADR-017 §Security.

**Recomendación adicional (INFO):** Para defensa en profundidad, considerar `Object.freeze(ACTIVE_PILOTS)` en el módulo para prevenir mutación en runtime JavaScript aunque TypeScript no la permita. Coste cero, ganancia de invariante auditable.

---

## Checklist ADR-018 §Attack Surface

| Control                                                            | Estado                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| RCE (exec/system/shell_exec/passthru/popen/proc_open stubbed)      | ✅ Presente en bootstrap                                      |
| SSRF (curl_exec bloqueado, allow_url_fopen=0, allow_url_include=0) | ✅ Presente en bootstrap                                      |
| Mail (wp_mail, mail() stubbed)                                     | ✅ Presente en bootstrap, CF7 no llama mail                   |
| DoS — memory (32M)                                                 | ✅ ini_set antes de pilotCode                                 |
| DoS — CPU (max_execution_time=2s)                                  | ✅ ini_set antes de pilotCode                                 |
| DoS — Node timeout (Promise.race 5s)                               | ✅ presente                                                   |
| Scope reset entre invocaciones                                     | ✅ $np_shortcodes=[] en cada renderShortcodes call            |
| Pilotos arbitrarios por caller                                     | ✅ Imposible — ACTIVE_PILOTS estático                         |
| Input >1MB rechazado                                               | ✅ validateInput                                              |
| Recursión infinita en do_shortcode                                 | ⚠️ Mitigado por timeout, no por contador de profundidad (H-1) |

---

## Condiciones para merge a staging

1. **H-1 (MEDIA) — Contador de profundidad en `su_do_nested_shortcodes`:** Implementar antes del primer despliegue a staging con tráfico real. En PoC interno puede convivir con el timeout.
2. **H-2 (MEDIA) — Documentar contrato `su_add_shortcode`:** Añadir nota en ADR-017 y test de regresión que verifique que `$args['id']` en `su_add_shortcode` solo llega desde código de piloto estático. No desde contenido del post.

Las condiciones H-3, H-4, H-5 son mejoras recomendadas para Sprint 3, no bloqueantes de staging.

---

## Co-sign

Helena (IT Manager) — 2026-04-19

_ADR-018 §Attack Surface: co-sign concedido con las condiciones H-1 y H-2 documentadas. El bridge pilot registry no introduce superficie de ataque nueva respecto a la baseline ADR-018. Los controles fundamentales (RCE, SSRF, mail, DoS, scope reset, inyección de pilotos) están en lugar y verificados. Puede proceder a staging con las condiciones documentadas pendientes de resolución antes de tráfico de producción._
