<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **El MVP está cerrado y demostrado de punta a punta.** El owner probó M3 el 2026-10-21 y confirmó
  que la descarga del CSV baja y abre bien en su Excel. Los tres planes (M1, M2, M3) están en
  `docs/sdd/roadmaps/archive/` y sus condiciones en `docs/prd.md` §3 están tildadas. El
  recorrido completo del PRD §2 —cargar → consultar → armar la lista de
  release— corre de verdad.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). Última corrida en verde:
  2026-10-21, **208 tests en 10 archivos**. La de integración va aparte:
  `npm run test:integracion` (necesita la base real y levanta su propio `next dev`).
- **Plan activo: `docs/sdd/roadmaps/active/m4-salida-y-encabezado.md`** (M4 · Salir de la app y
  volver a Inicio). Dos piezas, las dos ⬜ pendientes. **Próximo paso: `/implementar M4-01`.**
  M4 lo pidió el owner el 2026-10-21 y no estaba en el PRD: se agregó como milestone en
  `docs/prd.md` §3 antes de planear, y el límite del logout (no revoca sesiones ya copiadas) quedó
  en §5. Las decisiones del cómo están en `docs/arquitectura/auth-y-permisos.md` § Cómo se sale y
  en `user-flow.md` §0/§1.
- **`/deploy` va después de M4**, no antes: las dos piezas de M4 son justamente para que la app se
  pueda dejar en una URL pública.

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

- **Las claves van en `.env`, no en `.env.local`.** Son cuatro: `DATABASE_URL`, `DIRECT_URL`,
  `APP_PASSWORD`, `SESSION_SECRET`.
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
