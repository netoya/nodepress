# Sprint 5 Retro — Async

**Sprint:** Sprint 5 — Adopción: CLI + WP Import + CLA + Contribuidores
**Fechas:** 2026-06-02 → 2026-06-13
**Retro abierta:** 2026-04-19
**Retro cerrada:** 2026-04-21 AM
**Facilitador:** Tomás (Scrum Master)
**Participantes (async):** Todo el equipo

---

## Velocity

| Métrica             | Valor                                                |
| ------------------- | ---------------------------------------------------- |
| Tickets completados | 9/10 (#61 CLA bloqueado — ver abajo)                 |
| Tickets P0+P1 done  | 8/8                                                  |
| Buffer utilizado    | #72 (ADR-023 stub) + #73 (vm spike)                  |
| Tests al cierre     | 65+ integración bridge nuevos                        |
| ADRs nuevos         | ADR-022 (WP Import), ADR-023 (Plugin Registry draft) |

**Nota velocity:** Sprint 5 completó 11 tickets contando #72/#73 de buffer (ADR-023 stub + vm.Context spike). Un sprint excepcionalmente productivo — equiparable a Sprint 2.

---

## ¿Qué fue bien? (Keep)

**K-1 — Bridge Pilot Registry**
La refactorización de `renderShortcodes()` para inyectar pilot PHP en cada invocación resolvió un bug arquitectónico profundo que habría afectado a todos los plugins futuros. Raúl + Román lo detectaron rápido vía /meet y lo implementaron el mismo día.

**K-2 — Compat test real de plugins**
Descargar CF7, Shortcodes Ultimate y Footnotes desde wordpress.org y ejecutarlos contra php-wasm fue la validación más concreta que hemos hecho en el proyecto. 3/4 PASS en primera iteración es un resultado excelente.

**K-3 — WP Import CLI**
Carmen entregó import-wp completo (posts + terms + users + comments + dry-run) sin necesidad de segunda iteración. El ADR-022 antes del código funcionó: Carmen no tuvo que reescribir nada.

**K-4 — Proceso /meet para debugging**
El uso de /meet para la sesión su_spacer (Raúl + Román) fue más eficaz que un issue asíncrono. Root cause identificado y opción elegida en una sola sesión. Repetir en Sprint 6 para decisiones arquitectónicas con más de 2 implicados.

**K-5 — Helena co-sign de seguridad**
El review de seguridad del Bridge Pilot Registry (ADR-018 compliance) fue proactivo — Helena lo hizo antes de que se lo pidieran. Las condiciones MEDIA son razonables y están documentadas.

---

## ¿Qué mejorar? (Improve)

**I-1 — #61 CLA sigue abierto (4 sprints)**
CLA Assistant requiere GitHub Settings access que no tenemos aún. Esto lleva arrastrándose desde Sprint 2. En Sprint 6 entra como P0 si no está resuelto antes del kickoff. Acción: Alejandro confirma acceso antes del 2026-06-16 AM.

**I-2 — su_spacer debería haberse detectado antes**
El bug de `renderShortcodes()` (piloto PHP nunca inyectado) existía desde Sprint 2. Los tests de integración usaban mocks que no ejercitaban el path real. La condición de Helena (ADR-017 §Consequences #6) va en la dirección correcta: tests de piloto deben usar renderShortcodes() real, no simular en JS.

**I-3 — vm.Context sin límite de memoria**
El spike confirmó que el enfoque actual (timeout-only) no da memoria isolation. Worker Threads es la respuesta correcta pero requiere señal de cliente (≥3 mentions). No bloquea Sprint 6 pero debe monitorizarse.

**I-4 — Nico activado tarde en el sprint**
D-038 condicionaba a Nico a ≥5 ICP-1 mentions de plugins terceros. La condición se cumplió (5/5 calls) pero Nico entró en la segunda mitad del sprint. En Sprint 6, Nico arranca desde el día 1 con ticket propio (#81 Users management UI).

---

## Acciones Sprint 6

| #      | Acción                                                                            | Responsable         | Deadline      |
| ------ | --------------------------------------------------------------------------------- | ------------------- | ------------- |
| R-S5-1 | Confirmar acceso GitHub Settings para CLA Assistant antes del kickoff S6          | Alejandro           | 2026-06-16 AM |
| R-S5-2 | Añadir recursion depth counter a su_do_nested_shortcodes (condición Helena H-1)   | Raúl                | Sprint 6 P1   |
| R-S5-3 | Test regression para su_add_shortcode overwrite (condición Helena H-2)            | Raúl                | Sprint 6 P1   |
| R-S5-4 | ADR-017 §Consequences #6 aplicado a todos los pilotos nuevos de Sprint 6          | Román               | Kickoff S6    |
| R-S5-5 | Go/no-go Worker Threads: ≥3 señales de cliente confirman need de memory isolation | Alejandro + Eduardo | Sprint 6 mid  |

---

## Decisiones Sprint 6 pendientes de Alejandro

Ver `docs/process/backlog-sprint6-draft.md` §Decisiones pendientes de Alejandro (4 items, deadline 2026-06-16 AM).

---

_Retro producida por Tomás (Scrum Master) — 2026-04-19._
_Cierre async: 2026-04-21 AM._
