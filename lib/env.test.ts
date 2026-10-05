import { describe, expect, it } from "vitest";

import {
  CLAVES_OBLIGATORIAS,
  VariableDeEntornoFaltanteError,
  assertEnvCompleto,
  requireEnv,
} from "./env";

// Criterio #7 de la ficha M1-01 (y regla #2): si falta una variable obligatoria el fallo es
// explícito — nombra la variable y dónde definirla — y nunca un cuelgue silencioso.
describe("requireEnv", () => {
  it("devuelve el valor cuando la variable está definida", () => {
    expect(requireEnv("DATABASE_URL", { DATABASE_URL: "postgresql://x" })).toBe(
      "postgresql://x",
    );
  });

  it("falla explícitamente nombrando la variable que falta", () => {
    expect(() => requireEnv("DATABASE_URL", {})).toThrow(
      VariableDeEntornoFaltanteError,
    );
    expect(() => requireEnv("DATABASE_URL", {})).toThrow(/DATABASE_URL/);
    expect(() => requireEnv("DATABASE_URL", {})).toThrow(/\.env/);
  });

  it("trata una variable vacía o en blanco como faltante", () => {
    expect(() => requireEnv("SESSION_SECRET", { SESSION_SECRET: "" })).toThrow(
      VariableDeEntornoFaltanteError,
    );
    expect(() => requireEnv("SESSION_SECRET", { SESSION_SECRET: "   " })).toThrow(
      VariableDeEntornoFaltanteError,
    );
  });

  it("no filtra el valor de la variable en el mensaje de error", () => {
    let mensaje = "";
    try {
      requireEnv("FALTANTE", { OTRA_CLAVE: "valor-secreto-abc123" });
    } catch (error) {
      mensaje = (error as Error).message;
    }
    expect(mensaje).not.toContain("valor-secreto-abc123");
  });
});

describe("assertEnvCompleto", () => {
  const envCompleto = {
    DATABASE_URL: "postgresql://pooler:6543/db?pgbouncer=true",
    DIRECT_URL: "postgresql://pooler:5432/db",
    APP_PASSWORD: "no-es-una-clave-real",
    SESSION_SECRET: "no-es-un-secreto-real",
  };

  it("exige las cuatro claves de secretos.md", () => {
    expect([...CLAVES_OBLIGATORIAS]).toEqual([
      "DATABASE_URL",
      "DIRECT_URL",
      "APP_PASSWORD",
      "SESSION_SECRET",
    ]);
  });

  it("pasa cuando están las cuatro", () => {
    expect(() => assertEnvCompleto(envCompleto)).not.toThrow();
  });

  it("falla nombrando TODAS las que faltan, no solo la primera", () => {
    const env = { DATABASE_URL: envCompleto.DATABASE_URL };
    expect(() => assertEnvCompleto(env)).toThrow(/DIRECT_URL/);
    expect(() => assertEnvCompleto(env)).toThrow(/APP_PASSWORD/);
    expect(() => assertEnvCompleto(env)).toThrow(/SESSION_SECRET/);
  });
});
