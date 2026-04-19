# CLA Assistant Setup Guide

## Estado

| Componente            | Estado                      | Bloqueador                            |
| --------------------- | --------------------------- | ------------------------------------- |
| GitHub App instalada  | PENDIENTE                   | Org Admin access (Alejandro — R-S5-1) |
| Webhook activo        | PENDIENTE                   | Depende de App instalada              |
| `.clabot` configurado | LISTO                       | —                                     |
| `CLA.md` en repo      | LISTO                       | —                                     |
| Fecha objetivo        | 2026-06-16 kickoff Sprint 6 | R-S5-1 resuelto                       |

---

## Prerequisitos

- [ ] Org Admin access confirmado (Alejandro — acción R-S5-1, deadline kickoff Sprint 6 2026-06-16)
- [ ] Repositorio `github.com/netoya/nodepress` (ya existe)
- [ ] `.clabot` en rama `main` (ya presente — apunta a `CLA.md`)
- [ ] `CLA.md` en rama `main` (ya presente)

---

## Pasos de instalación (cuando el acceso esté disponible)

### 1. Instalar CLA Assistant GitHub App

1. Navegar a <https://github.com/apps/cla-assistant>
2. Hacer clic en **Install**
3. Seleccionar la organización **netoya**
4. En "Repository access", seleccionar **Only select repositories** → elegir `nodepress`
5. Confirmar la instalación

Tiempo estimado: 2–3 minutos.

> Nota: si la App ya estaba instalada a nivel de org de un sprint anterior, ir a **Settings → GitHub Apps → CLA Assistant → Configure** y verificar que `nodepress` está en la lista de repos permitidos.

### 2. Verificar `.clabot`

El archivo `.clabot` ya está en la raíz del repositorio con el siguiente contenido:

```json
{
  "path": "https://raw.githubusercontent.com/netoya/nodepress/main/CLA.md"
}
```

No requiere cambios. CLA Assistant lo detecta automáticamente al instalarse.

### 3. Configurar el documento CLA en CLA Assistant (opcional — interfaz web)

CLA Assistant también permite apuntar al documento desde su panel en <https://cla-assistant.io>:

1. Ir a <https://cla-assistant.io> e iniciar sesión con GitHub
2. En el dashboard, seleccionar **netoya/nodepress**
3. En el campo "CLA document URL", introducir:
   `https://raw.githubusercontent.com/netoya/nodepress/main/CLA.md`
4. Guardar

> Nota: si `.clabot` ya está presente, este paso es redundante. El archivo tiene prioridad.

### 4. Verificar webhook

Una vez instalada la App, CLA Assistant registra automáticamente un webhook en el repositorio.

Para verificarlo:

1. Ir a `github.com/netoya/nodepress/settings/hooks`
2. Confirmar que aparece un webhook con URL `https://cla-assistant.io/webhooks/pull_request`
3. El evento configurado debe ser `pull_request`

### 5. Test de verificación end-to-end

1. Crear una rama de test: `git checkout -b test/cla-check`
2. Hacer cualquier cambio mínimo (ej: añadir una línea en blanco a `README.md`)
3. Abrir un PR contra `main`
4. Verificar que CLA Assistant comenta automáticamente en el PR solicitando firma
5. Firmar el CLA siguiendo el enlace del comentario
6. Verificar que el status check `cla/cla-assistant` cambia a verde
7. Cerrar el PR de test sin merge

Tiempo estimado: 5 minutos.

---

## Documento CLA

- **Ruta en repo:** `CLA.md` (raíz)
- **URL raw (usada por `.clabot`):** `https://raw.githubusercontent.com/netoya/nodepress/main/CLA.md`
- **Versión actual:** 1.0 (2026-04-19)
- **Tipo:** Individual CLA — dual-license (GPL-3.0-or-later + Commercial)

Si el texto del CLA necesita actualizarse, editar `CLA.md` directamente en `main`. CLA Assistant lee el documento en tiempo real desde la URL raw — no requiere reconfiguración.

---

## Soporte

**Helena (IT Manager)** — responsable de la activación técnica.
Disponible para ejecutar los pasos de instalación en menos de 15 minutos una vez que Alejandro confirme el Org Admin access (R-S5-1).

Para escalada o preguntas sobre el contenido legal del CLA: abrir issue con label `cla-question`.
