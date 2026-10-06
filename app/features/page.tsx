/**
 * La lista maestra de features (ficha M1-03) — la primera pantalla de negocio de ReleaseView.
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión, así
 * que esta ruta NO está en la lista de rutas públicas y sin sesión redirige a `/ingresar`.
 *
 * Desde M2-01, la pestaña "Por feature" lleva a la consulta (`/por-feature`), no acá: esta
 * pantalla queda alcanzable desde ahí con el link "Lista maestra de features"
 * (`user-flow.md` §2.1). El link suelto que M1-03 había dejado en Inicio como puente hasta
 * acá ya no hace falta y se retiró desde M1-05.
 *
 * **Qué se está mirando lo dice la URL**, no un estado escondido en el navegador:
 *   - `/features` → la lista;
 *   - `/features?nuevo=1` → la lista con el formulario de alta abierto;
 *   - `/features?editar=<id>` → la lista con ese feature abierto para editar.
 * Por eso el formulario se renderiza en el servidor y funciona igual antes de que cargue el
 * JS (el mismo estándar que el portón de M1-02), el link de una fila se puede compartir, y
 * "Cancelar" es volver atrás de verdad.
 *
 * La consulta está dentro de un `Suspense` a propósito: es lo que hace que el skeleton de
 * filas se vea mientras la base responde, en vez de una pantalla en blanco.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listarFeaturesDeOrganizacion } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

import { Navegacion } from "../navegacion";
import { EsqueletoDeLista } from "./esqueleto-de-lista";
import { FormularioDeFeature } from "./formulario-de-feature";
import { TablaDeFeatures } from "./tabla-de-features";

export const metadata: Metadata = {
  title: "Features · ReleaseView",
};

// Se lee en cada request: la lista cambia con cada alta y no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

type Busqueda = { nuevo?: string; editar?: string };

function conteo(cantidad: number): string {
  return cantidad === 1 ? "1 feature en el catálogo" : `${cantidad} features en el catálogo`;
}

/**
 * Estado de error de la ficha §4: si falla traer la lista, el mensaje y la salida.
 *
 * Se renderiza en el servidor, no desde `error.tsx`: cuando la base falla dentro de un
 * `Suspense` ya empezado a transmitir, el boundary de cliente recién puede pintar cuando
 * hidrata — así, el mensaje viaja en el HTML y se ve aunque el JS no haya cargado.
 *
 * "Reintentar" es un `<a>` y no un `<Link>` a propósito: hace una carga completa de la ruta,
 * que es lo que vuelve a intentar la consulta de verdad. Un `Link` a la misma URL podría
 * resolverse del cache del router y no reintentar nada.
 */
function ErrorDeCarga(): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
      <p role="alert" className="text-sm">
        {MENSAJES_DE_FEATURE.cargaFallida}
      </p>
      <a
        href="/features"
        className="rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado"
      >
        Reintentar
      </a>
    </div>
  );
}

async function ListaMaestra({
  busqueda: busquedaPendiente,
}: {
  /** La promesa, no el valor: esperarla acá adentro es lo que deja ver el skeleton. */
  busqueda: Promise<Busqueda>;
}): Promise<React.ReactElement> {
  const busqueda = await busquedaPendiente;

  let features;
  try {
    // Regla #1: la organización la resuelve el servidor y se pasa explícita a la query.
    const { id: organizationId } = await organizacionActual();
    features = await listarFeaturesDeOrganizacion(organizationId);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudo cargar la lista de features:", error);
    return <ErrorDeCarga />;
  }

  // El feature a editar se busca DENTRO de la lista de la organización: un id de otra
  // organización simplemente no está acá (regla #1): no hay una segunda query que lo exponga.
  const aEditar = busqueda.editar
    ? (features.find((feature) => feature.id === busqueda.editar) ?? null)
    : null;
  const pidieronEditarAlgoQueNoEsta = Boolean(busqueda.editar) && aEditar === null;
  const formularioAbierto = Boolean(busqueda.nuevo) || aEditar !== null;
  const hayFeatures = features.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {pidieronEditarAlgoQueNoEsta ? (
        <p role="alert" className="text-sm text-error">
          {MENSAJES_DE_FEATURE.noExiste}
        </p>
      ) : null}

      {hayFeatures && !formularioAbierto ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-texto-secundario">{conteo(features.length)}</p>
          <Link href="/features?nuevo=1" className={CLASES_DE_ACCION_PRINCIPAL}>
            + Agregar feature
          </Link>
        </div>
      ) : null}

      {formularioAbierto ? <FormularioDeFeature feature={aEditar} /> : null}

      {hayFeatures ? (
        /* La tabla vive sobre superficie, dentro de un panel con borde, apoyado sobre el
           fondo: es el supuesto de layout con el que marca.md derivó los divisores. */
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <TablaDeFeatures features={features} idEnEdicion={aEditar?.id ?? null} />
        </div>
      ) : null}

      {!hayFeatures && !formularioAbierto ? (
        /* Estado vacío (ficha §4): texto claro y una sola acción. Sin ilustración y sin copy
           motivacional — marca.md § Voz y tono. */
        <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
          <p className="text-sm">Todavía no cargaste ningún feature.</p>
          <Link href="/features?nuevo=1" className={CLASES_DE_ACCION_PRINCIPAL}>
            + Agregar feature
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default function Features({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}): React.ReactElement {
  return (
    <>
      <Navegacion actual="features" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Features</h1>
          <p className="text-sm text-texto-secundario">
            El catálogo del producto. De esta lista se eligen los features que tiene habilitado
            cada cliente.
          </p>
        </div>

        <Suspense fallback={<EsqueletoDeLista />}>
          <ListaMaestra busqueda={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
