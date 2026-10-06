# M3-01 · Lista de release por versión destino

**Depende de:** nada dentro de este plan (usa lo que M1 y M2 ya dejaron construido y verificado)

## 1. Qué queremos lograr

Que el día del release el PM escriba la versión que va a desplegar y vea, sin cruzar nada a mano,
qué clientes la reciben y en qué versión está cada uno hoy — y cuántos quedaron afuera porque ya
la tienen. Es la primera mitad de "filtrar los clientes que corresponden a la próxima versión o
feature" (PRD, M3), y trae la pantalla sobre la que se apoyan M3-02 y M3-03.

## 2. Qué hay hoy

M1 y M2 están terminados: clientes con su versión activa (M1-04), la navegación de pestañas
"Por cliente" / "Por feature" (M1-05, M2-01), y la tabla de clientes de Inicio que muestra nombre
y versión (`TablaDeClientes`). No existe ninguna pantalla de lista de release: hoy, para saber
quién recibe la 2.5.0, hay que recorrer Inicio y comparar versiones a ojo.

La regla para decidir si dos versiones son "la misma" ya existe y está probada: `laVersionCambio`
(`lib/validacion-de-cliente.ts`), la que usa el historial de M1-04 — ignora espacios al borde y no
ignora mayúsculas. Esta pieza la reusa, para que la lista de release y el historial nunca
discrepen sobre si un cliente ya está en una versión.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Hay una tercera pestaña, "Lista de release", que lleva a `/lista-de-release` y se ve activa ahí. Las otras dos siguen igual | El HTML de Inicio trae el link "Lista de release" a `/lista-de-release`; en esa pantalla la pestaña tiene `aria-current`; "Por cliente" y "Por feature" siguen llevando a `/` y `/por-feature` |
| 2 | Hay un campo para escribir la versión destino y un botón "Ver lista". Con una versión ya pedida, el campo viene con esa versión escrita | Enviar `2.5.0` lleva a `/lista-de-release?version=2.5.0`, y esa pantalla trae `2.5.0` en el campo |
| 3 | La lista trae a todos los clientes de la organización cuya versión activa es distinta de la destino | Con A en `2.4.0`, B en `2.4.1`, C en `2.5.0` y D en `2.6.0`, pedir `2.5.0` lista A, B y D; C no aparece |
| 4 | La comparación es la misma que la del historial: ignora espacios al borde y no ignora mayúsculas | Pedir ` 2.5.0 ` da lo mismo que `2.5.0`; con un cliente en `2.5.0-RC1`, pedir `2.5.0-rc1` lo incluye en la lista. Se prueba sobre la regla, sin base |
| 5 | Nadie desaparece sin aviso: además de la lista, se dice cuántos quedaron afuera y por qué | En el caso de la fila 3: "Clientes que reciben la 2.5.0 (3)" y "1 cliente ya está en 2.5.0" (en plural con 2 o más). Si nadie está en esa versión, esa segunda línea no aparece |
| 6 | Cada cliente se ve con su nombre —un link a su Vista de cliente— y su versión actual, ordenados por nombre | Cada fila trae `href="/clientes/<id>"` y la versión del cliente en monoespaciada; D (`2.6.0`, adelantado) se reconoce por su versión |
| 7 | Sin versión pedida, la pantalla explica qué hacer y no lista nada. Un pedido vacío o solo con espacios cuenta como "sin versión" | `/lista-de-release` y `/lista-de-release?version=%20%20` traen "Escribí la versión que vas a desplegar para ver qué clientes la reciben." y ninguna lista |
| 8 | Si todos los clientes ya están en esa versión, lo dice con palabras | "Ningún cliente corresponde a este filtro todavía." (el texto de `user-flow.md` §5) y "N clientes ya están en 2.5.0" |
| 9 | Sin clientes cargados, un solo mensaje y la acción | "Todavía no cargaste ningún cliente." y un link "+ Agregar cliente" a `/clientes/nuevo`; ni lista ni conteos |
| 10 | **(no debe pasar)** Regla #1: un cliente de otra organización no aparece en la lista ni suma a ninguno de los dos conteos | Dos organizaciones con clientes en versiones distintas: la lista y los conteos de una no incluyen a nadie de la otra. Probado sobre los datos y sobre la pantalla servida |
| 11 | **(no debe pasar)** Una versión con caracteres raros se muestra como texto, no se interpreta | `?version=<script>alert(1)</script>` responde 200 y muestra ese texto literal en el título; no ejecuta nada ni rompe la pantalla |
| 12 | La pantalla está detrás del portón | Sin cookie de sesión, `/lista-de-release` redirige a `/ingresar` |
| 13 | Mientras llega la lista se ve un esqueleto de filas; si la base falla, "No se pudo cargar la lista de release." con "Reintentar", sin stack ni connection string | Con `DATABASE_URL` inalcanzable el HTML trae el mensaje y el botón, y nada técnico |
| 14 | Funciona sin JavaScript y se recorre con teclado | El campo y el botón envían el formulario sin JS; Tab recorre campo, botón y links, con el anillo de foco global visible |
| 15 | Cumple `marca.md`: tabla sin zebra y con la densidad de 40px/36px, hover solo en filas navegables, versiones en monoespaciada, ningún hex suelto, ninguna sombra en tarjetas | `tests/estilos-de-marca.test.ts` cubre los archivos nuevos y pasa |

## 4. Qué ve el usuario

**Pantallas.** Una nueva, "Lista de release" (`/lista-de-release`). Cambia la navegación: suma la
tercera pestaña.

**El recorrido.**
1. Entra a la pestaña "Lista de release". Ve el título, un campo "Versión destino" con un botón
   "Ver lista", y debajo "Escribí la versión que vas a desplegar para ver qué clientes la reciben."
2. Escribe `2.5.0` y aprieta "Ver lista" (o Enter).
3. La URL pasa a `?version=2.5.0` y ve, debajo del campo (que conserva lo escrito): **"Clientes que
   reciben la 2.5.0 (N)"**, la línea de quiénes quedaron afuera si los hay ("1 cliente ya está en
   2.5.0"), y la lista: cada cliente con su versión actual.
4. Revisa la lista —esta es la vista previa que `user-flow.md` §5 pide antes de exportar— y
   reconoce por su versión a cualquier cliente que esté más adelante.
5. Hace clic en un cliente y llega a su Vista de cliente.

**Los tres estados** (son criterios de §3, no opcionales):
- **Carga:** esqueleto de filas mientras llega la lista; el campo ya está a la vista. (fila 13)
- **Error:** "No se pudo cargar la lista de release." y "Reintentar". (fila 13)
- **Vacío**, en tres casos con su propio mensaje: sin versión pedida (fila 7), todos ya en esa
  versión (fila 8) y sin clientes cargados (fila 9).

El copy sigue `marca.md` § Voz y tono: directo, calmo, sin signos de exclamación, sin emojis.

## 5. Qué queda afuera

- El criterio por feature: es M3-02, sobre esta misma pantalla.
- Exportar la lista: es M3-03.
- Interpretar números de versión ("solo los que están por debajo"): decidido con el owner que no
  (plan §3). Un cliente adelantado aparece y se reconoce por su versión.
- Sacar clientes de la lista dentro de la app: se quitan del archivo exportado.
- Sugerir versiones al escribir (autocompletar con las que existen): casi siempre la destino es una
  que ningún cliente tiene todavía.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — la lista y los dos conteos salen de los clientes de la organización actual, resuelta en
  el servidor con `organizacionActual()` y nunca recibida del navegador (fila 10).

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración (la
  lista contra la base real, con la prueba de que una organización no ve lo de otra; y la pantalla
  servida por HTTP) → 3) el recorrido completo en un navegador real, mirando la captura. No se
  avanza a una capa con la anterior en rojo; si una falla: causa raíz → arreglo mínimo → re-correr.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta. El de aislamiento (fila 10) tiene que ponerse en rojo si se le saca el filtro de
  organización: si no cambia, no prueba nada.
- **Entregables:**
  - `lib/lista-de-release.ts` (+ su test), **sin base de datos**: la partición de los clientes en
    "reciben la versión" / "ya están en ella". Mismo patrón que `particionarClientesPorFeature`
    (`lib/consulta-por-feature.ts`): se recorre la lista completa de clientes de la organización.
    La comparación **es** `laVersionCambio(cliente.currentVersion, destino)` de
    `lib/validacion-de-cliente.ts` — reusala, no escribas otra; ese es el punto de la fila 4.
  - Los clientes salen de `listarClientesDeOrganizacion` (`lib/clientes.ts`), que ya los trae por
    nombre con su versión. No hace falta una consulta nueva.
  - `app/lista-de-release/page.tsx` y sus componentes (formulario de versión, esqueleto), con el
    mismo patrón que `app/por-feature/page.tsx`: `force-dynamic`, consulta dentro de `Suspense`,
    `searchParams` como promesa, lo que se mira lo dice la URL, formulario `GET` sin JS.
  - **La URL queda preparada para M3-02:** `?version=<texto>` alcanza en esta pieza, y M3-02 va a
    sumar `?por=feature`. Por eso el criterio por defecto —sin `por`— es "por versión", y un link
    `/lista-de-release?version=2.5.0` tiene que seguir andando cuando llegue M3-02.
  - **Reutilizar, no duplicar:** `TablaDeClientes` (`app/tabla-de-clientes.tsx`) para la lista y
    `PanelDeError` (`app/clientes/panel-de-error.tsx`) para el error.
  - `app/navegacion.tsx`: `SeccionActual` suma una tercera sección y `SECCIONES` la pestaña
    `{ etiqueta: "Lista de release", destino: "/lista-de-release" }`.
  - Los textos nuevos juntos en un solo lugar, como `MENSAJES_DE_CONSULTA_POR_FEATURE`.
  - `tests/estilos-de-marca.test.ts`: extenderlo para que cubra los archivos nuevos.
- **Si hace falta un valor que `marca.md` no define**, no se inventa: se usa el declarado más
  cercano y se reporta como pregunta abierta para el Diseñador.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/` (`user-flow.md` §5,
  `marca.md`); el si entra o no, a `docs/prd.md`.
