## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **php-wasm preferido sobre php-fpm:** Sandbox WASM, sin segundo proceso, +70MB vs +400MB Docker. **Date:** 2026-04-09
- **Extensiones PHP en WASM:** Parciales (mbstring parcial, curl no, gd/imagick no). Matriz a documentar en Sprint 1. **Date:** 2026-04-09
- **Acción Helena:** Elaborar matriz de extensiones PHP disponibles en php-wasm. Sprint 1, paralelo al spike. **Date:** 2026-04-09
- **Condición:** ADR-003 con limitaciones documentadas antes de cualquier compromiso público de compatibilidad PHP. **Date:** 2026-04-09
- **CVE dual-stack:** Si PHP entra, necesita pipeline de seguridad separado. **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server aceptado como Tier 3 Future.** No en desarrollo activo. **Date:** 2026-04-09
- **5 servicios en prod requieren K8s.** DR con dos DBs necesita snapshots coordinados. **Date:** 2026-04-09
- **Coste infra:** +70-120€/mes base sobre stack actual. **Date:** 2026-04-09
- **4 condiciones pre-requisito (no negociables):** ADR nuevo, threat model, DR coordinado, CVE pipeline PHP. **Date:** 2026-04-09
