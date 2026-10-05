import { defineConfig } from "vitest/config";

// Verificación 2 (integración): corre contra la base real de Supabase, con las variables de
// .env cargadas. Separada de `npm test` a propósito — la verificación 1 (unitarias + linter)
// tiene que poder correr sin base de datos.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    setupFiles: ["tests/integracion/cargar-env.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
