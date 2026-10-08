# Esquema de datos · Atlas de la Filosofía

Versión 0.1 · 8 de octubre de 2026

Este documento describe el formato de los archivos de `datos/` y las reglas de redacción que siguen todos los textos. El validador (`herramientas/validar.py`) comprueba automáticamente buena parte de estas reglas.

## Decisiones clave

- **Todo es un nodo.** Autores, obras, conceptos, tesis, escuelas, contextos y temáticas comparten una estructura común y se distinguen por el campo `tipo`. Cualquier cosa se puede pulsar en el mapa.
- **Clasificar no es relacionar.** A qué contexto, temática o escuela pertenece un nodo se guarda como lista dentro del propio nodo. Las relaciones se reservan para vínculos con significado filosófico o histórico.
- **Cada relación se guarda una sola vez.** La app calcula el inverso («fue maestro de» ↔ «fue discípulo de»).
- **La incertidumbre es un dato.** Fechas con horquilla, historicidad, autoría atribuida y certeza de cada relación son campos obligatorios, no notas al margen.
- **Dos capas de texto.** `resumen` accesible y `profundizacion` rigurosa, con palabras enlazadas a otros nodos.
- **El progreso del usuario va aparte.** Nunca se mezcla con el conocimiento, así los datos se pueden actualizar sin borrar el avance de nadie.

## Archivos

Los datos se reparten en varios archivos que la app carga y une al arrancar:

| Archivo | Contenido |
| --- | --- |
| `comun.json` | Catálogo de tipos de relación (`tiposRelacion`) y las 14 temáticas |
| `china-antigua.json` | Tradición china de la Antigüedad |
| `india-antigua.json` | Tradición india de la Antigüedad |
| `grecorromana-antigua.json` | Tradición grecorromana de la Antigüedad |
| `proximo-oriente-antiguo.json` | Sabidurías del Próximo Oriente: Egipto, Mesopotamia, Irán e Israel |
| … | Otras épocas (pendientes) |

Cada archivo tiene la misma forma:

```json
{
  "version": "0.1",
  "actualizado": "2026-10-08",
  "descripcion": "…",
  "nodos": [ { "id": "autor.confucio", "tipo": "autor", "…": "…" } ],
  "relaciones": [ { "id": "r0001", "origen": "…", "tipo": "…", "destino": "…" } ]
}
```

Una relación o un enlace puede apuntar a un nodo de otro archivo; por eso el validador los comprueba todos juntos.

**Identificadores:** `tipo.nombre` en minúsculas, sin tildes ni espacios: `autor.platon`, `obra.republica`, `concepto.ren`, `contexto.cien_escuelas`. El prefijo evita choques como «Zhuangzi» autor frente a *Zhuangzi* obra (`autor.zhuangzi` y `obra.zhuangzi`).

**Ids de relación:** únicos en todo el proyecto. Cada archivo usa su propio rango para no chocar: China antigua `r0001`–`r0999`, India antigua `r1000`–`r1999`, Grecia y Roma `r2000`–`r2999`, Próximo Oriente `r3000`–`r3999`.

**Años:** números enteros, negativos antes de Cristo (−551 = 551 a. C.). No existe el año 0: de −1 se pasa a 1. La app se encarga de mostrarlos como «551 a. C.».

## Campos comunes a todos los nodos

| Campo | Obligatorio | Qué contiene |
| --- | --- | --- |
| `id` | Sí | Identificador único `tipo.nombre` |
| `tipo` | Sí | autor, obra, concepto, tesis, escuela, contexto o tematica |
| `nombre` | Sí | Forma visible: «Confucio», «Analectas», «ren» |
| `nombreOriginal` | No | Escritura original: 孔子, Πλάτων, नागार्जुन |
| `alias` | No | Otras formas para la búsqueda: «Kongzi», «K'ung Fu-tzu», «Lun yu» |
| `tradicion` | Sí | grecorromana, india, china, proximo_oriente o transversal (solo temáticas) |
| `contextos` | Sí | Lista de ids de contexto a los que pertenece (puede estar vacía) |
| `tematicas` | No | Lista de ids de temática |
| `escuelas` | No | Lista de ids de escuela |
| `resumen` | Sí | 2-3 frases accesibles, con enlaces |
| `profundizacion` | No | Texto riguroso, con enlaces. Obligatorio para autores del círculo 1 |
| `fechas` | Según tipo | Objeto de fechas (abajo) |
| `fuentes` | No | Referencias para la profundización |

**Enlaces dentro del texto.** Se escriben con doble corchete, al estilo wiki: `[[concepto.ren|humanidad]]` muestra «humanidad» y lleva al nodo `concepto.ren`. Sin barra, `[[autor.mencio]]` muestra el nombre del nodo.

**Fechas.** Cada fecha es una horquilla, nunca un número suelto, para que la línea de tiempo pueda dibujar los extremos difuminados:

```json
"fechas": {
  "nacimiento": { "min": -551, "max": -551 },
  "muerte": { "min": -479, "max": -479 },
  "tipo": "tradicional",
  "historicidad": "historico",
  "alternativas": [],
  "nota": "Fechas tradicionales del Shiji, aceptadas por convención."
}
```

- `tipo`: exacta, aproximada, tradicional o actividad (cuando solo se conoce la época en que estuvo activo, como Xunzi, 289-238 a. C.). Para `actividad` se usa el campo `activo` en lugar de `nacimiento` y `muerte`. Las obras usan `composicion`.
- `historicidad`: historico, probable, debatido, legendario o colectivo.
- `alternativas`: otras cronologías con su etiqueta, por ejemplo la tradicional jaina de Mahāvīra (599-527 a. C.) junto a la académica (c. 499-427 a. C.).

## Campos propios de cada tipo

| Tipo | Campos propios |
| --- | --- |
| **autor** | `lugarOrigen`, `circulo` (1 canon, 2 secundario, 3 puente), `anecdotas` |
| **obra** | `autoria` (autor, atribuida, escuela, compilacion o anonima), `idiomaOriginal`, `capas` (estratos del texto con su fecha y testimonio), `primerTestimonio` |
| **concepto** | `terminoOriginal`, `transliteracion`, `traduccion`, `notaTraduccion` (para términos polisémicos como *dharma* o *ren*) |
| **tesis** | `enunciado` (la afirmación en una frase) |
| **escuela** | `naturaleza`: real o rotulo_historiografico (la «Escuela de los Nombres», el «legalismo») |
| **contexto** | `horquilla` (`inicio` y `fin`), `lugar`; las subdivisiones se mencionan dentro del texto |
| **tematica** | Solo los campos comunes. Son 14: las 12 clásicas más «soteriología y vías de liberación» y «cultivo de sí y formas de vida» |

**Anécdotas.** Un único bloque de texto por autor. Cada anécdota termina con su fuente y su fiabilidad entre paréntesis:

```json
"anecdotas": "Tras oír la música Shao, pasó tres meses sin notar el sabor de la carne ([[obra.analectas|Analectas]] 7.14 · B). Cuando un hombre lo describió como un perro sin hogar, aceptó la comparación riendo ([[obra.shiji|Shiji]], cap. 47 · C)."
```

Escala de fiabilidad: **A** fuente contemporánea, **B** fuente antigua seria pero tardía, **C** tradición antigua o anécdota literaria, **L** leyenda. La app nunca muestra la letra suelta, sino su significado. Toda la caja se desbloquea como carta coleccionable al visitar al autor.

## Imágenes

Cualquier nodo puede llevar un campo opcional `imagenes`, una lista de imágenes libres de derechos o con licencia compatible:

```json
"imagenes": [
  {
    "archivo": "imagenes/china/confucio-retrato.webp",
    "fuente": "https://commons.wikimedia.org/wiki/File:…",
    "tipo": "retrato_imaginario",
    "pie": "Confucio. Representación imaginaria, grabado de época Ming (s. XVI).",
    "fechaObra": "s. XVI",
    "autorObra": "Anónimo",
    "licencia": "dominio_publico",
    "credito": ""
  }
]
```

- `tipo`: retrato_imaginario, escultura, manuscrito, inscripcion, lugar, objeto u otro.
- `licencia`: dominio_publico, CC0, CC-BY-4.0, CC-BY-SA-4.0 (o versiones 2.0, 2.5 y 3.0 de las dos últimas). **No se admiten licencias no comerciales (NC) ni sin obras derivadas (ND)**, porque son incompatibles con la licencia CC BY-SA de los datos.
- `credito`: obligatorio con licencias CC BY y CC BY-SA; es el texto de atribución que la app muestra bajo la imagen.
- **La obra frente a la foto.** Una obra antigua es de dominio público, pero la foto de un objeto en tres dimensiones (una estatua, un relieve) puede tener derechos del fotógrafo: la licencia que cuenta es la de la foto.
- **Rigor en el pie.** Casi no existen retratos reales de filósofos antiguos. Toda imagen de una persona hecha mucho después indica que es una representación imaginaria y su fecha.
- **Tamaño.** Las imágenes se guardan en `imagenes/`, en formato WebP y con unos 800 píxeles de lado mayor (alrededor de 100 KB), y la app solo las carga al abrir la ficha.

El validador comprueba los campos obligatorios, las licencias admitidas y que el archivo exista.

## Relaciones

| Clave | Se lee (directo) | Se lee (inverso) | Entre | Simétrica |
| --- | --- | --- | --- | --- |
| `escribio` | escribió | escrita por | autor → obra | No |
| `parte_de` | es parte de | contiene | obra → obra; temática → temática | No |
| `fue_maestro_de` | fue maestro de | fue discípulo de | autor → autor | No |
| `influyo_en` | influyó en | recibió influencia de | cualquiera | No |
| `critica` | critica | es criticado por | cualquiera | No |
| `desarrolla` | desarrolla | es desarrollado por | cualquiera | No |
| `responde_a` | responde a | recibe respuesta de | cualquiera | No |
| `defiende` | defiende | es defendida por | autor o escuela → tesis | No |
| `trata_sobre` | trata sobre | se trata en | obra o tesis → concepto | No |
| `comenta` | comenta | es comentada por | obra → obra | No |
| `es_fuente_de` | es fuente sobre | se conoce a través de | obra → autor o escuela | No |
| `se_opone_a` | se opone a | se opone a | concepto o tesis ↔ concepto o tesis | Sí |
| `paralelo_a` | es paralelo a | es paralelo a | cualquiera ↔ cualquiera | Sí |

Cada relación es un objeto con su grado de certeza:

```json
{
  "id": "r0074",
  "origen": "autor.xunzi",
  "tipo": "critica",
  "destino": "autor.mencio",
  "certeza": "D",
  "fuente": "Xunzi, cap. 23",
  "nota": "Rechaza que la naturaleza humana sea buena."
}
```

- `certeza`: D documentado, P probable, C conjetural, L legendario. Obligatorio.
- `ejeComparacion`: obligatorio solo en `paralelo_a`, por ejemplo «impermanencia» para Heráclito ‖ Buda.
- **Regla editorial:** una relación `influyo_en` entre tradiciones distintas solo se admite con una fuente antigua citada; si no la hay, se usa `paralelo_a`. El validador lo comprueba.
- **Obras compiladas:** si el autor no escribió la obra (las *Analectas*), no se usa `escribio`, sino `es_fuente_de` desde la obra. Si la autoría es dudosa (Laozi y el *Daodejing*), se usa `escribio` con certeza C.

## Progreso del usuario

Se guarda en el navegador (localStorage) con este formato, que es también el del archivo que se exporta e importa:

```json
{
  "formato": "atlas-progreso",
  "version": "0.1",
  "perfil": { "nombre": "Juan", "creado": "2026-10-08" },
  "visitas": {
    "autor.confucio": { "veces": 5, "primera": "2026-10-08T10:12", "ultima": "2026-10-09T18:40" }
  },
  "recorrido": [
    { "id": "autor.confucio", "t": "2026-10-08T10:12", "desde": null },
    { "id": "concepto.ren", "t": "2026-10-08T10:14", "desde": "autor.confucio" }
  ],
  "busquedas": [ { "texto": "virtud", "t": "2026-10-08T10:20" } ],
  "retos": { "aciertos": 12, "fallos": 4 },
  "misiones": { "mision.hilo_virtud": { "pasos": ["autor.socrates", "autor.platon"] } }
}
```

- **Niebla de guerra:** 0 visitas sin explorar, 1 rojo brasa, 2-4 naranja, 5 o más amarillo.
- **Mapa del recorrido:** sale de `recorrido`, porque cada paso guarda de qué nodo venía.
- **Anécdotas desbloqueadas:** las de los autores con al menos una visita.
- **Varios perfiles:** cada perfil se guarda con su propia clave en el navegador.
- **Seguridad del dato:** si al importar aparece un id que ya no existe, se conserva sin mostrarlo.

## Decisiones cerradas

- **Profundización:** obligatoria para el círculo 1, opcional para los círculos 2 y 3.
- **Umbrales de la niebla:** 1, 2-4 y 5 o más visitas; se ajustarán al probar.
- **Anécdotas:** un solo bloque por autor, con fuente y fiabilidad al final de cada una.
- **Cronología por defecto:** la académica. Las alternativas se ven en la ficha (todas, con su etiqueta y origen), en la línea de tiempo (barra fantasma punteada en la misma fila, que abre la ficha) y con un interruptor general «académica / tradicional».
- **«Escuela de los Nombres»:** se muestra con el nombre tradicional y una nota de que es un rótulo de época Han.

## Guía de redacción

Tres reglas para todos los textos (resumen, profundización, anécdotas y notas):

1. **Ningún nombre propio sin contexto.** Toda persona, obra, lugar o institución que aparezca en un texto, o está enlazada a su ficha, o se explica en la misma frase («el ingeniero Gongshu Ban», «Liang, otro nombre del estado de Wei»). Si un nombre se repite en varias fichas, merece ficha propia, aunque sea mínima.
2. **Claridad antes que brevedad.** Frases completas que se entiendan sin conocer la fuente: quién hace qué y por qué. Si una anécdota necesita contexto para tener sentido, se le da, aunque quede más larga.
3. **Referencias legibles.** Las fuentes se citan con nombre y capítulo, enlazando a la ficha de la obra cuando existe: `([[obra.shiji|Shiji]], cap. 63 · B)`. Una página fija de la app, «Cómo leemos las fuentes», explica la escala de fiabilidad.

El validador comprueba la regla 3 y el formato de los enlaces; las reglas 1 y 2 requieren revisión humana.
