<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **El MVP y M4 están cerrados y probados por el owner (2026-10-21).** Cuatro planes archivados
  (M1, M2, M3, M4) en `docs/sdd/roadmaps/archive/`; todas las condiciones de `docs/prd.md` §3
  tildadas. No hay plan activo. El recorrido completo corre de verdad: cargar → consultar → armar
  la lista de release → salir. El owner probó M4 a mano: el nombre del encabezado lleva a Inicio,
  "Cerrar sesión" vuelve al portón con el aviso, y una ruta protegida pide la contraseña de nuevo.
- **Las dos verificaciones en verde (2026-10-21):** `npm run check` → **225 tests en 11 archivos**;
  `npm run test:integracion` → **162 tests en 13 archivos**. La de integración corre contra una
  **base de prueba aparte** (M4-00), no contra la del owner. En una máquina nueva: una vez
  `npm run db:migrate:test` y `npm run db:seed:test` (ver `docs/arquitectura/secretos.md`
  § Las dos de prueba). **Cada migración nueva hay que correrla en las dos bases** (`DECISIONS.md`).
- **Correr SIEMPRE las dos verificaciones antes de archivar un plan.** M3 se cerró con solo
  `npm run check` y la integración ya estaba en rojo. M4 se cerró con las dos, corridas por mí y
  no solo reportadas por el builder.
- **`/deploy` corrió el 2026-10-23 y dio NO-GO; los dos bloqueos están resueltos, falta repetir el
  control.** Nada se publicó. (1) `next` subió de 16.3.8 a **16.4.3** (había una crítica; el DoS de
  Server Actions sí aplicaba). Verificado: check 225/225, integración 162/162 corrida sola, build OK;
  `npm audit` quedó en 6 *high* sin críticas (ver `DECISIONS.md`, 2026-10-23). (2) Existe
  `docs/arquitectura/costos.md`: **recomendado Vercel Pro ~US$20/mes + Supabase Free**; rango US$0–~55.
  **Vercel Hobby es solo uso no comercial**, así que el "$0" de `stack.md` era incorrecto (corregido).
  **Siguiente: volver a correr `/deploy` y, con GO, pedir el OK del owner antes de publicar.**
- **Diseño: LISTO PARA PUBLICAR** (auditor, 2026-10-23). Pulido posterior sin bloquear: el encabezado y
  `/features` se desbordan a 390 px; las sub-pestañas de Lista de release repiten el gris de las
  pestañas principales.
- **Lo que falta y es del owner:** decidir si "Cliente 004" (creado por él el 2026-10-21) queda en la
  lista; validar la paleta de `marca.md`; hacer `git push` (main está 42 commits adelante de origin);
  cargar las 4 variables en Vercel (Production **y** Build) y **no** las `_TEST`.
- **Ojo:** la integración falló una vez por timeout de arranque de `next dev` cuando corrió a la vez
  que el auditor de diseño (dos servidores y un Chrome en la misma máquina). Aislada pasó 162/162.
  `/deploy` despacha los dos controles en paralelo; si vuelve a pasar, correr la integración sola.
- **Cerrar sesión NO revoca** un token ya copiado a otro lado (firma stateless, sin tabla de
  sesiones). Resuelve "me levanto de la máquina", no "se filtró el link". Está en `docs/prd.md` §5.

## Lo que `/deploy` tiene que resolver (decidido que se evalúa ahí, no antes)

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
