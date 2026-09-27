# M1-02 · Portón de acceso: contraseña compartida + sesión

**Depende de:** M1-01

## 1. Qué queremos lograr
Una pantalla de login con una única contraseña compartida (`APP_PASSWORD`): al acertarla se crea
una sesión que deja navegar libre por el resto de la app; sin esa sesión, ninguna ruta de negocio
se puede ver.

## 2. Qué hay hoy
El proyecto Next.js + Supabase + Prisma de M1-01 corriendo en local, sin ninguna protección de
acceso todavía — cualquiera que entre a la URL ve la app directo.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Contraseña correcta crea sesión y deja pasar | En `/ingresar`, tipear la `APP_PASSWORD` correcta y enviar redirige a la app (home) con una cookie de sesión válida seteada |
| 2 | Contraseña incorrecta muestra error y NO crea sesión | En `/ingresar`, tipear una contraseña incorrecta muestra un mensaje de error en la misma pantalla, no redirige y no queda ninguna cookie de sesión seteada |
| 3 | Ruta protegida sin sesión redirige al login | Acceder directo a cualquier ruta de negocio (ej. `/`) sin cookie de sesión válida redirige a `/ingresar` |
| 4 | La sesión persiste durante la navegación | Con sesión ya iniciada, navegar a otra ruta protegida no vuelve a pedir la contraseña |
| 5 | La sesión expira pasado el plazo definido | Con la cookie vencida (expiración ~30 días, ver `auth-y-permisos.md`) o eliminada, cualquier ruta protegida vuelve a redirigir a `/ingresar` |
| 6 | El secreto de la contraseña y de la sesión nunca están en el código | `APP_PASSWORD` y `SESSION_SECRET` se leen de variables de entorno (`.env.local`); ninguna búsqueda en el código fuente encuentra su valor hardcodeado |

## 4. Qué ve el usuario

- **Pantallas o vistas:** una pantalla nueva, `/ingresar`, con un campo de contraseña y un botón
  para enviar. No agrega ni cambia ninguna otra pantalla.
- **El recorrido:** la persona entra a la URL de la app → si no tiene sesión válida, el middleware
  la redirige a `/ingresar` → tipea la contraseña compartida → envía → si es correcta, entra a la
  app y no se le vuelve a pedir durante la sesión; si es incorrecta, se queda en `/ingresar` con el
  error a la vista y puede reintentar.
- **Los tres estados:**
  - **Carga:** mientras se verifica la contraseña enviada, el botón se deshabilita (evita doble
    envío) y muestra que está procesando.
  - **Error:** contraseña incorrecta → mensaje visible en la misma pantalla, sin redirigir.
  - **Vacío:** no aplica — `/ingresar` siempre muestra el mismo formulario fijo; no hay listado ni
    contenido que pueda no tener datos.

## 5. Qué queda afuera
- Cuentas individuales (usuario/contraseña por persona).
- Permisos o roles distintos según quién entra.
- Recuperación o cambio de contraseña desde la app (el cambio de `APP_PASSWORD` es manual, vía
  variable de entorno).

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#2** — central en esta pieza: `APP_PASSWORD` y `SESSION_SECRET` salen de variables de entorno
  (`.env.local` en desarrollo, panel de Vercel en producción) y nunca se escriben en el código ni
  se commitean; la comparación de la contraseña tipeada contra `APP_PASSWORD` es de tiempo
  constante (ver `secretos.md`).
- **#1** — no aplica todavía distinción de dueño de datos: el portón es compartido a propósito
  (una sola contraseña para toda la app, sin cuentas individuales, ver `auth-y-permisos.md`); esta
  pieza no crea datos nuevos de usuario, solo protege el acceso a los que ya aísla el modelo de
  datos por organización.

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter (validación de
  contraseña correcta/incorrecta, generación y verificación de la cookie firmada) → 2) integración
  (middleware protegiendo una ruta real sin sesión, y dejando pasar con sesión válida) → 3) el
  recorrido completo de punta a punta (`/ingresar` → contraseña correcta → app; contraseña
  incorrecta → error). No se avanza a una capa con la anterior en rojo; si una falla: causa raíz →
  arreglo mínimo → re-correr.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta antes de darlo por bueno.
- **Mecanismo de sesión (definido en `auth-y-permisos.md`, no se reinventa acá):** endpoint
  server-side que compara la contraseña tipeada contra `APP_PASSWORD` (comparación de tiempo
  constante); al validar, setea una cookie `httpOnly`, `secure`, firmada con `SESSION_SECRET`, con
  expiración ~30 días — sin tabla de sesiones en base de datos, firma stateless. Middleware de
  Next.js protege todas las rutas excepto `/ingresar`; sin cookie válida, redirige ahí.
- **Entregables:** pantalla `/ingresar` (ruta nueva), endpoint de verificación de contraseña,
  middleware de Next.js que protege el resto de las rutas, utilidad de firma/verificación de la
  cookie de sesión.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/auth-y-permisos.md` y
  `docs/arquitectura/secretos.md`; el si entra o no, a `docs/prd.md`.
