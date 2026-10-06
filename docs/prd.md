# ReleaseView — PRD

> **Este documento manda sobre el *qué*: qué construimos, en qué orden, y qué significa
> «terminado».** El *cómo* técnico vive en `docs/arquitectura/` (un documento por tema) y no se decide acá.
>
> **Última revisión:** `2026-09-15`

---

## 1. Qué es ReleaseView

**ReleaseView es un panel interno que centraliza, cliente por cliente, qué versión y qué features tiene activos cada instalación de un producto SaaS o agente de IA.**

- **Para quién:** PM, Product Owner o líder técnico en una consultora de IT o empresa de software que gestiona un producto desplegado en múltiples clientes con versiones y features divergentes.
- **Qué promete:** pasar de "te confirmo después" cuando un cliente pregunta por su estado, y de perder 1-2 horas cruzando herramientas antes de cada release, a responder en el momento y armar la lista de despliegue en minutos.
- **Qué problema resuelve:** la información de versión/features por cliente vive dispersa entre Azure DevOps/Jira y la memoria del líder técnico — nadie más puede responder rápido sin reconstruirla a mano.

## 2. El MVP — un recorrido completo, no una lista de features

```
Cargar un cliente con su versión activa y sus features habilitados
  → Consultar el estado de ese cliente (o de un feature: qué clientes lo tienen y cuáles no)
  → Generar la lista de "qué cliente recibe qué" para el próximo release
```

Si eso corre de punta a punta **una vez** — con datos cargados a mano, sin integración automática ni login individual todavía — el MVP está probado.

## 3. Milestones (en orden)

### M1 — Carga y consulta por cliente

**Objetivo:** poder dar de alta un cliente con su versión y features, y consultar su estado de un vistazo.
**Por qué primero:** sin datos cargados y una vista básica, no hay nada que consultar ni lista que armar después.

**Está terminado cuando:**
- [x] Se puede dar de alta un cliente con su versión activa y la lista de features habilitados.
- [x] Se puede editar esos datos cuando cambian.
- [x] Se puede ver, para un cliente elegido, su versión activa y sus features de un vistazo.
- [x] Cada vez que la versión de un cliente cambia (incluida la primera carga), queda guardada con fecha — no se pierde el valor anterior — y se puede ver ese historial de versiones para el cliente.

### M2 — Consulta por feature

**Objetivo:** responder "¿qué clientes todavía no tienen el feature X?".
**Por qué segundo:** usa los mismos datos de M1 desde el otro ángulo — resuelve la segunda pregunta de negocio del ICP.

**Está terminado cuando:**
- [ ] Se puede elegir un feature y ver qué clientes lo tienen activo y cuáles no.

### M3 — Lista de despliegue para un release

**Objetivo:** armar en minutos la lista de "qué cliente recibe qué" antes de un release real.
**Por qué tercero:** cierra el recorrido completo — es el momento de mayor dolor (el día de release) y necesita los datos ya cargados y consultables de M1/M2.

**Está terminado cuando:**
- [ ] Se puede filtrar los clientes que corresponden a la próxima versión o feature a desplegar.
- [ ] Esa lista se puede ver u exportar lista para compartir con el equipo.

## 4. Riesgos, con su límite aceptado

| # | Riesgo | Hasta dónde se tolera / qué se hace al cruzarlo |
|---|---|---|
| 1 | La carga manual queda desactualizada si nadie la mantiene | Se tolera mientras sea la única fuente en un release real y funcione; si en un release los datos manuales fallan o quedan viejos, se prioriza la integración automática con Azure DevOps/Jira (fuera del MVP, ver §5). Cadencia real confirmada: versión/features cambian cada ~2 semanas, en el peor caso cada sprint de 1 semana — carga manual a ese ritmo se considera manejable |
| 2 | Acceso compartido sin login individual — no queda registro de quién cargó o cambió qué | Se tolera mientras el equipo que usa el panel sea chico (vos + líder técnico); si se suma más gente y hace falta trazabilidad, se agrega login y permisos por rol |
| 3 | La carga inicial de datos no queda completa o correcta | Se acompaña la carga inicial; si después de M3 los datos siguen desactualizados en 2 releases seguidos, se replantea el flujo de carga antes de sumar más milestones |

## 5. Fuera de alcance

- Integración automática con Azure DevOps/Jira (ver riesgo #1 — se suma en un milestone posterior si la carga manual no aguanta).
- Login individual y permisos por rol.
- Notificaciones automáticas a clientes sobre su estado o próximos despliegues.
- Historial operativo completo de despliegues (quién lo hizo, notas de release, tickets asociados) — el MVP guarda automáticamente el cambio de versión con fecha (ver M1), pero no un registro de despliegue detallado.
- Soporte para otras herramientas de tracking distintas de Azure DevOps/Jira.
- SLA formal de soporte técnico.

## 6. Preguntas abiertas

Ninguna por ahora — las dos preguntas que quedaban (cadencia de cambios y necesidad de histórico)
se cerraron el 2026-09-16 (ver `DECISIONS.md`) y ya están reflejadas en M1 y en §5.

## 7. El cómo técnico

- **Stack, deploy y costo:** [`docs/arquitectura/stack.md`](arquitectura/stack.md) — Next.js + Supabase (Postgres) en Vercel, ~$0/mes en esta etapa.
- **Modelo de datos:** [`docs/arquitectura/modelo-de-datos.md`](arquitectura/modelo-de-datos.md) — Cliente / Feature / Cliente↔Feature, aislados por organización desde el día 1.
- **Secretos:** [`docs/arquitectura/secretos.md`](arquitectura/secretos.md)
- **Recorrido del usuario:** [`docs/arquitectura/user-flow.md`](arquitectura/user-flow.md)
- **Marca:** [`docs/arquitectura/marca.md`](arquitectura/marca.md)
- **Autenticación y permisos:** [`docs/arquitectura/auth-y-permisos.md`](arquitectura/auth-y-permisos.md) — portón compartido (una contraseña), sin cuentas individuales.
- **Integraciones IA / otros sistemas:** no aplica en el MVP — ver `docs/arquitectura/README.md`.

## 8. La regla de gestión

> **El alcance se achica quitando features (que quedan visibles en §5), nunca bajando la vara de
> «terminado».** Un milestone con condiciones recortadas parece cerrado y no lo está: la deuda
> queda escondida en un checkbox tildado.

Si algo se posterga, se anota con milestone destino y dueño, y el porqué va a
[`DECISIONS.md`](../DECISIONS.md). Lo que toque la regla #1 de la
[constitución](sdd/constitucion.md) (datos de usuarios) no se posterga nunca.
