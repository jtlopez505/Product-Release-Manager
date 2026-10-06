/**
 * Consulta por feature (ficha M2-01): elegir un feature y ver, de un vistazo, qué clientes lo
 * tienen habilitado y cuáles todavía no — la segunda pregunta de negocio del ICP
 * (`user-flow.md` §4). Antes de esta pieza, responderla obligaba a abrir cliente por
 * cliente; acá se lee directo de `ClientFeature`, sin datos nuevos que guardar.
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión.
 *
 * **Qué se está mirando lo dice la URL**, no un estado escondido en el navegador: `/por-feature`
 * sin parámetro muestra el selector solo; `/por-feature?feature=<id>` muestra también las dos
 * listas de ese feature. El formulario del selector (`selector-de-feature.tsx`) es un
 * `<form method="get">` nativo: funciona igual antes de que cargue el JS.
 *
 * **Regla #1, criterios #11 y #12:** la organización la resuelve el servidor
 * (`organizacionActual()`), nunca el navegador. El feature de `?feature=` se valida con
 * `obtenerFeature(organizationId, id)` (`lib/features.ts`): si no es de esta organización
 * devuelve `null` y la pantalla responde exactamente igual que si el id no existiera en
 * ninguna parte — "Ese feature ya no existe." — sin distinguir los dos casos.
 *
 * **Por qué el selector y el feature elegido no esperan la consulta de clientes:** la lista
 * de features y la validación de `?feature=` son consultas rápidas y son lo que decide qué
 * mensaje mostrar (fila 7, 9, 10 o 12 de la ficha), así se resuelven antes de devolver
 * cualquier HTML — el mismo criterio que la Vista de cliente (M1-05) usa para su encabezado.
 * Solo las dos listas, que dependen de la consulta a `Client` y `ClientFeature`, van dentro
 * de un `Suspense`: es lo que deja ver el esqueleto de filas (fila 15) con el selector ya a
 * la vista, en vez de una pantalla en blanco.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { idsDeClientesConFeatureHabilitado, listarClientesDeOrganizacion } from "@/lib/clientes";
import {
  MENSAJES_DE_CONSULTA_POR_FEATURE,
  particionarClientesPorFeature,
} from "@/lib/consulta-por-feature";
import { listarFeaturesDeOrganizacion, obtenerFeature } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";
import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

import { ChipDeEstado } from "../features/tabla-de-features";
import { Navegacion } from "../navegacion";
import { PanelDeError } from "../clientes/panel-de-error";
import { EsqueletoDeConsulta } from "./esqueleto-de-consulta";
import { ListasDeClientesPorFeature } from "./listas-de-clientes";
import { SelectorDeFeature } from "./selector-de-feature";

export const metadata: Metadata = {
  title: "Por feature · ReleaseView",
};

// Se lee en cada request: el catálogo y los clientes cambian con cada alta, y lo que se mira
// lo decide la URL — no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

type Busqueda = { feature?: string };

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

function Pantalla({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <Navegacion actual="features" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Por feature</h1>
          <p className="text-sm text-texto-secundario">
            Elegí un feature y mirá qué clientes lo tienen habilitado y cuáles todavía no.
          </p>
        </div>
        {children}
      </main>
    </>
  );
}

/**
 * Las dos listas de clientes (criterios #3, #4, #5, #8 y #9 de la ficha): la parte que
 * depende de la consulta a `Client` y `ClientFeature`, dentro de su propio `Suspense`.
 */
async function ListasDelFeature({
  organizationId,
  featureId,
}: {
  organizationId: string;
  featureId: string;
}): Promise<React.ReactElement> {
  let clientes;
  let idsHabilitados;
  try {
    // Regla #1: las dos consultas llevan la organización en el `where`.
    [clientes, idsHabilitados] = await Promise.all([
      listarClientesDeOrganizacion(organizationId),
      idsDeClientesConFeatureHabilitado(organizationId, featureId),
    ]);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudo cargar la consulta por feature:", error);
    return (
      <PanelDeError
        mensaje={MENSAJES_DE_CONSULTA_POR_FEATURE.cargaFallida}
        reintentarEn={`/por-feature?feature=${encodeURIComponent(featureId)}`}
      />
    );
  }

  if (clientes.length === 0) {
    // Criterio #9: sin clientes cargados, un solo mensaje y la acción, no dos listas vacías.
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
        <p className="text-sm">{MENSAJES_DE_CLIENTE.sinClientes}</p>
        <Link href="/clientes/nuevo" className={CLASES_DE_ACCION_PRINCIPAL}>
          + Agregar cliente
        </Link>
      </div>
    );
  }

  const particion = particionarClientesPorFeature(clientes, idsHabilitados);

  return (
    <ListasDeClientesPorFeature
      loTienen={particion.loTienen}
      noLoTienenTodavia={particion.noLoTienenTodavia}
    />
  );
}

export default async function PorFeature({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}): Promise<React.ReactElement> {
  const { feature: featureIdBuscado } = await searchParams;

  let organizationId: string;
  let features;
  try {
    // Regla #1: la organización la resuelve el servidor y se pasa explícita a las queries.
    const organizacion = await organizacionActual();
    organizationId = organizacion.id;
    features = await listarFeaturesDeOrganizacion(organizationId);
  } catch (error) {
    console.error("No se pudo cargar la consulta por feature:", error);
    return (
      <Pantalla>
        <PanelDeError
          mensaje={MENSAJES_DE_CONSULTA_POR_FEATURE.cargaFallida}
          reintentarEn="/por-feature"
        />
      </Pantalla>
    );
  }

  if (features.length === 0) {
    // Criterio #10: sin features en el catálogo no hay selector: mensaje y salida.
    return (
      <Pantalla>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
          <p className="text-sm">{MENSAJES_DE_CONSULTA_POR_FEATURE.sinFeaturesEnCatalogo}</p>
          <Link href="/features?nuevo=1" className={CLASES_DE_ACCION_PRINCIPAL}>
            + Agregar feature
          </Link>
        </div>
      </Pantalla>
    );
  }

  // Criterio #12, regla #1: un id ajeno o inexistente responde igual, sin distinguir cuál es
  // cuál — no se confirma que el id exista en otra parte.
  const featureElegido = featureIdBuscado
    ? await obtenerFeature(organizationId, featureIdBuscado)
    : null;
  const pidieronUnoQueNoEsta = Boolean(featureIdBuscado) && featureElegido === null;

  return (
    <Pantalla>
      <SelectorDeFeature features={features} featureElegidoId={featureElegido?.id ?? null} />

      {pidieronUnoQueNoEsta ? (
        <p role="alert" className="text-sm text-error">
          {MENSAJES_DE_FEATURE.noExiste}
        </p>
      ) : null}

      {!featureIdBuscado ? (
        // Criterio #7: sin feature elegido, el mensaje y nada de consulta a clientes.
        <p className="text-sm text-texto-secundario">
          {MENSAJES_DE_CONSULTA_POR_FEATURE.sinFeatureElegido}
        </p>
      ) : null}

      {featureElegido ? (
        <>
          {/* Criterio #6: qué feature se está mirando — nombre, código y estado. */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borde-marcado bg-superficie p-4">
            <p className="text-base font-semibold tracking-tight">{featureElegido.name}</p>
            {featureElegido.code ? (
              <span className="font-datos text-xs text-texto-secundario">
                {featureElegido.code}
              </span>
            ) : null}
            <ChipDeEstado estado={featureElegido.estado} />
          </div>

          <Suspense fallback={<EsqueletoDeConsulta />}>
            <ListasDelFeature organizationId={organizationId} featureId={featureElegido.id} />
          </Suspense>
        </>
      ) : null}
    </Pantalla>
  );
}
