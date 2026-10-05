/**
 * Página base de M1-01: la prueba de que la app corre en local Y que el camino
 * Next.js → Prisma → Postgres de Supabase está en pie (lee la organización sembrada).
 * El inicio de verdad (versión y features por cliente) lo construye M1-05.
 *
 * Desde M1-02 queda detrás del portón: sin sesión válida, el middleware manda a `/ingresar`.
 * Los estilos pasaron a los tokens de marca (app/globals.css) junto con la llegada de
 * Tailwind: tenía un gris pegado a mano, y la regla es que ningún hex viva en el markup.
 */
import Link from "next/link";

import { prisma } from "@/lib/prisma";

// La organización se lee en cada request: nada de prerender en build, que no tiene base.
export const dynamic = "force-dynamic";

export default async function Home() {
  const organizacion = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">ReleaseView</h1>
      <p className="text-sm">
        La base del proyecto está en pie: Next.js corriendo, Prisma conectado a Postgres
        y las claves fuera del código.
      </p>
      <p className="text-sm">
        Organización: <strong>{organizacion?.name ?? "(ninguna sembrada)"}</strong>
      </p>
      <p className="text-sm text-texto-secundario">
        Las pantallas de clientes llegan en las piezas siguientes de M1.
      </p>
      {/* M1-03: hasta que exista la navegación de pestañas (user-flow.md §1, M1-05/M2), este
          link es cómo se llega a la lista maestra de features. */}
      <Link href="/features" className="text-sm font-medium text-primario underline">
        Ver la lista de features
      </Link>
    </main>
  );
}
