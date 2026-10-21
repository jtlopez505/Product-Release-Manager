import { describe, expect, it } from "vitest";

import {
  BaseDePruebaMalConfiguradaError,
  aplicarBaseDePrueba,
  resolverBaseDePrueba,
} from "./base-de-prueba";

/**
 * Criterios #3 y #4 de la ficha M4-00 (las dos guardas que sostienen la pieza) y el
 * reemplazo del criterio #1, probados en la verificación 1: son lógica pura, no necesitan
 * base de datos.
 *
 * Las connection strings de abajo son de fantasía a propósito (regla #2): las reales viven
 * solo en `.env` y `tests/no-secretos-en-codigo.test.ts` vigila que no se filtren acá.
 */

const REAL = "postgres://fantasia-real@host-real:6543/postgres?pgbouncer=true";
const REAL_DIRECTA = "postgres://fantasia-real@host-real:5432/postgres";
const PRUEBA = "postgres://fantasia-prueba@host-prueba:6543/postgres?pgbouncer=true";
const PRUEBA_DIRECTA = "postgres://fantasia-prueba@host-prueba:5432/postgres";

function envCompleto(): Record<string, string | undefined> {
  return {
    DATABASE_URL: REAL,
    DIRECT_URL: REAL_DIRECTA,
    DATABASE_URL_TEST: PRUEBA,
    DIRECT_URL_TEST: PRUEBA_DIRECTA,
  };
}

describe("resolverBaseDePrueba · el caso bueno", () => {
  it("devuelve las URLs de prueba, no las reales", () => {
    const resuelto = resolverBaseDePrueba(envCompleto());
    expect(resuelto).toEqual({
      DATABASE_URL: PRUEBA,
      DIRECT_URL: PRUEBA_DIRECTA,
    });
  });
});

describe("criterio #3 · corta ruidosamente si falta la variable", () => {
  it("sin DATABASE_URL_TEST lanza un error que la nombra", () => {
    const env = envCompleto();
    delete env.DATABASE_URL_TEST;

    expect(() => resolverBaseDePrueba(env)).toThrow(BaseDePruebaMalConfiguradaError);
    expect(() => resolverBaseDePrueba(env)).toThrow(/DATABASE_URL_TEST/);
  });

  it("una DATABASE_URL_TEST vacía o en blanco cuenta como ausente", () => {
    for (const vacio of ["", "   "]) {
      const env = { ...envCompleto(), DATABASE_URL_TEST: vacio };
      expect(() => resolverBaseDePrueba(env)).toThrow(/DATABASE_URL_TEST/);
    }
  });

  it("sin DIRECT_URL_TEST también corta, nombrándola", () => {
    const env = envCompleto();
    delete env.DIRECT_URL_TEST;

    expect(() => resolverBaseDePrueba(env)).toThrow(/DIRECT_URL_TEST/);
  });

  it("JAMÁS cae de vuelta a la base real: el error no devuelve nada usable", () => {
    const env = envCompleto();
    delete env.DATABASE_URL_TEST;
    delete env.DIRECT_URL_TEST;

    let capturado: unknown;
    try {
      resolverBaseDePrueba(env);
    } catch (error) {
      capturado = error;
    }
    expect(capturado).toBeInstanceOf(BaseDePruebaMalConfiguradaError);
    const mensaje = (capturado as Error).message;
    expect(mensaje).toContain("DATABASE_URL_TEST");
    expect(mensaje).toContain("DIRECT_URL_TEST");
  });
});

describe("criterio #4 · corta ruidosamente si la base de prueba es la real", () => {
  it("con DATABASE_URL_TEST igual a DATABASE_URL lanza nombrando las dos", () => {
    const env = { ...envCompleto(), DATABASE_URL_TEST: REAL };

    expect(() => resolverBaseDePrueba(env)).toThrow(BaseDePruebaMalConfiguradaError);
    expect(() => resolverBaseDePrueba(env)).toThrow(/DATABASE_URL_TEST/);
    expect(() => resolverBaseDePrueba(env)).toThrow(/DATABASE_URL\b/);
  });

  it("ignora espacios alrededor: una copia con un espacio de más sigue siendo la real", () => {
    const env = { ...envCompleto(), DATABASE_URL_TEST: ` ${REAL} ` };

    expect(() => resolverBaseDePrueba(env)).toThrow(BaseDePruebaMalConfiguradaError);
  });

  it("con DIRECT_URL_TEST igual a DIRECT_URL también corta", () => {
    const env = { ...envCompleto(), DIRECT_URL_TEST: REAL_DIRECTA };

    expect(() => resolverBaseDePrueba(env)).toThrow(/DIRECT_URL_TEST/);
  });
});

describe("regla #2 · los errores no filtran valores", () => {
  it("ningún mensaje de error incluye una connection string", () => {
    const casos: Array<Record<string, string | undefined>> = [
      { ...envCompleto(), DATABASE_URL_TEST: undefined },
      { ...envCompleto(), DATABASE_URL_TEST: REAL },
      { ...envCompleto(), DIRECT_URL_TEST: REAL_DIRECTA },
    ];

    for (const env of casos) {
      let mensaje = "";
      try {
        resolverBaseDePrueba(env);
      } catch (error) {
        mensaje = (error as Error).message;
      }
      expect(mensaje.length).toBeGreaterThan(0);
      for (const valor of [REAL, REAL_DIRECTA, PRUEBA, PRUEBA_DIRECTA]) {
        expect(mensaje).not.toContain(valor);
      }
    }
  });
});

describe("aplicarBaseDePrueba", () => {
  it("reemplaza DATABASE_URL y DIRECT_URL por las de prueba", () => {
    const env = envCompleto();

    aplicarBaseDePrueba(env);

    expect(env.DATABASE_URL).toBe(PRUEBA);
    expect(env.DIRECT_URL).toBe(PRUEBA_DIRECTA);
    // Las de prueba quedan intactas: el test de integración las usa para comprobar el swap.
    expect(env.DATABASE_URL_TEST).toBe(PRUEBA);
    expect(env.DIRECT_URL_TEST).toBe(PRUEBA_DIRECTA);
  });

  it("si la guarda corta, no deja DATABASE_URL a medio reemplazar", () => {
    const env = envCompleto();
    delete env.DATABASE_URL_TEST;

    expect(() => aplicarBaseDePrueba(env)).toThrow(BaseDePruebaMalConfiguradaError);
    expect(env.DATABASE_URL).toBe(REAL);
    expect(env.DIRECT_URL).toBe(REAL_DIRECTA);
  });
});
