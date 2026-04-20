# Reunión: Mini sprint intermedio, estado del proyecto, y brecha CSS/templates

**Fecha:** 2026-04-19
**Participantes:** Román (Tech Lead), Martín (Ops Manager), Lucas (Lead Frontend), Sofía (Head de Diseño), Marta (Dev Frontend)
**Duración estimada:** 45 min

---

## Preparación Individual

**Román:** El `InlineThemeEngine` tiene HTML hardcodeado sin CSS. Los tipos están congelados desde Sprint 3. Propone distinguir Paso A (inline CSS con tokens, sin ADR, 2 días) vs Paso B (FileThemeEngine, ADR-025, Sprint 8). El 404 tiene CSS inline con valores fuera de paleta — anti-patrón a no replicar. Riesgos: scope creep, drift de tokens entre admin y público, templates sin tests visuales.

**Martín:** El backlog S7 no tiene ningún ticket de CSS/templates públicos. ADR-021 prometió Sprint 5+ para el renderer real. Tres sprints de deuda sin ticket asignado. Sprint 7 a techo (10 tickets, ~20 puntos efectivos). Candidato a desplazar: #91 dark mode (3 puntos). Necesita respuesta sobre si entra en S7 o se aparca con fecha en S8.

**Lucas:** Template engine es string interpolation en TypeScript — ningún sistema de templates externo. Los tokens `admin/src/styles/tokens.css` son portables directamente. El 404 tiene `INLINE_CSS` con colores hardcodeados (`#0066cc`, `#333`, `#fafafa`) fuera de paleta. Paso A = rápido. Necesita spec visual de Sofía antes de escribir CSS. Los pasos 11-14 del demo spec siguen pendientes.

**Sofía:** HTML desnudo en el frontend público contradice el design system del admin. Primera impresión del evaluador: proyecto sin diseño. Puede entregar spec visual esta semana derivada de los tokens existentes. No aprueba sin screenshot del render. La spec debe incluir shortcodes (CF7, footnotes) dentro del article y estados vacío/404.

**Marta:** Admin CSS completo y correcto: 100+ tokens, 74 tests verdes, WCAG AA verificado. Vista pública: sin CSS. La INLINE_CSS del 404 en `handlers.ts` es el anti-patrón a eliminar. Acepta la decisión de copiar tokens para Paso A, pero exige que el ticket de consolidación sea P0 en Sprint 9, no P2.

---

## Conversación

**Martín:** Voy con los números primero porque si no los ponemos sobre la mesa todo se vuelve una conversación de arquitectura sin fecha. El mini sprint intermedio entregó: bridge PHP-WASM operativo, plugin marketplace UI completa, plugins quedan activos al instalar, demo video con tres plugins. Eso es delivery sólido en tiempo comprimido. El problema que señala el usuario — hojas de estilo y templates — lleva tres sprints sin ticket asignado. ADR-021 lo prometió para Sprint 5. Estamos en mini-sprint post-S6. Eso es deuda conocida y documentada que nadie ha convertido en commitment. Mi pregunta para Román y Lucas: ¿esto entra en Sprint 7 o lo aparcamos con fecha en Sprint 8?

**Román:** La pregunta de Martín es la correcta y la respondo directamente: depende de lo que necesite la demo. El estado técnico es claro — tenemos `InlineThemeEngine` con HTML hardcodeado y cero CSS para la vista pública. Los tipos están congelados desde Sprint 3 en `packages/theme-engine/src/types.ts`. La arquitectura espera a que alguien la use. Lo que propongo es distinguir dos cosas: el Paso A — meter un `<style>` embebido con los tokens en `single` y `archive`, dos días de trabajo — y el Paso B — `FileThemeEngine` real con templates en disco, ADR-025, sprint completo. Para el demo del 30-04, Paso A es suficiente y no requiere ADR nuevo.

**Sofía:** Antes de hablar de días necesito decir algo sobre el estado actual. Lo que el lector ve hoy en `/p/:slug` es HTML desnudo con el estilo por defecto del navegador. El admin panel tiene identidad visual — Deep Violet, Inter, spacing system. La vista pública contradice ese trabajo completamente. Si alguien hace una demo de NodePress mostrando la página pública, la primera impresión es que el proyecto no tiene diseño. El contraste entre el admin y el frontend público daña la credibilidad. No es perfeccionismo — es que el ojo del evaluador técnico salta esa diferencia inmediatamente.

**Lucas:** Sofía tiene razón en el diagnóstico. Y técnicamente el camino más rápido que propone Román —inline `<style>` con los tokens— ya lo tenemos hecho a medias: el 404 tiene 116 líneas de CSS inline en `handlers.ts` con colores hardcodeados fuera de paleta. `#0066cc`, `#333`, `#fafafa` — nada de esto está en los tokens. El Paso A que propone Román no es "hacer CSS nuevo", es hacer bien lo que ya intentamos hacer en el 404 y extenderlo a los templates de posts. La resistencia que yo tengo no es técnica — es que necesito que Sofía me dé la spec visual antes de escribir una línea de CSS público.

**Marta:** Puedo confirmar lo que dice Lucas del 404. Ese bloque `INLINE_CSS` en `handlers.ts` es exactamente el anti-patrón que señalamos en la reunión de calidad: CSS de negocio en el handler. Si lo dejamos crecer, cada nuevo estado de error replica el patrón. La propuesta de meter `<style>` en los templates de `InlineThemeEngine` es mejor — al menos el CSS está en el theme engine, no en el servidor. Pero hay que resolverlo de una vez y con los tokens reales, no duplicar valores.

**Martín:** Bien. Entonces tenemos tres piezas distintas: el Paso A que Román estima en dos días, la spec visual que Sofía tiene que entregar para que Lucas y Marta puedan implementar, y el Paso B que es Sprint 8. Sprint 7 tiene techo de diez tickets y ya está a veinte puntos efectivos. No hay capacity sin mover algo. El candidato natural para desplazar es el #91 dark mode del admin — irónicamente también es CSS, pero del admin, y ya tenemos el Paso A que es más urgente. Román, ¿me confirmas que Paso A no necesita ADR nuevo?

**Román:** Confirmado. El Paso A — inline CSS con tokens en `InlineThemeEngine` — cabe dentro del contrato de ADR-021. El ADR permite mejoras de la implementación inline siempre que no cambie la interfaz `ThemeEngine`. El `render()` sigue devolviendo un string HTML — ahora con `<style>` dentro. No hay nueva interfaz, no hay nuevo paquete, no hay ADR. Paso B sí necesita ADR-025, pero eso es Sprint 8.

**Sofía:** Si el scope es Paso A, puedo entregar la spec visual esta semana. No necesito Figma completo — basta con definir: tipografía del body del artículo, tratamiento de `h2`/`h3`/`blockquote`/`code` dentro del contenido, columna de lectura, header y footer mínimos, y los estados que faltan: archive vacío y 404 alineado con el sistema. Todo derivado de los tokens que ya existen. Lo que no puedo hacer es aprobar el resultado sin ver el render — necesito que Marta o Lucas me den una screenshot del `/p/:slug` con el CSS aplicado antes de que entre a main.

**Lucas:** Eso es exactamente el proceso correcto. Sofía entrega spec, Marta implementa, Sofía aprueba screenshot. Una pregunta de arquitectura que hay que resolver hoy: ¿los tokens del admin `admin/src/styles/tokens.css` los copiamos al theme engine, o los movemos a un paquete compartido? Si los copiamos, tenemos drift controlado con un ticket Sprint 9. Si los movemos a `@nodepress/design-tokens`, hay un refactor pequeño pero limpio.

**Román:** Mi recomendación es copiar para Paso A, ticket de deduplicación en Sprint 9. El refactor a paquete compartido es correcto a largo plazo, pero si lo metemos en el mismo scope del Paso A alargamos dos días a cuatro y añadimos riesgo de regresión en el admin. Separemos los concerns: ahora entregamos CSS público funcional con los tokens copiados, Sprint 9 consolidamos.

**Marta:** Acepto esa decisión, pero con una condición: el ticket Sprint 9 tiene que ser P0 en el backlog de ese sprint, no P2. Si lo dejamos como P2, en Sprint 9 hay cuatro P0 nuevos y el drift de tokens se queda tres sprints más. Lo apunto como precondición.

**Martín:** Anotado. Marta tiene razón — ese tipo de deuda hay que comprometer la fecha desde hoy. Resumiendo el plan: Sofía entrega spec visual antes de fin del 21-04. Marta implementa CSS en `InlineThemeEngine` con tokens copiados. Sofía aprueba screenshot. Entra en Sprint 7 desplazando #91 dark mode a Sprint 8. El ticket de deduplicación de tokens va como P0 en Sprint 9.

**Sofía:** Una cosa más que quiero dejar clara antes de cerrar. La spec visual que voy a entregar incluye obligatoriamente los estados que no existen: archive vacío con estilo, 404 alineado con los tokens reales, y el tratamiento tipográfico del contenido de plugin — los shortcodes de footnotes y el formulario de CF7 tienen que verse bien dentro del article. No apruebo el Paso A si el formulario de CF7 flota sin estilo dentro del post.

**Lucas:** Completamente de acuerdo. Y añado: tenemos el spec de `public-site-shortcodes.spec.ts` que acordamos en la reunión anterior. Eso tiene que correr después del Paso A para verificar que los shortcodes se ven bien en el browser real. Propongo que el spec incluya una screenshot de comparación básica.

**Román:** Cerramos con eso. Paso A es el entregable inmediato. ADR-025 y Paso B son Sprint 8. Los tokens se consolidan en Sprint 9. Sofía modera la calidad visual — nada entra a main sin su screenshot approval.

---

## Puntos Importantes

1. **Deuda de tres sprints sin ticket** (Martín): CSS/templates del frontend público prometidos en ADR-021 para Sprint 5. No asignados en S5, S6 ni el borrador de S7.
2. **Paso A vs Paso B — no mezclar** (Román): Paso A = inline CSS con tokens en `InlineThemeEngine`, 2 días, sin ADR. Paso B = `FileThemeEngine` real, Sprint 8, ADR-025.
3. **Contraste admin vs público daña la demo** (Sofía): HTML desnudo frente a admin con design system. Primera impresión del evaluador técnico es definitoria.
4. **`INLINE_CSS` del 404 es el anti-patrón a eliminar** (Lucas + Marta): valores hardcodeados fuera de paleta en el handler. El Paso A lo unifica con tokens reales en el theme engine.
5. **Tokens: copiar para Paso A, consolidar en Sprint 9 como P0** (Román + Marta): refactor a paquete compartido correcto a largo plazo pero out of scope ahora.
6. **Sofía entrega spec visual 21-04** (Sofía): tipografía, columna lectura, shortcodes en article, archive vacío, 404 corregida. Derivada de tokens existentes.
7. **Screenshot approval de Sofía es gate de merge** (Sofía): no aprueba sin ver render real del `/p/:slug`.
8. **Sprint 7: desplazar #91 dark mode a Sprint 8** (Martín): única forma de hacer hueco al Paso A sin reventar el techo de 20 puntos.
9. **Estado mini sprint intermedio: delivery sólido** (Martín): bridge, marketplace UI, plugin status fix, demo video 3 plugins. Sin deudas nuevas.

## Conclusiones

- **Paso A** entra en Sprint 7: CSS público en `InlineThemeEngine` con tokens copiados de admin. Sofía spec → Marta implementa → Sofía aprueba screenshot.
- **#91 dark mode** desplazado a Sprint 8.
- **Tokens** duplicados para Paso A; ticket consolidación como P0 en Sprint 9.
- **Paso B** (`FileThemeEngine`, ADR-025): Sprint 8 día 1.
- **`public-site-shortcodes.spec.ts`** corre post-Paso A verificando CSS en browser.

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Spec visual frontend público: tipografía, columna lectura, shortcodes en article, archive vacío, 404 corregida | Sofía | 2026-04-21 |
| 2 | Implementar Paso A: CSS en `InlineThemeEngine` con tokens copiados (single, archive, 404 unificada) | Marta | 2026-04-22 |
| 3 | Screenshot review `/p/:slug` y `/` con CSS → approve o feedback | Sofía | 2026-04-23 |
| 4 | Screenshot assertion en `public-site-shortcodes.spec.ts` post-merge Paso A | Lucas | 2026-04-23 |
| 5 | Actualizar backlog S7: mover #91 a Sprint 8, añadir ticket Paso A CSS público | Martín | 2026-04-20 |
| 6 | Comprometer ticket `@nodepress/design-tokens` como P0 en backlog S8 | Martín | 2026-04-20 |
| 7 | Escribir ADR-025 "Theme Engine Runtime + Default Theme" (scope Paso B) | Román | Sprint 8 día 1 |

---

_Generado por /meet — Trinity_
