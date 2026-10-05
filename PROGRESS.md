<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **Último commit:** `6877a28` (M1-02: prueba de token manipulado deja de ser intermitente). Sin commitear: la tabla del plan.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). La de integración va aparte: `npm run test:integracion` (necesita la base real y levanta un `next dev`).
- **Plan activo:** `docs/sdd/roadmaps/active/m1-carga-y-consulta.md` (M1 · Carga y consulta por cliente). **M1-01 y M1-02 terminadas**, quedan M1-03, M1-04 y M1-05.
- **Próximo paso:** `/implementar M1-03` — la lista maestra de features (crear, ver, editar).
- **Ojo con:**
  - **`marca.md` no define color de borde/divisor ni estados hover/foco.** M1-02 salió del paso usando el token más cercano con alfa, pero M1-03 en adelante son tablas y se va a notar. Conviene que el Diseñador agregue esos valores al doc **antes** de M1-03.
  - **No hay forma de cerrar sesión.** Hoy la única salida es borrar la cookie o esperar los 30 días de vencimiento. Si se quiere un "Salir", es una pieza nueva — no se agrega de contrabando dentro de otra spec.
  - **El middleware se llama `proxy.ts`, no `middleware.ts`** — Next 16 deprecó el nombre viejo.
  - **Las claves van en `.env`, no en `.env.local`** — el CLI de Prisma solo lee `.env`. Son cuatro: `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`.
  - **Prisma 7:** `url`/`directUrl` no van en `schema.prisma`. Están en `prisma.config.ts` (migraciones) y `lib/prisma.ts` (la app).
  - **Estilos:** Tailwind, con los colores de `marca.md` como tokens en `app/globals.css`. Ningún hex suelto en el markup.
  - `npm install` arrastra 9 vulnerabilidades *high* heredadas del scaffold, analizadas y toleradas (ver `DECISIONS.md`, 2026-10-05). Revisar antes de `/deploy`.
  - La paleta/tono de `marca.md` sigue siendo una propuesta sin validar por el owner.
