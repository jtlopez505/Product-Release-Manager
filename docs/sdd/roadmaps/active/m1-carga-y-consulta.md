# M1 · Carga y consulta por cliente — plan

## 1. Qué logramos con este milestone

Se puede dar de alta un cliente con su versión y sus features, editarlo cuando cambia, y ver su
estado de un vistazo — incluido el historial de cada cambio de versión con fecha, desde la
primera carga. Es la base de la que dependen M2 (consulta por feature) y M3 (lista de release).

## 2. Qué queda afuera

Ya está en `docs/prd.md` §5: integración automática con Azure DevOps/Jira, login individual y
permisos por rol, notificaciones, historial operativo completo de despliegues (solo se guarda
versión + fecha, ver M1-04). Además, específico de este plan:

- El deploy real a producción (Vercel) — eso es `/deploy`, con el owner dando el OK. Acá el
  Programador prueba localmente (`npm run dev`) y el owner lo ve andar ahí primero.
- Consulta por feature (M2) y la lista de release (M3) — usan lo que este milestone deja armado,
  pero se planifican aparte.

## 3. Preguntas y riesgos

**Resuelta antes de planear:** el owner todavía no tiene cuenta/proyecto en Supabase — M1-01
incluye crearlo como parte de la pieza, no asume que ya existe.

**Riesgos** (heredados del PRD, ver `docs/prd.md` §4, con su límite ya definido ahí):
- Riesgo #1 (carga manual desactualizada) y #3 (carga inicial incompleta) — sin cambios, se
  toleran según lo que ya dice el PRD.

Sin preguntas abiertas que bloqueen: la arquitectura (`docs/arquitectura/`) ya resuelve stack,
modelo de datos, auth y recorrido — este plan solo los parte en piezas.

## 4. Reglas del proyecto que toca este milestone

- **#1** — todo lo que se guarda (clientes, features, historial) queda etiquetado por
  organización desde la primera pieza, aunque el MVP tenga una sola (`modelo-de-datos.md`).
- **#2** — `DATABASE_URL`, `APP_PASSWORD` y `SESSION_SECRET` salen de variables de entorno desde
  M1-01, nunca del código (`secretos.md`).
- **#5** — siempre: cada pieza cierra con sus 3 verificaciones en verde.

## 5. Las piezas de trabajo (ESTA TABLA ES EL ESTADO)

| ID | Pieza | Estado | Depende de | Ficha |
|---|---|---|---|---|
| M1-01 | Base del proyecto: Next.js + Supabase + Prisma, corriendo en local | ✅ terminada | — | `docs/sdd/specs/M1-01-base-del-proyecto.md` |
| M1-02 | Portón de acceso: contraseña compartida + sesión | ⬜ pendiente | M1-01 | `docs/sdd/specs/M1-02-porton-de-acceso.md` |
| M1-03 | Lista maestra de features (crear, ver, editar) | ⬜ pendiente | M1-01, M1-02 | `docs/sdd/specs/M1-03-lista-maestra-de-features.md` |
| M1-04 | Alta y edición de cliente + historial de versión | ⬜ pendiente | M1-01, M1-02, M1-03 | `docs/sdd/specs/M1-04-alta-y-edicion-de-cliente.md` |
| M1-05 | Inicio (lista de clientes) + Vista de cliente | ⬜ pendiente | M1-04 | `docs/sdd/specs/M1-05-inicio-y-vista-de-cliente.md` |

**Por qué este orden:** no hay pantalla sin proyecto (M1-01); nada queda protegido sin el portón
(M1-02); un cliente no puede elegir features que no existen, así que la lista maestra va antes
del alta (M1-03 → M1-04); y no hay nada que listar o ver en detalle hasta que exista al menos un
cliente (M1-04 → M1-05).

**Cobertura de las condiciones de M1 (`docs/prd.md` §3):**
- "Dar de alta un cliente con versión y features" → M1-04.
- "Editar esos datos" → M1-04.
- "Ver de un vistazo su versión y features" → M1-05.
- "Historial de versión con fecha, incluida la primera carga" → M1-04 (se guarda) + M1-05 (se ve).

## 6. Cuándo está terminado el milestone
- [ ] Todas las filas de la tabla en ✅ (cada una con sus 3 verificaciones en verde, regla #5).
- [ ] Las condiciones del milestone en `docs/prd.md` se cumplen y se pueden demostrar.
- [ ] **El owner lo probó con sus ojos:** el agente le dejó la app levantada y el link servido,
      y él confirmó que lo que ve está bien.
- [ ] Este plan movido a `docs/sdd/roadmaps/archive/`.
