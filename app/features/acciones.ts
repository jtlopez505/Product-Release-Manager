"use server";

/**
 * La acción que guarda un feature: alta si no viene `id`, edición si viene.
 *
 * Corre en el servidor y es el único camino de escritura de la pantalla. Tres cosas que no
 * son detalle:
 *   - El `organizationId` NO viaja en el formulario: lo resuelve el servidor
 *     (`organizacionActual()`). Si viniera del cliente, cualquiera podría escribir en otra
 *     organización — justo lo que la regla #1 prohíbe.
 *   - Un error nunca se convierte en excepción hacia la pantalla: se devuelve como estado, con
 *     lo tipeado adentro, para que el formulario lo muestre sin perder la carga (ficha §4).
 *   - Si sale bien, redirige a la lista: es el "vuelve a la lista con el feature nuevo
 *     visible" de la ficha, y funciona igual con JS y sin JS. El `redirect` va FUERA del
 *     `try`: internamente lanza, y atraparlo lo convertiría en un error falso.
 *
 * El pedido de la acción pasa por el portón igual que cualquier ruta: el matcher de `proxy.ts`
 * cubre todo menos los assets estáticos.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actualizarFeature, crearFeature } from "@/lib/features";
import { organizacionActual } from "@/lib/organizacion";
import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

import {
  CAMPOS_DEL_FORMULARIO,
  type EstadoDeGuardado,
  valoresDeFormData,
} from "./estado-de-guardado";

export async function guardarFeature(
  previo: EstadoDeGuardado | FormData,
  datos?: FormData,
): Promise<EstadoDeGuardado> {
  // Sin JS, React invoca la acción con el FormData como primer argumento y sin estado previo.
  const formulario = datos ?? previo;
  const valores = valoresDeFormData(formulario);
  const crudo = Object.fromEntries(
    CAMPOS_DEL_FORMULARIO.map((campo) => [campo, valores[campo]]),
  );
  const idEnviado = formulario instanceof FormData ? formulario.get("id") : null;
  const id = typeof idEnviado === "string" && idEnviado.length > 0 ? idEnviado : null;

  try {
    const { id: organizationId } = await organizacionActual();
    const resultado = id
      ? await actualizarFeature(organizationId, id, crudo)
      : await crearFeature(organizationId, crudo);

    if (!resultado.ok) {
      return { fase: "error", errores: resultado.errores, valores };
    }
  } catch (error) {
    // Cae acá lo técnico (base caída, organización sin sembrar). Se registra en el servidor
    // y a la persona se le dice qué pasó y qué hacer, no el stack.
    console.error("Falló el guardado de un feature:", error);
    return {
      fase: "error",
      errores: { general: MENSAJES_DE_FEATURE.guardadoFallido },
      valores,
    };
  }

  // La lista es un componente de servidor: esto es lo que la hace aparecer con el feature
  // nuevo sin que nadie recargue la página a mano (ficha §3 fila 1).
  revalidatePath("/features");
  redirect("/features");
}
