<!--
Plantilla de PLAN — el índice y el estado de un milestone.
LA TABLA DE ABAJO ES EL ÚNICO LUGAR DONDE VIVE EL ESTADO de las specs.
-->

# M4 · Salir de la app y volver a Inicio — plan

## 1. Qué logramos con este milestone

El encabezado pasa a hacer las dos cosas que cualquiera espera de él y que hoy no hace: el nombre
**"ReleaseView"** lleva a Inicio desde cualquier pantalla, y aparece **"Cerrar sesión"** para
poder levantarse de la máquina sin dejar la app abierta. Cierra las dos condiciones de
`docs/prd.md` §3 · M4.

## 2. Qué queda afuera

- **Revocar sesiones abiertas en otros navegadores o dispositivos.** Ya está en `docs/prd.md` §5
  con su razón: la firma es stateless, así que cerrar sesión borra *esta* cookie y un token ya
  copiado sigue valiendo hasta vencer. Resuelve "me levanto de la máquina", no "se filtró el link".
- **Tabla de sesiones en la base.** Es lo que haría falta para revocar de verdad, y es un cambio
  de modelo de datos, no un botón (`auth-y-permisos.md`).
- **Login individual y permisos por rol.** Fuera de alcance del MVP desde el día 1 (`docs/prd.md`
  §5). Esto no es un paso hacia allá: es la salida del portón compartido que ya existe.
- **Un diálogo de confirmación antes de salir.** Ver riesgos.
- **Llevar la barra de navegación a las pantallas donde hoy no está** (el portón y los formularios
  de cliente). Decidido al revés a propósito, ver abajo.
- **Rediseñar el encabezado.** Se suma un link y un botón a la barra que ya existe; no se toca la
  altura, el orden de las pestañas ni los tokens de `marca.md`.

## 3. Preguntas y riesgos

**Resueltas antes de planear:**

- *¿El milestone existía en el PRD?* **No — lo pidió el owner y el PRD no lo contemplaba.** Según
  la doctrina del Planificador (punto 1) eso es un agujero del PRD y se arregla allá, no se cuela
  en un plan: **M4 se agregó a `docs/prd.md` §3** con sus dos condiciones, y el límite de la
  revocación quedó anotado en §5 antes de escribir este plan.
- *¿Qué hace exactamente "Cerrar sesión"?* Borra la cookie de sesión de ese navegador y devuelve
  al portón. **No revoca** — el owner fue advertido de esto y lo aceptó explícitamente antes de
  planear. Quedó escrito en `auth-y-permisos.md` § Cómo se sale y en `docs/prd.md` §5.
- *¿El botón va en todas las pantallas?* **No, y es deliberado.** La barra
  (`app/navegacion.tsx`) no está en el portón (no hay sesión que cerrar) ni en los formularios de
  alta/edición de cliente — salir de ahí por un link costaría lo tipeado, por eso la salida de un
  formulario es "Cancelar", que pregunta antes de descartar. El logout hereda esa regla en vez de
  romperla. El owner también fue advertido de esto y lo aceptó.

**Heredado para las fichas** (decidido acá, no se re-pregunta):

- **El logout es `POST /api/salir`, no un link.** Un logout por GET lo dispara cualquier prefetch
  o `<img>` de una página y te saca sin que lo hayas pedido. Se sirve con un `<form method="post">`
  para que funcione sin JS — el mismo criterio de doble camino que ya usa el endpoint de ingreso.
  Responde 303 a `/ingresar?salio=1`.
- **El aviso al volver al portón.** `/ingresar` ya lee `?error=credencial`; `?salio=1` sigue ese
  mismo patrón y muestra "Cerraste sesión." Sin el aviso, la pantalla es indistinguible de "se te
  venció la sesión" o "nunca entraste", que es justo lo que no queremos que se confunda.
- **El endpoint NO va en `RUTAS_PUBLICAS`.** Solo cierra sesión quien tiene una; si ya venció, el
  portón de `proxy.ts` redirige a `/ingresar` y limpia la cookie por su cuenta — mismo resultado.
- **El nombre del encabezado es un `<Link href="/">`** con el tinte de hover de `marca.md` (ahora
  es clickeable, así que corresponde: "hover solo donde hay clic"). **No lleva `aria-current`:**
  ese marcador es de la pestaña "Por cliente", y dos "página actual" en el mismo encabezado es un
  error de accesibilidad, no un refuerzo.
- **La pestaña "Por cliente" se queda.** El nombre y la pestaña apuntan los dos a `/`, y está
  bien: el nombre es la vuelta a casa, la pestaña es la que dice dónde estás parado.

**Riesgos:**

- **Dos controles al mismo destino** (el nombre y la pestaña "Por cliente"). Se tolera porque es
  la convención universal de un encabezado web y romperla confunde más que duplicar; mitigado
  porque solo la pestaña declara `aria-current`, así que a un lector de pantalla le llega una sola
  "página actual".
- **Salir por error con un clic.** Se tolera: volver a entrar es tipear una contraseña, y el
  control está lejos de las acciones destructivas. Un diálogo de confirmación en cada salida
  cuesta más que el error que evita. Si en el uso real molesta, se agrega la confirmación — es un
  cambio chico y local.
- **El logout da una sensación de seguridad mayor que la que entrega.** Es el riesgo real de este
  milestone: alguien podría creer que cerrar sesión corta el acceso de todos. Mitigado donde
  importa (escrito en `auth-y-permisos.md` y en `docs/prd.md` §5, y advertido al owner), pero no
  en la interfaz — si alguna vez la app sale del equipo de 1-2 personas, el texto del portón
  debería decirlo.

Sin preguntas abiertas que bloqueen.

## 4. Reglas del proyecto que toca este milestone

- **#5** — siempre: cada pieza cierra con sus 3 verificaciones en verde.
- **#2** — M4-02 toca el portón. Ni el endpoint de salida ni sus pruebas escriben un secreto en el
  código: el endpoint no necesita ninguno (solo borra la cookie), y la prueba de que la ruta
  protegida ya no se ve toma `APP_PASSWORD` de la variable de entorno, como las de M1-02.

## 5. Las piezas de trabajo (ESTA TABLA ES EL ESTADO)

| ID | Pieza | Estado | Depende de | Ficha |
|---|---|---|---|---|
| M4-00 | Base de prueba aparte para la integración (desbloquea a las otras dos) | ⬜ pendiente | — | `docs/sdd/specs/M4-00-base-de-prueba-aparte.md` |
| M4-01 | El nombre "ReleaseView" del encabezado lleva a Inicio | 🔵 en curso (código hecho, no cierra hasta M4-00) | M4-00 | `docs/sdd/specs/M4-01-nombre-que-lleva-a-inicio.md` |
| M4-02 | Cerrar sesión: el botón, el endpoint y el aviso al volver al portón | ⬜ pendiente | M4-00, M4-01 | `docs/sdd/specs/M4-02-cerrar-sesion.md` |

**Por qué este orden:** **M4-00 va primero porque bloquea a las otras dos.** Apareció a mitad
del milestone: al construir M4-01 se descubrió que `npm run test:integracion` cierra en rojo —13
fallas— porque los tests de pantalla corren contra la base real del owner y afirman conteos
absolutos sobre ella; cuando el owner cargó sus 3 clientes en el "probalo vos" de M3, se
desajustaron. Mientras la suite esté en rojo, la regla #5 no se puede cumplir y **ninguna pieza
puede darse por terminada**, por ajena que sea la falla. Las otras dos tocan el mismo archivo (`app/navegacion.tsx`), así que van en
fila y no en paralelo. Primero la chica, que es la que convierte el nombre en un control
clickeable y fija cómo se ve un elemento interactivo en esa barra; el botón de salir se apoya en
ese tratamiento en vez de inventar el suyo. Al revés, M4-01 tendría que entrar a un encabezado
recién movido para cambiar una línea.

**Cobertura de las condiciones de M4 (`docs/prd.md` §3):**
- "Se puede cerrar sesión desde la app: al hacerlo se vuelve a la pantalla de ingreso, y una ruta
  protegida ya no se ve sin volver a tipear la contraseña" → M4-02.
- "El nombre «ReleaseView» del encabezado lleva a Inicio desde cualquier pantalla que tenga la
  barra de navegación" → M4-01.
- **M4-00 no cubre ninguna condición del PRD, y es a propósito.** No es una funcionalidad del
  producto: es la condición para que la verificación 2 pueda volver a estar en verde. Se anota acá
  en vez de esconderla para que no parezca que el milestone creció de alcance sin registro.

## 6. Cuándo está terminado el milestone
- [ ] Todas las filas de la tabla en ✅ (cada una con sus 3 verificaciones en verde, regla #5).
- [ ] Las condiciones del milestone en `docs/prd.md` se cumplen y se pueden demostrar.
- [ ] **El owner lo probó con sus ojos:** el agente le dejó la app levantada y el link servido,
      y él confirmó que lo que ve está bien.
- [ ] Este plan movido a `docs/sdd/roadmaps/archive/`.
