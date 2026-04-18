# Clarificación del PO: revertimos decisión sesión 2 — volvemos al plan original

**Fecha:** 2026-04-18
**De:** Alejandro (CEO)
**Para:** Equipo NodePress
**Asunto:** Clarificación del PO: revertimos decisión sesión 2 — volvemos al plan original

## Contexto

Anoche tuvimos dos reuniones sobre el mapa PHP-WASM. En la primera archivamos el mapa. Tras un push-back del PO ("dejamos esos puntos en la nada, porque no vale") abrimos una sesión 2 e interpretamos que pedía un plan con fases. No era eso. El PO pedía descartar el mapa entero y volver al plan pre-mapa. Corrijo el rumbo ahora, antes de que entre en código.

## Queda RECHAZADO (efectivo desde este comunicado)

- Plan por fases A/B/C ("Phased WP Bridge Roadmap").
- Re-spike de Raúl con 4 plugins reales (ACF, Yoast, WooCommerce, Contact Form 7).
- ADR-017 en su versión Tier 2.5 "Fase A Surface".
- Outreach 24-04 con pregunta "¿pagarías X€ si funcionaran los plugins X/Y/Z?".

## Queda VIGENTE (plan original pre-mapa)

- **Sprint 1** cierra como estaba. Demo 30-04 con hooks + REST + admin ya grabada.
- **Sprint 2** con el foco original: hardening (#28/#29/#30 — Ingrid) + ADRs pendientes de Román + skeletons cli/theme-engine/plugin-api.
- **Tier 2 content-only** según ADR-003 + verdict ADR-008: los 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts). Ya validado empíricamente.
- **D-008** intacto: CMS nativo Node, NO orquestador WP.
- **Outreach 24-04** con pregunta neutral sobre stack actual y dolor real, NO sobre compat de plugins concretos.

## Sobrevive de ambas sesiones

- **ADRs de Helena** (bridge security boundary + observability): saludables con independencia del scope del mapa. Aplican a los 3 pilotos actuales y se mantienen.
- **Spike original de Raúl** (día 1-3) sigue válido con verdict GO a Tier 2.
- **Acciones Sprint 1 W2** de Ingrid, Román y Raúl: sin cambios.

## Cierre

Esto fue un malentendido de comunicación, no un error técnico. El equipo interpretó razonablemente lo que tenía delante y trabajó bien. El PO ahora comunica con más precisión y agradezco la flexibilidad del equipo para pivotar sin fricción. No sobra nada del trabajo hecho: los ADRs de Helena, el spike original de Raúl y el cierre del Sprint 1 siguen en pie.

Seguimos.

— Alejandro, CEO · 2026-04-18

## Acciones de reversión

| Acción                                                               | Responsable         | Estado                        |
| -------------------------------------------------------------------- | ------------------- | ----------------------------- |
| Memoria sesión 2 marcada REVOCADA en project_memory de los 7 agentes | Tomás               | Pendiente                     |
| Log sesión 2 prefijo "[REVOCADO]" en título (no borrar, histórico)   | Tomás               | Pendiente                     |
| Re-spike Raúl con 4 plugins reales → cancelado                       | Raúl                | Efecto inmediato              |
| ADR "Phased WP Bridge Roadmap" → no se escribe                       | Román               | Efecto inmediato              |
| ADR-017 vuelve a "Tier 2 Surface mínimo" (3 pilotos originales)      | Román               | Mantener como estaba sesión 1 |
| ADRs Helena (security + observability) → se mantienen                | Helena              | Sin cambios                   |
| Outreach viernes 24: pregunta neutral sobre dolor, no sobre plugins  | Alejandro + Eduardo | Re-redactar                   |
