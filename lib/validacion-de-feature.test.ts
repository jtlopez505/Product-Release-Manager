import { describe, expect, it } from "vitest";

import {
  MENSAJES_DE_FEATURE,
  normalizarNombreDeFeature,
  parsearEntradaDeFeature,
} from "./validacion-de-feature";

/**
 * Verificación 1 de M1-03 (unitarias): las reglas de validación del alta/edición de un
 * feature, sin base de datos de por medio.
 *
 * Por qué vive separado de `lib/features.ts`: el acceso a datos importa `lib/prisma.ts`, que
 * exige DATABASE_URL al importarse. La verificación 1 tiene que poder correr sin base
 * (vitest.config.mts no carga .env), así que lo que es lógica pura va en su propio módulo.
 *
 * Lo que mide: criterios #1 (nombre obligatorio, estado por defecto), #4 (sin nombre no se
 * guarda) y la mitad "sin base" del #5 (cómo se compara un nombre duplicado) de la ficha.
 */

describe("normalizarNombreDeFeature · criterio de duplicado (ficha §3 fila 5)", () => {
  it("ignora mayúsculas y espacios al borde", () => {
    expect(normalizarNombreDeFeature("login sso ")).toBe(
      normalizarNombreDeFeature("Login SSO"),
    );
  });

  it("no ignora diferencias reales de nombre", () => {
    expect(normalizarNombreDeFeature("Login SSO")).not.toBe(
      normalizarNombreDeFeature("Login SAML"),
    );
  });

  it("no colapsa espacios internos: son parte del nombre", () => {
    expect(normalizarNombreDeFeature("Login  SSO")).not.toBe(
      normalizarNombreDeFeature("Login SSO"),
    );
  });
});

describe("parsearEntradaDeFeature · nombre obligatorio (criterios #1 y #4)", () => {
  it("rechaza el nombre vacío con un error en el campo nombre", () => {
    const resultado = parsearEntradaDeFeature({ name: "" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_FEATURE.nombreVacio);
  });

  it("rechaza un nombre que son solo espacios", () => {
    const resultado = parsearEntradaDeFeature({ name: "   " });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_FEATURE.nombreVacio);
  });

  it("rechaza cuando el campo nombre no vino en el formulario", () => {
    const resultado = parsearEntradaDeFeature({});
    expect(resultado.ok).toBe(false);
  });

  it("acepta un nombre y lo guarda sin espacios al borde", () => {
    const resultado = parsearEntradaDeFeature({ name: "  Login SSO  " });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.name).toBe("Login SSO");
  });
});

describe("parsearEntradaDeFeature · el resto del catálogo es opcional (criterio #1)", () => {
  it("con solo el nombre, los campos opcionales quedan nulos y el estado sin elegir", () => {
    const resultado = parsearEntradaDeFeature({ name: "Login SSO" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos).toEqual({
      name: "Login SSO",
      code: null,
      producto: null,
      queHace: null,
      queProblemaResuelve: null,
      aQuienBeneficia: null,
      prioridad: null,
      // null = no se eligió: el default DISPONIBLE lo pone el esquema (modelo-de-datos.md).
      estado: null,
      metricaExito: null,
      observaciones: null,
    });
  });

  it("toma los diez campos del catálogo y recorta los espacios al borde", () => {
    const resultado = parsearEntradaDeFeature({
      name: "Login SSO",
      code: " F-020 ",
      producto: " IWIA - Nexus Go/Pro ",
      queHace: " Permite entrar con la cuenta corporativa ",
      queProblemaResuelve: " Evita otra contraseña más ",
      aQuienBeneficia: " Al equipo de IT del cliente ",
      prioridad: "ALTA",
      estado: "EN_DESARROLLO",
      metricaExito: " Altas sin ticket de soporte ",
      observaciones: " Pendiente de prueba con el cliente piloto ",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos).toEqual({
      name: "Login SSO",
      code: "F-020",
      producto: "IWIA - Nexus Go/Pro",
      queHace: "Permite entrar con la cuenta corporativa",
      queProblemaResuelve: "Evita otra contraseña más",
      aQuienBeneficia: "Al equipo de IT del cliente",
      prioridad: "ALTA",
      estado: "EN_DESARROLLO",
      metricaExito: "Altas sin ticket de soporte",
      observaciones: "Pendiente de prueba con el cliente piloto",
    });
  });

  it("un código vacío queda nulo, no cadena vacía (el unique de código no lo choca)", () => {
    const resultado = parsearEntradaDeFeature({ name: "Login SSO", code: "   " });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.code).toBeNull();
  });
});

describe("parsearEntradaDeFeature · prioridad y estado solo aceptan valores del esquema", () => {
  it("rechaza una prioridad inventada", () => {
    const resultado = parsearEntradaDeFeature({ name: "Login SSO", prioridad: "URGENTE" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.prioridad).toBe(MENSAJES_DE_FEATURE.prioridadInvalida);
  });

  it("rechaza un estado inventado", () => {
    const resultado = parsearEntradaDeFeature({ name: "Login SSO", estado: "ARCHIVADO" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.estado).toBe(MENSAJES_DE_FEATURE.estadoInvalido);
  });

  it("acepta los tres estados y las tres prioridades del modelo de datos", () => {
    for (const prioridad of ["ALTA", "MEDIA", "BAJA"]) {
      expect(parsearEntradaDeFeature({ name: "X", prioridad }).ok).toBe(true);
    }
    for (const estado of ["DISPONIBLE", "EN_DESARROLLO", "PROXIMAMENTE"]) {
      expect(parsearEntradaDeFeature({ name: "X", estado }).ok).toBe(true);
    }
  });

  it("acumula los errores de todos los campos en un solo intento", () => {
    const resultado = parsearEntradaDeFeature({
      name: "",
      prioridad: "URGENTE",
      estado: "ARCHIVADO",
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(Object.keys(resultado.errores).sort()).toEqual([
      "estado",
      "name",
      "prioridad",
    ]);
  });
});

describe("los mensajes de error hablan como una persona (marca.md § Voz y tono)", () => {
  it("el de duplicado es exactamente el que pide la ficha", () => {
    expect(MENSAJES_DE_FEATURE.nombreDuplicado).toBe(
      "Ya existe un feature con ese nombre.",
    );
  });

  it("ninguno lleva signos de exclamación ni emojis", () => {
    for (const mensaje of Object.values(MENSAJES_DE_FEATURE)) {
      expect(mensaje).not.toMatch(/[!¡]/);
      expect(mensaje).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
