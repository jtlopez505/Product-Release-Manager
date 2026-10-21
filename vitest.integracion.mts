import { defineConfig } from "vitest/config";

// Verificación 2 (integración): corre contra una base de datos de Supabase **propia de la
// suite** (DATABASE_URL_TEST), nunca contra la base real del owner — ficha M4-00. Separada de
// `npm test` a propósito: la verificación 1 (unitarias + linter) tiene que poder correr sin
// base de datos.
//
// `setupFiles` es el punto donde eso pasa: `tests/integracion/entorno-de-prueba.ts` carga el
// `.env` y reemplaza DATABASE_URL/DIRECT_URL por las de prueba antes de que se importe
// cualquier archivo de test (y con ellos `lib/prisma.ts`). Si la base de prueba falta o es la
// real, corta ahí y no corre nada.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    setupFiles: ["tests/integracion/entorno-de-prueba.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
