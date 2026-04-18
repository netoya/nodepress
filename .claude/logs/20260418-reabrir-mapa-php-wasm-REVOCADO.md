# Reunión: Reabrir mapa PHP-WASM tras push-back del product owner

**Fecha:** 2026-04-18 (noche, sesión 2)
**Participantes:** Tomás (Scrum Master), Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Raúl (Dev Backend), Helena (IT), Eduardo (Consultor)
**Duración estimada:** 55 minutos

---

## Contexto

Hace 30 minutos el equipo archivó unánimemente el mapa PHP-WASM de 15 áreas como "catálogo informativo". **El product owner rechazó la decisión**: _"equipo dejamos esos puntos en la nada. porque no vale."_

Reunión de reconsideración. No es "defender la decisión" — es integrar la señal del dueño.

---

## Preparación Individual

### Tomás (facilitador)

- Aceptar push-back sin drama. "Informacion nueva, no decision equivocada."
- Tres preguntas orden: plan real vs archivado, tercera vía, qué es empírico y qué especulación.
- Proteger a Raúl — su spike es puente entre "archivado" y "plan con fases".
- Riesgos: Alejandro defensivo, Eduardo escalando, equipo interpreta como micro-management.

### Alejandro (CEO)

- Reconoce fallo de lectura. El consenso interno ≠ señal de mercado.
- Reabre bajo condiciones, no en blanco.
- **Propone Tier 2.5** — bridges de contenido real: Options write, Users inyectable, Object Cache, Transients, HTTP async, hooks.
- Fuera: `$wpdb`, Uploads/FS writes, Sessions/Cookies WP.
- Pregunta directa al PO: "¿qué has visto tú?" antes de plan.

### Román (Tech Lead)

- El user cambia el trade-off. Archivado = cero valor WP-compat.
- **3 fases con criterios técnicos:**
  - Fase A (Sprint 2-3): Options R/W, Transients, Object Cache, Users inyectable, `$_SERVER`, lifecycle reset, hooks cross-runtime.
  - Fase B (Sprint 4-5): HTTP async wrapper, cookies context bridge, sessions.
  - Fase C (Sprint 6+, gated): `$wpdb` proxy, FS virtual + S3, Uploads.
  - Fuera siempre: Tier 3 full orquestador (D-008).
- ADR-017 se reformula → "Fase A Surface".
- ADRs Helena siguen siendo gate.

### Ingrid (Lead Backend)

- Acepta reencuadre. "Priorizar por plugin real + archivar" era demasiado conservador.
- Fase A = ~8 días totales repartidos Carmen + ella.
- Firme en: `$wpdb` sigue fuera (Anti-ICP, ROI negativo).
- Cookies: context injection sí, emulación HMAC no.

### Raúl (Dev Backend)

- Los 3 pilotos anteriores (Footnotes/Shortcodes Ultimate/Display Posts) eran juguetes. Ningún agency escoge NodePress por esos.
- **Re-spike con 4 plugins reales:**
  - ACF (1.5M sites) → Fase A
  - Yoast SEO (5M sites) → Fase A
  - WooCommerce display básico → Fase B (`$wpdb`)
  - Contact Form 7 → Fase B (cURL async)
- Hard stop lunes 22-04 mantenido, +3 días si WooCommerce requiere coordinación Ingrid.

### Helena (IT)

- Posición no cambia. 2 ADRs gate SIGUEN innegociables — si reabrimos, MÁS motivo para threat model.
- Fase A factible con estimaciones: Object Cache + Transients 2 días, HTTP proxy 1 día, Sessions store 2 días (si se pide).
- HTTP async wrapper (Worker Threads) = 3-5 días + spike propio. NO en Fase A sin spike.
- Presupuesto explícito para threat modeling por fase, no único global.

### Eduardo (Consultor)

- **Autocrítica abierta:** mi benchmark Ghost/Strapi era correcto para greenfield, incompleto para migración.
- **Contraejemplo:** Faust.js + WPGraphQL (WP Engine acquisition, 400k+ sites) = compat parcial estratégica con ROI. Es el modelo cerca de Fase A.
- **Retiro la generalización:** "ningún CMS comercial gana vía compat" solo aplica a full compat. Compat parcial SÍ es mercado (WP Engine).
- Outreach pregunta binaria con fricción: "¿pagarías X€ por piloto Q3?" — no "¿te gustaría?".
- Criterio archivado Fase A: si outreach <3 sí → archivar.

---

## Conversación

**Tomás:** Buenas otra vez. Aviso de contexto: hace 30 minutos cerramos con consenso total. El product owner ha rechazado la decisión con tres palabras: "en la nada, no vale". Lo primero — esto no es cuestionar la autoridad del equipo. Es información nueva que no teníamos. Mi pregunta de apertura es para Alejandro: ¿qué te está diciendo el product owner que nosotros no vimos anoche?

**Alejandro:** Te lo digo claro, Tomás. Todavía no tengo el dato concreto — pero reconozco que consenso interno no equivale a señal de mercado. Y reconozco algo más: archivar 12 áreas como "catálogo" y decirle al cliente "la mayoría de tus plugins no funcionan pero tenemos 3 que sí" NO vende. El product owner ve lo que yo debería haber visto: sin los bridges básicos, "WP-compatible" es marketing vacío. Mi postura ahora: reabrir bajo condiciones, NO en blanco. Y propongo un encuadre nuevo — Tier 2.5: bridges de contenido real. Options API con write, Users inyectable, Object Cache, Transients, HTTP async, hooks cross-runtime. Queda fuera: `$wpdb`, Uploads, FS writes, Sessions con cookies WP. Eso sí es diferenciador defendible.

**Eduardo:** Alejandro, antes de que sigas — te debo una autocrítica. Ayer cerré con "Ghost y Strapi ganan sin compat". Es correcto para greenfield. **Es incompleto para migración**, que es exactamente ICP-1. Un agency modernizer con 40 clientes en WordPress no abandona ACF ni Yoast por capricho. Los necesita funcionando o no migra. Mi benchmark omitió el caso. Añado el contraejemplo que sí aplica: Faust.js con WPGraphQL. WP Engine los adquirió. 400 mil sites. Es compat parcial estratégica con ROI. Eso está a un paso de donde estamos.

**Román:** Eduardo, ese contraejemplo cambia el cálculo. Si Faust.js valida "compat parcial en el borde de datos" como modelo comercial, Fase A no es "experimento tímido" — es la línea correcta. Desde arquitectura propongo estructura por 3 fases, con criterios técnicos explícitos. Fase A: Options read/write, Transients, Object Cache, Users inyectable, `$_SERVER`, lifecycle reset, hooks cross-runtime. Es lo que la matriz empírica de Raúl va a confirmar que tocan los plugins reales. Fase B: HTTP async wrapper con worker threads, cookies como contexto en el borde, sessions. Fase C gated por demanda con piloto pagando: `$wpdb` proxy, filesystem virtual, uploads con S3. Tier 3 full queda fuera siempre — D-008 se mantiene. Eso sí es el plan que reemplaza el archivado.

**Raúl:** Para. Tengo que asumir algo. Los tres pilotos que defendí ayer — Footnotes, Shortcodes Ultimate, Display Posts — eran juguetes. Ningún agency escoge NodePress por esos plugins. El product owner ve eso, yo no lo vi ayer. Si re-hago el spike, necesito hacerlo con plugins reales: ACF, Yoast SEO, WooCommerce display básico, Contact Form 7. Esa es la matriz que importa. ACF y Yoast van a caer en Fase A de Román. WooCommerce va a romper por `$wpdb` — Fase B real. Contact Form 7 necesita cURL async — Fase B también. Mi hipótesis post-re-spike es que Fase A vale para el 80% del uso real de ICP-1.

**Ingrid:** Raúl, suscribo. Y añado concreción desde backend. Voy fila por fila con estimaciones revisadas. Options R/W: la tabla existe con índice por nombre, un día completo incluyendo writes. Transients: columna `expires_at` sobre la misma tabla o tabla nueva, un día. Users inyectable: el schema ya tiene `roles[]` y `capabilities JSONB`, dos días para construir `WP_User` fake. Object Cache con Redis: wrapper JS sobre lo que Helena ya tiene en compose, un día. Hooks cross-runtime: ya funciona — Raúl lo validó día 2. `$_SERVER`: inyección por request, medio día. Request lifecycle reset: instancia PHP-WASM reciclable por request, dos días. Total Fase A: **ocho días reales**, repartidos entre Carmen y yo. Pero una cosa firme — `$wpdb` sigue fuera indefinidamente. JSONB a EAV son semanas, sin MySQL vivo no hay bridge real, y los plugins que dependen de `$wpdb` directo son Anti-ICP.

**Helena:** Coincido con Ingrid en las estimaciones de Fase A. Desde infra: Object Cache con Transients son dos días compartidos. HTTP proxy para casos sync es un día adicional. Sessions store con Node KV o Redis, dos días si se pide. Pero **HTTP async wrapper con Worker Threads es otra historia**: tres a cinco días de infra + spike propio + threat model específico. PHP-WASM aislado en worker con message passing no es trivial. **NO entra en Fase A sin spike dedicado**. Y mi posición no cambia con el push-back: los dos ADRs gate — bridge security boundary y observabilidad — siguen siendo innegociables. Si reabrimos más bridges, **más** motivo para el threat model, no menos. Si el product owner o alguien sugiere arrancar implementación sin esos ADRs, lo paro. No es personal, es proceso.

**Eduardo:** Apoyo todo eso. Añado dos cosas operativas sobre el outreach del viernes. Primera: la pregunta al CTO no puede ser "¿te gustaría?" — eso siempre da sí. Propongo pregunta binaria con fricción económica: **"¿pagarías cinco mil euros por un piloto en Q3 si tus plugins de contenido — ACF, Yoast meta, shortcodes — funcionaran out-of-the-box?"**. Binaria, sí o no con razón. Segunda: necesitamos criterio de archivado de Fase A definido **hoy**, antes de escribir código. Si outreach devuelve menos de tres sí, Fase A se archiva sin rework emocional. Si devuelve cinco o más, Fase B entra planificación Sprint 4. Sin ese criterio, cuando el equipo tenga código de Fase A construido, se resistirá a archivar aunque el mercado no responda.

**Tomás:** Recojo momentum. ¿Vemos estructura emergente?

- El mapa deja de ser "catálogo archivado" y se convierte en **"Phased WP Bridge Roadmap"**.
- Fases A, B, C con criterios técnicos y de demanda explícitos por fase.
- Fuera siempre: Tier 3 full orquestador. D-008 intacto.
- Spike Raúl re-hecho con ACF + Yoast + WooCommerce + Contact Form 7. Hard stop extendido a jueves 25-04 (3 días adicionales).
- ADRs Helena sigue siendo gate pre-prod. No cambia.
- Outreach del viernes con pregunta binaria con fricción económica. Criterio de activación Fase B: ≥5 sí en 15 calls. Criterio de archivado Fase A: <3 sí.
  ¿Alguien disiente?

**Alejandro:** Un matiz mío. Fase A entra Sprint 2 **parcialmente** — no se abre el scope completo de ocho días el lunes 21. Entran solo Options R/W + hooks cross-runtime + `$_SERVER`, que son los tres que el spike de Raúl va a confirmar. El resto de Fase A (Users, Object Cache, Transients, lifecycle reset) se añade en Sprint 3 una vez tengamos matriz + ADRs de Helena firmados. Eso protege scope freeze de Sprint 2 actual.

**Raúl:** Me cuadra. Lo que confirmo con el re-spike entra en Sprint 2. Lo que no, a Sprint 3.

**Román:** Acepto. Actualizo ADR-017 a "Fase A Surface — Sprint 2 subset" + "Fase A Completion — Sprint 3". Dos ADRs cortos en lugar de uno grande.

**Helena:** Mi jueves 23 cumple para ADR security boundary. Observability antes del arranque de Sprint 3.

**Ingrid:** Backend de acuerdo. Reservo mi semana 2 de Sprint 1 para cerrar el spike con Raúl si WooCommerce requiere queries reales contra mi schema.

**Eduardo:** Añado: el product owner — quien nos abrió los ojos — debería co-firmar el ADR "Phased WP Bridge Roadmap" con Alejandro. Si el PO está en el documento, no hay riesgo de que el equipo vuelva a archivar por malentendido.

**Alejandro:** Acepto. Alejandro + product owner co-firman. Román y Eduardo co-signatarios técnicos y estratégicos.

**Tomás:** Cierro. Decisiones:

- **Archivado del mapa: revocado.** Nuevo ADR "Phased WP Bridge Roadmap" reemplaza el anterior.
- **Fase A-Sprint 2 subset** (Options R/W + hooks cross-runtime + `$_SERVER`): depende del re-spike Raúl.
- **Fase A-Sprint 3 completion** (Users + Object Cache + Transients + lifecycle reset): con ADRs Helena firmados.
- **Fase B** (HTTP async + cookies + sessions): gated por ≥5 sí en outreach.
- **Fase C** (`$wpdb` + FS + Uploads): gated por piloto pagando.
- **Tier 3 full rechazado permanentemente.** D-008 intacto.
- **Re-spike Raúl** con ACF + Yoast + WooCommerce display + Contact Form 7. Hard stop jueves 25-04.
- **ADRs Helena** (security + observability): plazos mantenidos.
- **Outreach pregunta binaria con fricción económica.** Criterios activación/archivado explícitos.
- **Co-firmas ADR roadmap:** Alejandro + product owner + Román + Eduardo.

¿Algo más?

**Raúl:** Una cosa — el re-spike lo empiezo lunes 21, no esta noche. El equipo acaba de entregar demo de video grabado, hay que respetar cierre de ciclo.

**Tomás:** Correcto. Nadie empieza nuevo scope esta noche.

**Alejandro:** Salimos. Buen trabajo, equipo. Y gracias al product owner por el empujón — nos ha ahorrado un trimestre de marketing vacío.

---

## Puntos Importantes

1. **Archivado revocado.** El mapa pasa de "catálogo" a **"Phased WP Bridge Roadmap"** con 3 fases explícitas. (Consenso total)
2. **Reconocimiento compartido**: consenso interno ≠ señal de mercado. Eduardo + Alejandro lideran la autocrítica. (Alejandro + Eduardo)
3. **Contraejemplo Faust.js + WPGraphQL** (WP Engine, 400k+ sites) valida compat parcial estratégica como modelo comercial. Eduardo retira su generalización anterior. (Eduardo)
4. **Re-spike con plugins reales**: ACF + Yoast + WooCommerce display + Contact Form 7. Los 3 pilotos anteriores eran juguetes. Hard stop jueves 25-04. (Raúl)
5. **Fase A dividida en dos sub-fases** para proteger scope freeze Sprint 2: subset Sprint 2 (Options+hooks+`$_SERVER`) + completion Sprint 3 (Users+Cache+Transients+lifecycle). (Alejandro)
6. **ADRs de Helena siguen innegociables** — security boundary + observabilidad. Si reabrimos, MÁS motivo para threat model, no menos. (Helena)
7. **`$wpdb` y Tier 3 full permanecen fuera indefinidamente.** D-008 intacto. Plugins que requieren `$wpdb` directo son Anti-ICP. (Ingrid + Román firme)
8. **HTTP async wrapper (Worker Threads) fuera de Fase A** — requiere spike dedicado + threat model propio. Entra Fase B o nunca. (Helena + Raúl)
9. **Outreach viernes con pregunta binaria de fricción económica**: "¿pagarías X€ por piloto Q3?" en lugar de "¿te gustaría?". (Eduardo)
10. **Criterios de activación/archivado explícitos antes de escribir código**: ≥5 sí → Fase B. <3 sí → archivar Fase A sin drama. (Eduardo)
11. **Co-firmas ADR roadmap**: Alejandro + product owner + Román + Eduardo. El PO queda en el documento para evitar re-archivados silenciosos. (Eduardo)
12. **Nadie empieza scope esta noche.** Respeto al cierre del ciclo anterior (demo grabada, post-mortem, Wave 14). (Raúl + Tomás)

## Conclusiones

- Consenso total tras push-back del PO. Cero desacuerdos irreconciliables.
- El equipo aceptó la corrección con honestidad — 4 de 7 participantes hicieron autocrítica explícita (Alejandro, Eduardo, Raúl, Ingrid).
- La decisión anterior NO se declaró "equivocada" — se declaró **correcta con la información de ayer, insuficiente con la señal del PO**.
- D-008 sobrevive: NodePress sigue siendo CMS nativo Node. Fase C no se activa sin piloto pagando + ADR-003 amendment formal.
- El criterio de archivado ex-ante evita sunk-cost emotional rework si el outreach falla.

## Acciones

| #   | Acción                                                                                                              | Responsable                            | Plazo                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| 1   | Re-spike con 4 plugins reales (ACF, Yoast, WooCommerce display, Contact Form 7) → matriz empírica por fila del mapa | Raúl (soporte Ingrid si `$wpdb`)       | Arranque lunes 2026-04-21, hard stop jueves 2026-04-25 |
| 2   | ADR "Phased WP Bridge Roadmap" (reemplaza archivado) — 3 fases + criterios activación/archivado + co-firmas         | Alejandro + PO + Román + Eduardo       | Viernes 2026-04-25                                     |
| 3   | ADR-017 "Fase A Surface — Sprint 2 subset" + ADR-018 "Fase A Completion — Sprint 3"                                 | Román                                  | Tras re-spike Raúl                                     |
| 4   | ADR "Bridge Security Boundary" (gate pre-prod)                                                                      | Helena                                 | Jueves 2026-04-23                                      |
| 5   | ADR "Bridge Observability" (gate pre-prod)                                                                          | Helena                                 | Sprint 3 kickoff                                       |
| 6   | ADR "HTTP async wrapper / Worker Threads isolation" (pre-req Fase B)                                                | Helena + Raúl                          | Sprint 4 planning                                      |
| 7   | Outreach viernes 24-04: pregunta binaria con fricción económica ("¿pagarías X€ por piloto Q3?")                     | Alejandro + Eduardo                    | Viernes 2026-04-24 → 2026-05-03                        |
| 8   | Criterios activación/archivado documentados en ADR roadmap antes de código Fase A                                   | Eduardo redacta, Alejandro aprueba     | Viernes 2026-04-25                                     |
| 9   | Sprint 2 backlog incluye Fase A subset (Options R/W + hooks + `$_SERVER`) tras verdict re-spike                     | Román + Martín scope                   | Sprint 2 kickoff (post 30-04)                          |
| 10  | Implementación Options R/W + Transients (Ingrid/Carmen)                                                             | Ingrid + Carmen                        | Sprint 2 week 1-2                                      |
| 11  | Implementación Object Cache Redis bridge                                                                            | Helena (infra) + Ingrid (bridge)       | Sprint 3 week 1                                        |
| 12  | Revisión en Sprint 4 planning: ¿Fase B se activa?                                                                   | Alejandro + Eduardo con datos outreach | 2026-05-15 aprox                                       |

---

_Generado por /meet — Trinity_
