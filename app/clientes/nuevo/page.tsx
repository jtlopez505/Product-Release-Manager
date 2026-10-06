/**
 * Alta de cliente (ficha M1-04): nombre, versión activa y el checklist de features.
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión, así
 * que esta ruta NO está en la lista de rutas públicas y sin sesión redirige a `/ingresar`.
 *
 * Desde M1-05 se llega acá por el "+ Agregar cliente" de Inicio (antes solo escribiendo la
 * URL). Al guardar, el recorrido termina en la Vista de cliente (`user-flow.md` §2).
 *
 * Sin navegación de pestañas a propósito (ver `app/navegacion.tsx`): salir de un formulario
 * por un link costaría lo tipeado. La salida es "Cancelar", que pregunta antes de descartar.
 */
import type { Metadata } from "next";

import { listarFeaturesDeOrganizacion } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";

import { FormularioDeCliente } from "../formulario-de-cliente";
import { opcionDeFeature } from "../estado-de-guardado";
import { PanelDeError } from "../panel-de-error";

export const metadata: Metadata = {
  title: "Nuevo cliente · ReleaseView",
};

// La lista maestra se lee en cada request: cambia con cada alta, no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

export default async function NuevoCliente(): Promise<React.ReactElement> {
  let features;
  try {
    // Regla #1: la organización la resuelve el servidor y se pasa explícita a la query.
    const { id: organizationId } = await organizacionActual();
    features = await listarFeaturesDeOrganizacion(organizationId);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudo preparar el alta de cliente:", error);
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-10">
        <h1 className="text-xl font-semibold tracking-tight">Nuevo cliente</h1>
        <PanelDeError
          mensaje={MENSAJES_DE_CLIENTE.cargaFallida}
          reintentarEn="/clientes/nuevo"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Nuevo cliente</h1>
        <p className="text-sm text-texto-secundario">
          Qué versión tiene y qué features le están habilitados.
        </p>
      </div>

      <FormularioDeCliente cliente={null} features={features.map(opcionDeFeature)} />
    </main>
  );
}
