# Costo mensual estimado

> **Dueño de:** cuánto cuesta tener ReleaseView publicado, con qué supuestos y qué lo haría subir.
> **Lo escribe `/costo`.** Foto del 2026-10-23. **No cubre:** el techo de gasto de IA (#3) — no
> aplica, ver más abajo.

## En llano

ReleaseView no gasta por uso: no llama a ninguna IA, no manda mails, no cobra. Lo único que se
paga es **dónde vive**: Vercel (la app) y Supabase (la base de datos). Con 1 o 2 personas usándola
el consumo está muy por debajo de lo que cualquier plan incluye, así que **el costo es fijo: lo
decide el plan que elijas, no cuánto la uses.**

| Escenario | Vercel | Supabase | **Total / mes** | Para quién |
|---|---|---|---|---|
| **Piso** | Hobby · US$0 | Free · US$0 | **US$0** | Solo si es un uso personal, no de trabajo. Ver la advertencia 1. |
| **Recomendado** | Pro · US$20 | Free · US$0 | **US$20** | Uso de trabajo, aceptando la advertencia 2. |
| **Techo razonable** | Pro · US$20 | Pro · US$25 | **US$45** | Si el panel no puede quedar caído nunca. |

El techo puede subir unos **US$10 más** si la base de prueba queda en la misma organización de
Supabase que la real (advertencia 3). **Rango total: US$0 a ~US$55 al mes; lo que yo
recomendaría, US$20.**

## Las tres advertencias (las que cambian la decisión)

1. **Vercel Hobby es solo para uso personal y no comercial** (Fair Usage Policy de Vercel). Este
   panel lo usa un PM o líder técnico de una consultora para su trabajo: eso es uso comercial. El
   piso de US$0 existe en la tabla, pero publicarlo ahí es violar los términos del plan y Vercel
   puede pausar el proyecto. **Esto corrige lo que decía `stack.md`** ("alcanza el plan gratuito").
2. **Supabase Free pausa el proyecto tras una semana de poca actividad.** Con pocas consultas por
   día se mantiene vivo, pero un panel que se usa en ráfagas, antes de cada release, puede pasar
   una semana tranquila, y entonces **la primera persona que entre encuentra la app caída**
   hasta restaurarla a mano desde el panel de Supabase (hay un año para hacerlo y no se pierden
   datos). Es un riesgo de molestia, no de pérdida. Los planes pagos no se pausan.
3. **La base de prueba es un segundo proyecto.** El plan gratis permite dos proyectos y hoy están
   usados los dos (la real y la de prueba). Si el día que subas a Supabase Pro las dos quedan en
   la misma organización, el segundo proyecto se factura aparte (un cómputo mínimo, ~US$10/mes;
   **confirmarlo en la página de precios antes de subir de plan**). Evitable dejando la base de
   prueba en una organización gratuita aparte.

## Qué NO cuesta

- **IA, mails, pagos, almacenamiento de archivos, colas, jobs:** no existen en el producto (ver
  `stack.md`, "Sin colas, sin jobs en background"). La exportación a CSV se arma en el navegador.
- **Los usuarios de la app.** En Vercel se paga por quien **despliega**, no por quien usa la
  aplicación. Si entra una segunda persona solo a consultar, no suma costo. Un segundo
  desarrollador que haga deploys sumaría ~US$20/mes.
- **El techo de gasto de la regla #3: no aplica.** No hay nada que consuma por llamada. Igual
  conviene, al pasar a Pro, mirar en el panel de Vercel que no haya gasto adicional habilitado
  sin límite.

## Qué haría saltar el costo

| Si pasa esto | Efecto |
|---|---|
| Se suma otra persona que despliega | +~US$20/mes por cada una (Vercel) |
| La base crece más allá de lo que incluye el plan | Hoy imposible: son filas de texto, unas pocas centenas de clientes. Se vería en el panel de Supabase mucho antes |
| Se agrega IA (por ejemplo, redactar notas de release) | Aparece un costo **variable** y la regla #3 pasa a aplicar: hay que fijar un techo antes de escribir la primera línea |
| Se pasa a login individual con Supabase Auth | Entra dentro de Supabase; el costo se mueve por usuarios activos, no por clientes |

## Para decidir

Lo único que te toca elegir es **qué plan de Vercel**. Mi lectura: **Pro (US$20)** es el
escenario honesto para un panel de trabajo, y Supabase **Free** alcanza al principio si aceptás
que puede dormirse tras una semana sin uso. Si ese corte te preocupa, el salto es +US$25.

## Anexo técnico

- **Precios verificados el 2026-10-23** contra las páginas oficiales: [Vercel
  pricing](https://vercel.com/pricing) y [plan Hobby](https://vercel.com/docs/plans/hobby) (Hobby
  gratis y no comercial; Pro US$20/mes con un asiento de deploy y US$20 de crédito de uso; cada
  asiento pago adicional US$20/mes; los asientos de solo lectura son gratuitos) y [Supabase
  pricing](https://supabase.com/pricing) con [Project
  Pausing](https://supabase.com/docs/guides/platform/free-project-pausing) (Free: 2 proyectos, se
  pausa tras una semana de poca actividad, aviso por mail una semana antes, un año para
  restaurar; Pro desde US$25/mes con US$10 de crédito de cómputo que cubren una instancia Micro,
  sin pausa). Los precios cambian: **releer antes de contratar.**
- **El ~US$10 del segundo proyecto** es una estimación a partir del crédito de cómputo de Pro; no
  lo confirmé en una página de precios y por eso está marcado como tal.
- **Insumos leídos:** `stack.md` (Vercel + Supabase, sin infraestructura adicional), `package.json`
  y `lib/` (sin SDK de IA, mail ni pagos), `docs/prd.md` (1-2 usuarios, uso interno).
- **Volumen supuesto:** 1-2 usuarios, decenas a pocos cientos de clientes, unas decenas de
  requests por día. No se preguntó: está declarado en el PRD y el costo no depende de él dentro
  de ese rango.
