"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import type { ClienteParaEdicion } from "@/lib/clientes";
import { ETIQUETAS_DE_CLIENTE, MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";

import { guardarCliente } from "./acciones";
import {
  ESTADO_INICIAL_DE_CLIENTE,
  type Intencion,
  type OpcionDeFeature,
  type ValoresDeCliente,
  VALORES_VACIOS_DE_CLIENTE,
} from "./estado-de-guardado";

/**
 * El formulario de alta y de edición de un cliente — el mismo en los dos modos, con los
 * campos precargados cuando se edita (ficha M1-04 §4).
 *
 * Se renderiza desde el servidor (lo decide la ruta: `/clientes/nuevo` o
 * `/clientes/<id>/editar`), así que el `action` nativo del form funciona igual si el JS
 * todavía no cargó — el mismo estándar que el portón de M1-02 y la pantalla de M1-03. Con JS,
 * `useActionState` agrega los errores por campo, el botón "ocupado" y el alta de feature
 * inline sin recargar la pantalla.
 *
 * Decisiones que son fáciles de perder si alguien retoca esto:
 *   - **La acción principal va arriba, no abajo.** El formulario tiene dos botones de envío
 *     (guardar el cliente y crear un feature inline) y el navegador usa el PRIMERO del
 *     documento cuando se aprieta Enter en un campo de texto. Con "Guardar cliente" arriba,
 *     Enter guarda; si estuviera debajo del checklist, Enter crearía un feature vacío.
 *   - **No se pierde lo tipeado:** los dos caminos que vuelven al formulario (error y feature
 *     creado) traen los valores y los campos se reponen desde ahí.
 *   - **Ocupado no es deshabilitado** (marca.md): el botón queda en color pleno con
 *     `aria-busy` y el label dice qué está pasando. Nada se atenúa.
 *   - **Salir sin guardar pregunta** (ficha §4): si hay algo tipeado, tanto "Cancelar" como
 *     cerrar/recargar la pestaña piden confirmación antes de descartar.
 */
const CLASES_DE_CONTROL =
  "rounded-md border border-borde-control bg-superficie px-3 py-2 text-sm focus:border-primario";

const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

const CLASES_DE_BOTON_SECUNDARIO =
  "rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado";

/** El orden en que se busca el primer campo con error para llevarle el foco. */
const CAMPOS_EN_PANTALLA = ["name", "currentVersion", "notes", "nuevoFeature"] as const;

function valoresDeCliente(cliente: ClienteParaEdicion | null): ValoresDeCliente {
  if (!cliente) {
    return VALORES_VACIOS_DE_CLIENTE;
  }
  return {
    name: cliente.name,
    currentVersion: cliente.currentVersion,
    notes: cliente.notes ?? "",
    featureIds: cliente.featureIds,
    nuevoFeature: "",
  };
}

export function FormularioDeCliente({
  cliente,
  features,
}: {
  /** `null` = alta; un cliente = edición del mismo formulario, precargado. */
  cliente: ClienteParaEdicion | null;
  /** La lista maestra de la organización (M1-03), de la que se eligen los habilitados. */
  features: OpcionDeFeature[];
}): React.ReactElement {
  const [estado, accion, guardando] = useActionState(
    guardarCliente,
    ESTADO_INICIAL_DE_CLIENTE,
  );
  const contenedor = useRef<HTMLFormElement>(null);
  /** Qué botón se apretó: solo para que el label del botón ocupado diga la verdad. No es
      estado del formulario (eso lo dice la ruta), es cuál de los dos envíos está en curso. */
  const [intencionEnCurso, setIntencionEnCurso] = useState<Intencion>("guardar");
  /** ¿Hay algo tipeado sin guardar? Para preguntar antes de descartar (ficha §4). */
  const sucio = useRef(false);

  const errores = estado.fase === "error" ? estado.errores : {};
  const valores = estado.fase === "inicial" ? valoresDeCliente(cliente) : estado.valores;
  const opciones = (estado.fase !== "inicial" ? estado.features : undefined) ?? features;
  const creado = estado.fase === "feature-creado" ? estado.creado : null;

  useEffect(() => {
    if (estado.fase === "error") {
      const primero = CAMPOS_EN_PANTALLA.find((campo) => estado.errores[campo]);
      if (primero) {
        contenedor.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      }
      return;
    }
    if (estado.fase === "feature-creado") {
      // El campo quedó limpio: el foco vuelve ahí para poder sumar otro de corrido.
      contenedor.current
        ?.querySelector<HTMLElement>('[name="nuevoFeature"]')
        ?.focus();
    }
  }, [estado]);

  useEffect(() => {
    function avisar(evento: BeforeUnloadEvent): void {
      if (sucio.current) {
        evento.preventDefault();
      }
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  function confirmarDescarte(evento: React.MouseEvent): void {
    if (sucio.current && !window.confirm(MENSAJES_DE_CLIENTE.descartarCambios)) {
      evento.preventDefault();
    }
  }

  function mensaje(campo: string, texto: string | undefined): React.ReactElement | null {
    if (!texto) {
      return null;
    }
    return (
      <p id={`error-${campo}`} role="alert" className="text-sm text-error">
        {texto}
      </p>
    );
  }

  return (
    /* Panel delimitado con borde y no con sombra (marca.md § Reglas de interfaz): la sombra
       queda reservada a lo que flota sobre contenido. */
    <form
      ref={contenedor}
      action={accion}
      onInput={() => {
        sucio.current = true;
      }}
      className="flex flex-col gap-5 rounded-lg border border-borde-marcado bg-superficie p-5"
    >
      {cliente ? <input type="hidden" name="id" value={cliente.id} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">
            {cliente ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <p className="text-sm text-texto-secundario">
            El nombre y la versión activa son obligatorios. Cada cambio de versión queda
            registrado con su fecha.
          </p>
        </div>
        {/* Arriba y primero en el documento: así Enter en un campo de texto guarda el
            cliente y no dispara el alta de feature inline. */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            name="intencion"
            value="guardar"
            onClick={() => setIntencionEnCurso("guardar")}
            disabled={guardando}
            aria-busy={guardando}
            className={CLASES_DE_ACCION_PRINCIPAL}
          >
            {guardando && intencionEnCurso === "guardar" ? "Guardando…" : "Guardar cliente"}
          </button>
          <Link
            href="/"
            onClick={confirmarDescarte}
            className={CLASES_DE_BOTON_SECUNDARIO}
          >
            Cancelar
          </Link>
        </div>
      </div>

      {errores.general ? (
        <p role="alert" className="rounded-md bg-chip-error px-3 py-2 text-sm text-error">
          {errores.general}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cliente-name" className="text-sm font-medium">
            {ETIQUETAS_DE_CLIENTE.name}
          </label>
          <input
            id="cliente-name"
            name="name"
            type="text"
            // Sin `required` del navegador a propósito: el rechazo lo decide el servidor y se
            // muestra como error inline junto al campo (ficha §3 fila 6). La burbuja nativa
            // taparía justo eso.
            aria-required="true"
            autoFocus={cliente === null}
            defaultValue={valores.name}
            aria-invalid={Boolean(errores.name)}
            aria-describedby={errores.name ? "error-name" : undefined}
            className={CLASES_DE_CONTROL}
          />
          {mensaje("name", errores.name)}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cliente-version" className="text-sm font-medium">
            {ETIQUETAS_DE_CLIENTE.currentVersion}
          </label>
          {/* Monoespaciada (marca.md § Tipografía): los números de versión se comparan de un
              vistazo entre pantallas. */}
          <input
            id="cliente-version"
            name="currentVersion"
            type="text"
            inputMode="text"
            placeholder="2.4.1"
            aria-required="true"
            defaultValue={valores.currentVersion}
            aria-invalid={Boolean(errores.currentVersion)}
            aria-describedby={errores.currentVersion ? "error-currentVersion" : undefined}
            className={`${CLASES_DE_CONTROL} font-datos`}
          />
          {mensaje("currentVersion", errores.currentVersion)}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="cliente-notes" className="text-sm font-medium">
            {ETIQUETAS_DE_CLIENTE.notes}
          </label>
          <textarea
            id="cliente-notes"
            name="notes"
            rows={2}
            defaultValue={valores.notes}
            className={`${CLASES_DE_CONTROL} resize-y`}
          />
        </div>
      </div>

      <ChecklistDeFeatures
        opciones={opciones}
        seleccionados={valores.featureIds}
        nuevoFeature={valores.nuevoFeature}
        errorDeNuevoFeature={errores.nuevoFeature}
        errorDeSeleccion={errores.featureIds}
        creado={creado}
        guardando={guardando}
        enCurso={guardando && intencionEnCurso === "crear-feature"}
        alCrear={() => setIntencionEnCurso("crear-feature")}
      />
    </form>
  );
}

/**
 * El checklist de la lista maestra, con el alta de feature inline debajo.
 *
 * Vive en el MISMO `<form>` que el cliente a propósito: por eso crear un feature no pierde lo
 * ya tipeado (criterio #5) — los campos del cliente viajan en el pedido y vuelven en el
 * estado.
 *
 * El `key` sobre la lista es lo que hace que la selección que vuelve del servidor (con el
 * feature recién creado ya tildado) se refleje en las casillas: `defaultChecked` solo manda
 * al montar, así que cuando el conjunto seleccionado cambia del lado del servidor, la lista
 * se vuelve a montar. Mientras la persona tilda a mano, el conjunto no cambia y nada se
 * remonta: no se pierde ningún clic.
 *
 * Cada fila es clickeable (el label tildea la casilla), así que lleva hover — "hover solo
 * donde hay clic" (marca.md). Alto de fila 36px, el de un encabezado de tabla: es una lista
 * densa de trabajo, no una landing.
 */
function ChecklistDeFeatures({
  opciones,
  seleccionados,
  nuevoFeature,
  errorDeNuevoFeature,
  errorDeSeleccion,
  creado,
  guardando,
  enCurso,
  alCrear,
}: {
  opciones: OpcionDeFeature[];
  seleccionados: string[];
  nuevoFeature: string;
  errorDeNuevoFeature?: string;
  errorDeSeleccion?: string;
  creado: string | null;
  guardando: boolean;
  /** Este envío puntual es el que está en curso: el label lo dice (marca.md). */
  enCurso: boolean;
  alCrear: () => void;
}): React.ReactElement {
  const tildados = new Set(seleccionados);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{ETIQUETAS_DE_CLIENTE.features}</legend>
      <p className="text-sm text-texto-secundario">
        Se eligen de la lista maestra de features. Los que no están tildados quedan como
        no habilitados para este cliente.
      </p>

      {errorDeSeleccion ? (
        <p role="alert" className="text-sm text-error">
          {errorDeSeleccion}
        </p>
      ) : null}

      {opciones.length > 0 ? (
        <div
          key={seleccionados.join(",")}
          className="max-h-64 divide-y divide-borde-sutil overflow-y-auto rounded-md border border-borde-marcado"
        >
          {opciones.map((feature) => (
            <label
              key={feature.id}
              className="flex h-9 cursor-pointer items-center gap-3 px-4 text-sm transition-[background-color] duration-[120ms] ease-out hover:bg-hover focus-within:bg-seleccionado"
            >
              <input
                type="checkbox"
                name="featureIds"
                value={feature.id}
                defaultChecked={tildados.has(feature.id)}
                className="size-4 accent-primario"
              />
              <span className="flex-1 truncate">{feature.name}</span>
              {feature.code ? (
                <span className="font-datos text-xs text-texto-secundario">{feature.code}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : (
        /* Estado vacío (ficha §4): texto claro y la salida ahí mismo — el alta inline de
           abajo. No bloquea guardar el cliente sin features. */
        <p className="rounded-md border border-borde-marcado px-4 py-3 text-sm">
          {MENSAJES_DE_CLIENTE.sinFeatures}
        </p>
      )}

      <div className="flex flex-col gap-1.5 pt-1">
        <label htmlFor="cliente-nuevo-feature" className="text-sm font-medium">
          {ETIQUETAS_DE_CLIENTE.nuevoFeature}
        </label>
        <div className="flex flex-wrap items-start gap-2">
          <input
            id="cliente-nuevo-feature"
            name="nuevoFeature"
            type="text"
            defaultValue={nuevoFeature}
            aria-invalid={Boolean(errorDeNuevoFeature)}
            aria-describedby={errorDeNuevoFeature ? "error-nuevoFeature" : undefined}
            className={`${CLASES_DE_CONTROL} min-w-0 flex-1`}
          />
          {/* Crea el feature en la lista maestra y lo deja tildado acá, sin perder la carga.
              Va después de "Guardar cliente" en el documento: ver el comentario de arriba. */}
          <button
            type="submit"
            name="intencion"
            value="crear-feature"
            onClick={alCrear}
            disabled={guardando}
            aria-busy={guardando}
            className={CLASES_DE_BOTON_SECUNDARIO}
          >
            {enCurso ? "Creando…" : "+ Crear feature"}
          </button>
        </div>
        {errorDeNuevoFeature ? (
          <p id="error-nuevoFeature" role="alert" className="text-sm text-error">
            {errorDeNuevoFeature}
          </p>
        ) : null}
        {creado ? (
          <p role="status" className="text-sm text-texto-secundario">
            Feature creado y tildado: {creado}. También quedó en la lista maestra.
          </p>
        ) : null}
        {/* Sin link a la lista maestra desde acá: salir del formulario costaría lo tipeado.
            El resto del catálogo (código, producto, prioridad) se completa en /features
            cuando el cliente ya está guardado. */}
        <p className="text-sm text-texto-secundario">
          Entra en la lista maestra con el nombre; el resto del catálogo se completa después.
        </p>
      </div>
    </fieldset>
  );
}
