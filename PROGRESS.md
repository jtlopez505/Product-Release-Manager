<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **Último commit:** `e2dbf57` (M1-04: el título del panel no repite el de la pantalla). Sin commitear: la tabla del plan.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). La de integración va aparte: `npm run test:integracion` (necesita la base real y levanta su propio `next dev`).
- **Plan activo:** `docs/sdd/roadmaps/active/m1-carga-y-consulta.md` (M1 · Carga y consulta por cliente). **M1-01 a M1-04 terminadas**, queda M1-05 — la última del milestone.
- **Próximo paso:** `/implementar M1-05` — Inicio (lista de clientes) + Vista de cliente. Es la última: al cerrarla va el "probalo vos" con el owner.
- **Ojo con:**
  - **Falta un chip neutro en `marca.md`.** Hay chip de éxito, alerta y error, pero `EstadoFeature` tiene tres valores: "Próximamente" quedó usando el relleno de skeleton con texto secundario. Funciona y se ve bien, pero no es un token pensado para eso — si el Diseñador quiere uno propio, va al doc primero.
  - **El nombre duplicado no tiene candado en la base.** El schema solo tiene `@@unique` sobre `(organizationId, code)`. La validación de nombre es un pre-chequeo en código, así que dos altas simultáneas con el mismo nombre podrían pasar. Con un solo usuario cargando a mano es teórico; si alguna vez hay carga concurrente, hay que migrar.
  - **Pantallas sin punto de entrada navegable:** `/features` cuelga de un link en `app/page.tsx`, y a `/clientes/nuevo` hoy solo se llega por URL directa. M1-05 trae la navegación real y ahí se retiran los puentes.
  - **Los botones del formulario de cliente están arriba de los campos**, porque los dos envíos son `submit` y el primero del documento es el que dispara Enter. El razonamiento es correcto pero se lee al revés; la salida limpia es separar el orden del documento del orden visual (CSS `order`).
  - **No hay forma de cerrar sesión.** La única salida es borrar la cookie o esperar los 30 días. Decidido en 2026-10-05: se evalúa recién en `/deploy`, cuando la app esté en una URL pública. Si se quiere antes, es una spec propia.
  - **Para probar pantallas hay navegador en esta máquina** (Chrome y Edge) y Node trae `WebSocket`, así que se puede manejar por CDP y sacar capturas reales.
  - **React SÍ hidrata con `npm run dev`** — verificado con Chrome real (`__reactFiber$` presente). Dos builders reportaron lo contrario; las dos veces fue su propia medición (servidores propios compitiendo, o chequear antes de que termine de cargar). No hace falta `build && start` para probar interactividad.
  - **Ojo con los puertos al verificar:** apagar todo servidor propio antes de `npm run test:integracion`, que levanta el suyo. Ya costó una corrida.
  - **Las claves van en `.env`, no en `.env.local`.** Son cuatro: `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`.
  - **Prisma 7:** `url`/`directUrl` no van en `schema.prisma`. Están en `prisma.config.ts` (migraciones) y `lib/prisma.ts` (la app).
  - **Estilos:** Tailwind con los tokens de `marca.md` en `app/globals.css`. Ningún hex suelto; `tests/estilos-de-marca.test.ts` lo vigila solo.
  - `npm install` arrastra 9 vulnerabilidades *high* del scaffold, analizadas y toleradas (ver `DECISIONS.md`, 2026-10-05). Revisar antes de `/deploy`.
  - La paleta/tono de `marca.md` sigue siendo una propuesta sin validar por el owner.
