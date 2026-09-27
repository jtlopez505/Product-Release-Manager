# M1-04 · Alta y edición de cliente + historial de versión

**Depende de:** M1-01, M1-02, M1-03

## 1. Qué queremos lograr

Poder dar de alta un cliente con su nombre, versión activa y los features habilitados (elegidos de
la lista maestra), editar esos mismos datos cuando cambian, y que cada vez que la versión de un
cliente cambia — incluida la primera carga — quede un registro de historial con la versión
anterior y la fecha, sin perder nunca el valor previo.

## 2. Qué hay hoy

El proyecto Next.js + Supabase + Prisma corriendo en local (M1-01), el portón de acceso con sesión
protegiendo todas las rutas de negocio (M1-02), y la lista maestra de features ya cargable, con
pantalla propia para verla/crearla/editarla (M1-03). Esta pieza es la primera que escribe datos en
`Client`, `ClientFeature` y `ClientVersionHistory`.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Dar de alta un cliente con nombre, versión activa y features seleccionados lo guarda correctamente | Completar el formulario con nombre, versión y 1+ features, guardar, y luego recuperar ese cliente por query directa (Prisma/DB) muestra los mismos datos: `Client` creado, filas de `ClientFeature` con `enabled: true` para cada feature elegido |
| 2 | La primera carga de un cliente también cuenta como el primer registro de historial | Después del alta del punto 1, `ClientVersionHistory` tiene exactamente una fila para ese cliente, con la versión cargada y una fecha (`recordedAt`) |
| 3 | Editar un cliente sin cambiar la versión actualiza nombre y/o features, y NO agrega historial | Editar el nombre o los features de un cliente existente dejando la misma versión activa: los datos quedan actualizados y `ClientVersionHistory` sigue teniendo la misma cantidad de filas que antes de editar |
| 4 | Cambiar la versión activa de un cliente crea una fila nueva de historial, sin borrar las anteriores | Editar un cliente y cambiar su versión: aparece una fila nueva en `ClientVersionHistory` con la versión nueva y la fecha del cambio, y la(s) fila(s) anterior(es) siguen existiendo sin modificarse — se puede leer la secuencia completa ordenada por fecha |
| 5 | Se puede crear un feature nuevo sin salir del formulario de alta/edición | Desde el checklist de features, la opción "+ crear feature nuevo" crea un `Feature` (visible después en la lista maestra de M1-03) y lo deja seleccionado en el cliente que se está cargando, sin recargar la página ni perder lo ya tipeado |
| 6 | **(rechazo)** alta sin nombre o sin versión no se guarda y muestra error | Enviar el formulario de alta sin nombre, o sin versión, no crea ningún `Client` (ni fila de historial asociada) y muestra el error de validación junto al campo faltante |
| 7 | **(rechazo)** si no hay features cargados todavía, el alta igual funciona sin seleccionar ninguno | Con la lista maestra de features vacía, el formulario de alta muestra el estado vacío en el checklist y permite guardar el cliente sin features seleccionados |
| 8 | **(rechazo)** un cliente de otra organización no es visible ni editable | Con dos organizaciones sembradas y un cliente que pertenece a la organización B, un intento de ver o editar ese cliente desde la sesión de la organización A no devuelve sus datos ni permite guardar cambios sobre él (se comporta como si no existiera) |

## 4. Qué ve el usuario

- **Pantallas o vistas:** un formulario de alta de cliente y el mismo formulario reutilizado para
  edición (precargado con los datos existentes). Campos: nombre, versión activa (texto libre) y un
  checklist de features de la lista maestra, con la opción "+ crear feature nuevo" inline. Como la
  lista de clientes y la vista de detalle (Inicio y Vista de cliente) son M1-05 y todavía no
  existen, esta pieza expone el alta y la edición por ruta directa (ej. `/clientes/nuevo` y
  `/clientes/[id]/editar`), sin un punto de entrada navegable todavía — M1-05 agrega el enlace real
  desde la lista.
- **El recorrido:** la persona entra al formulario de alta → completa nombre, versión y selecciona
  features (o crea uno nuevo sin salir de la pantalla) → guarda → recibe una confirmación de que el
  cliente quedó creado (mensaje simple; el redirigido a la Vista de cliente completa lo agrega
  M1-05). Para editar: entra al formulario de edición de un cliente existente → lo ve precargado →
  cambia lo que corresponda → guarda → los cambios quedan reflejados, y si cambió la versión, el
  historial suma la fila nueva sin perder las anteriores. Si se navega hacia atrás sin guardar, se
  pregunta explícitamente antes de descartar lo tipeado.
- **Los tres estados:**
  - **Carga:** al guardar, spinner en el botón (no bloqueo de pantalla completa).
  - **Error:** validación in-line junto al campo faltante (nombre o versión); si el guardado falla
    por otra razón (ej. error del servidor), el formulario conserva todo lo tipeado y muestra un
    mensaje de error puntual, sin obligar a recargar desde cero.
  - **Vacío:** si todavía no hay features cargados en la lista maestra, el checklist muestra
    "Todavía no hay features cargados" con acceso a crear uno ahí mismo — no bloquea el alta del
    cliente sin features.

## 5. Qué queda afuera

- La vista de lista de clientes (Inicio) y la vista de detalle de cliente con su historial visible
  — eso es M1-05.
- Consulta por feature (qué clientes tienen o no un feature) — M2.
- Exportar la lista de despliegue de un release — M3.
- Historial operativo completo (quién cargó el cambio, notas de release, tickets) — fuera de
  alcance de todo el MVP (`docs/prd.md` §5); acá solo se guarda versión + fecha.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — toda escritura y lectura de `Client`, `ClientFeature` y `ClientVersionHistory` filtra
  por `organizationId`; la fila #8 de §3 (cliente de otra organización no editable/visible) es la
  prueba concreta de que esto se cumple, no solo una intención.

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter (validación de
  nombre/versión obligatorios, lógica de "crear fila de historial solo si la versión cambió") →
  2) integración (alta y edición contra la base real, incluida la prueba de que un cliente de otra
  organización no se ve ni se edita) → 3) el recorrido completo de punta a punta (alta de un
  cliente nuevo con features → edición cambiando la versión → el historial muestra ambas filas). No
  se avanza a una capa con la anterior en rojo; si una falla: causa raíz → arreglo mínimo →
  re-correr.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta antes de darlo por bueno — en particular, ver fallar primero la prueba de "cambiar la
  versión crea una fila nueva sin borrar la anterior" antes de implementar esa lógica.
- **Entregables:** rutas de alta y edición de cliente (`/clientes/nuevo`,
  `/clientes/[id]/editar` o equivalente según convención del proyecto), las funciones de acceso a
  datos que reciben `organizationId` explícito para crear/editar `Client`, `ClientFeature` y
  `ClientVersionHistory` (la lógica de "solo agregar fila de historial si la versión cambió" vive
  acá), y el componente de formulario compartido entre alta y edición.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/modelo-de-datos.md` y
  `docs/arquitectura/user-flow.md`; el si entra o no, a `docs/prd.md`.
