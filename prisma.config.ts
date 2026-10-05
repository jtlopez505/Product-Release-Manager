// Configuración del CLI de Prisma (Prisma 7).
//
// En Prisma 7 las connection strings salieron de schema.prisma: la URL que usan los comandos
// de migración/introspección se declara acá. Sigue valiendo la regla #2 — el valor nunca se
// escribe, se lee de la variable de entorno (docs/arquitectura/secretos.md).
//
// Acá va DIRECT_URL (pooler en modo sesión, 5432) a propósito: el pooler en modo transacción
// de DATABASE_URL (6543) no soporta las sentencias DDL que usa `prisma migrate`.
// DATABASE_URL es la que usa la app en runtime (ver lib/prisma.ts).
import { defineConfig, env } from "prisma/config";

// El CLI de Prisma no carga `.env` por sí solo en todos los contextos; Node lo hace nativo.
// No pisa variables ya presentes en el entorno (ej. las que inyecta Vercel).
try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env: las variables tienen que venir del entorno. Si falta alguna, el
  // env() de abajo corta con un error explícito que la nombra (criterio #7 de M1-01).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
