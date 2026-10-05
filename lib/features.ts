/**
 * Acceso a datos de `Feature` — la lista maestra del catálogo (ficha M1-03).
 *
 * **Regla #1 (docs/arquitectura/modelo-de-datos.md, "Regla de acceso a datos"):** toda función
 * de este módulo recibe `organizationId` explícito y lo mete en el `where` o en el registro
 * nuevo. No hay ninguna query sin ese filtro, y la edición usa `updateMany` con
 * `{ id, organizationId }` a propósito: un `update` por id solo alcanzaría una fila de otra
 * organización, que es exactamente lo que la regla prohíbe.
 *
 * La validación de lo que entra vive en `lib/validacion-de-feature.ts` (sin base de datos,
 * para que la verificación 1 pueda correr sin Supabase); acá quedan las reglas que necesitan
 * mirar lo que ya está guardado: el nombre duplicado y el código duplicado.
 */
import { Prisma, type Feature } from "../prisma/generated/client/client";
import { prisma } from "./prisma";
import {
  type ErroresDeFeature,
  MENSAJES_DE_FEATURE,
  parsearEntradaDeFeature,
} from "./validacion-de-feature";

export type { Feature };

export type ResultadoDeGuardado =
  | { ok: true; feature: Feature }
  | { ok: false; errores: ErroresDeFeature };

/** Lo que llega del formulario, sin validar todavía. */
export type EntradaCruda = Record<string, unknown>;

const CODIGO_UNIQUE_VIOLADO = "P2002";

/** La lista maestra de la organización, ordenada como se lee: por nombre. */
export async function listarFeaturesDeOrganizacion(
  organizationId: string,
): Promise<Feature[]> {
  return prisma.feature.findMany({
    where: { organizationId },
    orderBy: [{ name: "asc" }],
  });
}

/** Un feature puntual, solo si es de esta organización (si no, `null`: no existe para ella). */
export async function obtenerFeature(
  organizationId: string,
  id: string,
): Promise<Feature | null> {
  return prisma.feature.findFirst({ where: { id, organizationId } });
}

/**
 * ¿Ya hay otro feature con este nombre en la organización?
 *
 * Criterio de la ficha §3 fila 5: sin distinguir mayúsculas/minúsculas ni espacios al borde,
 * y solo dentro de la misma organización (dos organizaciones pueden repetir nombre, regla #1).
 * El `trim` ya lo hizo la validación; el case lo resuelve Postgres con `mode: "insensitive"`.
 */
async function nombreYaUsado(
  organizationId: string,
  name: string,
  excepto?: string,
): Promise<boolean> {
  const existente = await prisma.feature.findFirst({
    where: {
      organizationId,
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      ...(excepto ? { id: { not: excepto } } : {}),
    },
    select: { id: true },
  });
  return existente !== null;
}

function esCodigoDuplicado(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === CODIGO_UNIQUE_VIOLADO
  );
}

/**
 * Crea un feature en la organización indicada.
 *
 * `estado` se omite cuando la persona no eligió ninguno: así el default `DISPONIBLE` lo pone
 * el esquema y no se duplica la decisión acá (criterio #1 de la ficha).
 */
export async function crearFeature(
  organizationId: string,
  crudo: EntradaCruda,
): Promise<ResultadoDeGuardado> {
  const parseo = parsearEntradaDeFeature(crudo);
  if (!parseo.ok) {
    return parseo;
  }
  const { estado, ...resto } = parseo.datos;

  if (await nombreYaUsado(organizationId, resto.name)) {
    return { ok: false, errores: { name: MENSAJES_DE_FEATURE.nombreDuplicado } };
  }

  try {
    const feature = await prisma.feature.create({
      data: {
        organizationId,
        ...resto,
        ...(estado ? { estado } : {}),
      },
    });
    return { ok: true, feature };
  } catch (error) {
    if (esCodigoDuplicado(error)) {
      return { ok: false, errores: { code: MENSAJES_DE_FEATURE.codigoDuplicado } };
    }
    throw error;
  }
}

/**
 * Edita un feature existente de la organización indicada.
 *
 * El `where` del `updateMany` lleva id Y organizationId: si el feature es de otra
 * organización no se actualiza nada y se responde "ya no existe" — ni se confirma que ese id
 * exista en otra parte (regla #1, ficha §3 fila 2).
 */
export async function actualizarFeature(
  organizationId: string,
  id: string,
  crudo: EntradaCruda,
): Promise<ResultadoDeGuardado> {
  const parseo = parsearEntradaDeFeature(crudo);
  if (!parseo.ok) {
    return parseo;
  }
  const { estado, ...resto } = parseo.datos;

  if (await nombreYaUsado(organizationId, resto.name, id)) {
    return { ok: false, errores: { name: MENSAJES_DE_FEATURE.nombreDuplicado } };
  }

  try {
    const { count } = await prisma.feature.updateMany({
      where: { id, organizationId },
      data: {
        ...resto,
        ...(estado ? { estado } : {}),
      },
    });

    if (count === 0) {
      return { ok: false, errores: { general: MENSAJES_DE_FEATURE.noExiste } };
    }
  } catch (error) {
    if (esCodigoDuplicado(error)) {
      return { ok: false, errores: { code: MENSAJES_DE_FEATURE.codigoDuplicado } };
    }
    throw error;
  }

  // Se vuelve a leer con el filtro de organización: el `updateMany` no devuelve la fila.
  const feature = await obtenerFeature(organizationId, id);
  return feature
    ? { ok: true, feature }
    : { ok: false, errores: { general: MENSAJES_DE_FEATURE.noExiste } };
}
