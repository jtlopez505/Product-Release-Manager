import { describe, expect, it } from "vitest";

import {
  MENSAJES_DE_CLIENTE,
  laVersionCambio,
  parsearEntradaDeCliente,
} from "./validacion-de-cliente";

/**
 * Verificación 1 de M1-04 (unitarias): lo que se acepta como cliente y — lo más importante de
 * la pieza — la decisión de "¿esto suma una fila de historial o no?", sin base de datos.
 *
 * Por qué vive separado de `lib/clientes.ts`: ese módulo importa `lib/prisma.ts`, que exige
 * DATABASE_URL al importarse, y la verificación 1 tiene que poder correr sin Supabase
 * (`vitest.config.mts` no carga `.env`). Mismo reparto que M1-03.
 *
 * Mide los criterios #2, #3, #4 (la regla del historial) y #6 (rechazo sin nombre o sin
 * versión) de la ficha, en la parte que no necesita mirar lo ya guardado.
 */

describe("laVersionCambio · la regla del historial (criterios #2, #3 y #4)", () => {
  it("la primera carga cuenta como cambio: no hay versión anterior", () => {
    // `null` = el cliente se está creando. El PRD lo dice explícito: "incluida la primera
    // carga". Es la fila de historial que más fácil se olvida.
    expect(laVersionCambio(null, "2.4.0")).toBe(true);
  });

  it("guardar la misma versión no es un cambio", () => {
    expect(laVersionCambio("2.4.0", "2.4.0")).toBe(false);
  });

  it("la misma versión con espacios al borde tampoco es un cambio", () => {
    expect(laVersionCambio("2.4.0", "  2.4.0  ")).toBe(false);
  });

  it("una versión distinta sí es un cambio", () => {
    expect(laVersionCambio("2.4.0", "2.4.1")).toBe(true);
  });

  it("distingue mayúsculas: `1.0.0-RC1` y `1.0.0-rc1` son versiones distintas", () => {
    // Una versión es un identificador que el equipo copia tal cual del release, no texto
    // libre a interpretar: adivinar que dos capitalizaciones son "la misma" escondería un
    // cambio real.
    expect(laVersionCambio("1.0.0-RC1", "1.0.0-rc1")).toBe(true);
  });
});

describe("parsearEntradaDeCliente · nombre y versión son obligatorios (criterio #6)", () => {
  it("rechaza el nombre vacío con el error en el campo nombre", () => {
    const resultado = parsearEntradaDeCliente({ name: "", currentVersion: "2.4.0" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_CLIENTE.nombreVacio);
    expect(resultado.errores.currentVersion).toBeUndefined();
  });

  it("rechaza un nombre que son solo espacios", () => {
    const resultado = parsearEntradaDeCliente({ name: "   ", currentVersion: "2.4.0" });
    expect(resultado.ok).toBe(false);
  });

  it("rechaza la versión vacía con el error en el campo versión", () => {
    const resultado = parsearEntradaDeCliente({ name: "Acme", currentVersion: "" });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.currentVersion).toBe(MENSAJES_DE_CLIENTE.versionVacia);
    expect(resultado.errores.name).toBeUndefined();
  });

  it("junta los dos errores en un solo intento: la persona corrige una vez", () => {
    const resultado = parsearEntradaDeCliente({});
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(Object.keys(resultado.errores).sort()).toEqual(["currentVersion", "name"]);
  });

  it("acepta nombre y versión y les recorta los espacios al borde", () => {
    const resultado = parsearEntradaDeCliente({
      name: "  Acme SA  ",
      currentVersion: "  2.4.0  ",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.name).toBe("Acme SA");
    expect(resultado.datos.currentVersion).toBe("2.4.0");
  });
});

describe("parsearEntradaDeCliente · notas y features", () => {
  it("sin notas, el campo queda nulo (no cadena vacía)", () => {
    const resultado = parsearEntradaDeCliente({ name: "Acme", currentVersion: "1.0.0" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.notes).toBeNull();
  });

  it("guarda las notas recortadas cuando vienen", () => {
    const resultado = parsearEntradaDeCliente({
      name: "Acme",
      currentVersion: "1.0.0",
      notes: "  Pidió el feature de exportar  ",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.notes).toBe("Pidió el feature de exportar");
  });

  it("sin features elegidos la lista queda vacía, no rechaza el alta (criterio #7)", () => {
    const resultado = parsearEntradaDeCliente({ name: "Acme", currentVersion: "1.0.0" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.featureIds).toEqual([]);
  });

  it("toma la lista de features elegidos tal como la manda el checklist", () => {
    const resultado = parsearEntradaDeCliente({
      name: "Acme",
      currentVersion: "1.0.0",
      featureIds: ["f1", "f2"],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.featureIds).toEqual(["f1", "f2"]);
  });

  it("un solo feature tildado también llega como lista", () => {
    const resultado = parsearEntradaDeCliente({
      name: "Acme",
      currentVersion: "1.0.0",
      featureIds: "f1",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.featureIds).toEqual(["f1"]);
  });

  it("descarta ids repetidos y vacíos: el mismo feature no se habilita dos veces", () => {
    const resultado = parsearEntradaDeCliente({
      name: "Acme",
      currentVersion: "1.0.0",
      featureIds: ["f1", "f1", "", "  ", " f2 "],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.datos.featureIds).toEqual(["f1", "f2"]);
  });
});

describe("los mensajes hablan como una persona (marca.md § Voz y tono)", () => {
  it("la confirmación de guardado es la que pide marca.md", () => {
    expect(MENSAJES_DE_CLIENTE.guardado).toBe("Cliente guardado.");
  });

  it("el estado vacío del checklist es el de la ficha §4", () => {
    expect(MENSAJES_DE_CLIENTE.sinFeatures).toBe("Todavía no hay features cargados.");
  });

  it("ninguno lleva signos de exclamación ni emojis", () => {
    for (const mensaje of Object.values(MENSAJES_DE_CLIENTE)) {
      expect(mensaje).not.toMatch(/[!¡]/);
      expect(mensaje).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
