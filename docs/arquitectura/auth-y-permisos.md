

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

