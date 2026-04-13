# NodePress — Licensing Decision

> Status: DECIDED | Owner: Alejandro (CEO) | Date: 2026-04-09

---

## Current State

`package.json` declares **GPL-3.0-or-later**.

Rationale at the time: coherencia con WordPress (que usa GPL-2.0-or-later). Romana lo puso durante el scaffolding inicial. La decisión no fue estratégica — fue por defecto.

El repo **no es público todavía**. Tenemos margen para decidir antes de que haya contribuidores externos y antes de que la licencia quede grabada en la historia pública del proyecto.

---

## Options Evaluated

### 1. GPL-3.0 puro — "El camino WordPress"

WordPress usa GPL-2.0-or-later. Nosotros tenemos GPL-3.0-or-later (más restrictiva).

**Pros:**

- Coherencia total con el ecosistema WordPress
- La comunidad WP entiende y respeta la GPL
- Fuerza que los derivados sean open source — protege el proyecto de apropiaciones

**Contras:**

- Todo derivado (plugins, temas, integraciones) hereda la GPL
- Imposible vender plugins premium con código cerrado bajo este modelo
- El plugin-server (Tier 3 Future) — nuestro producto de pago potencial — no puede ser propietario si está construido sobre el core GPL
- Grandes empresas evitan GPL en stacks propietarios

**Veredicto:** Cierra la puerta a monetización por plugins premium y SaaS propietario. No sirve a nuestro modelo.

---

### 2. MIT — "Máxima libertad"

**Pros:**

- Cualquier empresa puede usar NodePress sin restricción
- Atrae a más adoptadores corporativos
- Sin fricción legal para integraciones

**Contras:**

- AWS, Automattic o cualquier cloud podría lanzar "NodePress managed" sin devolver nada
- Pierde el espíritu de comunidad que tiene WP
- No diferencia entre comunidad y competidores directos
- Sin CLA requerido, pero tampoco necesitas uno — no hay nada que proteger

**Veredicto:** Demasiado generosa. Nos deja expuestos a que terceros moneticen el proyecto mejor que nosotros.

---

### 3. Dual License — GPL + Commercial

Modelo: MySQL (Oracle), Qt (The Qt Company), GitLab (EE vs CE), Metabase.

- **Tier comunidad:** core bajo GPL → cualquier dev o agencia puede usar, modificar, contribuir
- **Tier comercial:** licencia propietaria para empresas que necesiten usarlo en productos cerrados o quieran el plugin-server

**Pros:**

- Monetización clara: las empresas que no quieren GPL pagan
- Comunidad mantiene el free tier con la seguridad de que el core no desaparece
- El plugin-server (Tier 3) puede existir como producto propietario bajo la licencia comercial
- Modelo probado en el mercado de infraestructura de software

**Contras:**

- Requiere **CLA (Contributor License Agreement)** para recibir contribuciones externas — sin CLA, no podemos re-licenciar las contribuciones de la comunidad bajo la licencia comercial
- Añade fricción al onboarding de contribuidores (pequeño pero real)
- Gestión legal más compleja: hay que mantener dos licencias
- La comunidad puede percibir el modelo como "open core" y desconfiar si el roadmap comercial domina

**Veredicto:** El modelo correcto para nuestro ICP y nuestro roadmap. Requiere disciplina en la gestión del CLA.

---

### 4. AGPL-3.0 — "GPL para el mundo SaaS"

Usado por MongoDB (hasta que cambió a SSPL), Nextcloud, Mastodon.

**Pros:**

- Fuerza open source incluso en despliegues SaaS — el "loophole" de la GPL (usar el software como servicio sin distribuir binarios) se cierra
- Protege el proyecto de que un cloud lo monetice sin contribuir

**Contras:**

- Asusta a empresas, especialmente a las que tienen políticas internas contra AGPL
- Las agencias (nuestro ICP) pueden tener clientes con restricciones sobre AGPL
- No resuelve el problema del plugin-server propietario — seguimos necesitando dual license si queremos producto cerrado

**Veredicto:** Más restrictiva que necesaria para nuestro ICP actual (agencias/devs). No resuelve el problema de monetización del plugin-server.

---

### 5. BSL (Business Source License) — "Open source con delay"

Usado por MariaDB, Sentry, HashiCorp (hasta que cambió a BSL), CockroachDB.

El código es "source available" con restricciones comerciales durante N años, luego pasa a ser open source.

**Pros:**

- Protección comercial real durante el periodo de growth
- Eventualmente se convierte en open source — hay un "contrato social" con la comunidad

**Contras:**

- No es open source según la OSI — daña la credibilidad ante la comunidad developer
- El ecosistema WordPress es profundamente open source — adoptar BSL nos aleja del ICP que queremos conquistar
- Más complejo de gestionar: hay que definir el "Change Date" y la "Additional Use Grant"
- La comunidad de agencias WP es escéptica con modelos BSL tras el drama de HashiCorp/Terraform

**Veredicto:** Descartado. Incompatible con el posicionamiento "open, moderno, para la comunidad WP".

---

## Recommendation

**Dual License (GPL-3.0 + Commercial) con CLA desde el primer commit público.**

Justificación basada en el modelo de negocio:

1. **ICP son agencias y devs** — la GPL es la licencia que entienden y confían. Usarla para el core genera credibilidad
2. **Plugin-server es el producto de pago** (Tier 3 Future) — necesita poder ser propietario. Solo el modelo dual lo permite
3. **El momento es ahora** — el repo no es público. Si esperamos a tener contribuidores externos y no tenemos CLA, quedamos bloqueados para re-licenciar
4. **Precedentes sólidos** — MySQL, Qt, GitLab CE/EE son referencias que el mercado enterprise entiende. No estamos inventando nada

---

## Decision

**NodePress adoptará Dual License: GPL-3.0-or-later (community) + NodePress Commercial License (enterprise/propietario).**

- El `package.json` permanece con `GPL-3.0-or-later` — es correcto para el tier comunidad
- Antes de hacer el repo público, se añade `LICENSE.md` con el texto GPL y `COMMERCIAL-LICENSE.md` con los términos comerciales (TBD con asesoría legal)
- Se implementa CLA mediante CLA Assistant (GitHub App) antes de aceptar el primer PR externo
- El plugin-server, cuando entre en roadmap activo, se desarrollará bajo un repo separado con licencia comercial

---

## Next Steps

### ¿Necesitamos CLA?

**Sí, y antes de que el repo sea público.**

Sin CLA, cualquier contribución externa queda bajo GPL y no podemos re-licenciarla comercialmente. El CLA transfiere al proyecto el derecho de relicenciar las contribuciones bajo otros términos.

**Acción:** Configurar [CLA Assistant](https://cla-assistant.io/) en el repo de GitHub antes de hacer el repositorio público. Es gratuito para open source.

### ¿Cambiamos `package.json` ahora?

**No cambiamos el campo `license`.** `GPL-3.0-or-later` sigue siendo correcto — es la licencia del tier comunidad.

Lo que SÍ hay que hacer antes de hacer el repo público:

- [ ] Añadir `LICENSE` (texto GPL-3.0)
- [ ] Añadir `COMMERCIAL-LICENSE.md` (placeholder hasta asesoría legal)
- [ ] Añadir `CONTRIBUTING.md` con referencia al CLA
- [ ] Configurar CLA Assistant en GitHub
- [ ] Revisar con asesoría legal los términos de la licencia comercial (Sprint 0 o Sprint 1)

### Timeline sugerido

| Acción                                   | Responsable       | Cuando                |
| ---------------------------------------- | ----------------- | --------------------- |
| Configurar CLA Assistant                 | DevOps / Román    | Antes de repo público |
| Redactar `COMMERCIAL-LICENSE.md` (draft) | Alejandro + Legal | Sprint 0              |
| Revisar con asesoría legal               | Alejandro         | Sprint 1              |
| Publicar repo                            | Todo el equipo    | Tras Sprint 0         |

---

_Decisión tomada por Alejandro (CEO) en meet del 2026-04-09. Próxima revisión si hay inversión externa o cambio de ICP._
