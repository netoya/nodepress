# Wireframes — Dashboard Principal (NodePress Admin)

> Versión 1.0 · Sofía, Head de Diseño · 2026-04-09  
> Descripción textual detallada de layout y comportamiento. Implementación a cargo del equipo frontend.

---

## 1. Layout Global del Admin

### Estructura de Zonas

El admin se divide en **tres zonas permanentes** y un **área de contenido** variable:

```
┌─────────────────────────────────────────────────────────┐
│  [SIDEBAR]  │           [HEADER]                        │
│  240px fijo │  ─────────────────────────────────────── │
│  (colaps.)  │           [CONTENT AREA]                  │
│             │                                           │
│             │                                           │
│             │                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Zona 1: Sidebar

**Dimensiones:** 240px de ancho en estado expandido. 60px en estado colapsado (solo iconos).

**Comportamiento:**
- Fijo (no hace scroll con el contenido).
- Colapsable mediante toggle en la parte inferior. Estado persistido en `localStorage`.
- En viewport < 1024px: el sidebar se convierte en drawer que aparece sobre el contenido (overlay), no empuja el layout.

**Estructura vertical del sidebar:**

```
┌──────────────────────────┐
│  [Logo NodePress]        │  ← 60px de altura, padding lateral 20px
│  + site name dropdown    │     Dropdown: cambiar entre sitios (futuro)
├──────────────────────────┤
│  [Quick Search]          │  ← Input de búsqueda global. Shortcut: Cmd+K
│  "Buscar..."             │     Abre command palette al hacer clic
├──────────────────────────┤
│  NAVEGACIÓN PRINCIPAL    │  ← Label de sección, all-caps, font-size-xs
│                          │
│  ⬡ Dashboard            │  ← Item activo: background primary-50, borde izquierdo 3px primary-500
│  📄 Entradas             │
│    └ Todas las entradas  │  ← Sub-items: indentados 12px, font-size-sm
│    └ Añadir nueva        │
│    └ Categorías          │
│    └ Etiquetas           │
│  📖 Páginas              │
│    └ Todas las páginas   │
│    └ Añadir nueva        │
│  🖼 Medios               │
│  💬 Comentarios          │  ← Badge numérico si hay pendientes
│                          │
│  APARIENCIA              │  ← Segunda sección
│                          │
│  🎨 Temas                │
│  🧩 Widgets              │
│  📋 Menús                │
│                          │
│  FUNCIONALIDAD           │  ← Tercera sección
│                          │
│  🔌 Plugins              │  ← Badge "actualización disponible" si aplica
│  👥 Usuarios             │
│  🛠 Herramientas         │
│  ⚙️ Ajustes             │
├──────────────────────────┤
│  [Avatar] Nombre admin   │  ← Bottom: avatar 32px, nombre, badge de rol
│  Administrador      [⋯] │     Menú contextual: Mi perfil, Cerrar sesión
│                          │
│  [←] Colapsar sidebar   │  ← Toggle de colapso, siempre visible
└──────────────────────────┘
```

**Comportamiento de items de nav:**
- Estado hover: background `neutral-100`, transición `transition-base`.
- Estado activo: background `primary-50`, borde izquierdo `3px solid primary-500`, texto `primary-700`.
- Items con sub-menú: la flecha rota 90° al expandir, animación `transition-slow`.
- Sub-items visibles solo cuando el item padre está activo o expandido manualmente.
- En modo colapsado: solo iconos de 20px centrados. Tooltip con label al hacer hover.

---

### Zona 2: Header

**Dimensiones:** 100% del área derecha. Altura: 56px. Posición: sticky top.

**Estructura:**

```
┌──────────────────────────────────────────────────────────────────┐
│  [Breadcrumb]                  [Notifs]  [Help]  [Avatar menu]   │
│  Dashboard                       🔔(3)    ?       [AB] ▾        │
└──────────────────────────────────────────────────────────────────┘
```

**Zona izquierda (breadcrumb):**
- Ruta actual de navegación. Ej: "Entradas / Añadir nueva".
- En dashboard home: solo "Dashboard".
- El último elemento es el título de la página actual (no clickable). Los anteriores son links.

**Zona derecha (acciones globales):**
- **Icono notificaciones:** campana con badge numérico (rojo si hay pendientes urgentes). Al hacer clic: dropdown con últimas 5 notificaciones (comentarios pendientes, actualizaciones de plugins, alertas de sistema). Link "Ver todas".
- **Icono ayuda:** abre documentation sidebar o enlaza a docs externas.
- **Avatar menu:** iniciales del usuario en círculo `primary-500`. Dropdown al hacer clic: "Mi perfil", "Ver sitio" (abre front en nueva pestaña), "Cerrar sesión". Separador antes de "Cerrar sesión".

---

### Zona 3: Content Area

**Dimensiones:** Fluida. Padding: `space-8` (32px) en desktop, `space-6` (24px) en tablet.

**Comportamiento:** Hace scroll de forma independiente al sidebar y header. Scroll solo vertical.

**Estructura interna estándar de cualquier página:**

```
[Page Header]
  Título de la sección                [CTA principal]
  Descripción breve opcional

[Content]
  (varía según la página)
```

El Page Header NO es el mismo que el Header global. Es una sub-zona dentro del Content Area con el título de la sección y las acciones principales de esa página.

---

## 2. Dashboard Home

### Descripción General

El dashboard es la primera pantalla que ve el usuario al entrar. Objetivo: visión rápida del estado del sitio y accesos directos a las acciones más frecuentes. No es un panel de analítica avanzada — es un resumen ejecutivo.

### Layout del Dashboard (estado con datos)

```
[Page Header]
  "Bienvenido, [nombre]"              [+ Nueva entrada]
  Hoy es [fecha larga]

[Stats Row — 4 widgets en grid 4 columnas]
  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
  │Entradas  │ │Páginas   │ │Comentarios│ │Medios   │
  │ publ.    │ │ publ.    │ │ pendientes│ │         │
  │          │ │          │ │           │ │         │
  │  [142]   │ │  [38]    │ │   [7]     │ │ [2.3GB] │
  │▲ +3 hoy  │ │ sin cambio│ │ ⚠ revisar│ │ de 5GB  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘

[Contenido Principal — grid 2 columnas, ratio 2:1]

[Columna principal — 2/3]                [Columna lateral — 1/3]

[Entradas recientes]                     [Acciones rápidas]
  Tabla de últimas 5 entradas:             ┌─────────────────┐
  Título | Estado | Autor | Fecha          │ + Nueva entrada │
  [...] | Publicado | Admin | hace 2h      │ + Nueva página  │
  [...] | Borrador  | María | hace 1d      │ + Subir medios  │
  [...] | Publicado | Admin | hace 3d      │ Ver comentarios │
  [Ver todas las entradas →]              └─────────────────┘

[Actividad reciente]                     [Estado del sistema]
  Feed cronológico:                        Plugin: Yoast SEO
  🟢 Entrada publicada "Título..."         Versión: 21.4 ✓
  🔵 Comentario aprobado en "..."          Tema activo: Twenty25
  🔴 Plugin desactivado "..."              PHP: 8.3 ✓
  🟡 Usuario registrado "Ana García"       NodePress: 1.0.0
  [Ver toda la actividad →]              [Ver estado detallado →]
```

---

### Widgets de Stats (detalle)

Cada widget de stat es una card con:

**Estructura interna:**
```
┌─────────────────────────────────┐
│  [Icono 20px]  [Label de métrica]     [Menú ⋯]  │
│                                                   │
│  [Valor principal — font-size-3xl bold]           │
│                                                   │
│  [Delta]  Texto comparativo                       │
└─────────────────────────────────────────────────┘
```

- **Icono:** 20px, color `neutral-400` en reposo.
- **Label:** `font-size-xs`, `font-weight-medium`, `color neutral-500`, `letter-spacing-wide`.
- **Valor principal:** `font-size-3xl`, `font-weight-bold`, `color neutral-800`.
- **Delta:** flecha ↑ o ↓ de color `success-500` o `danger-500`. Texto `font-size-sm neutral-500`.
- **Menú contextual (⋯):** opciones "Ver detalle", "Exportar". Visible solo en hover de la card.
- **Card:** `shadow-sm`, border `neutral-200`, border-radius `radius-lg`. En hover: `shadow-md`, transición `transition-base`.

**Los 4 widgets (v1):**
1. **Entradas publicadas** — icono documento. Delta: entradas nuevas hoy.
2. **Páginas publicadas** — icono página. Delta: sin cambio si no hay actividad.
3. **Comentarios pendientes** — icono comentario. Si >0: valor en `warning-700`, delta en rojo si aumentó.
4. **Espacio de medios** — icono imagen. Valor: uso actual / total en GB. Delta: barra de progreso secundaria.

---

### Tabla de Entradas Recientes (detalle)

- Últimas 5 entradas por fecha de modificación.
- Columnas: Título (link) | Estado (badge) | Autor (avatar + nombre) | Fecha (relativa: "hace 2h").
- Badge de estado: "Publicado" (`secondary-100` background, `secondary-700` text), "Borrador" (`neutral-200` bg, `neutral-600` text), "Programado" (`primary-100` bg, `primary-700` text), "Papelera" (`danger-100` bg, `danger-700` text).
- Hover de fila: background `neutral-50`.
- Clic en título: va a edición de esa entrada.
- Footer de la tabla: link "Ver todas las entradas →" alineado a la derecha.
- Sin bordes entre celdas. Solo separadores horizontales `neutral-200` de 1px.

---

### Feed de Actividad Reciente (detalle)

- Lista cronológica inversa. Máx 8 eventos visibles.
- Cada evento: icono de tipo (colored dot 8px) + descripción + fecha relativa.
- Tipos de evento y colores:
  - Entrada publicada: `success-500`
  - Entrada editada: `primary-400`
  - Comentario recibido: `info-500`
  - Comentario aprobado: `success-500`
  - Comentario spam: `neutral-400`
  - Plugin activado/desactivado: `warning-500`
  - Usuario registrado: `secondary-400`
  - Error del sistema: `danger-500`
- La descripción incluye link al elemento relacionado si aplica.
- Footer: "Ver toda la actividad →"

---

### Panel de Acciones Rápidas (detalle)

- Card vertical con 4 botones apilados.
- Cada botón: ancho completo, alineación izquierda, icono + label. Estilo "ghost" (border `neutral-300`, background transparente, hover `neutral-100`).
- El primer botón ("+ Nueva entrada") tiene estilo primario (background `primary-500`, texto blanco).
- Separador horizontal entre el botón primario y los siguientes.

---

### Panel de Estado del Sistema (detalle)

- Card con lista de checks del sistema.
- Cada check: label + valor + indicador (✓ verde, ⚠ amarillo, ✗ rojo).
- Items: plugins activos con updates disponibles, tema activo, versión de PHP/Node, versión de NodePress.
- Si hay updates disponibles: el item se muestra en `warning-500` con link "Actualizar".
- Footer: "Ver estado detallado →" (enlaza a Herramientas > Estado del sistema).

---

## 3. Estados del Dashboard

### Estado: Cargando (Loading)

El dashboard usa **skeleton loaders** que replican exactamente el layout del estado con datos. No hay spinner global bloqueante.

**Comportamiento por zona:**

```
[Page Header skeleton]
  Rectángulo 200px × 28px gris — título
  Rectángulo 300px × 16px gris — subtítulo
  Botón skeleton 120px × 36px — CTA

[Stats Row skeleton]
  4 cards con:
  - Rectángulo icono 20px × 20px
  - Rectángulo label 80px × 12px
  - Rectángulo valor 60px × 36px
  - Rectángulo delta 120px × 14px

[Tabla skeleton]
  5 filas con:
  - Rectángulo título 250px × 14px
  - Rectángulo badge 70px × 20px
  - Círculo avatar 24px + rectángulo 80px
  - Rectángulo fecha 60px × 14px

[Feed skeleton]
  8 filas con:
  - Círculo dot 8px + rectángulo descripción 200px + rectángulo fecha 50px
```

**Animación skeleton:** gradiente animado de `neutral-100` a `neutral-200` con duración `1.5s`, timing `ease-in-out`, infinito. Respeta `prefers-reduced-motion` (sin animación si activo, solo color sólido `neutral-100`).

**Timing:** Si los datos cargan en menos de 400ms, los skeletons no deben mostrarse (evitar flash). Se implementa con un delay de 400ms antes de mostrar el skeleton. Si los datos llegaron antes, se omite.

---

### Estado: Vacío (Empty)

Aparece cuando el sitio es nuevo y no tiene contenido aún. Prioridad UX: guiar al usuario a crear su primer contenido.

**Layout del estado vacío:**

```
[Page Header]
  "Bienvenido a NodePress, [nombre]"      [+ Nueva entrada]
  Tu sitio está listo para empezar.

[Stats Row]
  4 widgets con valor "0" o "—". Sin delta. Sin estado de error.
  Sin borde de warning en comentarios (0 no es urgente).

[Empty State Central — reemplaza la tabla y el feed]
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │          [Ilustración simple — 120px]               │
  │                                                     │
  │      "Aún no has publicado nada"                    │
  │   Tu sitio está en blanco — una hoja en blanco      │
  │    es el mejor lugar para empezar.                  │
  │                                                     │
  │         [+ Crear mi primera entrada]                │
  │         [Importar desde WordPress]                  │
  │                                                     │
  └─────────────────────────────────────────────────────┘

[Panel de acciones rápidas — permanece visible]
[Panel de estado del sistema — permanece visible]
```

**Especificaciones del empty state:**
- Ilustración: SVG simple, no un stock illustration. Estilo line art, colores `primary-200` y `secondary-200`.
- Título: `font-size-xl`, `font-weight-semibold`, `neutral-800`.
- Descripción: `font-size-base`, `neutral-500`, máx 2 líneas.
- CTA principal: botón `primary-500` con icono `+`. Full-width del contenedor no — max 280px, centrado.
- CTA secundario: botón ghost debajo del principal. "Importar desde WordPress" (flujo de importación, v2 pero el botón se muestra en v1).
- Espaciado vertical del empty state: `space-20` (80px) arriba y abajo dentro del panel.

---

### Estado: Error

Distinguir entre **errores de red** (no se pudo cargar el dashboard) y **errores parciales** (un widget falló, el resto carga bien).

#### Error Total (no se pudo cargar el dashboard)

```
[Page Header]
  "Dashboard"                              [Reintentar]

[Error State Central]
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │     [Icono de error — 48px, danger-400]             │
  │                                                     │
  │    "No se pudo cargar el dashboard"                 │
  │  Hubo un problema al conectar con el servidor.      │
  │         Comprueba tu conexión e inténtalo.          │
  │                                                     │
  │              [Reintentar]                           │
  │         Ver diagnóstico del sistema                 │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

- Icono: X dentro de círculo. Color `danger-400`.
- Título: `font-size-xl`, `font-weight-semibold`, `neutral-800`. NO en rojo — el color de error ya está en el icono.
- Descripción: `font-size-base`, `neutral-500`. Mensaje claro, sin jerga técnica.
- CTA principal: "Reintentar" — botón `primary-500`. Al hacer clic: vuelve al estado loading.
- Link secundario: "Ver diagnóstico del sistema" — link texto, `primary-600`. Enlaza a la página de estado.
- El sidebar permanece visible — el usuario puede navegar a otras secciones.

#### Error Parcial (widget individual falla)

Cada widget con error muestra un error inline dentro de su card:

```
┌────────────────────────────────┐
│  [Icono]  Entradas publicadas  │
│                                │
│  ⚠ No se pudo cargar           │
│    [Reintentar]                │
└────────────────────────────────┘
```

- El error no ocupa toda la pantalla — solo afecta al widget fallido.
- Icono triangular de warning `warning-500` de 16px.
- Texto: `font-size-sm`, `neutral-500`.
- Link "Reintentar": `font-size-sm`, `primary-600`, sin decoración de link en reposo, subrayado en hover.
- Los demás widgets cargan normalmente.

---

## 4. Comportamiento Responsive

### Desktop (≥ 1280px)

Layout estándar descrito arriba. Sidebar expandido por defecto.

### Tablet (768px – 1279px)

- Sidebar colapsado por defecto (solo iconos, 60px).
- Stats row: 2 columnas en lugar de 4.
- Grid principal: 1 columna (la columna lateral baja debajo del contenido principal).
- Header: se elimina el breadcrumb, se conservan las acciones.

### Mobile (< 768px)

v1 es admin-first desktop. En mobile:
- Sidebar: drawer con overlay al activar hamburger menu en el header.
- Stats row: 1 columna (4 cards apiladas).
- Tabla de entradas: columnas reducidas (Título + Estado). El resto en sub-fila expandible.
- Feed de actividad: oculto por defecto, detrás de "Ver actividad" toggle.

**Nota:** La experiencia mobile es funcional pero no optimizada en v1. Roadmap v2 incluye mobile-first admin.

---

## 5. Interacciones y Microinteracciones

### Navigation

- Al hacer clic en un item de nav: el sidebar item cambia a estado activo inmediatamente (optimistic UI). El contenido del área principal hace fade-in con `opacity: 0 → 1`, duración `transition-enter`.
- Si la página tarda en cargar: el skeleton aparece después de 400ms.

### Cards de Stats

- Hover: la card eleva su sombra de `shadow-sm` a `shadow-md`. El menú contextual (⋯) aparece. Duración: `transition-base`.
- El valor numérico no tiene animación de contador (v1). Futuro: animación de count-up en el primer load.

### Tabla de Entradas

- Hover de fila: background `neutral-50`. Transición `transition-fast`.
- Aparece un set de acciones inline en hover: Editar | Ver | Papelera. Estos se revelan a la derecha del título. Desplazan la fecha al aparecer.

### Notificaciones

- Al abrir el dropdown de notificaciones: las notificaciones no leídas tienen punto `primary-500` a la izquierda. Al abrir el dropdown, las no leídas se marcan como leídas y el badge del header desaparece después de 2 segundos.
- El dropdown tiene animación de entrada `translateY(-8px) → 0` + `opacity 0 → 1`, duración `transition-enter`.

---

## Notas para el Equipo

- Este documento es la spec de comportamiento. Los diseños visuales exactos (si se hacen en Figma) son complementarios, no contradictorios.
- Cualquier componente de esta pantalla sin los tres estados (vacío, loading, error) definidos NO se considera implementable.
- Preguntas de UX o edge cases que surjan durante la implementación: pasan por Sofía antes de tomar decisiones autónomas de diseño.
- La columna de acciones inline en tabla (hover) es una interacción que Lucas y Sofía deben validar juntos antes de implementar — puede ser conflictiva con touch devices.
