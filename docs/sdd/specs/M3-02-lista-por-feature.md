# M3-02 · Lista de release por feature

**Depende de:** M3-01

## 1. Qué queremos lograr

Que el PM elija el feature que va a desplegar y vea, en la misma pantalla de la lista de release,
qué clientes lo reciben —los que todavía no lo tienen— con su versión actual, y cuántos quedaron
afuera porque ya lo tienen. Es la segunda mitad de "filtrar los clientes que corresponden a la
próxima versión o feature" (PRD, M3). Un criterio por vez: versión o feature, nunca los dos.

## 2. Qué hay hoy

M3-01 dejó la pantalla "Lista de release" (`/lista-de-release`) con el criterio por versión
destino, su vista previa y sus estados. M2-01 dejó resuelto el cálculo que hace falta acá: quién
tiene un feature y quién no (`particionarClientesPorFeature` en `lib/consulta-por-feature.ts`,
con `idsDeClientesConFeatureHabilitado` en `lib/clientes.ts`), y un selector de feature
(`SelectorDeFeature`, `app/por-feature/selector-de-feature.tsx`).

Ese selector tiene hoy el destino `/por-feature` escrito en el código, así que no se puede usar
tal cual desde otra pantalla. Esta pieza lo parametriza; no lo copia.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Dentro de la pantalla hay dos opciones de criterio, "Por versión destino" y "Por feature", y una sola está activa. Sin elegir, está activa "Por versión destino" | `/lista-de-release` muestra activa "Por versión destino" (con `aria-current`); el link "Por feature" lleva a `/lista-de-release?por=feature` |
| 2 | Con "Por feature" activo hay un selector con todos los features de la organización y un botón "Ver lista". Con un feature ya elegido, el selector viene con ese feature seleccionado | Elegir uno lleva a `/lista-de-release?por=feature&feature=<id>`, y esa pantalla trae ese feature seleccionado |
| 3 | La lista trae a los clientes que todavía no tienen el feature: los que tienen la fila deshabilitada y los que no tienen fila | Con A y B con el feature habilitado, C sin fila y D con la fila en `enabled = false`: la lista trae C y D |
| 4 | Nadie desaparece sin aviso | En el caso de la fila 3: "Clientes que reciben <nombre del feature> (2)" con el código y el estado del feature, y "2 clientes ya tienen este feature" (en singular con 1). Si nadie lo tiene, esa segunda línea no aparece |
| 5 | Cada cliente se ve con su nombre —link a su Vista de cliente— y su versión actual, ordenados por nombre: la misma vista previa que el criterio por versión | Cada fila trae `href="/clientes/<id>"` y la versión en monoespaciada |
| 6 | Con "Por feature" activo y sin feature elegido, la pantalla explica qué hacer | "Elegí el feature que vas a desplegar para ver qué clientes lo reciben." y ninguna lista |
| 7 | Si todos los clientes ya tienen el feature, lo dice con palabras | "Ningún cliente corresponde a este filtro todavía." y "N clientes ya tienen este feature" |
| 8 | Sin features en el catálogo, con "Por feature" activo no hay selector: mensaje y salida | "Todavía no cargaste ningún feature." y un link "+ Agregar feature" a `/features?nuevo=1` |
| 9 | Sin clientes cargados, el mismo mensaje que en M3-01 | "Todavía no cargaste ningún cliente." y "+ Agregar cliente"; ni lista ni conteos |
| 10 | **(no debe pasar)** Un criterio por vez: el que manda es el activo, y el parámetro del otro se ignora | `?por=feature&feature=<id>&version=2.5.0` lista por feature e ignora la versión; `?version=2.5.0&feature=<id>` (sin `por`) lista por versión e ignora el feature. Cambiar de criterio con los links no arrastra la selección del otro |
| 11 | **(no debe pasar)** Lo que construyó M3-01 sigue igual | `/lista-de-release?version=2.5.0` da el mismo resultado que antes de esta pieza, y los tests de M3-01 siguen en verde sin cambios de fondo |
| 12 | **(no debe pasar)** Regla #1: ningún cliente de otra organización aparece ni suma a los conteos, ningún feature de otra organización aparece en el selector, y un `?feature=` ajeno o inexistente responde igual: "Ese feature ya no existe." | Dos organizaciones con clientes y features: nada cruza. `?por=feature&feature=<id inventado>` y `…&feature=<id de otra organización>` responden 200, con el mismo mensaje, sin lista, indistinguibles entre sí |
| 13 | **(no debe pasar)** La consulta por feature de M2 sigue funcionando con su selector | `/por-feature` sigue enviando a `/por-feature?feature=<id>` y sus tests siguen en verde |
| 14 | Funciona sin JavaScript y se recorre con teclado; los estados de carga y error son los de M3-01 | El selector y el botón envían sin JS; Tab recorre las opciones de criterio, el selector y el botón con el foco visible |
| 15 | Cumple `marca.md` | `tests/estilos-de-marca.test.ts` cubre los archivos nuevos o modificados y pasa |

## 4. Qué ve el usuario

**Pantallas.** Cambia "Lista de release": suma, arriba del formulario, la elección de criterio.
No hay pantallas nuevas.

**El recorrido.**
1. En "Lista de release" ve dos opciones: **"Por versión destino"** (activa) y **"Por feature"**.
2. Elige "Por feature". El campo de versión se reemplaza por el selector de feature con su botón
   "Ver lista", y debajo "Elegí el feature que vas a desplegar para ver qué clientes lo reciben."
3. Elige el feature y aprieta "Ver lista". Ve **"Clientes que reciben <feature> (N)"** con el
   código y el estado del feature, la línea de quiénes quedaron afuera si los hay ("2 clientes ya
   tienen este feature"), y la lista con la versión actual de cada uno.
4. Si vuelve a "Por versión destino", el campo de versión aparece vacío: un criterio no arrastra
   la selección del otro.

**Los tres estados:** carga y error, iguales a M3-01. Vacío, en cuatro casos con su mensaje:
"Por feature" sin feature elegido (fila 6), todos ya lo tienen (fila 7), catálogo sin features
(fila 8), sin clientes (fila 9). Más el feature inexistente o ajeno (fila 12).

El copy sigue `marca.md` § Voz y tono.

## 5. Qué queda afuera

- Combinar criterios (versión y feature a la vez): decidido en el plan, uno por vez.
- Exportar la lista: es M3-03.
- Elegir varios features a la vez.
- Un buscador del feature: mismo criterio que M2 (catálogo de ~15 a ~40, alcanza la lista
  desplegable).

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — clientes, features y conteos salen de la organización actual, resuelta en el servidor;
  un `?feature=` ajeno se trata igual que uno inexistente, sin confirmar que existe en otra parte
  (fila 12).

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración (con
  la prueba de aislamiento entre dos organizaciones y la pantalla servida por HTTP) → 3) el
  recorrido completo en un navegador real, mirando la captura. Si una falla: causa raíz → arreglo
  mínimo → re-correr.
- **Test primero:** el test se escribe antes y se lo ve fallar por la razón correcta. El de
  aislamiento tiene que ponerse en rojo si se le saca el filtro de organización.
- **Entregables:**
  - **Reutilizar el cálculo de M2, sin reescribirlo:** `particionarClientesPorFeature`
    (`lib/consulta-por-feature.ts`) y `idsDeClientesConFeatureHabilitado` (`lib/clientes.ts`). El
    feature se valida con `obtenerFeature(organizationId, id)` de `lib/features.ts`, como en M2.
  - **Parametrizar `SelectorDeFeature`** (`app/por-feature/selector-de-feature.tsx`): hoy tiene
    `action="/por-feature"` fijo. Recibe el destino (y los campos ocultos que haga falta, como
    `por=feature`) por props, sin cambiar cómo se ve ni cómo se comporta en `/por-feature`
    (fila 13). Si conviene moverlo a un lugar compartido, se mueve; no se duplica.
  - En `app/lista-de-release/`: la elección de criterio (dos links, el activo marcado con
    `aria-current`) y la rama "por feature" de la página. El criterio activo lo dice `?por=`
    (`feature`; sin `por` o con cualquier otro valor, "por versión"), y solo se lee el parámetro
    del criterio activo (fila 10).
  - La vista previa de la lista es la misma en los dos criterios: si M3-01 la dejó como
    componente, se reusa; si no, se extrae ahora en lugar de copiarla.
  - Los textos nuevos, junto a los de M3-01.
  - `tests/estilos-de-marca.test.ts`: extenderlo para los archivos nuevos o modificados.
- **Si hace falta un valor que `marca.md` no define** (por ejemplo, el aspecto de la elección de
  criterio), no se inventa: se usa el declarado más cercano —la pestaña activa de la navegación ya
  resuelve "una de dos, una activa"— y se reporta como pregunta abierta para el Diseñador.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/` (`user-flow.md` §5,
  `marca.md`); el si entra o no, a `docs/prd.md`.
