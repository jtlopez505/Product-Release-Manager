import { describe, expect, it } from "vitest";

import {
  MENSAJES_DE_LISTA_DE_RELEASE,
  mensajeDeClientesQueYaEstan,
  particionarClientesPorVersion,
  tituloDeListaDeRelease,
  versionPedida,
} from "./lista-de-release";

/**
 * Verificación 1 de M3-01: la partición de clientes por versión destino, y los textos que
 * dependen de ella, sin base de datos.
 *
 * Mismo problema que `particionarClientesPorFeature` (`lib/consulta-por-feature.ts`), con
 * otro criterio de corte: se recorre la lista completa de clientes y la comparación **es**
 * `laVersionCambio` (`lib/validacion-de-cliente.ts`) — no se reescribe la regla acá (ficha
 * §3 fila 4).
 */

const C = (id: string, name: string, currentVersion: string) => ({ id, name, currentVersion });

describe("particionarClientesPorVersion · criterio #3 (reciben vs. ya están)", () => {
  // A en 2.4.0, B en 2.4.1, C en 2.5.0, D en 2.6.0 (adelantado) — el caso de la ficha §3 fila 3.
  const clientes = [
    C("a", "A", "2.4.0"),
    C("b", "B", "2.4.1"),
    C("c", "C", "2.5.0"),
    C("d", "D", "2.6.0"),
  ];

  it("pedir 2.5.0 lista A, B y D en 'reciben'; C queda en 'ya están'", () => {
    const particion = particionarClientesPorVersion(clientes, "2.5.0");
    expect(particion.reciben.map((c) => c.id)).toEqual(["a", "b", "d"]);
    expect(particion.yaEstan.map((c) => c.id)).toEqual(["c"]);
  });

  it("cada cliente cae en un solo grupo: ninguno repetido ni faltante", () => {
    const particion = particionarClientesPorVersion(clientes, "2.5.0");
    expect(particion.reciben.length + particion.yaEstan.length).toBe(clientes.length);
  });

  it("conserva el orden de la lista dentro de cada grupo", () => {
    const particion = particionarClientesPorVersion(clientes, "2.5.0");
    expect(particion.reciben.map((c) => c.name)).toEqual(["A", "B", "D"]);
  });

  it("sin clientes, los dos grupos quedan vacíos", () => {
    const particion = particionarClientesPorVersion([], "2.5.0");
    expect(particion.reciben).toEqual([]);
    expect(particion.yaEstan).toEqual([]);
  });

  it("no muta la lista que recibe", () => {
    const original = [...clientes];
    particionarClientesPorVersion(clientes, "2.5.0");
    expect(clientes).toEqual(original);
  });
});

describe("particionarClientesPorVersion · criterio #4 (misma regla que el historial)", () => {
  it("ignora espacios al borde: pedir ' 2.5.0 ' da lo mismo que '2.5.0'", () => {
    const clientes = [C("c", "C", "2.5.0")];
    const conEspacios = particionarClientesPorVersion(clientes, " 2.5.0 ");
    const sinEspacios = particionarClientesPorVersion(clientes, "2.5.0");
    expect(conEspacios.yaEstan.map((c) => c.id)).toEqual(sinEspacios.yaEstan.map((c) => c.id));
    expect(conEspacios.yaEstan.map((c) => c.id)).toEqual(["c"]);
  });

  it("no ignora mayúsculas: un cliente en 2.5.0-RC1 recibe el pedido de 2.5.0-rc1", () => {
    const clientes = [C("c", "C", "2.5.0-RC1")];
    const particion = particionarClientesPorVersion(clientes, "2.5.0-rc1");
    expect(particion.reciben.map((c) => c.id)).toEqual(["c"]);
    expect(particion.yaEstan).toEqual([]);
  });
});

describe("versionPedida · criterio #7 (sin versión pedida, vacío o solo espacios)", () => {
  it("undefined es 'sin versión pedida'", () => {
    expect(versionPedida(undefined)).toBeNull();
  });

  it("una cadena vacía es 'sin versión pedida'", () => {
    expect(versionPedida("")).toBeNull();
  });

  it("solo espacios es 'sin versión pedida'", () => {
    expect(versionPedida("   ")).toBeNull();
  });

  it("una versión con espacios al borde se recorta", () => {
    expect(versionPedida("  2.5.0  ")).toBe("2.5.0");
  });

  it("conserva el texto tal cual, aunque tenga caracteres raros (criterio #11)", () => {
    expect(versionPedida("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("tituloDeListaDeRelease · criterio #5", () => {
  it("compone 'Clientes que reciben la <version> (N)'", () => {
    expect(tituloDeListaDeRelease("2.5.0", 3)).toBe("Clientes que reciben la 2.5.0 (3)");
  });

  it("también con 0: lo decide quien la llama si mostrarlo o no", () => {
    expect(tituloDeListaDeRelease("2.5.0", 0)).toBe("Clientes que reciben la 2.5.0 (0)");
  });
});

describe("mensajeDeClientesQueYaEstan · criterios #5 y #8 (singular y plural)", () => {
  it("con 0, no hay nada que decir: null", () => {
    expect(mensajeDeClientesQueYaEstan("2.5.0", 0)).toBeNull();
  });

  it("con 1, usa el singular", () => {
    expect(mensajeDeClientesQueYaEstan("2.5.0", 1)).toBe("1 cliente ya está en 2.5.0");
  });

  it("con 2 o más, usa el plural", () => {
    expect(mensajeDeClientesQueYaEstan("2.5.0", 2)).toBe("2 clientes ya están en 2.5.0");
  });
});

describe("MENSAJES_DE_LISTA_DE_RELEASE · los textos fijos de la ficha", () => {
  it("sin versión pedida (criterio #7)", () => {
    expect(MENSAJES_DE_LISTA_DE_RELEASE.sinVersionPedida).toBe(
      "Escribí la versión que vas a desplegar para ver qué clientes la reciben.",
    );
  });

  it("todos ya están en esa versión (criterio #8, el texto de user-flow.md §5)", () => {
    expect(MENSAJES_DE_LISTA_DE_RELEASE.ningunoCorresponde).toBe(
      "Ningún cliente corresponde a este filtro todavía.",
    );
  });

  it("error de carga (criterio #13)", () => {
    expect(MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida).toBe(
      "No se pudo cargar la lista de release.",
    );
  });
});
