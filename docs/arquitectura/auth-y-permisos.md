

# Autenticación y permisos

> **Dueño de:** cómo entra alguien a ReleaseView y qué puede hacer. **No cubre:** el modelo de
> datos (→ [`modelo-de-datos.md`](modelo-de-datos.md)).

## En llano

El MVP **no tiene cuentas individuales** (decisión del PRD §3/§5 — es un riesgo aceptado
explícitamente, ver PRD §4 riesgo #2). En vez de eso, tiene un **portón compartido**: una sola
contraseña para entrar a toda la app. No identifica quién es cada persona ni diferencia qué puede
hacer cada una — quien tiene la contraseña, puede ver y editar todo.

Se agregó este portón (en vez de dejar la app completamente abierta) porque, aunque los datos no
son ultra-sensibles, tampoco es información que uno quiera pública si el link se comparte sin
querer — es la decisión que tomaste al confirmar "contraseña compartida simple" en esta sesión.

**Cómo se siente para quien lo usa:** entra a la URL, ve una pantalla simple pidiendo la
contraseña, la tipea una vez, y desde ahí navega libre por la app durante su sesión (no se lo
vuelve a pedir en cada clic).

## Cómo se sale (M4)

El portón tuvo entrada desde el día 1 pero nunca tuvo salida: la única forma de cerrar la sesión
era borrar la cookie a mano o esperar los ~30 días. M4 agrega **"Cerrar sesión"** en el encabezado.

**Qué hace:** borra la cookie de sesión de ese navegador y devuelve a `/ingresar`. Para volver a
entrar hay que tipear la contraseña otra vez.

**Qué NO hace, y es importante:** no revoca nada. La firma es stateless (no hay tabla de
sesiones), así que un token que ya fue copiado a otro navegador **sigue valiendo hasta que
vence**. Cerrar sesión resuelve "me levanto de la máquina y no quiero dejar la app abierta", no
"se filtró el link, cortá el acceso". Lo segundo está fuera de alcance y anotado en
[`docs/prd.md`](../prd.md) §5; necesitaría tabla de sesiones o rotar `SESSION_SECRET`.

**Dónde está el control:** en la barra de navegación, que no está en todas las pantallas. No
aparece en el portón (no hay sesión que cerrar) ni en los formularios de alta/edición de cliente
—de donde se sale con "Cancelar", que pregunta antes de descartar lo tipeado—. Es la misma regla
que ya seguían las pestañas, no una excepción nueva.

## Permisos

No hay roles ni diferencias de permisos en el MVP: cualquiera que pase el portón puede cargar,
editar clientes y features, y generar la lista de release. Esto es intencional — el equipo real
hoy son 1-2 personas (vos y el líder técnico); diferenciar roles sin tener todavía usuarios reales
distintos sería construir para un problema que no existe (regla "base primero").

## Cuándo esto cambia

Cuando el equipo crezca o se necesite saber quién cargó o cambió qué dato (riesgo #2 del PRD
cruzando su límite), se reemplaza este portón compartido por login individual con Supabase Auth
(ya incluido en el stack elegido, ver [`stack.md`](stack.md)) y ahí sí se diseñan roles. No es un
cambio de motor ni de proveedor — es agregar una pieza que el stack ya soporta.

## Anexo técnico

- Endpoint server-side que compara la contraseña tipeada contra `APP_PASSWORD` (comparación de
tiempo constante — ver [`secretos.md`](secretos.md)).
- Al validar, se setea una cookie `httpOnly`, `secure`, firmada con `SESSION_SECRET`, con
expiración razonable (ej. 30 días) — no hay tabla de sesiones en base de datos, es una firma
stateless.
- Middleware de Next.js protege todas las rutas de la app excepto la pantalla de ingreso: sin
cookie válida, redirige a `/ingresar`.
- No hay tabla `User` en el modelo de datos (ver [`modelo-de-datos.md`](modelo-de-datos.md)) —
cuando se migre a Supabase Auth, ahí sí se suma.
- **Salida (M4):** endpoint propio `POST /api/salir` que borra la cookie de sesión y responde 303
a `/ingresar`. Es **POST y no un link GET** a propósito: un logout por GET lo dispara cualquier
prefetch o `<img>` de una página y te saca sin que lo hayas pedido. Se sirve con un `<form
method="post">`, así funciona sin JS — el mismo criterio que el endpoint de ingreso.
- **No va en `RUTAS_PUBLICAS`:** solo cierra sesión quien tiene una. Si ya venció, el portón de
`proxy.ts` redirige a `/ingresar` y limpia la cookie por su cuenta, que es el mismo resultado.
- **No se agrega tabla de sesiones.** La firma sigue siendo stateless; ver arriba qué implica eso
para la revocación.
