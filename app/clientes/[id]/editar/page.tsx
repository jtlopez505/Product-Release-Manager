/**
 * Edición de un cliente (ficha M1-04): el mismo formulario del alta, precargado.
 *
 * Queda detrás del portón sin hacer nada (`proxy.ts` cierra por omisión).
 *
 * **Regla #1, criterio #8:** el cliente se busca con `organizationId` explícito. Un id de
 * otra organización no devuelve nada y la ruta responde 404 — se comporta como si no
 * existiera, sin confirmar que ese id exista en otra parte.
 *
 * Se llega desde el botón "Editar" de la Vista de cliente, y al guardar se vuelve ahí con la
 * confirmación (`user-flow.md` §2 y §3). Por eso esta pantalla ya no muestra el "Cliente
 * guardado.": el destino del guardado es la Vista, que es donde se ve el resultado completo
 * —versión, features e historial— y no solo el formulario de nuevo.
 *
 * Sin navegación de pestañas a propósito (ver `app/navegacion.tsx`): salir de un formulario
 * por un link costaría lo tipeado. La salida es "Cancelar", que pregunta antes de descartar.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { obtenerClienteParaEdicion } from "@/lib/clientes";
import { listarFeaturesDeOrganizacion } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";

import { FormularioDeCliente } from "../../formulario-de-cliente";
import { opcionDeFeature } from "../../estado-de-guardado";
import { PanelDeError } from "../../panel-de-error";

export const metadata: Metadata = {
  title: "Editar cliente · ReleaseView",
};

export const dynamic = "force-dynamic";

export default async function EditarCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  let cliente;
  let features;
  try {
    const { id: organizationId } = await organizacionActual();
    [cliente, features] = await Promise.all([
      obtenerClienteParaEdicion(organizationId, id),
      listarFeaturesDeOrganizacion(organizationId),
    ]);
  } catch (error) {
    console.error("No se pudo cargar el cliente para editar:", error);
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">Editar cliente</h1>
        <PanelDeError
          mensaje={MENSAJES_DE_CLIENTE.cargaFallida}
          reintentarEn={`/clientes/${encodeURIComponent(id)}/editar`}
        />
      </main>
    );
  }

  if (!cliente) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{cliente.name}</h1>
        <p className="text-sm text-texto-secundario">
          Versión activa: <span className="font-datos">{cliente.currentVersion}</span>
        </p>
      </div>

      <FormularioDeCliente cliente={cliente} features={features.map(opcionDeFeature)} />
    </main>
  );
}
