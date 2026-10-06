import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearCliente, listarClientesDeOrganizacion } from "../../lib/clientes";
import { particionarClientesPorVersion } from "../../lib/lista-de-release";
import { prisma } from "../../lib/prisma";

/**
 * Verificación 2 de M3-01 (integración, regla #5), capa de acceso a datos: la partición por
 * versión contra la base real, sobre `listarClientesDeOrganizacion` (`lib/clientes.ts`, ya
 * probada por M1-04/M2-01 — no hace falta una consulta nueva).
 *
 * El caso central es el de la ficha §3 fila 3: A en 2.4.0, B en 2.4.1, C en 2.5.0, D en
 * 2.6.0 (adelantado) — pedir 2.5.0 tiene que listar A, B y D; C queda afuera.
 *
 * El caso de regla #1 siembra una organización ajena con un cliente en una versión distinta
 * de la destino: si el filtro de organización de `listarClientesDeOrganizacion` se rompe (se
 * le saca `organizationId` del `where`), este test se pone en rojo — es la comprobación que
 * la ficha pide "romper a propósito" antes de restaurar.
 *
 * Molde heredado de M1-04/M2-01: organizaciones de prueba con sufijo único y limpieza en
 * `afterAll`. Requiere la base real: `npm run test:integracion`.
 */

const SUFIJO = `m3-01-test-${Date.now()}`;
const idsOrganizacionesDePrueba: string[] = [];

let orgPropia = "";
let orgAjena = "";

let clienteA = "";
let clienteB = "";
let clienteC = "";
let clienteD = "";
let clienteAjeno = "";

beforeAll(async () => {
  const [propia, ajena] = await Promise.all([
    prisma.organization.create({ data: { name: `Org propia ${SUFIJO}` } }),
    prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } }),
  ]);
  orgPropia = propia.id;
  orgAjena = ajena.id;
  idsOrganizacionesDePrueba.push(orgPropia, orgAjena);

  const [a, b, c, d, ajeno] = await Promise.all([
    crearCliente(orgPropia, { name: `A ${SUFIJO}`, currentVersion: "2.4.0", featureIds: [] }),
    crearCliente(orgPropia, { name: `B ${SUFIJO}`, currentVersion: "2.4.1", featureIds: [] }),
    crearCliente(orgPropia, { name: `C ${SUFIJO}`, currentVersion: "2.5.0", featureIds: [] }),
    crearCliente(orgPropia, { name: `D ${SUFIJO}`, currentVersion: "2.6.0", featureIds: [] }),
    crearCliente(orgAjena, { name: `Ajeno ${SUFIJO}`, currentVersion: "2.4.0", featureIds: [] }),
  ]);
  if (!a.ok || !b.ok || !c.ok || !d.ok || !ajeno.ok) {
    throw new Error("No se pudieron sembrar los clientes de prueba.");
  }
  clienteA = a.cliente.id;
  clienteB = b.cliente.id;
  clienteC = c.cliente.id;
  clienteD = d.cliente.id;
  clienteAjeno = ajeno.cliente.id;
});

afterAll(async () => {
  // La base es la del owner: los datos de prueba no se quedan.
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
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("criterio #3 · la partición completa, contra la base real (ficha §3 fila 3)", () => {
  it("pedir 2.5.0 lista A, B y D en 'reciben'; C en 'ya están'", async () => {
    const clientes = await listarClientesDeOrganizacion(orgPropia);
    const particion = particionarClientesPorVersion(clientes, "2.5.0");

    expect(particion.reciben.map((c) => c.id).sort()).toEqual(
      [clienteA, clienteB, clienteD].sort(),
    );
    expect(particion.yaEstan.map((c) => c.id)).toEqual([clienteC]);
  });

  it("ninguno repetido ni faltante", async () => {
    const clientes = await listarClientesDeOrganizacion(orgPropia);
    const particion = particionarClientesPorVersion(clientes, "2.5.0");
    expect(particion.reciben.length + particion.yaEstan.length).toBe(clientes.length);
  });
});

describe("regla #1 · aislamiento entre organizaciones", () => {
  it("listarClientesDeOrganizacion(orgPropia) no incluye al cliente de orgAjena", async () => {
    const clientes = await listarClientesDeOrganizacion(orgPropia);
    expect(clientes.map((c) => c.id)).not.toContain(clienteAjeno);
  });

  it("la partición de orgPropia no suma ni cuenta al cliente ajeno en ningún grupo", async () => {
    const clientes = await listarClientesDeOrganizacion(orgPropia);
    const particion = particionarClientesPorVersion(clientes, "2.4.0");
    expect(particion.reciben.map((c) => c.id)).not.toContain(clienteAjeno);
    expect(particion.yaEstan.map((c) => c.id)).not.toContain(clienteAjeno);
  });

  it("(se comprueba también al revés, rompiendo el filtro) un findMany sin organizationId SÍ traería al ajeno", async () => {
    // Esta prueba no ejercita el código de la app: deja constancia de que el dato ajeno
    // existe y es distinguible, para que la prueba de arriba no esté pasando "por las dudas"
    // (si no hubiera ningún cliente ajeno en la base, "not.toContain" pasaría sin probar
    // nada). Confirma que el escenario de fuga es real antes de confiar en que el filtro lo
    // evita.
    const todos = await prisma.client.findMany({
      where: { organizationId: { in: [orgPropia, orgAjena] } },
      select: { id: true },
    });
    expect(todos.map((c) => c.id)).toContain(clienteAjeno);
  });
});
