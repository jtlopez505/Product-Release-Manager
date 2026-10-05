import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actualizarCliente,
  crearCliente,
  featuresHabilitadosDeCliente,
  listarHistorialDeVersiones,
  obtenerClienteParaEdicion,
} from "../../lib/clientes";
import { crearFeature } from "../../lib/features";
import { prisma } from "../../lib/prisma";
import { MENSAJES_DE_CLIENTE } from "../../lib/validacion-de-cliente";

/**
 * Verificación 2 de M1-04 (integración, regla #5): el acceso a datos de `Client`,
 * `ClientFeature` y `ClientVersionHistory` contra la base real.
 *
 * El corazón de la pieza es el historial, y es lo que más fácil se construye mal, así que
 * tiene las cuatro pruebas que importan: el alta deja su primera fila (criterio #2), editar
 * sin tocar la versión NO suma fila (criterio #3), cambiar la versión suma una fila sin pisar
 * las anteriores (criterio #4) y un alta rechazada no deja ni cliente ni fila (criterio #6:
 * la mitad escrita es el estado roto que esta pieza no puede dejar).
 *
 * Molde heredado de M1-01/M1-03: dos organizaciones de prueba con sufijo único, consultas
 * filtradas por organización y limpieza en `afterAll` para no dejar nada en la base del owner.
 *
 * Requiere la base real: `npm run test:integracion`.
 */

const SUFIJO = `m1-04-test-${Date.now()}`;
const idsOrganizacionesDePrueba: string[] = [];

let orgA = "";
let orgB = "";
let featureA1 = "";
let featureA2 = "";
let featureDeB = "";

/** Separa dos escrituras para que sus `recordedAt` no caigan en el mismo milisegundo. */
function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.organization.create({ data: { name: `Org A ${SUFIJO}` } }),
    prisma.organization.create({ data: { name: `Org B ${SUFIJO}` } }),
  ]);
  orgA = a.id;
  orgB = b.id;
  idsOrganizacionesDePrueba.push(orgA, orgB);

  const [uno, dos, deB] = await Promise.all([
    crearFeature(orgA, { name: `Exportar CSV ${SUFIJO}` }),
    crearFeature(orgA, { name: `Alertas por correo ${SUFIJO}` }),
    crearFeature(orgB, { name: `Feature de B ${SUFIJO}` }),
  ]);
  if (!uno.ok || !dos.ok || !deB.ok) {
    throw new Error("No se pudieron sembrar los features de prueba.");
  }
  featureA1 = uno.feature.id;
  featureA2 = dos.feature.id;
  featureDeB = deB.feature.id;
});

afterAll(async () => {
  // La base es la del owner: los datos de prueba no se quedan. El orden importa, las
  // referencias cuelgan del cliente.
  for (const organizationId of idsOrganizacionesDePrueba) {
    const clientes = await prisma.client.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const ids = clientes.map((cliente) => cliente.id);
    if (ids.length > 0) {
      await prisma.clientFeature.deleteMany({ where: { clientId: { in: ids } } });
      await prisma.clientVersionHistory.deleteMany({ where: { clientId: { in: ids } } });
      await prisma.client.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.feature.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("criterio #1 · el alta guarda el cliente con sus features habilitados", () => {
  it("deja el Client y una fila de ClientFeature habilitada por cada feature elegido", async () => {
    const resultado = await crearCliente(orgA, {
      name: `Acme ${SUFIJO}`,
      currentVersion: "2.4.0",
      notes: "Cliente piloto",
      featureIds: [featureA1, featureA2],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    // Se recupera por query directa, como pide la ficha: no se confía en lo que devolvió.
    const guardado = await prisma.client.findUnique({
      where: { id: resultado.cliente.id },
      include: { features: true },
    });
    expect(guardado?.organizationId).toBe(orgA);
    expect(guardado?.name).toBe(`Acme ${SUFIJO}`);
    expect(guardado?.currentVersion).toBe("2.4.0");
    expect(guardado?.notes).toBe("Cliente piloto");
    expect(guardado?.features).toHaveLength(2);
    expect(guardado?.features.every((fila) => fila.enabled)).toBe(true);
    expect(guardado?.features.map((fila) => fila.featureId).sort()).toEqual(
      [featureA1, featureA2].sort(),
    );
  });
});

describe("criterio #2 · la primera carga también es la primera fila de historial", () => {
  it("después del alta hay exactamente una fila, con la versión cargada y su fecha", async () => {
    const antes = Date.now();
    const resultado = await crearCliente(orgA, {
      name: `Primera carga ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const historial = await prisma.clientVersionHistory.findMany({
      where: { clientId: resultado.cliente.id },
    });
    expect(historial).toHaveLength(1);
    expect(historial[0].version).toBe("1.0.0");
    expect(historial[0].recordedAt.getTime()).toBeGreaterThanOrEqual(antes - 1000);
  });
});

describe("criterio #3 · editar sin cambiar la versión no suma historial", () => {
  it("cambia nombre, notas y features, y el historial queda igual que antes", async () => {
    const creado = await crearCliente(orgA, {
      name: `Sin cambio de versión ${SUFIJO}`,
      currentVersion: "3.1.0",
      featureIds: [featureA1],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;
    const id = creado.cliente.id;

    const historialAntes = await prisma.clientVersionHistory.findMany({
      where: { clientId: id },
    });
    expect(historialAntes).toHaveLength(1);

    const editado = await actualizarCliente(orgA, id, {
      name: `Renombrado ${SUFIJO}`,
      currentVersion: "3.1.0",
      notes: "Cambió el contacto",
      featureIds: [featureA2],
    });
    expect(editado.ok).toBe(true);
    if (!editado.ok) return;

    const despues = await obtenerClienteParaEdicion(orgA, id);
    expect(despues?.name).toBe(`Renombrado ${SUFIJO}`);
    expect(despues?.notes).toBe("Cambió el contacto");
    expect(despues?.featureIds).toEqual([featureA2]);

    const historialDespues = await prisma.clientVersionHistory.findMany({
      where: { clientId: id },
    });
    expect(historialDespues).toHaveLength(1);
    expect(historialDespues[0].id).toBe(historialAntes[0].id);
    expect(historialDespues[0].recordedAt.getTime()).toBe(
      historialAntes[0].recordedAt.getTime(),
    );
  });

  it("la misma versión con espacios al borde tampoco suma fila", async () => {
    const creado = await crearCliente(orgA, {
      name: `Versión con espacios ${SUFIJO}`,
      currentVersion: "4.0.0",
      featureIds: [],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    await actualizarCliente(orgA, creado.cliente.id, {
      name: `Versión con espacios ${SUFIJO}`,
      currentVersion: "  4.0.0  ",
      featureIds: [],
    });

    const historial = await listarHistorialDeVersiones(orgA, creado.cliente.id);
    expect(historial).toHaveLength(1);
  });

  it("deshabilitar un feature deja la fila en enabled: false, no borra el rastro", async () => {
    const creado = await crearCliente(orgA, {
      name: `Features que se apagan ${SUFIJO}`,
      currentVersion: "1.2.3",
      featureIds: [featureA1, featureA2],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    await actualizarCliente(orgA, creado.cliente.id, {
      name: `Features que se apagan ${SUFIJO}`,
      currentVersion: "1.2.3",
      featureIds: [featureA1],
    });

    const filas = await prisma.clientFeature.findMany({
      where: { clientId: creado.cliente.id },
      orderBy: { featureId: "asc" },
    });
    expect(filas).toHaveLength(2);
    expect(filas.find((fila) => fila.featureId === featureA1)?.enabled).toBe(true);
    expect(filas.find((fila) => fila.featureId === featureA2)?.enabled).toBe(false);

    // Lo que cuenta como "habilitado" es la fila prendida, no la existencia de la fila.
    expect(await featuresHabilitadosDeCliente(orgA, creado.cliente.id)).toEqual([featureA1]);

    // Y volver a tildarlo lo reenciende sin duplicar la fila (la PK es cliente+feature).
    await actualizarCliente(orgA, creado.cliente.id, {
      name: `Features que se apagan ${SUFIJO}`,
      currentVersion: "1.2.3",
      featureIds: [featureA1, featureA2],
    });
    const reencendido = await prisma.clientFeature.findMany({
      where: { clientId: creado.cliente.id },
    });
    expect(reencendido).toHaveLength(2);
    expect(reencendido.every((fila) => fila.enabled)).toBe(true);
  });
});

describe("criterio #4 · cambiar la versión suma una fila y no pisa las anteriores", () => {
  it("después de 2.4.0 → 2.4.1 → 2.5.0 el historial tiene tres filas, en orden", async () => {
    const creado = await crearCliente(orgA, {
      name: `Historial largo ${SUFIJO}`,
      currentVersion: "2.4.0",
      featureIds: [featureA1],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;
    const id = creado.cliente.id;

    const primera = await prisma.clientVersionHistory.findFirst({ where: { clientId: id } });
    expect(primera?.version).toBe("2.4.0");

    await esperar(5);
    await actualizarCliente(orgA, id, {
      name: `Historial largo ${SUFIJO}`,
      currentVersion: "2.4.1",
      featureIds: [featureA1],
    });

    await esperar(5);
    await actualizarCliente(orgA, id, {
      name: `Historial largo ${SUFIJO}`,
      currentVersion: "2.5.0",
      featureIds: [featureA1],
    });

    const historial = await listarHistorialDeVersiones(orgA, id);
    expect(historial.map((fila) => fila.version)).toEqual(["2.4.0", "2.4.1", "2.5.0"]);

    // Append-only: la primera fila sigue existiendo, con su id y su fecha sin tocar.
    const primeraDespues = await prisma.clientVersionHistory.findUnique({
      where: { id: primera?.id ?? "" },
    });
    expect(primeraDespues?.version).toBe("2.4.0");
    expect(primeraDespues?.recordedAt.getTime()).toBe(primera?.recordedAt.getTime());

    // Y la versión activa del cliente es la última.
    const cliente = await obtenerClienteParaEdicion(orgA, id);
    expect(cliente?.currentVersion).toBe("2.5.0");
  });

  it("volver a una versión anterior también suma fila (es un cambio, no un deshacer)", async () => {
    const creado = await crearCliente(orgA, {
      name: `Rollback ${SUFIJO}`,
      currentVersion: "5.0.0",
      featureIds: [],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    await esperar(5);
    await actualizarCliente(orgA, creado.cliente.id, {
      name: `Rollback ${SUFIJO}`,
      currentVersion: "4.9.9",
      featureIds: [],
    });

    const historial = await listarHistorialDeVersiones(orgA, creado.cliente.id);
    expect(historial.map((fila) => fila.version)).toEqual(["5.0.0", "4.9.9"]);
  });
});

describe("criterio #6 · sin nombre o sin versión no se guarda nada", () => {
  it("sin nombre: ni Client ni fila de historial, y el error va al campo", async () => {
    const clientesAntes = await prisma.client.count({ where: { organizationId: orgA } });
    const historialAntes = await prisma.clientVersionHistory.count();

    const resultado = await crearCliente(orgA, {
      name: "   ",
      currentVersion: "9.9.9",
      featureIds: [featureA1],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_CLIENTE.nombreVacio);

    expect(await prisma.client.count({ where: { organizationId: orgA } })).toBe(clientesAntes);
    expect(await prisma.clientVersionHistory.count()).toBe(historialAntes);
  });

  it("sin versión: tampoco se crea nada", async () => {
    const clientesAntes = await prisma.client.count({ where: { organizationId: orgA } });

    const resultado = await crearCliente(orgA, {
      name: `Sin versión ${SUFIJO}`,
      currentVersion: "",
      featureIds: [],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.currentVersion).toBe(MENSAJES_DE_CLIENTE.versionVacia);

    expect(await prisma.client.count({ where: { organizationId: orgA } })).toBe(clientesAntes);
  });

  it("editar dejando el nombre vacío no cambia nada de lo guardado", async () => {
    const creado = await crearCliente(orgA, {
      name: `Intacto ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const resultado = await actualizarCliente(orgA, creado.cliente.id, {
      name: "",
      currentVersion: "2.0.0",
      featureIds: [],
    });
    expect(resultado.ok).toBe(false);

    const sinTocar = await obtenerClienteParaEdicion(orgA, creado.cliente.id);
    expect(sinTocar?.name).toBe(`Intacto ${SUFIJO}`);
    expect(sinTocar?.currentVersion).toBe("1.0.0");
    expect(await listarHistorialDeVersiones(orgA, creado.cliente.id)).toHaveLength(1);
  });

  it("un feature que no existe rechaza el alta sin dejar el cliente a medio escribir", async () => {
    const clientesAntes = await prisma.client.count({ where: { organizationId: orgA } });

    const resultado = await crearCliente(orgA, {
      name: `Con feature fantasma ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: ["no-existe-este-id"],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.featureIds).toBe(MENSAJES_DE_CLIENTE.featureInexistente);

    expect(await prisma.client.count({ where: { organizationId: orgA } })).toBe(clientesAntes);
  });
});

describe("criterio #7 · si no hay features cargados, el alta igual funciona", () => {
  it("una organización sin ningún feature puede dar de alta un cliente sin features", async () => {
    const sinFeatures = await prisma.organization.create({
      data: { name: `Org sin features ${SUFIJO}` },
    });
    idsOrganizacionesDePrueba.push(sinFeatures.id);

    expect(await prisma.feature.count({ where: { organizationId: sinFeatures.id } })).toBe(0);

    const resultado = await crearCliente(sinFeatures.id, {
      name: `Cliente sin features ${SUFIJO}`,
      currentVersion: "0.1.0",
      featureIds: [],
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(await featuresHabilitadosDeCliente(sinFeatures.id, resultado.cliente.id)).toEqual([]);
    expect(await listarHistorialDeVersiones(sinFeatures.id, resultado.cliente.id)).toHaveLength(
      1,
    );
  });
});

describe("criterio #8 · regla #1 · un cliente de otra organización no se ve ni se edita", () => {
  it("no se puede leer por su id desde otra organización", async () => {
    const deB = await crearCliente(orgB, {
      name: `Cliente de B ${SUFIJO}`,
      currentVersion: "7.0.0",
      featureIds: [featureDeB],
    });
    expect(deB.ok).toBe(true);
    if (!deB.ok) return;

    expect(await obtenerClienteParaEdicion(orgA, deB.cliente.id)).toBeNull();
    expect(await obtenerClienteParaEdicion(orgB, deB.cliente.id)).not.toBeNull();
  });

  it("no se puede editar por su id desde otra organización, y queda intacto", async () => {
    const deB = await crearCliente(orgB, {
      name: `Intocable de B ${SUFIJO}`,
      currentVersion: "7.1.0",
      featureIds: [],
    });
    expect(deB.ok).toBe(true);
    if (!deB.ok) return;

    const intento = await actualizarCliente(orgA, deB.cliente.id, {
      name: `Pisado desde A ${SUFIJO}`,
      currentVersion: "0.0.1",
      featureIds: [],
    });
    expect(intento.ok).toBe(false);
    if (intento.ok) return;
    expect(intento.errores.general).toBe(MENSAJES_DE_CLIENTE.noExiste);

    const sinTocar = await prisma.client.findUnique({ where: { id: deB.cliente.id } });
    expect(sinTocar?.name).toBe(`Intocable de B ${SUFIJO}`);
    expect(sinTocar?.currentVersion).toBe("7.1.0");
    // Lo más importante: el intento fallido no le sumó una fila de historial.
    expect(
      await prisma.clientVersionHistory.count({ where: { clientId: deB.cliente.id } }),
    ).toBe(1);
  });

  it("su historial no se puede leer desde otra organización", async () => {
    const deB = await crearCliente(orgB, {
      name: `Historial de B ${SUFIJO}`,
      currentVersion: "8.0.0",
      featureIds: [],
    });
    expect(deB.ok).toBe(true);
    if (!deB.ok) return;

    expect(await listarHistorialDeVersiones(orgA, deB.cliente.id)).toEqual([]);
    expect(await listarHistorialDeVersiones(orgB, deB.cliente.id)).toHaveLength(1);
  });

  it("no se puede habilitar un feature de otra organización en un cliente propio", async () => {
    const resultado = await crearCliente(orgA, {
      name: `Con feature ajeno ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureDeB],
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.featureIds).toBe(MENSAJES_DE_CLIENTE.featureInexistente);
  });

  it("tampoco al editar un cliente propio", async () => {
    const creado = await crearCliente(orgA, {
      name: `Propio limpio ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureA1],
    });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const intento = await actualizarCliente(orgA, creado.cliente.id, {
      name: `Propio limpio ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureA1, featureDeB],
    });
    expect(intento.ok).toBe(false);
    if (intento.ok) return;
    expect(intento.errores.featureIds).toBe(MENSAJES_DE_CLIENTE.featureInexistente);

    expect(await featuresHabilitadosDeCliente(orgA, creado.cliente.id)).toEqual([featureA1]);
  });
});
