import { describe, expect, it } from "vitest";

import {
  agruparFeaturesDelCliente,
  fechaDeHistorial,
  historialMasRecientePrimero,
} from "./vista-de-cliente";

/**
 * Verificación 1 de M1-05: la lógica de la Vista de cliente, sin base de datos.
 *
 * Son las dos decisiones que la pantalla no puede equivocar y que no hacen falta queries
 * para comprobar: cómo se parten los features entre habilitados y no habilitados
 * (criterio #4 de la ficha) y cómo se lee el historial, que `lib/clientes.ts` devuelve del
 * más viejo al más nuevo y la pantalla muestra al revés (criterio #5).
 */

const F = (id: string, name: string, code: string | null = null) => ({ id, name, code });

describe("agruparFeaturesDelCliente · criterio #4 (habilitados vs. no habilitados)", () => {
  const catalogo = [F("a", "Alertas", "F-001"), F("b", "Backups"), F("c", "Cuotas", "F-003")];

  it("parte el catálogo en los dos grupos, sin perder ni duplicar ninguno", () => {
    const grupos = agruparFeaturesDelCliente(catalogo, ["b"]);

    expect(grupos.habilitados.map((f) => f.id)).toEqual(["b"]);
    expect(grupos.noHabilitados.map((f) => f.id)).toEqual(["a", "c"]);
    expect(grupos.habilitados.length + grupos.noHabilitados.length).toBe(catalogo.length);
  });

  it("conserva el orden del catálogo dentro de cada grupo (viene ordenado por nombre)", () => {
    const grupos = agruparFeaturesDelCliente(catalogo, ["c", "a"]);

    expect(grupos.habilitados.map((f) => f.name)).toEqual(["Alertas", "Cuotas"]);
    expect(grupos.noHabilitados.map((f) => f.name)).toEqual(["Backups"]);
  });

  it("un cliente sin ningún feature habilitado deja todo el catálogo como no habilitado", () => {
    // No es el estado vacío: el catálogo existe, así que la pantalla igual puede decir
    // "no lo tiene todavía" en vez de "no se cargó" (la ambigüedad que la ficha prohíbe).
    const grupos = agruparFeaturesDelCliente(catalogo, []);

    expect(grupos.habilitados).toEqual([]);
    expect(grupos.noHabilitados).toHaveLength(3);
  });

  it("un id habilitado que ya no está en el catálogo no inventa una fila", () => {
    // Puede pasar con un feature de otra organización: `featuresHabilitadosDeCliente` nunca
    // lo devuelve, pero si pasara, la pantalla no tiene que mostrar un feature sin nombre.
    const grupos = agruparFeaturesDelCliente(catalogo, ["b", "fantasma"]);

    expect(grupos.habilitados.map((f) => f.id)).toEqual(["b"]);
    expect(grupos.noHabilitados.map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("no toca el catálogo que recibe", () => {
    const original = [...catalogo];
    agruparFeaturesDelCliente(catalogo, ["a"]);
    expect(catalogo).toEqual(original);
  });
});

describe("historialMasRecientePrimero · criterio #5 (más reciente primero)", () => {
  const cronologico = [
    { id: "1", version: "1.0.0", recordedAt: new Date("2026-09-01T12:00:00.000Z") },
    { id: "2", version: "2.0.0", recordedAt: new Date("2026-09-20T12:00:00.000Z") },
    { id: "3", version: "2.4.1", recordedAt: new Date("2026-10-01T12:00:00.000Z") },
  ];

  it("invierte el orden que devuelve lib/clientes.ts, sin perder filas", () => {
    expect(historialMasRecientePrimero(cronologico).map((f) => f.version)).toEqual([
      "2.4.1",
      "2.0.0",
      "1.0.0",
    ]);
  });

  it("no muta la lista original", () => {
    const antes = cronologico.map((fila) => fila.id);
    historialMasRecientePrimero(cronologico);
    expect(cronologico.map((fila) => fila.id)).toEqual(antes);
  });

  it("una sola fila (el alta recién hecha) se devuelve igual", () => {
    expect(historialMasRecientePrimero([cronologico[0]])).toEqual([cronologico[0]]);
  });

  it("sin filas devuelve una lista vacía, no explota", () => {
    expect(historialMasRecientePrimero([])).toEqual([]);
  });
});

describe("fechaDeHistorial · la fecha que se lee en la fila", () => {
  it("es día/mes/año y hora, en la zona del owner, sin depender del reloj del servidor", () => {
    // 23:30 UTC del 5 de octubre ya es el 5 a las 20:30 en Argentina: si la pantalla
    // formateara en UTC (Vercel corre en UTC), el owner vería fechas corridas.
    expect(fechaDeHistorial(new Date("2026-10-05T23:30:00.000Z"))).toBe("05/10/2026 20:30");
  });

  it("dos cambios del mismo día se distinguen por la hora", () => {
    const manana = fechaDeHistorial(new Date("2026-10-05T13:05:00.000Z"));
    const tarde = fechaDeHistorial(new Date("2026-10-05T19:45:00.000Z"));

    expect(manana).toBe("05/10/2026 10:05");
    expect(tarde).toBe("05/10/2026 16:45");
  });

  it("la medianoche se escribe 00:xx, no 24:xx", () => {
    expect(fechaDeHistorial(new Date("2026-01-02T03:04:00.000Z"))).toBe("02/01/2026 00:04");
  });
});
