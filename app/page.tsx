/**
 * Página base de M1-01: la prueba de que la app corre en local.
 * El inicio de verdad (versión y features por cliente) lo construye M1-05.
 */
export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "4rem 1.5rem",
        maxWidth: "40rem",
        margin: "0 auto",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.75rem" }}>ReleaseView</h1>
      <p style={{ margin: 0 }}>
        La base del proyecto está en pie: Next.js corriendo, Prisma conectado a
        Postgres y las claves fuera del código.
      </p>
      <p style={{ margin: 0, color: "#52525b" }}>
        Las pantallas de clientes y features llegan en las piezas siguientes de
        M1.
      </p>
    </main>
  );
}
