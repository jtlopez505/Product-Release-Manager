import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma";

/**
 * Verificación 2 de M1-01 (integración, regla #5): el schema está migrado contra Supabase,
 * la organización sembrada existe y el aislamiento por organización (regla #1) funciona.
 *
 * Requiere la base real: se corre con `npm run test:integracion`.
 */

const SUFIJO = `m1-01-test-${Date.now()}`;
const idsOrganizacionesDePrueba: string[] = [];

afterAll(async () => {
  // Limpieza: los datos de prueba no quedan en la base del owner.
  for (const organizationId of idsOrganizacionesDePrueba) {
    await prisma.clientVersionHistory.deleteMany({
      where: { client: { organizationId } },
    });
    await prisma.clientFeature.deleteMany({
      where: { client: { organizationId } },
    });
    await prisma.client.deleteMany({ where: { organizationId } });
    await prisma.feature.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("el schema está migrado contra Supabase", () => {
  it("las cinco tablas del modelo-de-datos existen y se pueden consultar", async () => {
    await expect(prisma.organization.count()).resolves.toBeTypeOf("number");
    await expect(prisma.client.count()).resolves.toBeTypeOf("number");
    await expect(prisma.feature.count()).resolves.toBeTypeOf("number");
    await expect(prisma.clientFeature.count()).resolves.toBeTypeOf("number");
    await expect(prisma.clientVersionHistory.count()).resolves.toBeTypeOf("number");
  });
});

describe("hay una organización sembrada", () => {
  it("Organization devuelve al menos una fila", async () => {
    const organizaciones = await prisma.organization.findMany({ take: 2 });
    expect(organizaciones.length).toBeGreaterThan(0);
    expect(organizaciones[0].name.trim().length).toBeGreaterThan(0);
  });
});

describe("regla #1 · aislamiento por organización", () => {
  it("una consulta filtrada por organizationId no ve datos de otra organización", async () => {
    const orgA = await prisma.organization.create({
      data: { name: `Org A ${SUFIJO}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: `Org B ${SUFIJO}` },
    });
    idsOrganizacionesDePrueba.push(orgA.id, orgB.id);

    const clienteA = await prisma.client.create({
      data: {
        organizationId: orgA.id,
        name: `Cliente de A ${SUFIJO}`,
        currentVersion: "1.0.0",
      },
    });
    await prisma.client.create({
      data: {
        organizationId: orgB.id,
        name: `Cliente de B ${SUFIJO}`,
        currentVersion: "2.0.0",
      },
    });

    const clientesDeA = await prisma.client.findMany({
      where: { organizationId: orgA.id },
    });
    expect(clientesDeA.map((c) => c.id)).toEqual([clienteA.id]);

    const clientesDeB = await prisma.client.findMany({
      where: { organizationId: orgB.id },
    });
    expect(clientesDeB.map((c) => c.id)).not.toContain(clienteA.id);

    // Los features también cuelgan de la organización desde esta pieza.
    const featureA = await prisma.feature.create({
      data: {
        organizationId: orgA.id,
        code: `F-${SUFIJO}`,
        name: `Feature de A ${SUFIJO}`,
      },
    });
    const featuresDeB = await prisma.feature.findMany({
      where: { organizationId: orgB.id },
    });
    expect(featuresDeB.map((f) => f.id)).not.toContain(featureA.id);

    // El historial de versión y el habilitado cliente↔feature cuelgan del cliente, que ya
    // está aislado por organización.
    const historial = await prisma.clientVersionHistory.create({
      data: { clientId: clienteA.id, version: "1.0.0" },
    });
    expect(historial.clientId).toBe(clienteA.id);

    const habilitado = await prisma.clientFeature.create({
      data: { clientId: clienteA.id, featureId: featureA.id },
    });
    expect(habilitado.enabled).toBe(true);
  });
});
