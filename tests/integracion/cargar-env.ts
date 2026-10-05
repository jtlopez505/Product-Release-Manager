// Los tests de integración hablan con la base real: necesitan las variables de .env
// (DATABASE_URL). Vitest no las carga por su cuenta.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin .env: se asume que las variables ya vienen del entorno. Si falta alguna, el
  // require del cliente de Prisma falla nombrándola.
}
