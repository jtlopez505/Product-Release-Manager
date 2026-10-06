/**
 * Inicio — la lista de clientes de la organización (ficha M1-05, criterios #1, #2 y #6).
 *
 * Es lo primero que se ve al entrar (`user-flow.md` §1): cada cliente con su versión activa
 * en la misma fila, y "+ Agregar cliente" siempre visible. Reemplaza la página de prueba de
 * M1-01, que solo demostraba que Next.js y Prisma estaban en pie, y retira el link puente a
 * `/features` que M1-03 había dejado acá: ahora la lista maestra cuelga de la pestaña "Por
 * feature" (`app/navegacion.tsx`).
 *
 * Queda detrás del portón sin hacer nada: el matcher de `proxy.ts` cierra por omisión.
 *
 * **Regla #1:** la organización la resuelve el servidor (`organizacionActual()`) y se pasa
 * explícita a la query; un cliente de otra organización no tiene por dónde aparecer en esta
 * lista.
 *
 * La consulta está dentro de un `Suspense` a propósito: es lo que hace que el esqueleto de
 * filas se vea mientras la base responde, en vez de una pantalla en blanco.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listarClientesDeOrganizacion } from "@/lib/clientes";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";

import { PanelDeError } from "./clientes/panel-de-error";
import { EsqueletoDeInicio } from "./esqueleto-de-inicio";
import { Navegacion } from "./navegacion";
import { TablaDeClientes } from "./tabla-de-clientes";

export const metadata: Metadata = {
  title: "Clientes · ReleaseView",
};

// La lista se lee en cada request: cambia con cada alta y no hay nada que prerenderizar
// (además, en build no hay base a la que preguntarle).
export const dynamic = "force-dynamic";

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

function conteo(cantidad: number): string {
  return cantidad === 1 ? "1 cliente cargado" : `${cantidad} clientes cargados`;
}

function AgregarCliente(): React.ReactElement {
  return (
    <Link href="/clientes/nuevo" className={CLASES_DE_ACCION_PRINCIPAL}>
      + Agregar cliente
    </Link>
  );
}

async function ListaDeClientes(): Promise<React.ReactElement> {
  let organizacion;
  let clientes;
  try {
    // Regla #1: la organización la resuelve el servidor y se pasa explícita a la query.
    organizacion = await organizacionActual();
    clientes = await listarClientesDeOrganizacion(organizacion.id);
  } catch (error) {
    // El detalle técnico va al log del servidor; a la pantalla, qué pasó y qué hacer.
    console.error("No se pudo cargar la lista de clientes:", error);
    return <PanelDeError mensaje={MENSAJES_DE_CLIENTE.listaFallida} reintentarEn="/" />;
  }

  const hayClientes = clientes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* De quién son estos datos. Es también la prueba, desde M1-01, de que esta pantalla
          leyó la base de verdad detrás del portón. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-texto-secundario">
          Organización: <span className="font-medium text-texto">{organizacion.name}</span>
          {hayClientes ? ` · ${conteo(clientes.length)}` : ""}
        </p>
        {/* En el estado vacío la única acción es la del panel de abajo (ficha §4). */}
        {hayClientes ? <AgregarCliente /> : null}
      </div>

      {hayClientes ? (
        /* La tabla vive sobre superficie, dentro de un panel con borde, apoyado sobre el
           fondo: es el supuesto de layout con el que marca.md derivó los divisores. */
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <TablaDeClientes clientes={clientes} />
        </div>
      ) : (
        /* Estado vacío (ficha §4): qué pasa y la única acción que corresponde. Sin
           ilustración y sin copy motivacional — marca.md § Voz y tono. Es la primera
           pantalla que ve alguien que recién instaló la app, así que dice qué hacer. */
        <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
          <p className="text-sm">{MENSAJES_DE_CLIENTE.sinClientes}</p>
          <AgregarCliente />
        </div>
      )}
    </div>
  );
}

export default function Inicio(): React.ReactElement {
  return (
    <>
      <Navegacion actual="clientes" />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-texto-secundario">
            Qué versión tiene cada cliente. Abrí uno para ver sus features habilitados y su
            historial de versiones.
          </p>
        </div>

        <Suspense fallback={<EsqueletoDeInicio />}>
          <ListaDeClientes />
        </Suspense>
      </main>
    </>
  );
}
