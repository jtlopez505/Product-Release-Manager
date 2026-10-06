import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  crearCliente,
  idsDeClientesConFeatureHabilitado,
  listarClientesDeOrganizacion,
} from "../../lib/clientes";
import { particionarClientesPorFeature } from "../../lib/consulta-por-feature";
import { crearFeature } from "../../lib/features";
import { prisma } from "../../lib/prisma";

/**
 * Verificación 2 de M2-01 (integración, regla #5), capa de acceso a datos: la lectura de
 * `idsDeClientesConFeatureHabilitado` (`lib/clientes.ts`) y la partición completa contra la
 * base real.
 *
 * El caso central es el de la ficha §3 fila 3: dos clientes con el feature habilitado, uno
 * sin ninguna fila de `ClientFeature` y uno con la fila en `enabled: false` — los dos últimos
 * tienen que caer en "no lo tienen todavía" sin que se puedan distinguir desde la pantalla.
 *
 * El caso de regla #1 (fila 11) siembra una fila de `ClientFeature` que la app nunca crearía
 * por sí sola (un cliente de otra organización apuntando al feature de la organización que se
 * consulta) para probar que el filtro de organización, y no la casualidad de los datos, es lo
 * que la mantiene afuera. Si se le saca `client: { organizationId }` a la query, esta prueba
 * se pone en rojo.
 *
 * Molde heredado de M1-01/M1-04: organizaciones de prueba con sufijo único y limpieza en
 * `afterAll`. Requiere la base real: `npm run test:integracion`.
 */

const SUFIJO = `m2-01-test-${Date.now()}`;
const idsOrganizacionesDePrueba: string[] = [];

let orgA = "";
let orgB = "";
let featureConsultado = "";

let clienteA = "";
let clienteB = "";
let clienteSinFila = "";
let clienteDeshabilitado = "";
let clienteAjeno = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.organization.create({ data: { name: `Org A ${SUFIJO}` } }),
    prisma.organization.create({ data: { name: `Org B ${SUFIJO}` } }),
  ]);
  orgA = a.id;
  orgB = b.id;
  idsOrganizacionesDePrueba.push(orgA, orgB);

  const feature = await crearFeature(orgA, { name: `Feature consultado ${SUFIJO}` });
  if (!feature.ok) {
    throw new Error("No se pudo sembrar el feature de prueba.");
  }
  featureConsultado = feature.feature.id;

  const [a1, b1, sinFila, deshabilitado] = await Promise.all([
    crearCliente(orgA, {
      name: `A ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureConsultado],
    }),
    crearCliente(orgA, {
      name: `B ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureConsultado],
    }),
    crearCliente(orgA, { name: `C ${SUFIJO}`, currentVersion: "1.0.0", featureIds: [] }),
    crearCliente(orgA, {
      name: `D ${SUFIJO}`,
      currentVersion: "1.0.0",
      featureIds: [featureConsultado],
    }),
  ]);
  if (!a1.ok || !b1.ok || !sinFila.ok || !deshabilitado.ok) {
    throw new Error("No se pudieron sembrar los clientes de prueba.");
  }
  clienteA = a1.cliente.id;
  clienteB = b1.cliente.id;
  clienteSinFila = sinFila.cliente.id;
  clienteDeshabilitado = deshabilitado.cliente.id;

  // D queda con la fila en `enabled: false` sin borrarla — el caso que `actualizarCliente`
  // deja al destildar un feature (M1-04), reproducido directo para no depender de esa pieza.
  await prisma.clientFeature.update({
    where: { clientId_featureId: { clientId: clienteDeshabilitado, featureId: featureConsultado } },
    data: { enabled: false },
  });

  // El cliente ajeno: de otra organización, con una fila de ClientFeature manual apuntando al
  // feature de orgA. La app nunca generaría esta fila (`crearCliente`/`actualizarCliente`
  // validan que el feature sea de la misma organización que el cliente); se siembra a mano
  // para probar que el filtro de organización de la query, no la ausencia de filas cruzadas,
  // es lo que la mantiene afuera de la consulta de orgA.
  const ajeno = await prisma.client.create({
    data: { organizationId: orgB, name: `Ajeno ${SUFIJO}`, currentVersion: "9.9.9" },
  });
  clienteAjeno = ajeno.id;
  await prisma.clientFeature.create({
    data: { clientId: ajeno.id, featureId: featureConsultado, enabled: true },
  });
});

afterAll(async () => {
  // La base es la del owner: los datos de prueba no se quedan. Primero TODAS las filas de
  // ClientFeature de los dos organizaciones juntas —incluida la del cliente ajeno, que
  // apunta a un feature de la otra organización— y solo después los features: si se borrara
  // por organización una por una, la fila cruzada del cliente ajeno rompería la referencia.
  const clientes = await prisma.client.findMany({
    where: { organizationId: { in: idsOrganizacionesDePrueba } },
    select: { id: true },
  });
  const ids = clientes.map((cliente) => cliente.id);
  if (ids.length > 0) {
    await prisma.clientFeature.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.clientVersionHistory.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.client.deleteMany({ where: { id: { in: ids } } });
  }
  for (const organizationId of idsOrganizacionesDePrueba) {
    await prisma.feature.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("criterio #4 · idsDeClientesConFeatureHabilitado, contra la base real", () => {
  it("solo trae los clientes con la fila habilitada: ni el sin fila ni el deshabilitado", async () => {
    const ids = await idsDeClientesConFeatureHabilitado(orgA, featureConsultado);

    expect(ids).toContain(clienteA);
    expect(ids).toContain(clienteB);
    expect(ids).not.toContain(clienteSinFila);
    expect(ids).not.toContain(clienteDeshabilitado);
  });

  it("regla #1 · un cliente de otra organización con fila manual al feature nunca aparece", async () => {
    const ids = await idsDeClientesConFeatureHabilitado(orgA, featureConsultado);
    expect(ids).not.toContain(clienteAjeno);
  });
});

describe("criterio #3 · la partición completa, contra la base real (el caso de la ficha §3 fila 3)", () => {
  it("A y B caen en 'lo tienen'; C (sin fila) y D (deshabilitado) en 'todavía no'", async () => {
    const [clientes, idsHabilitados] = await Promise.all([
      listarClientesDeOrganizacion(orgA),
      idsDeClientesConFeatureHabilitado(orgA, featureConsultado),
    ]);
    const particion = particionarClientesPorFeature(clientes, idsHabilitados);

    const idsDeLoTienen = particion.loTienen.map((c) => c.id);
    const idsDeNoLoTienen = particion.noLoTienenTodavia.map((c) => c.id);

    expect(idsDeLoTienen.sort()).toEqual([clienteA, clienteB].sort());
    expect(idsDeNoLoTienen.sort()).toEqual([clienteSinFila, clienteDeshabilitado].sort());
    // Ninguno repetido ni faltante, y el cliente ajeno no suma a ningún lado (regla #1).
    expect(idsDeLoTienen).not.toContain(clienteAjeno);
    expect(idsDeNoLoTienen).not.toContain(clienteAjeno);
    expect(particion.loTienen.length + particion.noLoTienenTodavia.length).toBe(
      clientes.length,
    );
  });
});

describe("regla #1 · la lista de clientes de orgA no trae al cliente de orgB", () => {
  it("listarClientesDeOrganizacion(orgA) no incluye al cliente ajeno", async () => {
    const clientes = await listarClientesDeOrganizacion(orgA);
    expect(clientes.map((c) => c.id)).not.toContain(clienteAjeno);
  });
});
