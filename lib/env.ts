/**
 * Lectura de variables de entorno (regla #2 · docs/arquitectura/secretos.md).
 *
 * Toda clave sale de `.env` (local) o de las Environment Variables de Vercel (producción):
 * nunca del código. Este módulo es el único lugar que las lee, y falla ruidosamente cuando
 * falta una — un cuelgue silencioso o una página en blanco esconden la causa real.
 */

/** Las cuatro claves que la app necesita para arrancar (secretos.md). */
export const CLAVES_OBLIGATORIAS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "APP_PASSWORD",
  "SESSION_SECRET",
] as const;

export type ClaveObligatoria = (typeof CLAVES_OBLIGATORIAS)[number];

type FuenteDeEnv = Record<string, string | undefined>;

export class VariableDeEntornoFaltanteError extends Error {
  readonly faltantes: readonly string[];

  constructor(faltantes: readonly string[]) {
    const lista = faltantes.join(", ");
    super(
      `Falta${faltantes.length > 1 ? "n" : ""} variable${
        faltantes.length > 1 ? "s" : ""
      } de entorno obligatoria${faltantes.length > 1 ? "s" : ""}: ${lista}. ` +
        `Definila${faltantes.length > 1 ? "s" : ""} en el archivo .env de la raíz del proyecto ` +
        `(en producción, en las Environment Variables de Vercel). ` +
        `Ver docs/arquitectura/secretos.md. La app no arranca sin esto.`,
    );
    this.name = "VariableDeEntornoFaltanteError";
    this.faltantes = faltantes;
  }
}

function estaDefinida(valor: string | undefined): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Devuelve el valor de una variable de entorno o lanza un error que nombra la variable
 * faltante. Nunca incluye valores en el mensaje (no filtra secretos en logs).
 */
export function requireEnv(
  nombre: string,
  env: FuenteDeEnv = process.env,
): string {
  const valor = env[nombre];
  if (!estaDefinida(valor)) {
    throw new VariableDeEntornoFaltanteError([nombre]);
  }
  return valor;
}

/**
 * Chequea de una sola vez las cuatro claves obligatorias y reporta TODAS las que falten,
 * para no tener que descubrirlas de a una.
 */
export function assertEnvCompleto(env: FuenteDeEnv = process.env): void {
  const faltantes = CLAVES_OBLIGATORIAS.filter(
    (clave) => !estaDefinida(env[clave]),
  );
  if (faltantes.length > 0) {
    throw new VariableDeEntornoFaltanteError(faltantes);
  }
}
