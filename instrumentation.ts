import * as Sentry from "@sentry/nextjs";

import { armarConfiguracionSentry } from "./lib/sentry";

/**
 * Arranca Sentry en el servidor (Node y edge). Sin NEXT_PUBLIC_SENTRY_DSN no hace nada.
 * Los console.error que la app ya escribe al atrapar un error llegan por la integración de
 * consola, solo en nivel `error`.
 */
export function register(): void {
  const config = armarConfiguracionSentry(process.env);
  if (!config.activo) return;

  Sentry.init({
    ...config.opciones,
    integrations: [Sentry.captureConsoleIntegration({ levels: config.nivelesDeConsola })],
  });
}

export const onRequestError = Sentry.captureRequestError;
