# M2-01 · Consulta por feature

**Depende de:** nada dentro de este plan (usa lo que M1 ya dejó construido y verificado)

## 1. Qué queremos lograr

Que el PM elija un feature y vea, de un vistazo y sin cruzar nada a mano, qué clientes lo tienen
habilitado y cuáles todavía no — la segunda pregunta de negocio del ICP ("¿qué clientes todavía no
tienen el feature X?"). Es la única condición de M2.

## 2. Qué hay hoy

M1 está terminado: hay clientes con sus features habilitados (M1-04), la lista de clientes y la
Vista de cliente (M1-05), la lista maestra de features en `/features` (M1-03) y la navegación de
pestañas. Dos cosas de hoy cambian con esta pieza:

- **La pestaña "Por feature" lleva a la lista maestra** (`/features`). Fue un puente de M1-05
  mientras la consulta no existía: `user-flow.md` §4 la define como la pantalla de consulta, y §2.1
  dice que la lista maestra es "accesible desde Por feature". Pasa a ser la consulta, y la lista
  maestra queda alcanzable desde ahí.
- **Saber quién tiene un feature obliga a abrir cliente por cliente** — el cruce manual que
  ReleaseView existe para evitar.

No hay datos nuevos que guardar: "tener un feature" ya es una fila `ClientFeature` con `enabled`
verdadero (M1-04, que al destildar deja la fila en falso en vez de borrarla).

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | La pestaña "Por feature" lleva a la consulta, y se ve activa tanto en ella como en la lista maestra | El HTML de Inicio trae el link de "Por feature" con destino `/por-feature`; `/por-feature` y `/features` marcan esa pestaña con `aria-current` |
| 2 | Hay un selector con todos los features de la organización, por nombre y con su código si lo tienen, y un botón "Ver clientes". Con un feature ya elegido, el selector viene con ese feature seleccionado | Con 3 features cargados el selector trae los 3, en orden alfabético; enviar el formulario con uno elegido lleva a `/por-feature?feature=<id>`, y esa pantalla trae ese mismo feature seleccionado |
| 3 | Al elegir un feature se ven dos listas separadas, "Clientes que lo tienen" y "Clientes que no lo tienen todavía"; cada cliente de la organización está en una y solo una | Con 4 clientes — A y B con el feature habilitado, C sin fila, D con la fila en `enabled = false` — la primera lista trae A y B, la segunda C y D; ninguno repetido ni faltante |
| 4 | "Lo tiene" significa fila habilitada; la fila deshabilitada y la ausencia de fila caen las dos en "no lo tiene todavía". Un cliente sin ningún feature cargado queda en "no lo tiene todavía" para todos | La partición, aislada de la base, se prueba con las tres situaciones (habilitado, deshabilitado, sin fila) y con un cliente sin ninguna fila |
| 5 | Cada lista muestra su cantidad, y cada cliente con su nombre —un link a su Vista de cliente— y su versión activa | Con el caso de la fila 3 los títulos dicen "(2)" y "(2)"; cada fila trae `href="/clientes/<id>"` y la versión del cliente |
| 6 | Se ve qué feature se está mirando: nombre, código y estado (Disponible / En desarrollo / Próximamente) | La pantalla trae el nombre, el código (ej. `F-001`) y el chip con la palabra del estado |
| 7 | Sin feature elegido, la pantalla muestra el selector y "Elegí un feature para ver qué clientes lo tienen.", y no consulta clientes | `/por-feature` sin parámetro trae ese texto y ninguna de las dos listas |
| 8 | Una lista vacía lo dice con palabras, no queda en blanco | Feature que nadie tiene: "Ningún cliente tiene este feature todavía." arriba y todos los clientes abajo. Feature que todos tienen: "Todos los clientes tienen este feature." abajo y todos arriba |
| 9 | Sin clientes cargados, un solo mensaje y la acción, en vez de dos listas vacías | Organización con features y sin clientes, con un feature elegido: "Todavía no cargaste ningún cliente." y un link "+ Agregar cliente" a `/clientes/nuevo`; ninguna de las dos listas |
| 10 | Sin features en el catálogo no hay selector: un mensaje y la salida a la lista maestra | Organización sin features: "Todavía no cargaste ningún feature." y un link "+ Agregar feature" a `/features?nuevo=1` |
| 11 | **(no debe pasar)** Regla #1: ningún cliente de otra organización aparece en las listas ni suma a los conteos, y ningún feature de otra organización aparece en el selector | Dos organizaciones, cada una con clientes y un feature: la consulta de una no trae nada de la otra. Probado sobre los datos y sobre la pantalla servida |
| 12 | **(no debe pasar)** Un `?feature=` que no existe, o que es de otra organización, no rompe ni delata nada: dice "Ese feature ya no existe." y deja el selector usable | `?feature=<id inventado>` y `?feature=<id de otra organización>` responden 200, con el mismo mensaje, sin listas, y con respuestas indistinguibles entre sí: no se confirma que el id exista en otra parte |
| 13 | Los datos no quedan viejos: lo que se cambia en un cliente se ve en la consulta | Habilitar el feature a un cliente y volver a abrir la consulta lo pasa de "no lo tiene todavía" a "lo tiene" |
| 14 | La pantalla está detrás del portón | Sin cookie de sesión, `/por-feature` redirige a `/ingresar` |
| 15 | Mientras llega la consulta se ve un esqueleto de filas, no una pantalla en blanco. Si la base falla, se ve "No se pudo cargar la consulta por feature." con "Reintentar", sin stack ni connection string | Con `DATABASE_URL` inalcanzable el HTML trae el mensaje y el botón, y nada técnico |
| 16 | Funciona sin JavaScript y se recorre con teclado | El selector y el botón envían el formulario sin JS; Tab recorre selector, botón y links, con el anillo de foco global visible |
| 17 | Cumple `marca.md`: tablas sin zebra y con la densidad de 40px/36px, hover solo en filas navegables, ningún hex suelto, ninguna sombra en tarjetas | `tests/estilos-de-marca.test.ts` cubre los archivos nuevos y pasa |

## 4. Qué ve el usuario

**Pantallas.** Una nueva, "Por feature" (`/por-feature`). Cambian dos cosas existentes: la pestaña
"Por feature" pasa a llevar acá, y la lista maestra (`/features`) deja de ser la entrada de esa
pestaña pero sigue donde está, con la pestaña activa.

**El recorrido.**
1. Entra a la pestaña "Por feature". Ve el título, el selector con el botón "Ver clientes", y
   debajo "Elegí un feature para ver qué clientes lo tienen."
2. Elige un feature de la lista desplegable y aprieta "Ver clientes".
3. La URL pasa a `?feature=<id>` y la pantalla muestra, debajo del selector (que queda con ese
   feature elegido): el feature —nombre, código en monoespaciada y estado como chip— y dos listas,
   **"Clientes que lo tienen (N)"** y **"Clientes que no lo tienen todavía (N)"**.
4. En pantalla ancha —el contexto de uso que define `marca.md`— las dos listas van **una al lado de
   la otra**, para verlas juntas sin scroll cruzado; en pantalla angosta, una debajo de la otra.
   Cada lista es la misma tabla de Inicio: nombre (link) y versión activa.
5. Hace clic en un cliente y llega a su Vista de cliente.
6. Para mirar otro feature, vuelve a elegir en el mismo selector.
7. Un link "Lista maestra de features", visible junto al selector, lleva a `/features`.

**Los tres estados** (son criterios de §3, no opcionales):
- **Carga:** esqueleto de filas mientras llega la consulta; el selector ya está a la vista.
  (fila 15)
- **Error:** "No se pudo cargar la consulta por feature." y "Reintentar". (fila 15)
- **Vacío**, que acá son cuatro casos distintos con su propio mensaje: sin features en el
  catálogo (fila 10), sin clientes cargados (fila 9), una lista sin nadie (fila 8) y sin feature
  elegido todavía (fila 7). Más el feature inexistente o ajeno (fila 12).

El copy sigue `marca.md` § Voz y tono: directo, calmo, sin signos de exclamación, sin emojis.

## 5. Qué queda afuera

- Un buscador del feature por nombre o código: el catálogo real tiene entre ~15 y ~40 features y
  una lista desplegable alcanza. Si crece, es una mejora aparte.
- Cambiar desde esta pantalla quién tiene qué feature: eso se edita en la Vista de cliente.
- Filtrar por versión o combinar criterios, la lista de despliegue y su exportación a CSV: es M3.
- Ordenar las listas por otra columna o buscar dentro de ellas: el orden es fijo, por nombre.
- Un atajo desde la Vista de cliente hacia la consulta de uno de sus features.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — la consulta cruza clientes y features, que son datos de la organización: ambas lecturas
  salen filtradas por `organizationId` (resuelto en el servidor, nunca recibido del navegador), y
  un `?feature=` ajeno se trata igual que uno inexistente (filas 11 y 12).

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración (la
  consulta contra la base real, con la prueba de que una organización no ve lo de otra; y la
  pantalla servida por HTTP) → 3) el recorrido completo de punta a punta, en un navegador real y
  mirando la captura. No se avanza a una capa con la anterior en rojo; si una falla: causa raíz →
  arreglo mínimo → re-correr.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta. En particular, el de aislamiento (fila 11) tiene que ponerse en rojo cuando se le
  saca el filtro de organización a la consulta: si no cambia, no prueba nada.
- **Entregables:**
  - `lib/consulta-por-feature.ts` (+ su test), **sin base de datos**: la partición de los clientes
    en "lo tienen" / "no lo tienen todavía". Mismo patrón y misma razón que
    `agruparFeaturesDelCliente` en `lib/vista-de-cliente.ts`: se recorre **la lista completa de
    clientes de la organización**, no la de los que lo tienen, así el cliente sin fila o con la
    fila deshabilitada cae solo en el grupo correcto y un id ajeno no inventa una fila.
  - En `lib/clientes.ts`, una lectura de los ids de cliente con el feature habilitado:
    `ClientFeature` con `featureId`, `enabled: true` y `client: { organizationId }`. El feature se
    valida antes con `obtenerFeature(organizationId, id)` de `lib/features.ts`; si no es de la
    organización devuelve `null` y la pantalla responde como si no existiera (fila 12). Los
    clientes salen de `listarClientesDeOrganizacion`, que ya los trae por nombre con su versión.
  - `app/por-feature/page.tsx` y sus componentes (selector, esqueleto), con el mismo patrón que
    `app/page.tsx` y `app/features/page.tsx`: `force-dynamic`, consulta dentro de `Suspense`,
    `searchParams` como promesa, qué se mira lo dice la URL (`?feature=<id>`), formulario `GET` que
    funciona sin JS. La organización la resuelve `organizacionActual()` en el servidor.
  - **Reutilizar, no duplicar:** `TablaDeClientes` (`app/tabla-de-clientes.tsx`) para las dos
    listas; `PanelDeError` (`app/clientes/panel-de-error.tsx`) para el error; y el chip de estado
    de `app/features/tabla-de-features.tsx`, que hoy es una función local (`ChipDeEstado`):
    exportarlo para compartirlo, **sin cambiar cómo se ve**.
  - `app/navegacion.tsx`: el destino de "Por feature" pasa a `/por-feature`, y se actualiza el
    comentario que dice que esa pestaña lleva a la lista maestra. En `app/features/page.tsx`, el
    comentario que dice "mientras la consulta por feature (M2) no exista".
  - `tests/integracion/pantalla-de-inicio.test.ts` (línea ~247) afirma hoy que la navegación trae
    `href="/features"`: pasa a `/por-feature`.
  - Los textos nuevos juntos en un solo lugar, como `MENSAJES_DE_CLIENTE` y `MENSAJES_DE_FEATURE`.
  - `tests/estilos-de-marca.test.ts`: extenderlo para que cubra los archivos nuevos.
- **Si hace falta un valor que `marca.md` no define** (por ejemplo, el tamaño del título de cada
  lista), no se inventa: se usa el declarado más cercano y se reporta como pregunta abierta para el
  Diseñador.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/` (en particular
  `user-flow.md` §4 y `marca.md`); el si entra o no, a `docs/prd.md`.
