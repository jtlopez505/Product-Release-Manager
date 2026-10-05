/**
 * Cuál es la organización que está usando la app (el `organizationId` de la regla #1).
 *
 * En el MVP el acceso es un portón con una contraseña compartida, no cuentas
 * (docs/arquitectura/auth-y-permisos.md): la cookie de sesión no transporta ninguna
 * organización, y `modelo-de-datos.md` dice que hay **una sola** organización, sembrada al
 * desplegar. Así que "la organización actual" es la sembrada — el mismo criterio que ya usa
 * `app/page.tsx` desde M1-01: la primera por fecha de creación.
 *
 * Esto está encapsulado acá a propósito. El día que haya una segunda organización, cambia
 * solo este archivo (saldrá de la sesión o del dominio) y ninguna query: todas reciben el
 * `organizationId` por parámetro, que es lo que exige la regla #1.
 *
 * Si no hay ninguna organización, falla ruidosamente nombrando el comando que la siembra:
 * una lista vacía mentiría sobre el estado de la base.
 */
import { prisma } from "./prisma";

export type OrganizacionActual = { id: string; name: string };

export class OrganizacionNoSembradaError extends Error {
  constructor() {
    super(
      "No hay ninguna organización en la base. Corré `npm run db:seed` para sembrarla " +
        "(ver docs/arquitectura/modelo-de-datos.md). La app no puede guardar ni listar " +
        "features sin una organización de la que colgarlos.",
    );
    this.name = "OrganizacionNoSembradaError";
  }
}

export async function organizacionActual(): Promise<OrganizacionActual> {
  const organizacion = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (!organizacion) {
    throw new OrganizacionNoSembradaError();
  }

  return organizacion;
}
