<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **El MVP está cerrado y demostrado de punta a punta.** El owner probó M3 el 2026-10-21 y confirmó
  que la descarga del CSV baja y abre bien en su Excel. Los tres planes (M1, M2, M3) están en
  `docs/sdd/roadmaps/archive/` y sus condiciones en `docs/prd.md` §3 están tildadas. El
  recorrido completo del PRD §2 —cargar → consultar → armar la lista de
  release— corre de verdad.
- **Las dos verificaciones en verde (2026-10-21):** `npm run check` → **219 tests en 11 archivos**;
  `npm run test:integracion` → **146 tests en 13 archivos**. Desde M4-00 la de integración corre
  contra una **base de prueba aparte**, no contra la real.
- **Plan activo: `docs/sdd/roadmaps/active/m4-salida-y-encabezado.md`** (M4 · Salir de la app y
  volver a Inicio). **Tres piezas:** M4-00 ✅ (base de prueba aparte), M4-01 ✅ (el nombre del
  encabezado lleva a Inicio), **M4-02 ⬜ (el logout — la única que queda).**
- **Ya no hay bloqueo:** el owner creó el segundo proyecto de Supabase el 2026-10-21 y `.env`
  tiene `DATABASE_URL_TEST` / `DIRECT_URL_TEST`. En una máquina nueva hay que correr una vez
  `npm run db:migrate:test` y `npm run db:seed:test`; ver `docs/arquitectura/secretos.md`
  § Las dos de prueba.
- **Las 13 fallas de la integración están resueltas** (M4-00). Corrían contra la base real del
  owner y afirmaban conteos absolutos sobre ella; se desajustaron cuando él cargó sus 3 clientes
  al probar M3. Se pusieron en verde **sin editar una sola aserción** (`git diff` vacío en los dos
  archivos, criterio #6). Las 4 alternativas evaluadas, en `DECISIONS.md` (2026-10-21).
- **Lección que costó caro: correr SIEMPRE las dos verificaciones antes de archivar un plan.** M3
  se cerró con `npm run check` en verde y sin correr `npm run test:integracion`, que ya estaba en
  rojo en ese momento. `npm run check` sola no alcanza.
- **`/deploy` va después de M4.**

## Lo que `/deploy` tiene que resolver (decidido que se evalúa ahí, no antes)

- ~~No hay forma de cerrar sesión.~~ **Dejó de ser pendiente de `/deploy`: lo pidió el owner y
  es M4-02.** Se construye antes de publicar, no se evalúa después.
- **Las 9 vulnerabilidades *high* del scaffold.** Analizadas y toleradas (ver `DECISIONS.md`,
  2026-10-05: ninguna es alcanzable en esta app). El compromiso fue revisarlas antes de publicar.
- **La paleta y el tono de `marca.md` siguen siendo una propuesta sin validar por el owner.** La app
  entera está construida con esos tokens; si los cambia, es un cambio de tokens en
  `app/globals.css`, no de pantallas.

## Deuda chica, anotada y no urgente

- **Falta un chip neutro en `marca.md`.** Hay chip de éxito, alerta y error, pero `EstadoFeature`
  tiene tres valores: "Próximamente" usa el relleno de skeleton con texto secundario. Funciona y se
  ve bien, pero no es un token pensado para eso.
- **El nombre de feature duplicado no tiene candado en la base** — solo el código (`@@unique`) lo
  tiene. La validación de nombre es un pre-chequeo; con un solo usuario cargando a mano es teórico.
- **Ninguna prueba automática cubre el clic que dispara la descarga del CSV** (ver `DECISIONS.md`,
  2026-10-21). El contenido del archivo sí está cubierto al byte. Si la exportación cambia de
  mecanismo, hay que re-verificarla a mano en un navegador de verdad.

## Ojo con (cosas de esta máquina y de este proyecto)

- **Las claves van en `.env`, no en `.env.local`.** Cuatro para la app: `DATABASE_URL`,
  `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`. Desde M4-00, dos más solo para la integración:
  `DATABASE_URL_TEST`, `DIRECT_URL_TEST` (no van en `CLAVES_OBLIGATORIAS` — la app no las necesita).
- **Prisma 7:** `url`/`directUrl` no van en `schema.prisma`. Están en `prisma.config.ts`
  (migraciones) y `lib/prisma.ts` (la app).
- **Estilos:** Tailwind con los tokens de `marca.md` en `app/globals.css`. Ningún hex suelto;
  `tests/estilos-de-marca.test.ts` lo vigila solo.
- **React SÍ hidrata con `npm run dev`** — verificado varias veces con Chrome real. No investigar
  esto de nuevo.
- **El Chrome headless de esta máquina no completa descargas de blob** — se cancelan a los 58 bytes
  incluso en un caso mínimo sin la app. No es la app. No volver a pelearlo.
- **Verificar los `id`/`name` reales del markup antes de escribir un script de prueba** — varias
  corridas se perdieron por asumir nombres de campo que no coincidían (`cliente-currentVersion` en
  vez de `cliente-version`, campo `password` en vez de `contrasena`, etc.).
- **Ojo con los puertos:** apagar todo servidor y navegador propio antes de
  `npm run test:integracion` y antes de levantar `npm run dev` para mirar algo. Si un builder se
  corta por un límite de sesión, puede dejar servidores huérfanos vivos (pasó con M1-05, puertos
  3000 y 3101) — revisar puertos ocupados antes de asumir que algo está roto.
- **Para probar pantallas hay navegador en esta máquina** (Chrome y Edge) y Node trae `WebSocket`:
  manejar por CDP y sacar capturas reales.
