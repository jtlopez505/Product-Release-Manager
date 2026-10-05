"use server";

/**
 * Las escrituras de la pantalla de cliente: guardar el cliente (alta si no viene `id`,
 * edición si viene) y crear un feature sin salir del formulario.
 *
 * Es una sola acción con dos intenciones a propósito: el alta inline de feature se envía con
 * el MISMO formulario, así que lo tipeado del cliente viaja en el pedido y vuelve en el
 * estado — por eso crear un feature no cuesta la carga ya hecha (criterio #5), ni con JS ni
 * sin JS.
 *
 * Tres cosas que no son detalle:
 *   - El `organizationId` NO viaja en el formulario: lo resuelve el servidor
 *     (`organizacionActual()`). Si viniera del cliente, cualquiera podría escribir en otra
 *     organización — justo lo que la regla #1 prohíbe.
 *   - Un error nunca se convierte en excepción hacia la pantalla: se devuelve como estado,
 *     con lo tipeado adentro (ficha §4).
 *   - Si el guardado sale bien, redirige al formulario de edición del cliente con la
 *     confirmación (`?guardado=1`): la Vista de cliente, que es el destino final del
 *     recorrido, la construye M1-05. El `redirect` va FUERA del `try`: internamente lanza, y
 *     atraparlo lo convertiría en un error falso.
 *
 * El pedido pasa por el portón igual que cualquier ruta: el matcher de `proxy.ts` cierra por
 * omisión y no hay nada que agregar a ninguna lista.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actualizarCliente, crearCliente } from "@/lib/clientes";
import { crearFeature, listarFeaturesDeOrganizacion } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";
import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

import {
  type EstadoDeClienteGuardado,
  type OpcionDeFeature,
  type ValoresDeCliente,
  intencionDeFormData,
  opcionDeFeature,
  valoresDeClienteDeFormData,
} from "./estado-de-guardado";

/**
 * La lista maestra al día para devolverla con el estado.
 *
 * Se vuelve a leer en cada vuelta (no se arrastra por el formulario) para que el feature
 * recién creado inline siga en el checklist aunque el guardado del cliente falle después.
 * Si la lectura falla, se devuelve `undefined` y el formulario se queda con la lista que ya
 * tenía: un error al refrescar opciones no debería tapar el error real.
 */
async function opcionesAlDia(organizationId: string): Promise<OpcionDeFeature[] | undefined> {
  try {
    const features = await listarFeaturesDeOrganizacion(organizationId);
    return features.map(opcionDeFeature);
  } catch (error) {
    console.error("No se pudo refrescar la lista de features del checklist:", error);
    return undefined;
  }
}

/** El alta inline de feature: crea el feature y lo deja tildado en el cliente en curso. */
async function crearFeatureInline(
  organizationId: string,
  valores: ValoresDeCliente,
): Promise<EstadoDeClienteGuardado> {
  const resultado = await crearFeature(organizationId, { name: valores.nuevoFeature });

  if (!resultado.ok) {
    return {
      fase: "error",
      // El error del feature se muestra junto al campo del alta inline, no en el del cliente.
      errores: {
        nuevoFeature:
          resultado.errores.name ??
          resultado.errores.general ??
          MENSAJES_DE_FEATURE.guardadoFallido,
      },
      valores,
      features: await opcionesAlDia(organizationId),
    };
  }

  // La lista maestra de M1-03 es la misma lista: el feature nuevo tiene que verse ahí.
  revalidatePath("/features");

  const features = await opcionesAlDia(organizationId);
  return {
    fase: "feature-creado",
    valores: {
      ...valores,
      // Queda tildado para el cliente que se está cargando (criterio #5)...
      featureIds: [...new Set([...valores.featureIds, resultado.feature.id])],
      // ...y el campo del alta inline queda limpio para el siguiente.
      nuevoFeature: "",
    },
    features: features ?? [opcionDeFeature(resultado.feature)],
    creado: resultado.feature.name,
  };
}

export async function guardarCliente(
  previo: EstadoDeClienteGuardado | FormData,
  datos?: FormData,
): Promise<EstadoDeClienteGuardado> {
  // Sin JS, React invoca la acción con el FormData como primer argumento y sin estado previo.
  const formulario = datos ?? previo;
  const valores = valoresDeClienteDeFormData(formulario);
  const intencion = intencionDeFormData(formulario);

  const idEnviado = formulario instanceof FormData ? formulario.get("id") : null;
  const id = typeof idEnviado === "string" && idEnviado.length > 0 ? idEnviado : null;

  let destino = "";
  try {
    const { id: organizationId } = await organizacionActual();

    if (intencion === "crear-feature") {
      return await crearFeatureInline(organizationId, valores);
    }

    const resultado = id
      ? await actualizarCliente(organizationId, id, valores)
      : await crearCliente(organizationId, valores);

    if (!resultado.ok) {
      return {
        fase: "error",
        errores: resultado.errores,
        valores,
        features: await opcionesAlDia(organizationId),
      };
    }

    destino = `/clientes/${resultado.cliente.id}/editar?guardado=1`;
  } catch (error) {
    // Cae acá lo técnico (base caída, organización sin sembrar). Se registra en el servidor
    // y a la persona se le dice qué pasó y qué hacer, no el stack.
    console.error("Falló el guardado de un cliente:", error);
    return {
      fase: "error",
      errores: { general: MENSAJES_DE_CLIENTE.guardadoFallido },
      valores,
    };
  }

  redirect(destino);
}
