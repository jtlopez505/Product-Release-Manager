import { ETIQUETAS_DE_HABILITACION, MENSAJES_DE_CLIENTE } from "@/lib/validacion-de-cliente";
import type { FeatureVisible } from "@/lib/vista-de-cliente";

/**
 * Los features del cliente, en dos grupos (criterio #4 de la ficha M1-05): los habilitados y
 * los que **todavía** no lo están.
 *
 * Los dos grupos se muestran siempre, también cuando uno está vacío: es lo que saca la
 * ambigüedad entre "no lo tiene" y "no se cargó" que la ficha prohíbe explícitamente. Si el
 * catálogo entero está vacío no hay nada que agrupar, y entonces sí corresponde el estado
 * vacío de la ficha §4.
 *
 * Reglas de marca.md que sostiene esta lista:
 *   - **El color nunca va solo:** cada grupo dice la palabra ("Habilitados" / "No habilitados
 *     todavía") además del verde y el ámbar — se diferencian muy poco en luminancia para
 *     quien tiene deuteranopia.
 *   - El ámbar como **texto** es el tono oscuro (token `alerta-texto`): el ámbar de puntos
 *     de estado no alcanza el mínimo de contraste para leerse.
 *   - **Hover solo donde hay clic:** estas filas no llevan a ninguna parte (el feature se
 *     edita en la lista maestra), así que no se resaltan ni muestran cursor de mano.
 *   - Densidad de tabla: encabezado de grupo 36px, fila 40px; el código en monoespaciada.
 */
const CLASES_DE_FILA = "flex h-10 items-center gap-3 px-4 text-sm";

function Grupo({
  etiqueta,
  tono,
  features,
  vacio,
}: {
  etiqueta: string;
  tono: string;
  features: FeatureVisible[];
  /** Qué dice el grupo cuando no tiene ninguno (sigue visible: ver el comentario de arriba). */
  vacio: string;
}): React.ReactElement {
  return (
    <section>
      <h3
        className={`flex h-9 items-center gap-2 border-b border-borde-marcado px-4 text-xs font-medium ${tono}`}
      >
        {etiqueta}
        <span className="text-texto-secundario">({features.length})</span>
      </h3>
      {features.length === 0 ? (
        <p className={`${CLASES_DE_FILA} text-texto-secundario`}>{vacio}</p>
      ) : (
        <ul className="divide-y divide-borde-sutil">
          {features.map((feature) => (
            <li key={feature.id} className={CLASES_DE_FILA}>
              <span className="flex-1 truncate">{feature.name}</span>
              {feature.code ? (
                <span className="font-datos text-xs text-texto-secundario">{feature.code}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FeaturesDelCliente({
  habilitados,
  noHabilitados,
}: {
  habilitados: FeatureVisible[];
  noHabilitados: FeatureVisible[];
}): React.ReactElement {
  const catalogoVacio = habilitados.length + noHabilitados.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold tracking-tight">Features</h2>

      {catalogoVacio ? (
        /* Estado vacío (ficha §4): no hay catálogo del que estar habilitado o no. */
        <p className="rounded-lg border border-borde-marcado bg-superficie p-5 text-sm">
          {MENSAJES_DE_CLIENTE.sinFeaturesDelCliente}
        </p>
      ) : (
        <div className="divide-y divide-borde-marcado overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <Grupo
            etiqueta={ETIQUETAS_DE_HABILITACION.habilitados}
            tono="text-exito"
            features={habilitados}
            vacio="Ninguno habilitado todavía."
          />
          <Grupo
            etiqueta={ETIQUETAS_DE_HABILITACION.noHabilitados}
            tono="text-alerta-texto"
            features={noHabilitados}
            vacio="Ninguno: tiene habilitado todo el catálogo."
          />
        </div>
      )}
    </section>
  );
}
