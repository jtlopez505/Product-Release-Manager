# M2 · Consulta por feature — plan

## 1. Qué logramos con este milestone

Se puede elegir un feature y ver, en dos listas separadas, qué clientes lo tienen habilitado y
cuáles todavía no — la segunda pregunta de negocio del ICP, respondida sin cruzar nada a mano. No
guarda datos nuevos: consulta desde el otro ángulo lo que M1 ya carga.

## 2. Qué queda afuera

Ya está en `docs/prd.md` §5: integración automática con Azure DevOps/Jira, login individual y
permisos por rol, notificaciones. Además, específico de este plan:

- La lista de despliegue para un release, el filtro por versión y la exportación a CSV — eso es M3.
- Un buscador del feature por nombre o código — el catálogo real tiene entre ~15 y ~40 features, y
  una lista desplegable alcanza. Si el catálogo crece más, se suma como mejora.
- Cambiar desde esta pantalla qué clientes tienen un feature — eso se edita desde la Vista de
  cliente (M1-04), y mezclar consulta con edición es justo lo que `user-flow.md` evita.
- Combinar la consulta con otros filtros (por versión, por estado del feature).
- El deploy real a producción (Vercel) — eso es `/deploy`, con el owner dando el OK.

## 3. Preguntas y riesgos

**Resueltas antes de planear:**
- *¿M1 está cerrado?* Sí: el owner lo probó y confirmó. Plan archivado en
  `docs/sdd/roadmaps/archive/`.
- *¿Cuántos features tiene el catálogo real?* Entre 15 y 40. → El feature se elige con una lista
  desplegable simple (ver "Heredado para las fichas").

**Heredado para las fichas** (decidido acá, no se re-pregunta):
- **La pestaña "Por feature" pasa a ser la consulta.** Hoy lleva a la lista maestra de features
  (puente que dejó M1-05); `user-flow.md` §4 la define como la pantalla de consulta y §2.1 dice que
  la lista maestra es "accesible desde Por feature". Entonces: la consulta es la entrada de la
  pestaña, y `/features` (la lista maestra) sigue donde está, alcanzable con un link desde ahí. La
  pestaña "Por feature" se ve activa en las dos pantallas.
- **Qué es "lo tiene":** el cliente tiene una fila en `ClientFeature` con `enabled = true`. Todo lo
  demás — fila con `enabled = false` (M1-04 deja el feature destildado sin borrar la fila) o sin
  fila — es "no lo tiene todavía".
- **Cómo se elige:** lista desplegable + botón "Ver clientes", con el feature elegido en la URL
  (`?feature=<id>`). Es el mismo patrón de M1: funciona sin JavaScript, se puede compartir el link
  y no hay estado escondido.
- **Qué muestra cada lista:** el nombre del cliente (que lleva a su Vista de cliente) y su versión
  activa en monoespaciada — saber qué versión tiene quien no recibió el feature es lo que el PM
  necesita para decidir qué hacer con él. Cada lista muestra además su cantidad.
- **El estado del feature se muestra** junto al nombre (Disponible / En desarrollo / Próximamente):
  que un feature "en desarrollo" aparezca sin clientes que lo tengan es esperable, y conviene que
  la pantalla lo diga.

**Riesgos** (heredados del PRD, ver `docs/prd.md` §4, con su límite ya definido ahí):
- Riesgo #1 (carga manual desactualizada): esta consulta es tan confiable como lo cargado a mano.
  Sin cambios, se tolera según el PRD.
- Una limitación del modelo, no un riesgo nuevo: no distingue "se marcó explícitamente que no lo
  tiene" de "nadie lo cargó todavía". Las dos caen en "no lo tiene todavía", y la etiqueta lo dice
  con esas palabras. Un cliente sin ningún feature cargado va a aparecer en esa lista para todos los
  features: es lo esperable, no un error.

Sin preguntas abiertas que bloqueen.

## 4. Reglas del proyecto que toca este milestone

- **#1** — la consulta cruza clientes y features, que son datos de la organización. Solo aparecen
  los de la organización actual, y un `?feature=<id>` de otra organización responde como si el
  feature no existiera — sin confirmar que el id existe en otra parte (mismo criterio que M1-04 y
  M1-05).
- **#5** — siempre: cada pieza cierra con sus 3 verificaciones en verde.

## 5. Las piezas de trabajo (ESTA TABLA ES EL ESTADO)

| ID | Pieza | Estado | Depende de | Ficha |
|---|---|---|---|---|
| M2-01 | Consulta por feature: elegir un feature y ver qué clientes lo tienen y cuáles no | ✅ terminada | — | `docs/sdd/specs/M2-01-consulta-por-feature.md` |

**Por qué una sola pieza:** la consulta y su entrada de navegación van juntas. Una pantalla a la
que solo se llega escribiendo la URL no está terminada — es exactamente lo que M1-04 dejó pendiente
hasta que M1-05 trajo la navegación. Partirla en "datos" y "pantalla" sería artificial: ninguna de
las dos mitades se puede ver funcionando sola.

**No depende de otras piezas de este plan.** Sí de lo que M1 ya dejó construido y verificado: la
lista maestra de features, los clientes con sus features habilitados, y la navegación de pestañas.

**Cobertura de las condiciones de M2 (`docs/prd.md` §3):**
- "Se puede elegir un feature y ver qué clientes lo tienen activo y cuáles no" → M2-01.

## 6. Cuándo está terminado el milestone
- [x] Todas las filas de la tabla en ✅ (cada una con sus 3 verificaciones en verde, regla #5).
- [x] Las condiciones del milestone en `docs/prd.md` se cumplen y se pueden demostrar.
- [x] **El owner lo probó con sus ojos:** el agente le dejó la app levantada y el link servido,
      y él confirmó que lo que ve está bien.
- [x] Este plan movido a `docs/sdd/roadmaps/archive/`.
