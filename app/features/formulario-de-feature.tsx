"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import type { Feature } from "@/lib/features";
import {
  CAMPOS_DE_TEXTO,
  ETIQUETAS_DE_ESTADO,
  ETIQUETAS_DE_FEATURE,
  ETIQUETAS_DE_PRIORIDAD,
} from "@/lib/validacion-de-feature";

import { guardarFeature } from "./acciones";
import {
  CAMPOS_DEL_FORMULARIO,
  ESTADO_INICIAL,
  type CampoDelFormulario,
  type ValoresDelFormulario,
  VALORES_VACIOS,
} from "./estado-de-guardado";

/**
 * El formulario de alta y de edición de un feature — es el mismo en los dos modos, con los
 * campos precargados cuando se edita (ficha M1-03 §4, paso 6).
 *
 * Se renderiza desde el servidor (lo decide la URL: `?nuevo=1` o `?editar=<id>`), así que el
 * `action` nativo del form funciona igual si el JS todavía no cargó — el mismo estándar que
 * el portón de M1-02. Con JS, `useActionState` agrega los errores por campo y el botón
 * "ocupado" sin recargar la pantalla.
 *
 * Los tres comportamientos que la ficha pide y que son fáciles de perder:
 *   - **No se pierde lo tipeado:** si el guardado falla, la acción devuelve los valores y los
 *     campos se reponen desde ahí (React resetea los campos no controlados después de una
 *     acción de formulario).
 *   - **Ocupado no es deshabilitado** (marca.md): mientras guarda, el botón queda en color
 *     pleno con `aria-busy` y el label lo dice. Nada se atenúa.
 *   - **El error se ve donde la persona está mirando:** cada mensaje va pegado a su campo, y
 *     al volver con error el foco salta al primer campo que falló (el formulario es largo:
 *     un error arriba del todo, con el botón abajo, no se ve).
 */
const CLASES_DE_CONTROL =
  "rounded-md border border-borde-control bg-superficie px-3 py-2 text-sm focus:border-primario";

const CLASES_DE_BOTON_SECUNDARIO =
  "rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado";

/** Los campos largos del catálogo van en textarea; `code` y `producto` son de una línea. */
const CAMPOS_LARGOS = CAMPOS_DE_TEXTO.filter(
  (campo) => campo !== "code" && campo !== "producto",
);

function valoresDeFeature(feature: Feature | null): ValoresDelFormulario {
  if (!feature) {
    // Un feature nuevo arranca en "Disponible", que es también el default del esquema.
    return { ...VALORES_VACIOS, estado: "DISPONIBLE" };
  }
  return {
    name: feature.name,
    code: feature.code ?? "",
    producto: feature.producto ?? "",
    queHace: feature.queHace ?? "",
    queProblemaResuelve: feature.queProblemaResuelve ?? "",
    aQuienBeneficia: feature.aQuienBeneficia ?? "",
    prioridad: feature.prioridad ?? "",
    estado: feature.estado,
    metricaExito: feature.metricaExito ?? "",
    observaciones: feature.observaciones ?? "",
  };
}

export function FormularioDeFeature({
  feature,
}: {
  /** `null` = alta; un feature = edición del mismo formulario, precargado. */
  feature: Feature | null;
}): React.ReactElement {
  const [estado, accion, guardando] = useActionState(guardarFeature, ESTADO_INICIAL);
  const contenedor = useRef<HTMLFormElement>(null);

  const errores = estado.fase === "error" ? estado.errores : {};
  const valores = estado.fase === "error" ? estado.valores : valoresDeFeature(feature);

  useEffect(() => {
    if (estado.fase !== "error") {
      return;
    }
    const primerCampoConError = CAMPOS_DEL_FORMULARIO.find((campo) => estado.errores[campo]);
    if (primerCampoConError) {
      contenedor.current
        ?.querySelector<HTMLElement>(`[name="${primerCampoConError}"]`)
        ?.focus();
    }
  }, [estado]);

  function descripcion(campo: CampoDelFormulario): string | undefined {
    return errores[campo] ? `error-${campo}` : undefined;
  }

  function mensaje(campo: CampoDelFormulario): React.ReactElement | null {
    const texto = errores[campo];
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
      className="flex flex-col gap-4 rounded-lg border border-borde-marcado bg-superficie p-5"
    >
      {feature ? <input type="hidden" name="id" value={feature.id} /> : null}

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">
          {feature ? "Editar feature" : "Nuevo feature"}
        </h2>
        <p className="text-sm text-texto-secundario">
          El nombre es lo único obligatorio. El resto del catálogo se puede completar después.
        </p>
      </div>

      {errores.general ? (
        <p role="alert" className="rounded-md bg-chip-error px-3 py-2 text-sm text-error">
          {errores.general}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="feature-name" className="text-sm font-medium">
            {ETIQUETAS_DE_FEATURE.name}
          </label>
          <input
            id="feature-name"
            name="name"
            type="text"
            autoFocus
            // Sin `required` del navegador a propósito: el rechazo del nombre vacío lo
            // decide el servidor y se muestra como error inline junto al campo (ficha §3
            // fila 4). La burbuja nativa taparía justo eso y no es el error de la ficha.
            aria-required="true"
            defaultValue={valores.name}
            aria-invalid={Boolean(errores.name)}
            aria-describedby={descripcion("name")}
            className={CLASES_DE_CONTROL}
          />
          {mensaje("name")}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feature-code" className="text-sm font-medium">
            {ETIQUETAS_DE_FEATURE.code}
          </label>
          <input
            id="feature-code"
            name="code"
            type="text"
            placeholder="F-020"
            defaultValue={valores.code}
            aria-invalid={Boolean(errores.code)}
            aria-describedby={descripcion("code")}
            className={`${CLASES_DE_CONTROL} font-datos`}
          />
          {mensaje("code")}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feature-producto" className="text-sm font-medium">
            {ETIQUETAS_DE_FEATURE.producto}
          </label>
          <input
            id="feature-producto"
            name="producto"
            type="text"
            defaultValue={valores.producto}
            className={CLASES_DE_CONTROL}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feature-prioridad" className="text-sm font-medium">
            {ETIQUETAS_DE_FEATURE.prioridad}
          </label>
          <select
            id="feature-prioridad"
            name="prioridad"
            defaultValue={valores.prioridad}
            aria-invalid={Boolean(errores.prioridad)}
            aria-describedby={descripcion("prioridad")}
            className={CLASES_DE_CONTROL}
          >
            <option value="">Sin definir</option>
            {Object.entries(ETIQUETAS_DE_PRIORIDAD).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          {mensaje("prioridad")}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feature-estado" className="text-sm font-medium">
            {ETIQUETAS_DE_FEATURE.estado}
          </label>
          <select
            id="feature-estado"
            name="estado"
            defaultValue={valores.estado}
            aria-invalid={Boolean(errores.estado)}
            aria-describedby={descripcion("estado")}
            className={CLASES_DE_CONTROL}
          >
            {Object.entries(ETIQUETAS_DE_ESTADO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
          {mensaje("estado")}
        </div>

        {CAMPOS_LARGOS.map((campo) => (
          <div key={campo} className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={`feature-${campo}`} className="text-sm font-medium">
              {ETIQUETAS_DE_FEATURE[campo]}
            </label>
            <textarea
              id={`feature-${campo}`}
              name={campo}
              rows={2}
              defaultValue={valores[campo]}
              className={`${CLASES_DE_CONTROL} resize-y`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Ocupado, no deshabilitado (marca.md): color pleno, `aria-busy` y los clics
            bloqueados para que no se envíe dos veces. La transición es solo de fondo
            (120ms ease-out), nunca del outline de foco, que es instantáneo. */}
        <button
          type="submit"
          disabled={guardando}
          aria-busy={guardando}
          className="rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active"
        >
          {guardando ? "Guardando…" : "Guardar feature"}
        </button>
        {/* Cancelar es una navegación de verdad (vuelve a la lista), no un botón que esconde
            el formulario: así la URL siempre dice qué se está mirando. */}
        <Link href="/features" className={CLASES_DE_BOTON_SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
