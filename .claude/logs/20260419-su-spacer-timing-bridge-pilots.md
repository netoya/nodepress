# Acta — su_spacer timing / Bridge Pilot Registry

- **Fecha:** 2026-04-19
- **Topic:** PARTIAL su_spacer — shortcode `[su_spacer]` no se transforma (timing de registro)
- **Participantes:** Román (Tech Lead, modera) + Raúl (Dev Backend 2)
- **Duración estimada:** ~25 min
- **Estado:** Consenso alcanzado. Implementación asignada a Raúl. ADR-017 amendment a Román.

---

## 1. Contexto

Durante la grabación del demo 2026-04-18, `[su_spacer size="20"]` no se transformaba a HTML — se emitía literal en el output público. Otros shortcodes del piloto Shortcodes Ultimate (`su_button`, `su_box`, `su_note`) funcionaban con normalidad.

Raúl hizo la preparación previa y detectó dos capas de bug:

1. **Timing de registro:** `renderShortcodes()` en `packages/server/src/bridge/index.ts` construye `runnerCode` = `bootstrapCode + do_shortcode($postContent)`. Nunca inyecta el código PHP de los pilotos. El comentario inline dice "pilot plugin code is injected externally", pero el caller externo nunca existió en producción.
2. **Mentira arquitectónica del piloto SU:** el fichero `packages/server/src/bridge/pilots/shortcodes-ultimate.ts` hardcodea 3 shortcodes llamando `add_shortcode()` nativo de PHP. El plugin Shortcodes Ultimate real usa `su_add_shortcode()` del framework SU, que invoca helpers internos (`su_get_css_class`, `su_query_asset`, etc.). Estos helpers no están declarados en ningún runner. Por eso `su_button` (hardcoded nativo) pasa y `su_spacer` (framework-dependiente) falla.

Raúl propuso tres opciones; Román rechazó una y afinó las otras dos a una única solución.

---

## 2. Opciones evaluadas

| Opción | Descripción                                                                         | Verdict                                                                                              |
| ------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A      | Inyectar `pilotCodes` en `runnerCode` antes de `do_shortcode` — quirúrgico          | Parcialmente válida — ambigua respecto a quién construye la lista                                    |
| B      | Pilot Registry estático en `bridge/pilots/index.ts`, concatenado en cada invocación | **ELEGIDA**                                                                                          |
| C      | `pilotCodes` como array en `BridgeInput` (input dinámico)                           | **RECHAZADA** — viola ADR-017 §Consequences #1 (escape hatch) y ADR-018 §Attack Surface (vector RCE) |

### Razonamiento de rechazo (C)

- ADR-017 §Consequences punto 1: "No escape hatches, el surface es determinista". `pilotCodes` en el input abriría una vía para inyectar PHP arbitrario desde cualquier caller.
- ADR-018 §Attack Surface: PHP arbitrario desde input = vector RCE trivial. Bloqueo de merge sin review adicional.

### Razonamiento elección (B sobre A)

- A era ambigua: si el caller construye la lista de pilotos, colapsa en C. Si la construye el bridge, es B con peor estructura.
- B hace explícito que `ACTIVE_PILOTS` es **build-time, no runtime**: un array estático de módulo al que ningún input externo accede.

---

## 3. Diseño acordado

### 3.1 Pilot Registry

- Archivo: `packages/server/src/bridge/pilots/index.ts`
- Exporta: `export const ACTIVE_PILOTS: readonly BridgePilot[]`
- Contrato `BridgePilot`: `{ id: string; buildPhpCode: () => string }`
- Contiene los 3 pilotos actuales: Footnotes, Shortcodes Ultimate, Display Posts.

### 3.2 Integración en el bridge

- `renderShortcodes()` importa `ACTIVE_PILOTS` directamente (import estático, no dinámico).
- En cada invocación, concatena `pilot.buildPhpCode()` al `runnerCode` **antes** del `do_shortcode($postContent)`.
- El scope de PHP-WASM se resetea en cada call → re-registrar shortcodes en cada invocación es obligatorio, no optimizable con caché.

### 3.3 Orden de concatenación

- Orden estable del array `ACTIVE_PILOTS` (no por prioridad WP).
- La prioridad de ejecución la marca `add_action`/`add_shortcode` internamente en PHP. No mezclar conceptos.
- Documentar en JSDoc del registry que el orden del array no implica prioridad de ejecución.

### 3.4 SU framework stubs

- Nueva función `buildSuFrameworkStubs()` exportada desde el piloto SU.
- Contiene stubs mínimos para que `su_spacer.php` y resto de shortcodes SU registrados funcionen: `su_add_shortcode` (delega en `add_shortcode`), `su_get_css_class`, `su_query_asset`, y helpers que los shortcodes invoquen.
- `buildShortcodesUltimatePhpCode()` prependea `buildSuFrameworkStubs()` a su output.
- Regla: todos los stubs SU en un único sitio. Añadir shortcodes SU en el futuro (`su_column`, `su_tabs`, etc.) amplía la lista aquí, no la dispersa.

### 3.5 Bounded surface — no plugins de usuario

- `ACTIVE_PILOTS` permanece cerrado al módulo bridge.
- Plugins de usuario van por el loader JS/TS de ADR-020 — canal distinto.
- "Dejar que plugins registren pilotos PHP" requeriría ADR nuevo + threat model propio. Fuera de scope.

---

## 4. Testing

### 4.1 Tests unitarios (mantener)

- Los tests JS actuales de cada piloto se mantienen — cubren transformaciones a nivel unidad.

### 4.2 Test de integración PHP-WASM real (nuevo)

- Un único test end-to-end en el bridge:
  - Arranca PHP-WASM real (`NODEPRESS_TIER2=true`).
  - Registra los 3 pilotos via `ACTIVE_PILOTS`.
  - Verifica que `[su_spacer size="20"]`, `[footnote]`, `[display-posts]` se transforman correctamente.
- Presupuesto: <2s total (cold start ~40-50ms + warm <10ms por pilot invocación, compartido).
- Si supera 2s, investigar antes de mergear.

### 4.3 Test regresión — registry vacío

- Test que verifique que `ACTIVE_PILOTS = []` resulta en `renderShortcodes()` devolviendo el contenido sin transformar, sin error.
- Protege contra vaciado accidental del registry.

---

## 5. ADR-017 amendment

- Román escribe el amendment antes del merge.
- Nueva sección "Pilot Registry" que formaliza:
  1. `ACTIVE_PILOTS` es array estático de módulo, no input.
  2. Cada piloto expone `{ id, buildPhpCode }`.
  3. El bridge concatena PHP de los pilotos en cada invocación (scope reset).
  4. SU framework stubs documentados como parte del piloto SU.
  5. Pilot registry cerrado — plugins de usuario fuera de scope.
- Co-sign obligatorio de Helena (ADR-018 §Attack Surface) antes del merge.
- Sin co-sign Helena → no push.

---

## 6. Definition of Done

| #   | Item                                                                                                 | Owner         |
| --- | ---------------------------------------------------------------------------------------------------- | ------------- |
| 1   | `packages/server/src/bridge/pilots/index.ts` exporta `ACTIVE_PILOTS` con los 3 pilotos               | Raúl          |
| 2   | Contrato `BridgePilot = { id: string; buildPhpCode: () => string }`                                  | Raúl          |
| 3   | `renderShortcodes()` concatena `buildPhpCode()` de cada pilot antes de `do_shortcode`                | Raúl          |
| 4   | `buildSuFrameworkStubs()` separado en el piloto SU, prependido en `buildShortcodesUltimatePhpCode()` | Raúl          |
| 5   | Test integración PHP-WASM real con los 3 pilotos (`su_spacer` incluido), <2s                         | Raúl          |
| 6   | Test regresión — `ACTIVE_PILOTS` vacío no rompe `renderShortcodes()`                                 | Raúl          |
| 7   | ADR-017 amendment con sección "Pilot Registry"                                                       | Román         |
| 8   | Co-sign Helena en ADR-017 amendment antes del merge                                                  | Helena (gate) |

---

## 7. Riesgos registrados

- **R-1:** Coste runtime por pilot (~2-4KB PHP concatenado por call). Aceptable con 3 pilotos; monitorizar si sube a 8-10.
- **R-2:** Tentación futura de convertir `ACTIVE_PILOTS` en input dinámico para "facilitar testing" o "permitir plugins PHP". Rechazado permanentemente — colapsaría en Opción C. Si se reabre, ADR nuevo + threat model.
- **R-3:** Los tests unitarios actuales de pilotos simulan JS, no ejecutan PHP-WASM. Dejan pasar bugs como `su_spacer`. Mitigación: test de integración real (punto 5 del DoD).
- **R-4:** Scope reset en PHP-WASM obliga a re-concatenar PHP en cada call. Si alguien en Sprint 6+ intenta cachear el runnerCode para optimizar, romperá el contrato. Documentar en JSDoc.

---

## 8. Estimación y ventana

- **Raúl:** 3-4 horas incluyendo tests y stubs SU.
- **Román:** 1 hora amendment ADR-017 + envío a Helena.
- **Merge target:** 2026-04-20 (dependiente de co-sign Helena).

---

## 9. Lección arquitectónica

- **Comentarios "injected externally" en código de producción = smell.** Si el caller no existe en el repo, el comentario miente. Regla: cualquier inyección externa declarada en código debe tener un caller real ejercitado por test de integración en el propio repo.
- **Tests que simulan en JS lo que corre en PHP-WASM producen falsos verdes.** El test de `shortcodes-ultimate.ts` llevaba semanas verde mientras `su_spacer` estaba roto. El único test fiable es el que ejecuta el runtime real.
- **Registry estático > input dinámico** cuando el surface tiene implicaciones de seguridad. Si `X` puede venir del caller, `X` puede venir de un atacante. ADR-017 + ADR-018 formalizan esto — la conversación de hoy lo reafirma.

---

## 10. Firmas

- Román (Tech Lead) — decisión arquitectónica + amendment ADR-017
- Raúl (Dev Backend 2) — implementación + DoD 1-6
- Helena (Security) — co-sign gate ADR-017 amendment (pendiente)
