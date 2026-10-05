import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    // Los tests de integración necesitan la base real: van en su propia corrida
    // (npm run test:integracion), que es la verificación 2.
    exclude: ["tests/integracion/**"],
  },
});
