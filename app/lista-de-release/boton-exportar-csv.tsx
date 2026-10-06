"use client";

import type { IdentificadorDeExportacion } from "@/lib/exportar-lista";
import { exportarListaDeRelease } from "@/lib/exportar-lista";

/**
 * "Exportar CSV" (ficha M3-03): arma el archivo en el navegador con las filas que la pantalla
 * ya calculó —`reciben`, las mismas que pinta `TablaDeClientes` en la vista previa— y lo baja.
 *
 * **Sin pedido al servidor (fila 9):** todo el cálculo vive en `lib/exportar-lista.ts`, puro;
 * acá solo se envuelve en un `Blob` y se dispara la descarga con un link temporal. La fecha es
 * la del navegador de quien exporta (`new Date()`), nunca del servidor.
 *
 * Es un botón **secundario** (marca.md: borde con `border-borde-control`, el mismo patrón que
 * "Reintentar" de `PanelDeError`) — la acción principal de esta pantalla sigue siendo elegir el
 * criterio, no exportar.
 */
export function BotonExportarCsv({
  identificador,
  filas,
}: {
  identificador: IdentificadorDeExportacion;
  filas: readonly { name: string; currentVersion: string }[];
}): React.ReactElement {
  function exportar(): void {
    const archivo = exportarListaDeRelease(identificador, filas, new Date());
    // El `Blob` codifica el string en UTF-8: el `﻿` inicial de `contenido` se vuelve los
    // 3 bytes del BOM (criterio #5), no un carácter visible de más.
    const blob = new Blob([archivo.contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = archivo.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      className="shrink-0 rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado"
    >
      Exportar CSV
    </button>
  );
}
