/**
 * Carga el archivo `.env` de la raíz en el entorno del proceso.
 *
 * Next.js y el CLI de Prisma lo hacen por su cuenta, pero los scripts que corren con `tsx`
 * (el seed) y los tests de integración no: sin esto fallan por DATABASE_URL faltante aunque
 * el `.env` esté completo.
 *
 * Importar este módulo ANTES que cualquier módulo que lea process.env (ej. lib/prisma.ts):
 * los imports se evalúan en orden.
 *
 * En producción (Vercel) no hay archivo `.env` y las variables vienen del entorno: el catch
 * deja seguir y, si falta alguna, `requireEnv` corta nombrándola.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env: se usa lo que ya haya en el entorno.
}

export {};
