# Navegación y puntos de vista

Versión 0.1 · 8 de octubre de 2026

Este documento describe cómo se recorre el Atlas de la Filosofía y qué necesita cada forma de recorrerlo de los datos descritos en [`esquema.md`](esquema.md). Distingue lo **decidido** con Juan de lo **propuesto**, pendiente de probar en el prototipo.

## Idea general (decidido)

Hay **una sola pantalla central, el mapa**, y los modos de navegación son **puntos de vista** (lentes) sobre ese mismo mapa, no aplicaciones distintas. Cambiar de punto de vista no cambia los datos ni el progreso: cambia qué nodos se muestran, cómo se colocan y qué control aparece encima del mapa.

Alrededor del mapa hay cuatro piezas fijas:

- **Barra superior:** buscador, selector de punto de vista y acceso a «Mi progreso».
- **Ficha:** se abre al pulsar un nodo; panel lateral en pantallas grandes y hoja que sube desde abajo en el móvil.
- **Botón de volver** que respeta el recorrido del lector, no el historial del navegador.
- **Niebla de guerra:** se aplica igual en todos los puntos de vista (0 visitas sin explorar; 1 rojo brasa; 2-4 naranja; 5 o más amarillo).

La app es una sola página: en Blogger vive dentro de una entrada, y las «pantallas» son vistas que cambian sin recargar.

## Pantallas (decidido)

| Pantalla | Qué muestra |
| --- | --- |
| **Portada** | Buscador grande, las tres puertas de entrada (cronológica, temática y libre), acceso a «Mi progreso» y, la primera vez, el aviso sobre dónde se guarda el progreso. |
| **Mapa** | La red con zoom y arrastre, en el punto de vista elegido. |
| **Ficha** | Resumen, profundización desplegable, palabras enlazadas, relaciones agrupadas por tipo, anécdotas, imágenes, fechas (con las cronologías alternativas) y el botón «centrar el mapa aquí». |
| **Mi progreso** | Vista de águila de todo el mapa con la niebla, el mapa del recorrido personal, la colección de anécdotas y los botones de exportar e importar. |
| **Retos y misiones** | Preguntas generadas desde el grafo y encargos de exploración; al resolverse devuelven al mapa. |

Los rangos y logros quedaron fuera del núcleo del juego.

## Los puntos de vista

### 1. Cronológico (decidido; detalles propuestos)

**Qué es.** Una línea del tiempo horizontal sobre el mapa, con los contextos (épocas) como franjas. Cada tradición ocupa un **carril** paralelo, de modo que se ve de un vistazo que Confucio, el Buda y los presocráticos son contemporáneos. El Próximo Oriente va en un carril secundario, más estrecho.

**Cómo se coloca cada nodo.**

- Autores: barra con su vida (`nacimiento`–`muerte`) o su época de actividad (`activo`). Los extremos de la horquilla (`min`–`max`) se dibujan difuminados: la incertidumbre se ve.
- Obras: en su `composicion`; las obras con `capas` muestran cada estrato.
- Contextos: franjas de fondo según su `horquilla`.
- Conceptos, tesis y escuelas no tienen fecha propia: se colocan junto a su autor o su contexto, o se muestran solo al desplegar un nodo con fecha.
- La `historicidad` cambia el trazo (por ejemplo, discontinuo para lo legendario).

**Cronologías alternativas (decidido).** Por defecto, la académica. Las alternativas aparecen como **barra fantasma punteada** en la misma fila, que abre la ficha, y un interruptor general cambia entre «académica» y «tradicional».

**Capa opcional (propuesto).** La «época axial» de Karl Jaspers (c. 800-200 a. C.) como franja que se puede encender, con un enlace a sus críticas.

**Qué necesita de los datos:** `fechas` (horquillas, `tipo`, `historicidad`, `alternativas`), `tradicion` (para el carril), `contextos` y la `horquilla` de cada contexto.

### 2. Temático (decidido)

**Qué es.** Un selector con las 14 temáticas sobre el mapa. Al elegir una, se muestran los nodos clasificados en ella y las relaciones entre ellos; el resto queda atenuado. Una temática puede desplegarse en sus subtemáticas.

**Qué necesita de los datos:** el campo `tematicas` de cada nodo, los nodos de tipo `tematica` y las relaciones `parte_de` entre temáticas.

### 3. Libre (decidido)

**Qué es.** La red alrededor de un nodo: el que se buscó o el último que se visitó. Se muestran sus vecinos directos y, al desplegar, los de segundo nivel. Pulsar un vecino lo convierte en el nuevo centro.

**Filtros (propuesto):** por tipo de relación (por ejemplo, solo maestros y discípulos), por certeza (ocultar lo conjetural y lo legendario) y por tradición.

**Qué necesita de los datos:** las `relaciones` con su `tipo` y su `certeza`, y el catálogo común de tipos de relación del núcleo (`esquema/relaciones.json`) para leer cada relación en los dos sentidos («fue maestro de» / «fue discípulo de»).

### 4. Recorrido personal (decidido)

**Qué es.** Desde «Mi progreso», el mapa del camino que ha seguido el lector: cada paso une un nodo con el nodo desde el que llegó.

**Qué necesita:** solo el progreso (`recorrido`, con el campo `desde`), no los datos.

### 5. Paralelos entre tradiciones (propuesto)

**Qué es.** Una lente que muestra solo las relaciones `paralelo_a`, agrupadas por su `ejeComparacion` (impermanencia, átomos, divisibilidad…), para comparar tradiciones sin confundir semejanza con influencia. Podría ser también un filtro del modo libre.

**Qué necesita:** `paralelo_a`, `ejeComparacion` y `tradicion`.

## Entradas a un nodo

A cualquier nodo se llega por varias vías, y todas registran la visita y el paso en el recorrido:

- el buscador, que busca en `nombre`, `nombreOriginal` y `alias`;
- un enlace `[[id|texto]]` dentro de un texto;
- una relación de la ficha;
- un nodo del mapa en cualquier punto de vista;
- un reto o una misión.

## Qué es general y qué es propio de filosofía

Para el núcleo común de la colección:

- **General:** la pantalla única con lentes; el modo libre; el modo temático (cada atlas con sus temáticas); el recorrido; la niebla; la ficha.
- **Configurable:** el modo cronológico necesita saber **qué campo define los carriles**. En filosofía es `tradicion`; otro atlas puede usar otro eje (una corriente, un país) o un solo carril. Los filtros (por certeza, por tradición…) salen de los campos con valores fijos del esquema, así que valen para cualquier atlas.
- **Lentes propias:** cada atlas declara las suyas en `atlas.json`. La de paralelos ya está declarada en el de filosofía; psicología prevé una lente de la evidencia.
- **Propio de filosofía:** la capa de la época axial, la lente de paralelos (que depende de `paralelo_a` y de las tradiciones) y el interruptor entre cronología académica y tradicional.

El detalle de cómo se declaran carriles, lentes y filtros está en el [esquema base del núcleo](https://github.com/caducidad/ATLAS_NUCLEO/blob/main/docs/esquema-base.md).
