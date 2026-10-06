<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **Último commit:** `594bf29` (M3-03: exportar la lista de release para Excel en español). Sin commitear: la tabla del plan.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). La de integración va aparte: `npm run test:integracion` (necesita la base real y levanta su propio `next dev`).
- **Plan activo:** `docs/sdd/roadmaps/active/m3-lista-de-release.md` (M3 · Lista de despliegue para un release). **Las 3 piezas ✅ — M3 completo.** Falta el "probalo vos" del owner antes de mover el plan a `archive/` (mismo criterio que M1 y M2). **M1 y M2 ya probados y archivados** en `docs/sdd/roadmaps/archive/`.
- **Próximo paso:** el owner prueba la app. Con su confirmación: archivar el plan, tildar la condición de M3 en `docs/prd.md` — y ahí el MVP completo queda demostrado de punta a punta (cargar → consultar → armar la lista de release).
- **Pendiente real, no cosmético: verificar la descarga del CSV en un navegador de verdad, no headless.** El contenido del archivo está probado al byte (función pura `lib/exportar-lista.ts`: BOM, separador, escapado, neutralización de fórmulas — todo con tests y verificado dos veces de forma independiente), pero el **clic que dispara la descarga en el navegador nunca se vio completarse**: en el Chrome headless de esta máquina, hasta una descarga de blob mínima sin nada de la app se cancela a los mismos 58 bytes. Es una limitación del entorno de verificación, no algo que se haya visto fallar en la app — pero tampoco se vio funcionar. Cuando pruebes M3, hacé el clic en "Exportar CSV" de verdad y confirmá que el archivo baja y abre bien en tu Excel.
- **Lo que cambió en M2:** la pestaña "Por feature" ya no lleva a la lista maestra de features — ahora es la pantalla de consulta (`/por-feature`). La lista maestra sigue en `/features`, alcanzable desde ahí con un link.
- **Ojo con:**
  - **M1-05 lo dejó un builder interrumpido por un límite de sesión de la API**, a mitad del recorrido final. El código estaba completo pero sin verificar ni commitear — las 3 verificaciones las corrí yo desde cero y están en verde. El builder además dejó dos servidores huérfanos vivos (puertos 3000 y 3101) que hicieron fallar la primera corrida de integración; liberados los puertos, 70/70 en verde. Si un builder se corta así de nuevo, revisar puertos ocupados antes de asumir que algo está roto.
  - **Falta un chip neutro en `marca.md`.** Hay chip de éxito, alerta y error, pero `EstadoFeature` tiene tres valores: "Próximamente" usa el relleno de skeleton con texto secundario. Funciona y se ve bien, pero no es un token pensado para eso.
  - **El nombre de feature duplicado no tiene candado en la base** — solo el código (`@@unique`) lo tiene. La validación de nombre es un pre-chequeo; con un solo usuario cargando a mano es teórico.
  - **No hay forma de cerrar sesión.** La única salida es borrar la cookie o esperar los 30 días. Decidido en 2026-10-05: se evalúa recién en `/deploy`, cuando la app esté en una URL pública.
  - **Para probar pantallas hay navegador en esta máquina** (Chrome y Edge) y Node trae `WebSocket`: manejar por CDP y sacar capturas reales.
  - **React SÍ hidrata con `npm run dev`** — verificado varias veces con Chrome real. No investigar esto de nuevo.
  - **Verificar los `id`/`name` reales del markup antes de escribir un script de prueba** — varias corridas se perdieron por asumir nombres de campo que no coincidían (`cliente-currentVersion` en vez de `cliente-version`, campo `password` en vez de `contrasena`, etc.).
  - **Ojo con los puertos al verificar:** apagar todo servidor y navegador propio antes de `npm run test:integracion` y antes de levantar `npm run dev` para mirar algo.
  - **Las claves van en `.env`, no en `.env.local`.** Son cuatro: `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`.
  - **Prisma 7:** `url`/`directUrl` no van en `schema.prisma`. Están en `prisma.config.ts` (migraciones) y `lib/prisma.ts` (la app).
  - **Estilos:** Tailwind con los tokens de `marca.md` en `app/globals.css`. Ningún hex suelto; `tests/estilos-de-marca.test.ts` lo vigila solo.
  - `npm install` arrastra 9 vulnerabilidades *high* del scaffold, analizadas y toleradas (ver `DECISIONS.md`, 2026-10-05). Revisar antes de `/deploy`.
  - La paleta/tono de `marca.md` sigue siendo una propuesta sin validar por el owner.
