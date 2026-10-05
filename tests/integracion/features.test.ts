import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  actualizarFeature,
  crearFeature,
  listarFeaturesDeOrganizacion,
  obtenerFeature,
} from "../../lib/features";
import { prisma } from "../../lib/prisma";
import { MENSAJES_DE_FEATURE } from "../../lib/validacion-de-feature";

/**
 * Verificación 2 de M1-03 (integración, regla #5): el acceso a datos de `Feature` contra la
 * base real, incluida la prueba de que un feature de otra organización no aparece ni se puede
 * editar desde otra organización (regla #1, ficha §3 fila 2).
 *
 * Sigue el molde que dejó M1-01 (`base-de-datos.test.ts`): dos organizaciones de prueba con
 * sufijo único, consultas filtradas y limpieza en `afterAll` para no dejar nada en la base
 * del owner.
 *
 * Requiere la base real: `npm run test:integracion`.
 */

const SUFIJO = `m1-03-test-${Date.now()}`;
const idsOrganizacionesDePrueba: string[] = [];

let orgA = "";
let orgB = "";

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.organization.create({ data: { name: `Org A ${SUFIJO}` } }),
    prisma.organization.create({ data: { name: `Org B ${SUFIJO}` } }),
  ]);
  orgA = a.id;
  orgB = b.id;
  idsOrganizacionesDePrueba.push(orgA, orgB);
});

afterAll(async () => {
  for (const organizationId of idsOrganizacionesDePrueba) {
    await prisma.feature.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("criterio #1 · crear un feature lo persiste en la organización actual", () => {
  it("con solo el nombre alcanza, y el estado queda en Disponible (default del esquema)", async () => {
    const resultado = await crearFeature(orgA, { name: "Exportar a CSV" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.feature.organizationId).toBe(orgA);
    expect(resultado.feature.name).toBe("Exportar a CSV");
    expect(resultado.feature.estado).toBe("DISPONIBLE");
    expect(resultado.feature.prioridad).toBeNull();
    expect(resultado.feature.code).toBeNull();
  });

  it("guarda los diez campos del catálogo cuando se los completa", async () => {
    const resultado = await crearFeature(orgA, {
      name: "Alertas por correo",
      code: `F-900-${SUFIJO}`,
      producto: "IWIA - Nexus Go/Pro",
      queHace: "Avisa por mail cuando cambia la versión",
      queProblemaResuelve: "Nadie se enteraba del cambio",
      aQuienBeneficia: "Al PM del cliente",
      prioridad: "ALTA",
      estado: "EN_DESARROLLO",
      metricaExito: "Menos consultas por chat",
      observaciones: "Depende del proveedor de correo",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const guardado = await obtenerFeature(orgA, resultado.feature.id);
    expect(guardado).not.toBeNull();
    expect(guardado?.prioridad).toBe("ALTA");
    expect(guardado?.estado).toBe("EN_DESARROLLO");
    expect(guardado?.producto).toBe("IWIA - Nexus Go/Pro");
    expect(guardado?.metricaExito).toBe("Menos consultas por chat");
  });
});

describe("criterio #4 · un feature sin nombre no se guarda", () => {
  it("rechaza el nombre vacío con el error en el campo y no crea ninguna fila", async () => {
    const antes = await prisma.feature.count({ where: { organizationId: orgA } });

    const resultado = await crearFeature(orgA, { name: "   " });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_FEATURE.nombreVacio);

    expect(await prisma.feature.count({ where: { organizationId: orgA } })).toBe(antes);
  });
});

describe("criterio #5 · nombre duplicado en la misma organización", () => {
  it("rechaza el mismo nombre con otra capitalización y espacios al borde", async () => {
    const primero = await crearFeature(orgA, { name: "Login SSO" });
    expect(primero.ok).toBe(true);

    const antes = await prisma.feature.count({ where: { organizationId: orgA } });
    const duplicado = await crearFeature(orgA, { name: "login sso " });

    expect(duplicado.ok).toBe(false);
    if (duplicado.ok) return;
    expect(duplicado.errores.name).toBe(MENSAJES_DE_FEATURE.nombreDuplicado);
    expect(await prisma.feature.count({ where: { organizationId: orgA } })).toBe(antes);
  });

  it("dos organizaciones distintas sí pueden tener un feature con el mismo nombre (regla #1)", async () => {
    const enB = await crearFeature(orgB, { name: "login SSO" });
    expect(enB.ok).toBe(true);
    if (!enB.ok) return;
    expect(enB.feature.organizationId).toBe(orgB);
  });

  it("al editar, el nombre propio no se cuenta como duplicado de sí mismo", async () => {
    const creado = await crearFeature(orgA, { name: `Buscador ${SUFIJO}` });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const resultado = await actualizarFeature(orgA, creado.feature.id, {
      name: `  Buscador ${SUFIJO}  `,
      prioridad: "MEDIA",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.feature.prioridad).toBe("MEDIA");
  });

  it("al editar, tomar el nombre de OTRO feature de la organización se rechaza", async () => {
    const otro = await crearFeature(orgA, { name: `Ocupado ${SUFIJO}` });
    const propio = await crearFeature(orgA, { name: `Libre ${SUFIJO}` });
    expect(otro.ok && propio.ok).toBe(true);
    if (!propio.ok) return;

    const resultado = await actualizarFeature(orgA, propio.feature.id, {
      name: `ocupado ${SUFIJO}`.toUpperCase(),
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores.name).toBe(MENSAJES_DE_FEATURE.nombreDuplicado);
  });
});

describe("criterio #3 · editar un feature guarda los cambios", () => {
  it("el cambio se ve tanto en el feature como en la lista", async () => {
    const creado = await crearFeature(orgA, { name: `Antes ${SUFIJO}`, prioridad: "BAJA" });
    expect(creado.ok).toBe(true);
    if (!creado.ok) return;

    const editado = await actualizarFeature(orgA, creado.feature.id, {
      name: `Después ${SUFIJO}`,
      prioridad: "ALTA",
      estado: "PROXIMAMENTE",
      observaciones: "Se renombró al cerrar el alcance",
    });
    expect(editado.ok).toBe(true);
    if (!editado.ok) return;
    expect(editado.feature.name).toBe(`Después ${SUFIJO}`);

    const enLista = (await listarFeaturesDeOrganizacion(orgA)).find(
      (feature) => feature.id === creado.feature.id,
    );
    expect(enLista?.name).toBe(`Después ${SUFIJO}`);
    expect(enLista?.prioridad).toBe("ALTA");
    expect(enLista?.estado).toBe("PROXIMAMENTE");
  });
});

describe("criterio #2 · regla #1 · aislamiento por organización", () => {
  it("la lista de una organización no trae ningún feature de la otra", async () => {
    const soloDeB = await crearFeature(orgB, { name: `Exclusivo de B ${SUFIJO}` });
    expect(soloDeB.ok).toBe(true);
    if (!soloDeB.ok) return;

    const deA = await listarFeaturesDeOrganizacion(orgA);
    expect(deA.length).toBeGreaterThan(0);
    expect(deA.every((feature) => feature.organizationId === orgA)).toBe(true);
    expect(deA.map((feature) => feature.id)).not.toContain(soloDeB.feature.id);

    const deB = await listarFeaturesDeOrganizacion(orgB);
    expect(deB.map((feature) => feature.id)).toContain(soloDeB.feature.id);
  });

  it("un feature de otra organización no se puede leer por su id", async () => {
    const deB = await crearFeature(orgB, { name: `Secreto de B ${SUFIJO}` });
    expect(deB.ok).toBe(true);
    if (!deB.ok) return;

    expect(await obtenerFeature(orgA, deB.feature.id)).toBeNull();
    expect(await obtenerFeature(orgB, deB.feature.id)).not.toBeNull();
  });

  it("un feature de otra organización no se puede editar por su id", async () => {
    const deB = await crearFeature(orgB, { name: `Intocable de B ${SUFIJO}` });
    expect(deB.ok).toBe(true);
    if (!deB.ok) return;

    const intento = await actualizarFeature(orgA, deB.feature.id, {
      name: `Pisado desde A ${SUFIJO}`,
    });
    expect(intento.ok).toBe(false);
    if (intento.ok) return;
    expect(intento.errores.general).toBe(MENSAJES_DE_FEATURE.noExiste);

    // Y lo más importante: el feature de B quedó igual.
    const sinTocar = await prisma.feature.findUnique({ where: { id: deB.feature.id } });
    expect(sinTocar?.name).toBe(`Intocable de B ${SUFIJO}`);
  });
});

describe("el código repetido tampoco se guarda (unique del esquema)", () => {
  it("avisa en el campo código en vez de reventar", async () => {
    const codigo = `F-777-${SUFIJO}`;
    const primero = await crearFeature(orgA, { name: `Con código ${SUFIJO}`, code: codigo });
    expect(primero.ok).toBe(true);

    const segundo = await crearFeature(orgA, {
      name: `Otro con el mismo código ${SUFIJO}`,
      code: ` ${codigo} `,
    });
    expect(segundo.ok).toBe(false);
    if (segundo.ok) return;
    expect(segundo.errores.code).toBe(MENSAJES_DE_FEATURE.codigoDuplicado);
  });

  it("varios features sin código conviven (dos NULL no chocan en Postgres)", async () => {
    const uno = await crearFeature(orgA, { name: `Sin código uno ${SUFIJO}` });
    const dos = await crearFeature(orgA, { name: `Sin código dos ${SUFIJO}` });
    expect(uno.ok).toBe(true);
    expect(dos.ok).toBe(true);
  });
});
