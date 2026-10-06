/**
 * Lista de release por versión destino (ficha M3-01): elegir la versión que se va a
 * desplegar y ver, sin cruzar nada a mano, qué clientes la reciben y en qué versión está
 * cada uno hoy (`user-flow.md` §5). Es la primera mitad de "filtrar los clientes que
 * corresponden a la próxima versión o feature" (PRD, M3) y la pantalla sobre la que se
 * apoyan M3-02 (por feature) y M3-03 (exportar).
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión.
 *
 * **Qué se está mirando lo dice la URL**, no un estado escondido en el navegador:
 * `/lista-de-release` sin parámetro muestra el campo solo; `?version=<texto>` suma la lista.
 * Hoy el único criterio es por versión, así que la ausencia de `?por=` ya significa "por
 * versión" — el lugar donde M3-02 va a sumar `?por=feature` sin romper ningún link existente
 * (`?version=2.5.0` sigue andando igual cuando esa pieza exista).
 *
 * **Regla #1:** la organización la resuelve el servidor (`organizacionActual()`) y se pasa
 * explícita a la query; un cliente de otra organización no tiene por dónde aparecer en la
 * lista ni en los conteos.
 *
 * Mismo patrón que `app/por-feature/page.tsx`: `force-dynamic`, lo que depende de la consulta
 * a `Client` va dentro de un `Suspense` (así se ve el esqueleto en vez de una pantalla en
 * blanco mientras se resuelve), `searchParams` como promesa, formulario `GET` nativo.
 *
 * **Criterio #11 (versión con caracteres raros):** el texto de `?version=` se pinta tal cual
 * llegó, como texto de React (JSX escapa siempre) — nunca con `dangerouslySetInnerHTML` ni
 * interpretado de ninguna otra forma.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listarClientesDeOrganizacion } from "@/lib/clientes";
import {
  MENSAJES_DE_LISTA_DE_RELEASE,
  particionarClientesPorVersion,
  versionPedida,
} from "@/lib/lista-de-release";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";

import { PanelDeError } from "../clientes/panel-de-error";
import { Navegacion } from "../navegacion";
import { EsqueletoDeListaDeRelease } from "./esqueleto-de-lista-de-release";
import { FormularioDeVersion } from "./formulario-de-version";
import { VistaPreviaDeListaDeRelease } from "./vista-previa-de-lista-de-release";

export const metadata: Metadata = {
  title: "Lista de release · ReleaseView",
};

// Se lee en cada request: los clientes cambian con cada alta y lo que se mira lo decide la
// URL — no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

type Busqueda = { version?: string };

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

function Pantalla({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <Navegacion actual="release" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Lista de release</h1>
          <p className="text-sm text-texto-secundario">
            Escribí la versión que vas a desplegar y mirá qué clientes la reciben.
          </p>
        </div>
        {children}
      </main>
    </>
  );
}

/**
 * La lista en sí (criterios #3, #5, #6, #8, #9): la parte que depende de la consulta a
 * `Client`, dentro de su propio `Suspense`.
 */
async function ListaDeRelease({
  organizationId,
  version,
}: {
  organizationId: string;
  version: string;
}): Promise<React.ReactElement> {
  let clientes;
  try {
    // Regla #1: la query lleva la organización en el `where`.
    clientes = await listarClientesDeOrganizacion(organizationId);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudo cargar la lista de release:", error);
    return (
      <PanelDeError
        mensaje={MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida}
        reintentarEn={`/lista-de-release?version=${encodeURIComponent(version)}`}
      />
    );
  }

  if (clientes.length === 0) {
    // Criterio #9: sin clientes cargados, un solo mensaje y la acción, ni lista ni conteos.
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
        <p className="text-sm">{MENSAJES_DE_CLIENTE.sinClientes}</p>
        <Link href="/clientes/nuevo" className={CLASES_DE_ACCION_PRINCIPAL}>
          + Agregar cliente
        </Link>
      </div>
    );
  }

  const particion = particionarClientesPorVersion(clientes, version);

  return (
    <VistaPreviaDeListaDeRelease
      version={version}
      reciben={particion.reciben}
      yaEstan={particion.yaEstan}
    />
  );
}

export default async function ListaDeReleasePagina({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}): Promise<React.ReactElement> {
  const { version: versionCruda } = await searchParams;
  const version = versionPedida(versionCruda);

  let organizationId: string;
  try {
    // Regla #1: la organización la resuelve el servidor, nunca el navegador.
    const organizacion = await organizacionActual();
    organizationId = organizacion.id;
  } catch (error) {
    console.error("No se pudo cargar la lista de release:", error);
    return (
      <Pantalla>
        <FormularioDeVersion version={version} />
        <PanelDeError
          mensaje={MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida}
          reintentarEn={version ? `/lista-de-release?version=${encodeURIComponent(version)}` : "/lista-de-release"}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <FormularioDeVersion version={version} />

      {version === null ? (
        // Criterio #7: sin versión pedida, el mensaje y nada de consulta a clientes.
        <p className="text-sm text-texto-secundario">
          {MENSAJES_DE_LISTA_DE_RELEASE.sinVersionPedida}
        </p>
      ) : (
        <Suspense fallback={<EsqueletoDeListaDeRelease />}>
          <ListaDeRelease organizationId={organizationId} version={version} />
        </Suspense>
      )}
    </Pantalla>
  );
}
