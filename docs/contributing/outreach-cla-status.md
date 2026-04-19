# CLA Outreach Status

**Fecha:** 2026-04-19
**Responsable:** Helena (IT) + Martín (Ops)

---

## Estado

| Item                    | Estado    | Bloqueador                   |
| ----------------------- | --------- | ---------------------------- |
| GitHub App instalada    | PENDIENTE | Org Admin access (Alejandro) |
| `.clabot` configurado   | LISTO     | —                            |
| `CLA.md` en repo        | LISTO     | —                            |
| Webhook activo          | PENDIENTE | Depende de App instalada     |
| Primer PR con CLA check | PENDIENTE | Depende de webhook           |

---

## Acción bloqueante

**R-S5-1:** Alejandro confirma Org Admin access antes de 2026-06-16 AM (kickoff Sprint 6).

Sin este acceso, la GitHub App no se puede instalar y el webhook no se puede configurar.
Todos los artefactos técnicos (`.clabot`, `CLA.md`, guía de setup) están listos en `main`.

---

## Plan de activación (cuando R-S5-1 se resuelva)

1. Helena instala CLA Assistant GitHub App en `netoya/nodepress` (< 5 min)
2. Verificar que `.clabot` ya está en `main` — no requiere cambios
3. Confirmar webhook en `github.com/netoya/nodepress/settings/hooks`
4. Abrir un PR de test → verificar que CLA check aparece y funciona
5. Cerrar ticket #80

**Tiempo estimado de activación:** < 15 min una vez que el acceso esté disponible.

Referencia detallada: [`docs/contributing/cla-setup.md`](cla-setup.md)

---

## Historial

| Fecha      | Acción                                              | Por             |
| ---------- | --------------------------------------------------- | --------------- |
| 2026-04-19 | `.clabot` + `CLA.md` + guía setup creados en `main` | Helena          |
| 2026-04-19 | Ticket #80 en espera de R-S5-1 (Alejandro)          | Helena + Martín |
