# S1-01 · Sentry captura los errores del servidor, del navegador y los que la app atrapa

**Depende de:** nada. **Paso previo del owner** (ver anexo): cuenta de Sentry, un proyecto Next.js y
`NEXT_PUBLIC_SENTRY_DSN` en `.env`.

## 1. Qué queremos lograr

Que un error en ReleaseView quede registrado en Sentry —con el mensaje, la ruta y el entorno— y no
solo en los logs de Vercel. El caso que lo justifica es real: el primer deploy mostró "No se pudo
cargar la lista de clientes" porque `DATABASE_URL` estaba mal, y la única forma de enterarse fue ir a
leer logs a mano.

## 2. Qué hay hoy

- **Ningún monitoreo.** Los errores del servidor salen por `console.error` a los logs de Vercel.
- **17 sitios atrapan el error y lo muestran en pantalla**: `app/page.tsx`, `app/por-feature/page.tsx`,
  `app/features/page.tsx` (y `error.tsx`), `app/lista-de-release/page.tsx` (4), `app/clientes/*`,
  `app/clientes/acciones.ts` y `app/features/acciones.ts`. Todos hacen
  `console.error("<mensaje>:", error)`. **Esos archivos no se tocan.**
- **No hay `app/error.tsx` ni `app/global-error.tsx`**, ni `instrumentation.ts`.
- **`proxy.ts` es el portón** (matcher a toda ruta menos estáticos): cualquier ruta nueva queda detrás
  de él salvo `/ingresar` y `/api/sesion`.
- **`lib/env.ts`** exige cuatro claves (`CLAVES_OBLIGATORIAS`). Esta pieza **no** suma ninguna.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | **Sin `NEXT_PUBLIC_SENTRY_DSN`, Sentry está apagado y la app anda igual** | Test unitario: la función que arma la configuración (`lib/sentry.ts`) devuelve "apagado" sin DSN y con DSN vacío o en blanco. `lib/env.test.ts` sigue verde con las cuatro claves de siempre, y `CLAVES_OBLIGATORIAS` no cambia. Las dos suites actuales siguen verdes **sin** definir la variable. |
| 2 | **Con DSN, configuración mínima** | Test unitario: con DSN queda `sendDefaultPii: false`, sin trazas (`tracesSampleRate` 0), sin grabación de sesiones y sin logs; `environment` sale de `VERCEL_ENV` y, si no existe, de `NODE_ENV` (así lo que viene de tu máquina no se mezcla con producción). |
| 3 | **Captura los errores sin atrapar, del servidor y del navegador** | `instrumentation.ts` (inicia el servidor y exporta `onRequestError`), `instrumentation-client.ts` (navegador) y `app/global-error.tsx` (error de renderizado de React). Verificación #3: ver el recorrido del anexo. |
| 4 | **Captura los errores que la app atrapa (los 17 sitios), sin editarlos** | Se activa la integración de consola de Sentry para el nivel `error`. Test unitario: la configuración la incluye con ese nivel y **solo ese**. Prueba de que no se tocó nada: `git diff --stat` no muestra ninguno de los 17 archivos. |
| 5 | **Nada sensible sale de la app** | Test unitario con un evento de ejemplo: el filtro (`beforeSend`) quita las cabeceras `cookie` y `authorization` y el cuerpo de la petición, y reemplaza por `[url-de-base-oculta]` cualquier texto que parezca una connection string (`postgres://…` o `postgresql://…`). El mismo test incluye un mensaje con una connection string falsa y comprueba que sale sin ella. |
| 6 | **El build no necesita ningún token** | `npm run build` pasa **sin** `SENTRY_AUTH_TOKEN` y sin imprimir advertencias que lo exijan. No se suben source maps y no se envía la telemetría propia del build de Sentry. |
| 7 | **El portón queda intacto** | Esta pieza **no agrega ninguna ruta** (sin túnel). `tests/integracion/porton-de-acceso.test.ts` sigue verde sin editarse. |
| 8 | **El DSN solo vive en el entorno (regla #2)** | `tests/no-secretos-en-codigo.test.ts` sigue verde. El DSN no aparece en ningún archivo versionado: `git grep` por `ingest.sentry.io` y `.ingest.` da vacío. Queda declarado como variable **opcional** en `docs/arquitectura/secretos.md`. |
| 9 | **Un error de verdad llega a Sentry** | Recorrido del anexo: se repite el incidente real de hoy contra la app local y el owner ve el evento en su panel. **Esto es lo que cierra la pieza.** |

## 4. Qué ve el usuario

Nada cambia en pantalla. Salvo un caso: si falla el renderizado de toda la app,
`app/global-error.tsx` muestra una pantalla de error con el tono de `marca.md` ("Algo salió mal.",
una acción para reintentar) en lugar de la pantalla en blanco de Next. **No tiene hover ni estilos
nuevos**: usa los tokens existentes.

## 5. Qué queda afuera

Lo del plan (§2): source maps, trazas, grabación de sesiones, túnel, alertas elaboradas. Y además:
**editar los 17 sitios que hacen `console.error`** — la integración de consola los cubre sin
refactor colateral, y cambiar cómo se reportan es otro trabajo.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#2** — el DSN sale de `NEXT_PUBLIC_SENTRY_DSN`; el criterio #8 lo comprueba.
- **#3** — el plan gratuito de Sentry tiene cuota de errores; queda nombrada en `costos.md` y no se
  activa gasto adicional.

---

## Anexo técnico (para los agentes)

- **Verificá antes de arrancar (sin imprimir su valor):** que `NEXT_PUBLIC_SENTRY_DSN` exista en
  `.env`. Si no está, **no inventes un valor ni lo saltees**: los criterios #1-#8 se pueden construir
  sin ella, pero el #9 no, y la pieza no cierra. Reportá qué falta.
- **SDK:** `@sentry/nextjs` (la 11.x declara soporte para Next `^16`). Instalalo con versión exacta,
  igual que el resto del proyecto, y después corré `npm audit` y comparalo con la entrada de
  `DECISIONS.md` del 2026-10-23: cualquier vulnerabilidad nueva es un ❌ hasta que se explique.
- **Test primero:** los criterios #1, #2, #4 y #5 son tests unitarios sobre `lib/sentry.ts` (lógica
  pura: recibe el entorno, devuelve la configuración y el filtro). Tienen que fallar antes de existir.
- **No uses el asistente de instalación de Sentry** (`@sentry/wizard`): reescribe archivos y suma
  rutas que pasarían por el portón. La instalación es manual y mínima.
- **`next.config.ts`:** si lo envolvés con `withSentryConfig`, que no exija token, no suba source maps
  y no mande telemetría. Conservá `agentRules: false`, que ya está.
- **Edge:** `proxy.ts` y `lib/sesion.ts` usan solo Web Crypto por el runtime. No importes el SDK de
  Sentry desde ellos.
- **Las 3 verificaciones, en orden (regla #5):** 1) `npm run check` → 2) `npm run test:integracion`
  (**corrida sola**: apagá todo servidor propio antes; cada archivo levanta su `next dev`) →
  3) **el recorrido, que repite el incidente real:** levantá `npm run dev` con
  `DATABASE_URL="base"` solo en el entorno de ese proceso (**no en el `.env`**), entrá, abrí `/` y
  confirmá que sale "No se pudo cargar la lista de clientes". Ese `console.error` tiene que llegar a
  Sentry como evento con `environment: development`. Pedile al owner que lo confirme en su panel
  (vos no podés verlo). Apagá el servidor al terminar.
- **El paso previo del owner:** crear la cuenta en sentry.io (plan Developer, gratis) → *Create
  Project* → plataforma **Next.js** → copiar el DSN y ponerlo en `.env` como
  `NEXT_PUBLIC_SENTRY_DSN`. Después, cargarlo en Vercel para Production **y** Build (es una variable
  `NEXT_PUBLIC_`: se incrusta al construir). **No** correr el asistente de Sentry.
- **Entregables previstos:** `lib/sentry.ts` (+ su test), `instrumentation.ts`,
  `instrumentation-client.ts`, `app/global-error.tsx`, ajuste de `next.config.ts`, la dependencia en
  `package.json`/`package-lock.json`. **No toques** los 17 sitios de `console.error`, `proxy.ts`,
  `lib/sesion.ts`, `lib/prisma.ts`, `lib/organizacion.ts` ni `lib/env.ts`.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/sentry.md`, que escribe
  `/instalar-sentry` al cerrar.
