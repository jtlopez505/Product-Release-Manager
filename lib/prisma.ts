/**
 * El único cliente de Prisma de la app (singleton).
 *
 * Desde Prisma 7 la connection string de runtime se pasa por un driver adapter, no por el
 * schema: acá entra DATABASE_URL (pooler en modo transacción, 6543) leída de variable de
 * entorno — regla #2, ver docs/arquitectura/secretos.md.
 *
 * Si DATABASE_URL falta, `requireEnv` corta al importar este módulo con un error que la
 * nombra (criterio #7 de M1-01): mejor un fallo ruidoso que una página en blanco.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client/client";
import { requireEnv } from "./env";

function crearPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: requireEnv("DATABASE_URL") });
  return new PrismaClient({ adapter });
}

// En dev, Next.js recarga los módulos en cada cambio: sin este cache global se abriría una
// conexión nueva por recarga hasta agotar el pool de Supabase.
const globalParaPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalParaPrisma.prisma ?? crearPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
