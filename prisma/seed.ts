/**
 * Seed inicial: la organización de la que cuelga todo lo demás (regla #1 ·
 * docs/arquitectura/modelo-de-datos.md). El MVP tiene una sola.
 *
 * Es idempotente: si ya hay una organización, no crea otra — se puede correr sin miedo
 * después de cada migración.
 *
 * Correr con: npm run db:seed
 */
// Primero el entorno (este script corre con tsx, que no lee .env), después el cliente.
import "../lib/cargar-env";

import { prisma } from "../lib/prisma";

const NOMBRE_POR_DEFECTO = "Organización principal";

async function main(): Promise<void> {
  const nombre = process.env.SEED_ORG_NAME?.trim() || NOMBRE_POR_DEFECTO;

  const existente = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existente) {
    console.log(
      `Ya existe una organización ("${existente.name}", id ${existente.id}) — no se crea otra.`,
    );
    return;
  }

  const creada = await prisma.organization.create({ data: { name: nombre } });
  console.log(`Organización sembrada: "${creada.name}" (id ${creada.id}).`);
}

main()
  .catch((error: unknown) => {
    console.error("El seed falló:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
