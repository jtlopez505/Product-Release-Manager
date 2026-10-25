import type { ErrorEvent } from "@sentry/core";

/**
 * Configuración de Sentry como lógica pura: recibe el entorno y devuelve qué hacer.
 *
 * Vive aparte de `instrumentation*.ts` para poder probarse sin el SDK y porque ese es el único
 * lugar donde se decide qué sale de la app (regla #2: el DSN sale solo de
 * NEXT_PUBLIC_SENTRY_DSN). Sin DSN, Sentry queda apagado y la app anda igual.
 *
 * No importar este módulo desde `proxy.ts` ni `lib/sesion.ts` (runtime edge).
 */

export type OpcionesSentry = {
  dsn: string;
  environment: string;
  sendDefaultPii: false;
  tracesSampleRate: 0;
  replaysSessionSampleRate: 0;
  replaysOnErrorSampleRate: 0;
  enableLogs: false;
  beforeSend: typeof filtrarEvento;
};

export type ConfiguracionSentry =
  | { activo: false }
  | {
      activo: true;
      opciones: OpcionesSentry;
      /** Niveles de consola que se mandan a Sentry: solo `error` (los 17 console.error de la app). */
      nivelesDeConsola: ["error"];
    };

const PATRON_URL_DE_BASE = /postgres(?:ql)?:\/\/[^\s"'`<>\\]+/gi;
const MARCA_URL_OCULTA = "[url-de-base-oculta]";

type Entorno = Record<string, string | undefined>;

export function armarConfiguracionSentry(entorno: Entorno): ConfiguracionSentry {
  const dsn = entorno.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return { activo: false };

  return {
    activo: true,
    opciones: {
      dsn,
      // Así lo que viene de la máquina de desarrollo no se mezcla con producción.
      environment: entorno.VERCEL_ENV || entorno.NODE_ENV || "development",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      enableLogs: false,
      beforeSend: filtrarEvento,
    },
    nivelesDeConsola: ["error"],
  };
}

/** Quita cookies, authorization y cuerpo de la petición, y oculta connection strings. */
export function filtrarEvento<T extends Pick<ErrorEvent, "request"> | Record<string, unknown>>(
  evento: T,
): T {
  const copia = { ...evento } as Record<string, unknown>;
  const request = copia.request as
    | { headers?: Record<string, string>; data?: unknown; cookies?: unknown }
    | undefined;

  if (request) {
    const { headers, ...resto } = request;
    const limpia: Record<string, unknown> = { ...resto };
    delete limpia.data;
    delete limpia.cookies;
    if (headers) {
      limpia.headers = Object.fromEntries(
        Object.entries(headers).filter(
          ([nombre]) => !["cookie", "authorization"].includes(nombre.toLowerCase()),
        ),
      );
    }
    copia.request = limpia;
  }

  return JSON.parse(
    JSON.stringify(copia).replace(PATRON_URL_DE_BASE, MARCA_URL_OCULTA),
  ) as T;
}
