# Script Outreach — 2026-04-24

> **Owner:** Alejandro (CEO) + Eduardo (Consultant)
> **Ventana:** viernes 2026-04-24 → viernes 2026-05-02 (10 días, 15 calls)
> **Objetivo:** validar dolor real en ICP-1 ANTES de decidir inversión Tier 2.
> **Producto actual:** PoC con hooks + REST API WP-compatible + admin React. Tier 2 bridge content-only (3 pilotos: Footnotes, Shortcodes Ultimate, Display Posts).
> **Guardarraíl:** conversación NEUTRAL sobre dolor y stack. NO vendemos compatibilidad de plugins. D-008 intacto: NodePress = CMS nativo Node, NO orquestador WP.

---

## 1. ICP-1 — a quién llamamos

**Perfil:**

- CTO / Tech Lead / Head of Engineering
- Empresa con blog, newsroom, knowledge base o sitio de contenido digital como activo relevante del negocio (no marketing landing — contenido que genera tráfico o ingresos)
- Equipo técnico propio (no 100% outsourced)
- Tamaño: 10-200 empleados
- Stack actual: WordPress (self-hosted o WP VIP / WP Engine / Kinsta) o CMS legacy (Drupal, Joomla, Sitecore viejo)

**Pain points que buscamos confirmar:**

- Performance (TTFB, Core Web Vitals, cache hell)
- Coste de hosting escalado
- Plugin bloat y conflictos entre plugins
- Ciclos de security updates y mantenimiento continuo
- Fricción entre equipo de producto (JS/TS stack moderno) y CMS (PHP legacy)

**Anti-ICP (no llamar):**

- eCommerce puro sobre WooCommerce
- Agencias que revenden WP a PYMES
- Startups 100% headless ya migrados (Contentful/Sanity/Strapi)

**Volumen:** 15 calls en 10 días laborables = ~1.5 calls/día. Eduardo agenda, Alejandro lidera, Eduardo toma notas.

---

## 2. Script de llamada (10-12 minutos)

### Apertura (1 min)

> "Hola [Nombre], soy Alejandro de NodePress. Gracias por coger la llamada — te robo 10-12 minutos, ni uno más.
>
> Contexto rápido: estamos construyendo un CMS moderno en Node.js y antes de invertir más quiero entender de primera mano cómo vivís vosotros la gestión de contenido hoy. No vengo a venderte nada — vengo a aprender.
>
> ¿Te va bien que grabe la conversación para mis notas, o prefieres que tome notas a mano?"

### Discovery (5-6 min)

1. **¿Qué CMS usáis actualmente para vuestro contenido?**
   _(Escuchar: versión, hosting, antigüedad del setup, quién lo mantiene.)_

2. **¿Cuál es el mayor dolor del día a día con él?**
   _(Dejar silencio. No sugerir. Apuntar las palabras exactas que usen.)_

3. **¿Cuánto tiempo al mes dedica vuestro equipo a mantener el CMS — actualizaciones, plugins, hosting, seguridad — comparado con construir features de producto?**
   _(Buscamos un número o ratio: "un sprint al trimestre", "20% de un ingeniero".)_

4. **¿Os habéis planteado alguna vez migrar a otra cosa? ¿Qué os lo ha frenado?**
   _(Si nunca se lo han planteado → el dolor no es tan grande. Señal débil.)_

5. **Si tuvieseis que migrar mañana, ¿qué funcionalidad del CMS actual es innegociable para vosotros — sin lo cual no podríais operar?**
   _(La pregunta más valiosa. Revela must-have real vs legacy por costumbre.)_

**Regla de oro:** escuchar 80%, hablar 20%. Nunca completar la frase del entrevistado. Si duda, silencio 5 segundos antes de reformular.

### Brief de NodePress (2-3 min)

> "Te cuento en 2 minutos dónde estamos, para que decidas si tiene sentido seguir hablando.
>
> **Qué es NodePress:** un CMS nativo en Node.js y TypeScript, admin en React, PostgreSQL. Hablamos el mismo API REST que WordPress — misma shape de endpoints, mismo hook system — para que el ecosistema de herramientas y templates que ya conocéis no tenga que reinventarse.
>
> **Qué NO es:** no es WordPress corriendo en Node, no es un wrapper de WP. Es un CMS nuevo que elige compatibilidad estratégica con la API de WordPress porque es el estándar de facto del sector.
>
> **Dónde estamos:** PoC funcional. Tenemos el admin, el REST API, el sistema de hooks, y un bridge experimental para ejecutar lógica de contenido simple. Estamos en Sprint 2. No estamos en producción todavía.
>
> **Por qué te llamo hoy:** si construimos esto sin hablar con vosotros, construiremos la versión equivocada. Prefiero pagarte 10 minutos ahora que 10 meses rehaciendo."

### Cierre (1 min)

**A. Si mostró dolor real + interés:**

> "Tengo una demo de 15 minutos grabada — el flow completo, admin a REST a hook programático. ¿Te la paso por email? Y si te encaja, en 2 semanas podemos hacer una segunda llamada de 20 minutos donde tú decides qué quieres ver vivo."

**B. Si fue neutro:**

> "Gracias por el tiempo. Te añado a la lista de gente con la que compartiré el release público cuando abramos el repo — sin spam, un email cada par de meses. ¿Te parece bien?"

**C. Si no encaja:**

> "Perfecto, eso me sirve muchísimo. Gracias por la honestidad. Si alguna vez cambia el contexto, tienes mi email. Que tengas buen día."

No forzar demo. No pedir referidos en esta primera ronda.

---

## 3. Qué NO preguntar (guardarraíles post-reversión 2026-04-18)

- **NO preguntar** por plugins específicos: ACF, Yoast, WooCommerce, Contact Form 7, Elementor.
- **NO preguntar** "¿pagarías X€ si funcionaran los plugins X/Y/Z?" — plan fases revocado el 18-04.
- **NO prometer** compatibilidad de plugins PHP. Somos content-only Tier 2.
- **NO posicionar** NodePress como "WordPress que funciona mejor".
- **NO mencionar** php-wasm, bridges, ni detalles de implementación.
- **NO cerrar piloto ni pricing** en esta llamada. Ronda DISCOVERY, no venta.

**Si preguntan directamente "¿soporta el plugin X?":**

> "Hoy no. Si el plugin X es innegociable para ti, probablemente no somos tu opción todavía."

Honestidad > expectativas infladas.

---

## 4. Qué registrar por call

| Campo                               | Ejemplo                                       |
| ----------------------------------- | --------------------------------------------- |
| Fecha + nombre + empresa            | 2026-04-24, Juan Pérez, Acme Media            |
| CMS actual                          | WordPress 6.4 self-hosted en AWS              |
| Pain point principal (sus palabras) | "Cada update de plugin rompe algo en staging" |
| Tiempo mantenimiento vs producto    | ~25% de un ingeniero                          |
| ¿Han considerado migrar?            | Sí, evaluaron Strapi hace 1 año               |
| Funcionalidad innegociable          | Editor Gutenberg con bloques custom           |
| Interés en demo                     | Sí / No / Tal vez                             |
| Señal cualitativa                   | Alta / Media / Baja / Anti-ICP                |
| Siguiente paso acordado             | Enviar demo grabada, follow-up 08-05          |

Plantilla en `docs/process/outreach/call-log-template.md` — Eduardo la crea antes del jueves 23-04 AM.

---

## 5. Criterio de señal positiva

Umbral compuesto AND (todas las condiciones) sobre las 15 calls:

| Condición                                     | Umbral          | Qué valida                           |
| --------------------------------------------- | --------------- | ------------------------------------ |
| Pain real articulado espontáneamente          | ≥ 8 / 15 (53%)  | El problema existe                   |
| Interés genuino en demo/follow-up             | ≥ 5 / 15 (33%)  | NodePress es percibido como solución |
| Innegociable que ya tenemos o está en roadmap | ≥ 3 / 15 (20%)  | Product-market fit direccional       |
| Innegociable que contradice D-008             | ≤ 3 / 15 (≤20%) | ICP bien definido                    |

### Matriz de decisión

| Resultado                    | Acción                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Todos los umbrales cumplidos | **GO** — continuar roadmap, planificar Sprint 4 con piloto real                                       |
| ≥8 pain + <5 demo            | **PIVOTAR MESSAGING** — dolor existe pero no nos ven como solución. Valentina revisa posicionamiento. |
| <8 pain                      | **PAUSAR outreach, revisar ICP** — Eduardo + Alejandro redefinen antes de más calls                   |
| >3 menciones anti-D-008      | **CONVERSACIÓN DE PRODUCTO** — Alejandro + PO + Román. No decisión unilateral.                        |

**Revisión del resultado:** lunes 2026-05-05, Alejandro + Eduardo + Román.
Output = decisión documentada (GO / PIVOTAR / PAUSAR) antes del planning de Sprint 3.

---

## Apéndice — operativa

- Cada call arranca a la hora exacta. Si el entrevistado llega 5+ min tarde, reagendar.
- Eduardo agenda con 48h de antelación mínima + calendar invite con agenda de 3 líneas.
- Grabación solo con consentimiento explícito verbal al inicio.
- Si preguntan por el repo: "Abrimos público el 2026-05-14. Te aviso ese día si te interesa."
- **Zero outreach externo hasta que CLA Assistant esté configurado — jueves 2026-04-23.** Gate confirmado.

---

**Firmado:** Alejandro (CEO) — 2026-04-18
**Co-review pendiente:** Eduardo antes de la primera call del viernes 2026-04-24.
