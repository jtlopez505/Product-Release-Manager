import { describe, expect, it } from "vitest";

import {
  MENSAJES_DE_LISTA_DE_RELEASE,
  criterioActivo,
  mensajeDeClientesQueYaEstan,
  mensajeDeClientesQueYaTienenFeature,
  particionarClientesPorVersion,
  tituloDeListaDeRelease,
  tituloDeListaDeReleasePorFeature,
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

  it("sin feature elegido (ficha M3-02, criterio #6)", () => {
    expect(MENSAJES_DE_LISTA_DE_RELEASE.sinFeatureElegido).toBe(
      "Elegí el feature que vas a desplegar para ver qué clientes lo reciben.",
    );
  });
});

/**
 * Verificación 1 de M3-02: qué criterio decide la URL, y los textos de la rama "por feature"
 * — misma lógica de M3-01, sin reescribir `particionarClientesPorFeature`
 * (`lib/consulta-por-feature.ts`): esto solo decide el título y el mensaje secundario para esa
 * partición ya hecha.
 */
describe("criterioActivo · ficha M3-02, criterios #1 y #10 (un criterio por vez)", () => {
  it("sin ?por=, el criterio es 'version' (comportamiento de M3-01)", () => {
    expect(criterioActivo(undefined)).toBe("version");
  });

  it("con ?por=feature, el criterio es 'feature'", () => {
    expect(criterioActivo("feature")).toBe("feature");
  });

  it("con cualquier otro valor, el criterio es 'version'", () => {
    expect(criterioActivo("lo-que-sea")).toBe("version");
  });
});

describe("tituloDeListaDeReleasePorFeature · ficha M3-02, criterio #4", () => {
  it("compone 'Clientes que reciben <feature> (N)'", () => {
    expect(tituloDeListaDeReleasePorFeature("SSO", 2)).toBe("Clientes que reciben SSO (2)");
  });

  it("también con 0: lo decide quien la llama si mostrarlo o no", () => {
    expect(tituloDeListaDeReleasePorFeature("SSO", 0)).toBe("Clientes que reciben SSO (0)");
  });
});

describe("mensajeDeClientesQueYaTienenFeature · ficha M3-02, criterio #4 (singular y plural)", () => {
  it("con 0, no hay nada que decir: null", () => {
    expect(mensajeDeClientesQueYaTienenFeature(0)).toBeNull();
  });

  it("con 1, usa el singular", () => {
    expect(mensajeDeClientesQueYaTienenFeature(1)).toBe("1 cliente ya tiene este feature");
  });

  it("con 2 o más, usa el plural", () => {
    expect(mensajeDeClientesQueYaTienenFeature(2)).toBe("2 clientes ya tienen este feature");
  });
});
