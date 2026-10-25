import * as Sentry from "@sentry/nextjs";

import { armarConfiguracionSentry } from "./lib/sentry";

// En el navegador Next solo reemplaza los accesos literales a process.env.NEXT_PUBLIC_*:
// por eso el entorno se arma a mano y no se pasa `process.env` entero.
const config = armarConfiguracionSentry({
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
});

if (config.activo) {
  Sentry.init({
    ...config.opciones,
    integrations: [Sentry.captureConsoleIntegration({ levels: config.nivelesDeConsola })],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
