# M4-02 · Cerrar sesión: el botón, el endpoint y el aviso al volver al portón

**Depende de:** M4-01

## 1. Qué queremos lograr

Poder **cerrar sesión** desde la app: un clic en el encabezado borra la cookie de sesión de ese
navegador y devuelve al portón con un aviso de que la sesión se cerró. Para volver a entrar hay
que tipear la contraseña otra vez. Es la contracara del portón, que desde el día 1 tuvo entrada y
nunca tuvo salida.

**Lo que esta pieza NO promete, y hay que tenerlo claro:** no revoca nada. La firma de sesión es
stateless y no hay tabla de sesiones, así que un token ya copiado a otro navegador sigue valiendo
hasta vencer. Resuelve "me levanto de la máquina y no quiero dejar la app abierta", no "se filtró
el link, cortá el acceso" — ver `docs/prd.md` §5 y `auth-y-permisos.md` § Cómo se sale.

## 2. Qué hay hoy

- **`lib/sesion.ts`** firma y verifica el token (`v1.<vencimiento>.<firma HMAC>`), expone
  `NOMBRE_COOKIE_SESION`, `opcionesDeCookieDeSesion()` y `RUTAS_PUBLICAS` (hoy: `/ingresar` y
  `/api/sesion`). Sin tabla de sesiones: todo es la firma.
- **`app/api/sesion/route.ts`** es el endpoint de entrada (`POST`): valida la contraseña contra
  `APP_PASSWORD` y setea la cookie. Responde por **dos caminos** según `Accept`: JSON (200/401)
  para el formulario con JS, y 303 para el formulario enviado sin JS. Ese doble camino es el
  criterio que esta pieza imita.
- **`proxy.ts`** aplica el portón: sin cookie válida redirige a `/ingresar`, y si venía un token
  inválido lo borra. Cierra por omisión — una ruta nueva queda protegida sola.
- **`app/ingresar/page.tsx`** ya lee un parámetro de la URL (`?error=credencial`) y lo traduce a
  texto con `MENSAJE_POR_ERROR`. El aviso de esta pieza sigue ese mismo patrón.
- **`app/navegacion.tsx`** es el encabezado; con M4-01 ya tiene su primer elemento interactivo
  (el nombre como link) y el tratamiento de hover/foco resuelto.
- **No existe** ninguna forma de cerrar sesión: la única salida es borrar la cookie a mano o
  esperar los ~30 días.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Hay un control "Cerrar sesión" a la derecha del encabezado, en toda pantalla con barra | Integración: el markup servido de `/`, `/por-feature` y `/lista-de-release` trae un `<form>` que apunta a `/api/salir` con `method="post"` y un botón con ese texto. |
| 2 | `POST /api/salir` borra la cookie de sesión | Unitario/integración sobre el endpoint: la respuesta trae un `Set-Cookie` de `releaseview_sesion` que la expira (`Max-Age=0` o `expires` en el pasado), con el mismo `path` que la original — si el `path` no coincide, el navegador deja la vieja viva. |
| 3 | Después de cerrar, devuelve al portón | El endpoint responde **303** a `/ingresar?salio=1`. |
| 4 | **Una ruta protegida ya no se ve** | **La prueba que cierra la condición del PRD.** Integración, en una sola secuencia: entrar con `APP_PASSWORD` (de la variable de entorno) → `GET /` responde 200 → `POST /api/salir` → `GET /` con las cookies resultantes **redirige a `/ingresar`**. No alcanza con mirar el `Set-Cookie`: se comprueba el efecto. |
| 5 | Al volver al portón se entiende qué pasó | `/ingresar?salio=1` muestra "Cerraste sesión." y **no** muestra el mensaje de contraseña incorrecta. Sin el aviso, la pantalla es indistinguible de "se te venció" o "nunca entraste". |
| 6 | Funciona sin JS | Es un `<form method="post">` con un `<button type="submit">`, no un `onClick`. Se comprueba en el recorrido completo con JavaScript deshabilitado en el navegador: el clic cierra la sesión igual. |
| 7 | **NO se puede cerrar sesión por GET** | `GET /api/salir` **no** borra la cookie: responde 405 (método no permitido) y su respuesta no trae `Set-Cookie`. Un logout por GET lo dispararía cualquier prefetch o `<img>` de una página y sacaría al usuario sin que lo pidiera. |
| 8 | **El endpoint no es público** | `/api/salir` **no** se agrega a `RUTAS_PUBLICAS`: sin sesión, `POST /api/salir` lo intercepta el portón y redirige a `/ingresar` — no revienta ni responde 500. Solo cierra sesión quien tiene una. |
| 9 | No aparece donde la barra no está | `/ingresar` sigue sin barra: no hay ningún `<form action="/api/salir">` en esa pantalla. No se ofrece cerrar una sesión que no existe. |
| 10 | No entra ningún secreto al código | `tests/no-secretos-en-codigo.test.ts` sigue en verde. El endpoint de salida **no necesita ninguna clave** (solo borra la cookie); la prueba del criterio #4 toma `APP_PASSWORD` de la variable de entorno, como las de M1-02 (regla #2). |

## 4. Qué ve el usuario

**Pantallas que cambian:** el encabezado compartido (las cuatro pantallas que lo llevan) y el
portón (`/ingresar`), que suma el aviso. Ninguna pantalla nueva.

**El recorrido:**

1. Estoy en cualquier pantalla de la app y me tengo que levantar de la máquina.
2. Hago clic en **"Cerrar sesión"**, arriba a la derecha. Sin diálogo de confirmación: volver a
   entrar es tipear la contraseña, así que un clic por error cuesta poco y un diálogo en cada
   salida cuesta más (decidido en el plan de M4).
3. Caigo en el portón con el aviso **"Cerraste sesión."**
4. Si intento volver a cualquier pantalla —escribiendo la URL o con el botón de atrás— el portón
   me pide la contraseña de nuevo.

**Los tres estados:**
- **Carga:** el envío del formulario es una navegación normal del navegador, que ya muestra su
  propio progreso. No se agrega spinner ni se deshabilita el botón: la pantalla se reemplaza.
- **Error:** el endpoint no puede fallar por lógica (borrar una cookie no depende de la base ni de
  ninguna clave). El único fallo posible es de red, y ahí la pantalla queda como está y se puede
  volver a hacer clic. No se inventa un estado de error que no se puede producir.
- **Vacío:** no aplica — no hay lista ni resultado que pueda venir sin elementos. El caso análogo
  es "no hay sesión que cerrar", y se resuelve no mostrando el control (criterio #9).

## 5. Qué queda afuera

- **Revocar las sesiones abiertas en otros navegadores o dispositivos.** Ya está en `docs/prd.md`
  §5 con su razón. Necesitaría tabla de sesiones o rotar `SESSION_SECRET`.
- **Tabla de sesiones en la base.** Es un cambio de modelo de datos, no un botón.
- **Un diálogo de confirmación antes de salir.** Decidido en el plan; si en el uso real molesta,
  se agrega después — es un cambio chico y local.
- **Cerrar sesión desde los formularios de alta/edición de cliente.** La barra no está ahí a
  propósito; de un formulario se sale con "Cancelar".
- **Avisar en la interfaz que cerrar sesión no revoca nada.** Está escrito en la arquitectura y en
  el PRD, y el owner fue advertido. Con un equipo de 1-2 personas no hace falta decirlo en
  pantalla; si la app sale de ese círculo, el texto del portón debería decirlo (anotado como
  riesgo en el plan de M4).
- **Expiración por inactividad.** La sesión sigue durando ~30 días desde que se abre.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#2** — toca el portón: el endpoint de salida no maneja ningún secreto y la prueba del criterio
  #4 toma `APP_PASSWORD` de la variable de entorno. Nada escrito en el código ni en el repo.

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración → 3)
  el recorrido completo de punta a punta. No se avanza a una capa con la anterior en rojo; si una
  falla: causa raíz → arreglo mínimo → re-correr. La integración de esta pieza es la que demuestra
  la condición del PRD (criterio #4), así que no se puede dar por buena mirando solo el header de
  la respuesta.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta antes de darlo por bueno. Los criterios #4, #7 y #8 tienen que fallar hoy — hoy
  `/api/salir` no existe y la ruta devolvería 404.
- **Entregables:** `app/api/salir/route.ts` (nuevo, solo `POST`), `app/navegacion.tsx` (el
  formulario con el botón), `app/ingresar/page.tsx` (el aviso: `searchParams` pasa a
  `{ error?: string; salio?: string }`), y los tests — los de integración del portón van en
  `tests/integracion/porton-de-acceso.test.ts`, que ya existe y es su lugar.
- **Reusar lo que ya está:** `NOMBRE_COOKIE_SESION` y el `path` de `opcionesDeCookieDeSesion()`
  salen de `lib/sesion.ts`; el nombre de la cookie no se escribe de nuevo en el endpoint.
- **Ojo con los puertos:** apagar todo servidor y navegador propio antes de
  `npm run test:integracion`, que levanta su propio `next dev`.
- **Verificar el markup real antes de escribir el test** — es el tropiezo que ya costó corridas en
  este proyecto.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/auth-y-permisos.md`
  § Cómo se sale y su anexo, que ya lo declaran; el si entra o no, a `docs/prd.md` §3 · M4.
