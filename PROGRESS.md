<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **Último commit:** `b801f2f` (M1-01: migración inicial aplicada en Supabase y organización sembrada). Quedan sin commitear tres docs: `secretos.md`, la ficha de M1-01 y la tabla del plan.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). La de integración va aparte: `npm run test:integracion` (necesita la base real).
- **Plan activo:** `docs/sdd/roadmaps/active/m1-carga-y-consulta.md` (M1 · Carga y consulta por cliente). **M1-01 terminada**, las otras 4 pendientes.
- **Próximo paso:** `/implementar M1-02` — el portón de acceso (contraseña compartida + sesión).
- **Ojo con:**
  - **Falta decidir herramienta de estilos.** Ningún doc de arquitectura la define; el proyecto quedó con CSS plano. Conviene cerrarlo antes de M1-03, que es la primera pantalla de verdad.
  - **`secretos.md` y `modelo-de-datos.md` quedaron desactualizados en una línea:** dicen que `url`/`directUrl` van en el bloque `datasource` de `schema.prisma`, y Prisma 7 ya no lo permite. En la práctica: `DIRECT_URL` en `prisma.config.ts` (migraciones) y `DATABASE_URL` vía `@prisma/adapter-pg` en `lib/prisma.ts` (la app), las dos desde `.env`.
  - **Las claves van en `.env`, no en `.env.local`** — el CLI de Prisma solo lee `.env`. Son cuatro: `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`.
  - El Quick Start de `CLAUDE.md` y `AGENTS.md` sigue con placeholders; los comandos reales ya existen.
  - `npm install` arrastra 9 vulnerabilidades *high* heredadas del scaffold de `create-next-app`, sin revisar.
  - La paleta/tono de `marca.md` sigue siendo una propuesta sin validar.
