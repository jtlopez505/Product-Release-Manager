import { describe, expect, it } from "vitest";

import { particionarClientesPorFeature } from "./consulta-por-feature";

/**
 * Verificación 1 de M2-01: la partición de clientes por feature, sin base de datos.
 *
 * Es la decisión que la pantalla no puede equivocar y que no hace falta una query para
 * comprobar (criterio #4 de la ficha): la fila deshabilitada y la ausencia de fila caen las
 * dos en "no lo tiene todavía", y un id ajeno no inventa una fila ni suma al conteo.
 */

const C = (id: string, name: string, currentVersion = "1.0.0") => ({
  id,
  name,
  currentVersion,
});

describe("particionarClientesPorFeature · criterios #3 y #4 (lo tienen vs. todavía no)", () => {
  // A y B con el feature habilitado, C sin ninguna fila de ClientFeature, D con la fila en
  // enabled: false. Son exactamente las cuatro situaciones que pide la ficha §3 fila 3.
  const clientes = [C("a", "A"), C("b", "B"), C("c", "C"), C("d", "D")];

  it("A y B habilitados caen en 'lo tienen'; C (sin fila) y D (fila deshabilitada) en 'todavía no'", () => {
    // Nótese: los ids de C y D NUNCA llegan en `idsConFeatureHabilitado` — así es como
    // featuresHabilitadosDeCliente/idsDeClientesConFeatureHabilitado representan "sin fila" y
    // "fila en enabled: false": ninguna de las dos aparece en la lista de habilitados.
    const particion = particionarClientesPorFeature(clientes, ["a", "b"]);

    expect(particion.loTienen.map((c) => c.id)).toEqual(["a", "b"]);
    expect(particion.noLoTienenTodavia.map((c) => c.id)).toEqual(["c", "d"]);
  });

  it("cada cliente cae en una lista y en una sola: ninguno repetido ni faltante", () => {
    const particion = particionarClientesPorFeature(clientes, ["a", "b"]);
    expect(particion.loTienen.length + particion.noLoTienenTodavia.length).toBe(
      clientes.length,
    );
  });

  it("conserva el orden de la lista dentro de cada grupo (viene ordenada por nombre)", () => {
    const particion = particionarClientesPorFeature(clientes, ["d", "a"]);
    expect(particion.loTienen.map((c) => c.name)).toEqual(["A", "D"]);
    expect(particion.noLoTienenTodavia.map((c) => c.name)).toEqual(["B", "C"]);
  });

  it("ningún cliente con el feature deja todo en 'todavía no'", () => {
    const particion = particionarClientesPorFeature(clientes, []);
    expect(particion.loTienen).toEqual([]);
    expect(particion.noLoTienenTodavia).toHaveLength(4);
  });

  it("todos los clientes con el feature deja 'todavía no' vacío", () => {
    const particion = particionarClientesPorFeature(clientes, ["a", "b", "c", "d"]);
    expect(particion.loTienen).toHaveLength(4);
    expect(particion.noLoTienenTodavia).toEqual([]);
  });

  it("un id habilitado que no es de ningún cliente de la lista no inventa una fila", () => {
    // Puede pasar con un cliente de otra organización: `idsDeClientesConFeatureHabilitado`
    // nunca lo devuelve, pero si pasara, la partición no tiene que sumarlo a ningún grupo.
    const particion = particionarClientesPorFeature(clientes, ["a", "fantasma-de-otra-org"]);
    expect(particion.loTienen.map((c) => c.id)).toEqual(["a"]);
    expect(particion.noLoTienenTodavia.map((c) => c.id)).toEqual(["b", "c", "d"]);
  });

  it("sin clientes, la partición queda vacía en los dos grupos", () => {
    const particion = particionarClientesPorFeature([], ["a"]);
    expect(particion.loTienen).toEqual([]);
    expect(particion.noLoTienenTodavia).toEqual([]);
  });

  it("no muta la lista que recibe", () => {
    const original = [...clientes];
    particionarClientesPorFeature(clientes, ["a"]);
    expect(clientes).toEqual(original);
  });
});
