# Esquema de datos · Atlas de la Filosofía

Versión 0.2 · 8 de octubre de 2026

El Atlas de la Filosofía sigue el **esquema base de la colección Atlas**, que está en el repositorio del núcleo: [`docs/esquema-base.md`](https://github.com/caducidad/ATLAS_NUCLEO/blob/main/docs/esquema-base.md). Allí se explican los nodos y sus campos, las fechas, los enlaces, las anécdotas, las imágenes, el catálogo de relaciones, el formato del progreso y la **Guía de redacción**, que se aplica a todos los textos de este atlas.

Este documento recoge solo lo propio de la filosofía, que se declara en [`atlas.json`](../atlas.json).

## Archivos

| Archivo | Contenido | Prefijo de relaciones |
| --- | --- | --- |
| `tematicas.json` | Las 14 temáticas | `te` |
| `china-antigua.json` | Tradición china de la Antigüedad | `cn` |
| `india-antigua.json` | Tradición india de la Antigüedad | `in` |
| `grecorromana-antigua.json` | Tradición grecorromana de la Antigüedad | `gr` |
| `proximo-oriente-antiguo.json` | Sabidurías del Próximo Oriente: Egipto, Mesopotamia, Irán e Israel | `po` |
| … | Otras épocas (pendientes) | uno nuevo por archivo |

El catálogo de tipos de relación ya no está en este repositorio: es común a la colección y vive en el núcleo.

## La tradición

Campo propio, `tradicion`, obligatorio en todos los nodos salvo las temáticas, que son comunes a todas.

| Valor | Se muestra como |
| --- | --- |
| `grecorromana` | Grecia y Roma |
| `india` | India |
| `china` | China |
| `proximo_oriente` | Próximo Oriente |

Define los **carriles** de la vista cronológica: cada tradición ocupa uno, de modo que se vea que Confucio, el Buda y los presocráticos son contemporáneos. El Próximo Oriente es un carril secundario: sabidurías que sirven de preámbulo, no filosofía en sentido estricto. Un nodo que aparece en textos de otra tradición conserva la suya de origen: los gimnosofistas, ascetas indios que conocieron los griegos, son de tradición india.

**Regla de las influencias.** Una relación `influyo_en` entre tradiciones distintas solo se admite con una fuente antigua citada en `fuente`. Si no la hay, se usa `paralelo_a` con su `ejeComparacion`. Los contactos documentados entre tradiciones son pocos y tardíos, y casi todas las semejanzas famosas son paralelos, no influencias. El validador lo comprueba.

## Campos obligatorios añadidos

| Tipo | Además del esquema base |
| --- | --- |
| **autor** | `circulo` y `lugarOrigen`. Los autores del **círculo 1** necesitan también `profundizacion` y `anecdotas` |
| **obra** | `idiomaOriginal` |
| **concepto** | `terminoOriginal` y `traduccion`; `notaTraduccion` para términos polisémicos como *dharma* o *ren* |
| **contexto** | `lugar` |

Los círculos: **1**, el canon que todo estudiante debe encontrar; **2**, figuras secundarias; **3**, figuras puente, que hacen falta para entender a otras (un rey, un historiador, un discípulo que transmitió la obra).

## Temáticas

Catorce: las doce ramas clásicas más dos que piden las tradiciones india y china.

Metafísica · Epistemología · Ética · Filosofía política · Estética · Lógica · Filosofía de la mente · Filosofía del lenguaje · Filosofía de la ciencia · Filosofía de la religión · Antropología filosófica · Filosofía de la historia · **Soteriología y vías de liberación** · **Cultivo de sí y formas de vida**

## Convenciones

- **Transcripción:** pinyin para el chino e IAST para el sánscrito y el pali son las formas canónicas (`Zhuangzi`, `Nāgārjuna`). Las formas hispanizadas o antiguas van en `alias` para el buscador (`Chuang-Tzu`, `Nagarjuna`).
- **Nombre original:** en su escritura (孔子, नागार्जुन, Πλάτων) cuando existe; en avéstico, egipcio o acadio, la transliteración académica.
- **Escuelas como rótulos:** muchas «escuelas» antiguas son etiquetas puestas después («presocráticos», «Escuela de los Nombres»). Se marcan con `naturaleza: rotulo_historiografico` y el resumen lo explica.

## Decisiones cerradas

- **Profundización:** obligatoria para el círculo 1, opcional para los círculos 2 y 3.
- **Umbrales de la niebla:** 1, 2-4 y 5 o más visitas; se ajustarán al probar.
- **Anécdotas:** un solo bloque por autor, con fuente y fiabilidad al final de cada una.
- **Cronología por defecto:** la académica. Las alternativas se ven en la ficha (todas, con su etiqueta y origen), en la línea de tiempo (barra fantasma punteada en la misma fila, que abre la ficha) y con un interruptor general «académica / tradicional».
- **«Escuela de los Nombres»:** se muestra con el nombre tradicional y una nota de que es un rótulo de época Han.

## Validar

```
python3 herramientas/validar.py
```

Ejecuta el validador común del núcleo sobre este atlas. Necesita el repositorio ATLAS_NUCLEO clonado junto a este (en una carpeta `atlas_nucleo` o `ATLAS_NUCLEO`) o su ruta en la variable `ATLAS_NUCLEO`.

## Navegación

Los puntos de vista del mapa y qué necesita cada uno de los datos están en [`navegacion.md`](navegacion.md).
