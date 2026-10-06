/**
 * Acceso a datos de `Client`, `ClientFeature` y `ClientVersionHistory` (ficha M1-04).
 *
 * **Regla #1 (docs/arquitectura/modelo-de-datos.md, "Regla de acceso a datos"):** toda función
 * recibe `organizationId` explícito y lo mete en el `where` o en el registro nuevo. La edición
 * usa `updateMany` con `{ id, organizationId }` a propósito: un `update` por id solo podría
 * alcanzar la fila de otra organización, que es justo lo que la regla prohíbe. El historial no
 * tiene `organizationId` propio (cuelga del cliente), así que se filtra por
 * `client: { organizationId }` — nunca solo por `clientId`.
 *
 * **El historial es append-only.** Acá no hay ninguna función que edite ni borre
 * `ClientVersionHistory`: lo único que se hace es agregar una fila cuando la versión cambió
 * (`laVersionCambio`, en `lib/validacion-de-cliente.ts`), incluida la primera carga.
 *
 * **Cliente e historial se escriben juntos o no se escriben.** El alta usa una escritura
 * anidada (Prisma la envuelve en una sola transacción) y la edición una transacción
 * interactiva: un cliente sin su fila de historial, o una fila sin su cliente, es el estado
 * roto que esta pieza no puede dejar.
 */
import type { Client } from "../prisma/generated/client/client";
import { prisma } from "./prisma";
import {
  type EntradaDeCliente,
  type ErroresDeCliente,
  MENSAJES_DE_CLIENTE,
  laVersionCambio,
  parsearEntradaDeCliente,
} from "./validacion-de-cliente";

export type { Client };

export type ResultadoDeGuardadoDeCliente =
  | { ok: true; cliente: Client }
  | { ok: false; errores: ErroresDeCliente };

/** Lo que llega del formulario, sin validar todavía. */
export type EntradaCrudaDeCliente = Record<string, unknown>;

/** Lo que el formulario de edición necesita para precargarse. */
export type ClienteParaEdicion = {
  id: string;
  name: string;
  currentVersion: string;
  notes: string | null;
  /** Solo los features habilitados (`enabled: true`): es lo que el checklist tilda. */
  featureIds: string[];
};

/** Una fila del registro de versiones (solo versión + fecha, como manda el PRD). */
export type FilaDeHistorial = {
  id: string;
  version: string;
  recordedAt: Date;
};

/** Una fila de la lista de Inicio: lo que se ve sin abrir el detalle (ficha M1-05, #1). */
export type FilaDeListaDeClientes = {
  id: string;
  name: string;
  currentVersion: string;
};

/** El encabezado de la Vista de cliente (ficha M1-05, #3). */
export type ClienteParaVista = {
  id: string;
  name: string;
  currentVersion: string;
  notes: string | null;
};

/** Cualquiera de los dos clientes de Prisma: el de siempre o el de dentro de una transacción. */
type ClientePrisma = Pick<typeof prisma, "feature">;

/**
 * ¿Todos estos features son de esta organización?
 *
 * Es la puerta de la regla #1 del lado de la escritura: sin este chequeo, un id de feature
 * ajeno enviado a mano en el formulario crearía una fila de `ClientFeature` que cruza dos
 * organizaciones. Un id inexistente se trata igual que uno ajeno: "ya no existe" — no se
 * confirma que exista en otra parte.
 */
async function featuresSonDeLaOrganizacion(
  db: ClientePrisma,
  organizationId: string,
  featureIds: string[],
): Promise<boolean> {
  if (featureIds.length === 0) {
    return true;
  }
  const encontrados = await db.feature.count({
    where: { organizationId, id: { in: featureIds } },
  });
  return encontrados === featureIds.length;
}

/**
 * Los clientes de esta organización, ordenados como se leen: por nombre.
 *
 * Trae la versión activa en la misma fila (criterio #1 de M1-05): la pregunta "qué versión
 * tiene cada cliente" se responde sin abrir ninguno. Regla #1: el `where` lleva
 * `organizationId` siempre — es la consulta donde una fuga sería más visible.
 */
export async function listarClientesDeOrganizacion(
  organizationId: string,
): Promise<FilaDeListaDeClientes[]> {
  return prisma.client.findMany({
    where: { organizationId },
    select: { id: true, name: true, currentVersion: true },
    orderBy: [{ name: "asc" }],
  });
}

/**
 * Un cliente de esta organización para su Vista (si no es de ella, `null`).
 *
 * Mismo criterio que la edición (regla #1, criterio #7 de M1-05): un id de otra
 * organización devuelve `null` y la pantalla responde 404 — se comporta como si el cliente
 * no existiera, sin confirmar que ese id exista en otra parte.
 */
export async function obtenerClienteParaVista(
  organizationId: string,
  id: string,
): Promise<ClienteParaVista | null> {
  return prisma.client.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true, currentVersion: true, notes: true },
  });
}

/** Un cliente de esta organización, listo para precargar el formulario (si no, `null`). */
export async function obtenerClienteParaEdicion(
  organizationId: string,
  id: string,
): Promise<ClienteParaEdicion | null> {
  const cliente = await prisma.client.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      name: true,
      currentVersion: true,
      notes: true,
      features: { where: { enabled: true }, select: { featureId: true } },
    },
  });

  if (!cliente) {
    return null;
  }

  return {
    id: cliente.id,
    name: cliente.name,
    currentVersion: cliente.currentVersion,
    notes: cliente.notes,
    featureIds: cliente.features.map((fila) => fila.featureId),
  };
}

/**
 * Los ids de features habilitados de un cliente de esta organización.
 *
 * "Habilitado" es la fila prendida, no la existencia de la fila: deshabilitar un feature deja
 * `enabled: false` (ver `actualizarCliente`), así que esta consulta filtra por `enabled`.
 */
export async function featuresHabilitadosDeCliente(
  organizationId: string,
  clientId: string,
): Promise<string[]> {
  const filas = await prisma.clientFeature.findMany({
    where: { clientId, enabled: true, client: { organizationId } },
    select: { featureId: true },
    orderBy: { featureId: "asc" },
  });
  return filas.map((fila) => fila.featureId);
}

/**
 * El registro de versiones de un cliente, del más viejo al más nuevo.
 *
 * Orden cronológico (no al revés) porque es la secuencia que se lee para auditar; la pantalla
 * de M1-05, que lo muestra con el más reciente primero, lo invierte al pintarlo.
 *
 * El desempate por `id` existe porque `recordedAt` se guarda con precisión de milisegundos:
 * dos cambios muy seguidos pueden caer en el mismo milisegundo y el orden tiene que ser
 * estable igual.
 */
export async function listarHistorialDeVersiones(
  organizationId: string,
  clientId: string,
): Promise<FilaDeHistorial[]> {
  return prisma.clientVersionHistory.findMany({
    where: { clientId, client: { organizationId } },
    select: { id: true, version: true, recordedAt: true },
    orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
  });
}

/**
 * Crea un cliente con su versión activa, sus features habilitados y **su primera fila de
 * historial** (criterios #1 y #2 de la ficha).
 *
 * Todo entra en una sola escritura anidada: Prisma la ejecuta dentro de una transacción, así
 * que o queda el cliente con su historial y sus features, o no queda nada.
 */
export async function crearCliente(
  organizationId: string,
  crudo: EntradaCrudaDeCliente,
): Promise<ResultadoDeGuardadoDeCliente> {
  const parseo = parsearEntradaDeCliente(crudo);
  if (!parseo.ok) {
    return parseo;
  }
  const datos: EntradaDeCliente = parseo.datos;

  if (!(await featuresSonDeLaOrganizacion(prisma, organizationId, datos.featureIds))) {
    return { ok: false, errores: { featureIds: MENSAJES_DE_CLIENTE.featureInexistente } };
  }

  const cliente = await prisma.client.create({
    data: {
      organizationId,
      name: datos.name,
      currentVersion: datos.currentVersion,
      notes: datos.notes,
      // La primera carga cuenta como cambio de versión: el PRD lo pide explícito y es la
      // fila que más fácil se olvida.
      versionHistory: { create: { version: datos.currentVersion } },
      features: {
        create: datos.featureIds.map((featureId) => ({ featureId, enabled: true })),
      },
    },
  });

  return { ok: true, cliente };
}

/**
 * Edita un cliente de esta organización y, **solo si la versión cambió**, suma una fila de
 * historial (criterios #3 y #4).
 *
 * Todo pasa dentro de una transacción interactiva porque la decisión depende de lo que había
 * guardado: leer la versión anterior, escribir la nueva y agregar la fila tienen que ser un
 * solo paso. Si se partiera en dos, dos guardados simultáneos podrían dejar el cliente en una
 * versión y el historial en otra.
 *
 * Los features se sincronizan sin borrar filas: lo que se destilda queda en `enabled: false`.
 * `ClientFeature.enabled` es justo el campo que el modelo define para eso
 * (`modelo-de-datos.md`: "si UN cliente en particular lo tiene prendido"), y borrar la fila
 * dejaría esa columna sin usar nunca.
 */
export async function actualizarCliente(
  organizationId: string,
  id: string,
  crudo: EntradaCrudaDeCliente,
): Promise<ResultadoDeGuardadoDeCliente> {
  const parseo = parsearEntradaDeCliente(crudo);
  if (!parseo.ok) {
    return parseo;
  }
  const datos: EntradaDeCliente = parseo.datos;

  return prisma.$transaction(async (tx): Promise<ResultadoDeGuardadoDeCliente> => {
    const actual = await tx.client.findFirst({
      where: { id, organizationId },
      select: { currentVersion: true },
    });

    // Un cliente de otra organización se comporta como si no existiera (regla #1, criterio
    // #8): no se confirma que el id exista en otra parte.
    if (!actual) {
      return { ok: false, errores: { general: MENSAJES_DE_CLIENTE.noExiste } };
    }

    if (!(await featuresSonDeLaOrganizacion(tx, organizationId, datos.featureIds))) {
      return { ok: false, errores: { featureIds: MENSAJES_DE_CLIENTE.featureInexistente } };
    }

    await tx.client.updateMany({
      where: { id, organizationId },
      data: {
        name: datos.name,
        currentVersion: datos.currentVersion,
        notes: datos.notes,
      },
    });

    if (laVersionCambio(actual.currentVersion, datos.currentVersion)) {
      await tx.clientVersionHistory.create({
        data: { clientId: id, version: datos.currentVersion },
      });
    }

    // Lo que ya no está tildado se apaga; `notIn: []` se evita porque no hay nada que apagar.
    await tx.clientFeature.updateMany({
      where: {
        clientId: id,
        enabled: true,
        ...(datos.featureIds.length > 0 ? { featureId: { notIn: datos.featureIds } } : {}),
      },
      data: { enabled: false },
    });

    for (const featureId of datos.featureIds) {
      await tx.clientFeature.upsert({
        where: { clientId_featureId: { clientId: id, featureId } },
        create: { clientId: id, featureId, enabled: true },
        update: { enabled: true },
      });
    }

    const cliente = await tx.client.findFirst({ where: { id, organizationId } });
    return cliente
      ? { ok: true, cliente }
      : { ok: false, errores: { general: MENSAJES_DE_CLIENTE.noExiste } };
  });
}
