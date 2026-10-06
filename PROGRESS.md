<!-- PROGRESS.md — la nota corta de "dónde retomar". Actualizar antes de cerrar cada sesión.
El estado pieza por pieza NO va acá: vive en la tabla del plan (docs/sdd/roadmaps/active/). -->

# Dónde retomar

- **Último commit:** ver `git log -1` (M2 archivado, plan de M3 escrito). Árbol limpio.
- **Verificación completa:** `npm run check` (typecheck + tests + linter). La de integración va aparte: `npm run test:integracion` (necesita la base real y levanta su propio `next dev`).
- **Plan activo:** `docs/sdd/roadmaps/active/m3-lista-de-release.md` (M3 · Lista de despliegue para un release, 3 piezas, ninguna empezada). **M1 y M2 terminados, probados por el owner y archivados** en `docs/sdd/roadmaps/archive/`.
- **Próximo paso:** `/specs` — las fichas de M3-01, M3-02 y M3-03 (son 3: se escriben directo, sin subagentes).
- **Decisiones de M3 ya tomadas con el owner** (están en el plan §3, no re-preguntar): por versión destino aparecen *todos los que no están en esa versión* (no se interpretan números de versión); el archivo es para **Excel en español** (punto y coma + acentos codificados para Excel); una tercera pestaña "Lista de release".
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
