/**
 * Vista de cliente (ficha M1-05, criterios #3, #4, #5 y #7): la respuesta que el PM necesita
 * en el momento — qué versión tiene este cliente, qué features le están habilitados y cómo
 * fue cambiando su versión.
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión.
 *
 * **Regla #1, criterio #7:** el cliente se busca con `organizationId` explícito. Un id de
 * otra organización no devuelve nada y la ruta responde 404 — se comporta como si no
 * existiera, sin confirmar que ese id exista en otra parte (el mismo criterio que la edición
 * de M1-04). Los features y el historial también se consultan con la organización en el
 * `where`, así que no hay una segunda query por la que se pueda filtrar algo ajeno.
 *
 * **Por qué el encabezado no espera y las secciones sí:** la consulta del cliente es la que
 * decide si la ruta es 404, así que se hace antes de devolver cualquier HTML (si se
 * transmitiera primero el encabezado, el estado ya estaría enviado y el 404 no podría
 * cambiarse). Lo de abajo —catálogo de features e historial— va dentro de un `Suspense`, que
 * es lo que deja ver el esqueleto de secciones mientras la base responde.
 *
 * Editar no se duplica acá (ficha §5): el botón lleva al formulario de M1-04, precargado.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  featuresHabilitadosDeCliente,
  listarHistorialDeVersiones,
  obtenerClienteParaVista,
} from "@/lib/clientes";
import { listarFeaturesDeOrganizacion } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { ETIQUETAS_DE_CLIENTE, MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";
import { agruparFeaturesDelCliente } from "@/lib/vista-de-cliente";

import { Navegacion } from "../../navegacion";
import { PanelDeError } from "../panel-de-error";
import { EsqueletoDeSecciones } from "./esqueleto-de-secciones";
import { FeaturesDelCliente } from "./features-del-cliente";
import { HistorialDeVersiones } from "./historial-de-versiones";

export const metadata: Metadata = {
  title: "Cliente · ReleaseView",
};

// Se lee en cada request: los datos cambian con cada edición y no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

const CLASES_DE_PANTALLA = "mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8";

/**
 * El marco de la pantalla: la misma navegación de nivel superior que Inicio (la pestaña "Por
 * cliente" sigue siendo la sección donde se está) más el link de vuelta a la lista, que es de
 * dónde se viene.
 */
function Pantalla({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <Navegacion actual="clientes" />
      <main className={CLASES_DE_PANTALLA}>
        <Link
          href="/"
          className="text-sm text-texto-secundario underline-offset-2 hover:underline"
        >
          ← Clientes
        </Link>
        {children}
      </main>
    </>
  );
}

/**
 * Las dos secciones de abajo, que son las que esperan a la base: features (en sus dos grupos)
 * e historial completo. Si la consulta falla, el mensaje y la salida — nunca el stack.
 */
async function SeccionesDelCliente({
  organizationId,
  clientId,
}: {
  organizationId: string;
  clientId: string;
}): Promise<React.ReactElement> {
  let catalogo;
  let habilitados;
  let historial;
  try {
    // Las tres consultas llevan la organización en el `where` (regla #1).
    [catalogo, habilitados, historial] = await Promise.all([
      listarFeaturesDeOrganizacion(organizationId),
      featuresHabilitadosDeCliente(organizationId, clientId),
      listarHistorialDeVersiones(organizationId, clientId),
    ]);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudieron cargar los features y el historial del cliente:", error);
    return (
      <PanelDeError
        mensaje={MENSAJES_DE_CLIENTE.cargaFallida}
        reintentarEn={`/clientes/${encodeURIComponent(clientId)}`}
      />
    );
  }

  // El JSX se arma fuera del `try`: dentro, un error de render no lo atraparía igual (es
  // lo que avisa la regla `react-hooks/error-boundaries`), solo escondería el camino feliz.
  const grupos = agruparFeaturesDelCliente(
    catalogo.map(({ id, name, code }) => ({ id, name, code })),
    habilitados,
  );

  return (
    <>
      <FeaturesDelCliente
        habilitados={grupos.habilitados}
        noHabilitados={grupos.noHabilitados}
      />
      <HistorialDeVersiones historial={historial} />
    </>
  );
}

export default async function VistaDeCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const { guardado } = await searchParams;

  let organizationId: string;
  let cliente;
  try {
    // Regla #1: la organización la resuelve el servidor y se pasa explícita a la query.
    const organizacion = await organizacionActual();
    organizationId = organizacion.id;
    cliente = await obtenerClienteParaVista(organizationId, id);
  } catch (error) {
    console.error("No se pudo cargar el cliente:", error);
    return (
      <Pantalla>
        <PanelDeError
          mensaje={MENSAJES_DE_CLIENTE.cargaFallida}
          reintentarEn={`/clientes/${encodeURIComponent(id)}`}
        />
      </Pantalla>
    );
  }

  // Criterio #7: de otra organización o inexistente, da lo mismo — no existe para esta app.
  if (!cliente) {
    notFound();
  }

  return (
    <Pantalla>
      {guardado ? (
        /* El color nunca va solo (marca.md): el chip lleva la palabra. Es la confirmación
           del guardado de M1-04, que ahora termina su recorrido acá (user-flow.md §2). */
        <p role="status" className="rounded-md bg-chip-exito px-3 py-2 text-sm text-exito">
          {MENSAJES_DE_CLIENTE.guardado}
        </p>
      ) : null}

      {/* Encabezado: nombre + versión activa, lo primero visible y sin scroll (criterio #3).
          Panel delimitado con borde y no con sombra (marca.md § Reglas de interfaz). */}
      <div className="flex flex-col gap-4 rounded-lg border border-borde-marcado bg-superficie p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{cliente.name}</h1>
            <p className="flex items-baseline gap-2 text-sm text-texto-secundario">
              {ETIQUETAS_DE_CLIENTE.currentVersion}
              {/* Monoespaciada y en grande: es el dato que se viene a buscar. */}
              <span className="font-datos text-lg font-medium text-texto">
                {cliente.currentVersion}
              </span>
            </p>
          </div>
          <Link
            href={`/clientes/${encodeURIComponent(cliente.id)}/editar`}
            className={CLASES_DE_ACCION_PRINCIPAL}
          >
            Editar
          </Link>
        </div>

        {cliente.notes ? (
          <div className="flex flex-col gap-1 border-t border-borde-sutil pt-3">
            <p className="text-xs font-medium text-texto-secundario">
              {ETIQUETAS_DE_CLIENTE.notes}
            </p>
            <p className="text-sm whitespace-pre-line">{cliente.notes}</p>
          </div>
        ) : null}
      </div>

      <Suspense fallback={<EsqueletoDeSecciones />}>
        <SeccionesDelCliente organizationId={organizationId} clientId={id} />
      </Suspense>
    </Pantalla>
  );
}
