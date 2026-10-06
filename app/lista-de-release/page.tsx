/**
 * Lista de release (ficha M3-01 por versión destino; M3-02 suma el criterio por feature):
 * elegir la versión o el feature que se va a desplegar y ver, sin cruzar nada a mano, qué
 * clientes corresponden (`user-flow.md` §5). Es "filtrar los clientes que corresponden a la
 * próxima versión o feature" completo (PRD, M3) y la pantalla sobre la que se apoya M3-03
 * (exportar).
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión.
 *
 * **Qué se está mirando lo dice la URL**, no un estado escondido en el navegador. El criterio
 * activo lo decide `?por=` (`criterioActivo`, `lib/lista-de-release.ts`): `"feature"` con ese
 * valor exacto, `"version"` sin el parámetro o con cualquier otro valor — el comportamiento de
 * M3-01, sin cambios (ficha M3-02, fila 11). **Solo se lee el parámetro del criterio activo**
 * (ficha M3-02, fila 10 — "no debe pasar"): por versión se ignora `?feature=`; por feature se
 * ignora `?version=`.
 *
 * **Regla #1:** la organización la resuelve el servidor (`organizacionActual()`) y se pasa
 * explícita a cada query; un cliente o un feature de otra organización no tiene por dónde
 * aparecer en la lista, en el selector ni en los conteos. Un `?feature=` ajeno o inexistente
 * responde igual — "Ese feature ya no existe." — sin distinguir los dos casos, exactamente
 * como ya hace `/por-feature` (`obtenerFeature`, `lib/features.ts`).
 *
 * **No se reescribe ningún cálculo:** `particionarClientesPorVersion` (M3-01,
 * `lib/lista-de-release.ts`) y `particionarClientesPorFeature` (M2-01,
 * `lib/consulta-por-feature.ts`) son los mismos de siempre; esta pieza solo decide, según el
 * criterio activo, cuál de los dos llamar y con qué título/mensaje pintar el resultado en
 * `VistaPreviaDeListaDeRelease` (componente compartido entre los dos criterios).
 *
 * Mismo patrón que `app/por-feature/page.tsx`: `force-dynamic`, lo que depende de la consulta
 * a `Client` va dentro de un `Suspense`, `searchParams` como promesa, formularios `GET`
 * nativos (`FormularioDeVersion`, `SelectorDeFeature` parametrizado con `destino` y
 * `camposOcultos`, ficha M3-02 anexo técnico).
 *
 * **Criterio #11 de M3-01 (versión con caracteres raros):** el texto de `?version=` se pinta
 * tal cual llegó, como texto de React (JSX escapa siempre) — nunca con
 * `dangerouslySetInnerHTML` ni interpretado de ninguna otra forma.
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
import {
  MENSAJES_DE_LISTA_DE_RELEASE,
  criterioActivo,
  mensajeDeClientesQueYaEstan,
  mensajeDeClientesQueYaTienenFeature,
  particionarClientesPorVersion,
  tituloDeListaDeRelease,
  tituloDeListaDeReleasePorFeature,
  versionPedida,
} from "@/lib/lista-de-release";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";
import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

import { PanelDeError } from "../clientes/panel-de-error";
import { ChipDeEstado } from "../features/tabla-de-features";
import { Navegacion } from "../navegacion";
import { SelectorDeFeature } from "../por-feature/selector-de-feature";
import { CriterioDeFiltro } from "./criterio-de-filtro";
import { EsqueletoDeListaDeRelease } from "./esqueleto-de-lista-de-release";
import { FormularioDeVersion } from "./formulario-de-version";
import { VistaPreviaDeListaDeRelease } from "./vista-previa-de-lista-de-release";

export const metadata: Metadata = {
  title: "Lista de release · ReleaseView",
};

// Se lee en cada request: los clientes y los features cambian con cada alta y lo que se mira
// lo decide la URL — no hay nada que prerenderizar.
export const dynamic = "force-dynamic";

type Busqueda = { por?: string; version?: string; feature?: string };

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
            Elegí la versión o el feature que vas a desplegar y mirá qué clientes corresponden.
          </p>
        </div>
        {children}
      </main>
    </>
  );
}

/** Lo que se ve cuando no hay ningún cliente cargado (ficha M3-01 #9 y M3-02 #9: mismo texto). */
function SinClientes(): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
      <p className="text-sm">{MENSAJES_DE_CLIENTE.sinClientes}</p>
      <Link href="/clientes/nuevo" className={CLASES_DE_ACCION_PRINCIPAL}>
        + Agregar cliente
      </Link>
    </div>
  );
}

/**
 * La lista por versión destino (ficha M3-01, criterios #3, #5, #6, #8, #9): la parte que
 * depende de la consulta a `Client`, dentro de su propio `Suspense`.
 */
async function ListaDeReleasePorVersion({
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
    return <SinClientes />;
  }

  const particion = particionarClientesPorVersion(clientes, version);

  return (
    <VistaPreviaDeListaDeRelease
      titulo={tituloDeListaDeRelease(version, particion.reciben.length)}
      mensajeSecundario={mensajeDeClientesQueYaEstan(version, particion.yaEstan.length)}
      reciben={particion.reciben}
      identificador={{ tipo: "version", version }}
    />
  );
}

/**
 * La lista por feature (ficha M3-02, criterios #3, #4, #5, #7, #9): mismo cálculo de M2-01
 * (`particionarClientesPorFeature`), con el título y el mensaje secundario de esta pantalla.
 *
 * "Reciben" acá es "todavía no lo tienen" (`noLoTienenTodavia`): son los clientes a los que
 * llega el feature si se despliega ahora. "Ya están" es "lo tienen" (`loTienen`): quedan
 * afuera y solo se cuentan (ficha M3-02, fila 3 y 4).
 */
async function ListaDeReleasePorFeature({
  organizationId,
  featureId,
  featureName,
  featureCode,
}: {
  organizationId: string;
  featureId: string;
  featureName: string;
  featureCode: string | null;
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
    console.error("No se pudo cargar la lista de release:", error);
    return (
      <PanelDeError
        mensaje={MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida}
        reintentarEn={`/lista-de-release?por=feature&feature=${encodeURIComponent(featureId)}`}
      />
    );
  }

  if (clientes.length === 0) {
    return <SinClientes />;
  }

  const particion = particionarClientesPorFeature(clientes, idsHabilitados);

  return (
    <VistaPreviaDeListaDeRelease
      titulo={tituloDeListaDeReleasePorFeature(featureName, particion.noLoTienenTodavia.length)}
      mensajeSecundario={mensajeDeClientesQueYaTienenFeature(particion.loTienen.length)}
      reciben={particion.noLoTienenTodavia}
      identificador={{ tipo: "feature", feature: { code: featureCode, name: featureName } }}
    />
  );
}

/**
 * La rama "por feature" completa (ficha M3-02, criterios #2, #6, #8, #12 y regla #1): el
 * selector, el feature elegido (con su código y su estado) y, dentro de su propio `Suspense`,
 * la lista. Mismo criterio que `app/por-feature/page.tsx`: el selector y la validación de
 * `?feature=` son consultas rápidas que no esperan la consulta a `Client`.
 */
async function SeccionPorFeature({
  organizationId,
  featureIdBuscado,
}: {
  organizationId: string;
  featureIdBuscado: string | undefined;
}): Promise<React.ReactElement> {
  let features;
  try {
    // Regla #1: la lista de features también lleva la organización en el `where`.
    features = await listarFeaturesDeOrganizacion(organizationId);
  } catch (error) {
    console.error("No se pudo cargar la lista de release:", error);
    return (
      <PanelDeError
        mensaje={MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida}
        reintentarEn="/lista-de-release?por=feature"
      />
    );
  }

  if (features.length === 0) {
    // Criterio #8: sin features en el catálogo no hay selector: mensaje y salida.
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
        <p className="text-sm">{MENSAJES_DE_CONSULTA_POR_FEATURE.sinFeaturesEnCatalogo}</p>
        <Link href="/features?nuevo=1" className={CLASES_DE_ACCION_PRINCIPAL}>
          + Agregar feature
        </Link>
      </div>
    );
  }

  // Criterio #12, regla #1: un id ajeno o inexistente responde igual, sin distinguir cuál es
  // cuál — no se confirma que el id exista en otra parte (mismo criterio que `/por-feature`).
  const featureElegido = featureIdBuscado
    ? await obtenerFeature(organizationId, featureIdBuscado)
    : null;
  const pidieronUnoQueNoEsta = Boolean(featureIdBuscado) && featureElegido === null;

  return (
    <>
      <SelectorDeFeature
        features={features}
        featureElegidoId={featureElegido?.id ?? null}
        destino="/lista-de-release"
        camposOcultos={{ por: "feature" }}
        textoBoton="Ver lista"
      />

      {pidieronUnoQueNoEsta ? (
        <p role="alert" className="text-sm text-error">
          {MENSAJES_DE_FEATURE.noExiste}
        </p>
      ) : null}

      {!featureIdBuscado ? (
        // Criterio #6: sin feature elegido, el mensaje y nada de consulta a clientes.
        <p className="text-sm text-texto-secundario">
          {MENSAJES_DE_LISTA_DE_RELEASE.sinFeatureElegido}
        </p>
      ) : null}

      {featureElegido ? (
        <>
          {/* Criterio #4: qué feature se está mirando — nombre, código y estado. */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borde-marcado bg-superficie p-4">
            <p className="text-base font-semibold tracking-tight">{featureElegido.name}</p>
            {featureElegido.code ? (
              <span className="font-datos text-xs text-texto-secundario">
                {featureElegido.code}
              </span>
            ) : null}
            <ChipDeEstado estado={featureElegido.estado} />
          </div>

          <Suspense fallback={<EsqueletoDeListaDeRelease />}>
            <ListaDeReleasePorFeature
              organizationId={organizationId}
              featureId={featureElegido.id}
              featureName={featureElegido.name}
              featureCode={featureElegido.code}
            />
          </Suspense>
        </>
      ) : null}
    </>
  );
}

export default async function ListaDeReleasePagina({
  searchParams,
}: {
  searchParams: Promise<Busqueda>;
}): Promise<React.ReactElement> {
  const { por, version: versionCruda, feature: featureIdCrudo } = await searchParams;
  const criterio = criterioActivo(por);
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
        <CriterioDeFiltro activo={criterio} />
        {criterio === "version" ? <FormularioDeVersion version={version} /> : null}
        <PanelDeError
          mensaje={MENSAJES_DE_LISTA_DE_RELEASE.cargaFallida}
          reintentarEn={
            criterio === "feature"
              ? "/lista-de-release?por=feature"
              : version
                ? `/lista-de-release?version=${encodeURIComponent(version)}`
                : "/lista-de-release"
          }
        />
      </Pantalla>
    );
  }

  if (criterio === "feature") {
    return (
      <Pantalla>
        <CriterioDeFiltro activo="feature" />
        <SeccionPorFeature organizationId={organizationId} featureIdBuscado={featureIdCrudo} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <CriterioDeFiltro activo="version" />
      <FormularioDeVersion version={version} />

      {version === null ? (
        // Criterio #7: sin versión pedida, el mensaje y nada de consulta a clientes.
        <p className="text-sm text-texto-secundario">
          {MENSAJES_DE_LISTA_DE_RELEASE.sinVersionPedida}
        </p>
      ) : (
        <Suspense fallback={<EsqueletoDeListaDeRelease />}>
          <ListaDeReleasePorVersion organizationId={organizationId} version={version} />
        </Suspense>
      )}
    </Pantalla>
  );
}
