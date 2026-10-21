/**
 * La base de datos contra la que corre la verificación 2 (ficha M4-00).
 *
 * La suite de integración NO corre contra la base real del owner: corre contra un segundo
 * proyecto de Supabase, declarado en `.env` como `DATABASE_URL_TEST` / `DIRECT_URL_TEST`
 * (docs/arquitectura/secretos.md). Este módulo es lógica pura — resuelve y valida — para que
 * las dos guardas se puedan probar en la verificación 1, sin base de datos.
 *
 * Quien lo usa:
 *   - `tests/integracion/entorno-de-prueba.ts` (setupFile de la suite), que aplica el
 *     reemplazo en `process.env` antes de que se importe `lib/prisma.ts`;
 *   - `scripts/base-de-prueba/*.ts` (`npm run db:migrate:test`, `npm run db:seed:test`).
 *
 * Regla #2: acá no hay ningún valor escrito. Todo sale del entorno, y ningún mensaje de error
 * incluye una connection string — solo nombres de variables.
 */

export type FuenteDeEnv = Record<string, string | undefined>;

/** Las dos variables que la app NO usa: son solo de la suite (criterio #10). */
export const CLAVES_DE_PRUEBA = ["DATABASE_URL_TEST", "DIRECT_URL_TEST"] as const;

/**
 * El nombre de la organización que siembra `npm run db:seed:test`.
 *
 * Es distinto del que usa `npm run db:seed` en la base real ("Organización principal") a
 * propósito: lo escribe **solo** el seed de prueba, así que verlo en la base viva es la prueba
 * de que la suite está conectada a la base de prueba y no a la del owner (criterio #1), sin
 * tener que mirar ninguna connection string. No se muestra en ninguna pantalla.
 */
export const NOMBRE_ORGANIZACION_DE_PRUEBA = "Organización de prueba (integración)";

/** El par real → de prueba. El orden importa: DATABASE_URL es la que lee `lib/prisma.ts`. */
const EQUIVALENCIAS = [
  { app: "DATABASE_URL", prueba: "DATABASE_URL_TEST" },
  { app: "DIRECT_URL", prueba: "DIRECT_URL_TEST" },
] as const;

export type UrlsDePrueba = {
  DATABASE_URL: string;
  DIRECT_URL: string;
};

export class BaseDePruebaMalConfiguradaError extends Error {
  readonly problemas: readonly string[];

  constructor(problemas: readonly string[]) {
    super(
      `La suite de integración no puede arrancar: la base de datos de prueba está mal ` +
        `configurada.\n` +
        problemas.map((problema) => `  - ${problema}`).join("\n") +
        `\nDefinila en el archivo .env de la raíz, apuntando a un SEGUNDO proyecto de ` +
        `Supabase (no el real). Ver docs/arquitectura/secretos.md.\n` +
        `No hay fallback a la base real a propósito: correr la integración contra los datos ` +
        `del owner es justo lo que esta guarda evita.`,
    );
    this.name = "BaseDePruebaMalConfiguradaError";
    this.problemas = problemas;
  }
}

function estaDefinida(valor: string | undefined): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Devuelve las URLs de la base de prueba, o corta nombrando el problema.
 *
 * Dos guardas, las dos ruidosas (criterios #3 y #4 de M4-00):
 *   1. si falta una variable de prueba, corta nombrándola — nunca cae a la real;
 *   2. si una variable de prueba es igual a la de la app, corta: es la connection string de
 *      producción pegada por error, y dejaría todo "verde" escribiendo en los datos reales.
 */
export function resolverBaseDePrueba(env: FuenteDeEnv): UrlsDePrueba {
  const problemas: string[] = [];

  for (const { app, prueba } of EQUIVALENCIAS) {
    const valor = env[prueba];
    if (!estaDefinida(valor)) {
      problemas.push(
        `falta ${prueba} (es la que reemplaza a ${app} durante la suite).`,
      );
      continue;
    }
    if (valor.trim() === env[app]?.trim()) {
      problemas.push(
        `${prueba} es igual a ${app}: la base de prueba sería la base real.`,
      );
    }
  }

  if (problemas.length > 0) {
    throw new BaseDePruebaMalConfiguradaError(problemas);
  }

  return {
    DATABASE_URL: env.DATABASE_URL_TEST as string,
    DIRECT_URL: env.DIRECT_URL_TEST as string,
  };
}

/**
 * Reemplaza en el entorno recibido (por defecto `process.env`) las URLs de la app por las de
 * prueba. Valida primero: si una guarda corta, el entorno queda sin tocar.
 */
export function aplicarBaseDePrueba(env: FuenteDeEnv = process.env): UrlsDePrueba {
  const urls = resolverBaseDePrueba(env);
  env.DATABASE_URL = urls.DATABASE_URL;
  env.DIRECT_URL = urls.DIRECT_URL;
  return urls;
}
