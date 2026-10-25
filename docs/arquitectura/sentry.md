# Monitoreo de errores — Sentry

## En llano

Cuando algo falla en ReleaseView —en el servidor, en el navegador o en una consulta a la base—,
el error llega a Sentry con el mensaje, la ruta y el entorno, y no hace falta ir a leer los logs de
Vercel. Nace de un caso real: el primer deploy mostraba "No se pudo cargar la lista de clientes"
porque `DATABASE_URL` estaba mal pegada, y la única forma de enterarse fue buscarlo a mano.

Es una pieza **opcional y apagable**: sin `NEXT_PUBLIC_SENTRY_DSN`, Sentry no arranca y la app anda igual.

## Por qué así

- **Los errores que la app atrapa también se capturan.** Hay 17 lugares donde la app hace
  `try/catch`, escribe `console.error(...)` y muestra "No se pudo cargar…". Un Sentry instalado de
  fábrica no los ve, porque no son errores sin atrapar. Se resuelve con la integración de consola de
  Sentry, solo en nivel `error`, **sin editar esos 17 archivos**.
- **Solo errores.** Sin trazas de rendimiento, grabación de sesiones ni logs: gastan cuota y capturan
  más datos de los que necesita un piloto de 1 o 2 personas.
- **Instalación a mano y mínima.** Sin el asistente de Sentry, que reescribe archivos y agrega rutas
  que quedarían detrás del portón.
- **Sin source maps ni token.** Subirlos exigiría un segundo secreto en el build. El costo: en
  producción los errores del navegador muestran el código minificado; el mensaje, la ruta y el
  contexto sí se ven. Se suma después si hace falta.
- **Sin túnel.** Los eventos del navegador van directo a Sentry y un bloqueador de anuncios puede
  cortarlos. Un túnel sería una ruta más detrás del portón.

## Cómo quedó acá

| Pieza | Para qué |
|---|---|
| `lib/sentry.ts` (+ test) | La lógica pura: arma la configuración desde el entorno (apagado sin DSN) y filtra cada evento antes de enviarlo |
| `instrumentation.ts` | Arranca Sentry en el servidor y exporta `onRequestError` (errores sin atrapar) |
| `instrumentation-client.ts` | Arranca Sentry en el navegador |
| `app/global-error.tsx` | Pantalla de error si falla el render de toda la app, con el tono de `marca.md` |
| `next.config.ts` | Envuelve con `withSentryConfig`: sin token, sin source maps, sin telemetría de Sentry |

- **Versión:** `@sentry/nextjs` 11.9.0, exacta.
- **Entorno (`environment`):** sale de `VERCEL_ENV` y, si no existe, de `NODE_ENV`, así lo que viene de
  la máquina de desarrollo (`development`) no se mezcla con producción. En el navegador hace falta
  además `NEXT_PUBLIC_VERCEL_ENV`; sin ella, una vista previa de Vercel figuraría como `production`.
  En producción real no cambia nada.
- **Qué NO sale de la app:** `sendDefaultPii: false`; el filtro quita las cabeceras `cookie` y
  `authorization` y el cuerpo de la petición, y reemplaza cualquier texto `postgres://…` o
  `postgresql://…` por `[url-de-base-oculta]`. Hay un test con un evento de ejemplo.
- **Qué sí sale:** el mensaje del error, la ruta, el entorno y rutas de archivos del servidor
  (por ejemplo `C:\dev\...` en desarrollo).
- **Lo que NO se tocó:** los 17 `console.error`, `proxy.ts`, `lib/sesion.ts`, `lib/prisma.ts`,
  `lib/organizacion.ts`, `lib/env.ts`. `CLAVES_OBLIGATORIAS` no cambió.

## Dónde está el DSN (regla #2)

En la variable **opcional** `NEXT_PUBLIC_SENTRY_DSN`: en tu `.env` local y en Vercel
(**Production y Build**, porque una variable `NEXT_PUBLIC_` se incrusta al construir). Nunca en el
código ni en el repo. Aunque el DSN viaja en el JavaScript del navegador por diseño y solo permite
*enviar* eventos, se trata como variable de entorno. Ver `secretos.md`.

## Costo y techo (regla #3)

Plan **Developer** (gratuito): unos 5.000 errores por mes. Sobra para 1 o 2 personas; un error en
bucle podría gastarlo en horas, así que se mira el panel el primer mes. No se activa gasto adicional.
La prueba de 14 días de un plan pago vence sola y la cuenta vuelve a Developer. Ver `costos.md`.

## Cómo se verifica

Repetir el incidente real: levantar `npm run dev` con `DATABASE_URL="base"` **solo en el entorno de
ese proceso** (no en el `.env`), entrar y abrir `/`. Tiene que salir "No se pudo cargar la lista de
clientes" y aparecer en el panel de Sentry, proyecto `releaseview`, un evento con
`environment: development`. Verificado el 2026-10-24 (evento `RELEASEVIEW-1`, error `P1001` con el
mensaje `Can't reach database server at base`), confirmado por el owner en su panel.

## Anexo técnico

- `lib/sentry.ts` no importa el SDK en tiempo de ejecución, solo tipos; los `instrumentation*.ts`
  arman `Sentry.captureConsoleIntegration({ levels: ["error"] })`.
- En 11.9.0 `withSentryConfig` se importa de `@sentry/nextjs/config`. Está configurado con
  `telemetry: false`, `sourcemaps: { disable: true }` y `release: { create: false }`.
- `proxy.ts` y `lib/sesion.ts` usan solo Web Crypto por el runtime edge: no deben importar el SDK.
