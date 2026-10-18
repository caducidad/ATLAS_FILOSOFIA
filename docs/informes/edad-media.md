# Informe previo · La Edad Media

Versión 0.1 · 18 de octubre de 2026

Es el primer paso del procedimiento de [`redaccion.md`](https://github.com/caducidad/ATLAS_NUCLEO/blob/main/docs/redaccion.md) del núcleo: qué entra, qué figuras forman el canon de cada tradición, qué fechas y debates hay, y una bibliografía verificada. Las fichas se escriben después, tradición por tradición, empezando por la Europa latina.

**Estado de la revisión.** Las fechas de la Europa latina están contrastadas (fuentes en la tabla). Las de las demás tradiciones son provisionales: se cotejan con las obras de referencia cuando llegue su tanda, como pide el procedimiento.

## 1. Decisiones de Juan (18 de octubre)

1. **Tres carriles nuevos:** Europa latina, mundo islámico y pensamiento judío. Bizancio sigue en el carril griego, que pasa a llamarse «Grecia, Roma y Bizancio», porque la filosofía en griego no se interrumpe: de Proclo se pasa a Filópono y a Psello. India y China continúan en sus carriles. Japón y Corea, más adelante.
2. **Los tardoantiguos que faltan abren la Edad Media.** Agustín, Boecio, Wang Bi, Vasubandhu o Dignāga no están en los archivos de la Antigüedad; entran en los medievales como su punto de partida, que es como se enseña en España (Agustín y Boecio abren la Europa latina). La excepción son Proclo y Damascio, que completan el neoplatonismo del archivo griego antiguo, cuya época ya llega al 529.
3. **Primera tanda: la Europa latina.**

## 2. Carriles y archivos

Orden de los carriles, de oeste a este y con el pensamiento judío entre los dos mundos en los que vivió:

| Carril (`tradicion`) | Se muestra como | Archivo medieval | Prefijo |
| --- | --- | --- | --- |
| `proximo_oriente` | Próximo Oriente (preámbulo) | — | — |
| `grecorromana` | Grecia, Roma y Bizancio | `bizancio.json` | `bz` |
| `latina` | Europa latina | `latina-medieval.json` | `la` |
| `judia` | Pensamiento judío | `judia-medieval.json` | `ju` |
| `islamica` | Mundo islámico | `islamica-medieval.json` | `is` |
| `india` | India | `india-medieval.json` | `im` |
| `china` | China | `china-medieval.json` | `cm` |

- **Cada carril nuevo entra en `atlas.json` con su primer archivo de datos, no antes.** La app se publica con cada subida y un carril vacío se vería en la línea del tiempo.
- **Las influencias entre tradiciones dejan de ser raras.** En la Antigüedad casi todo eran paralelos; en la Edad Media hay traducciones documentadas (del griego al árabe en Bagdad, del árabe al latín en Toledo, del sánscrito al chino). La regla del validador sigue igual: `influyo_en` entre tradiciones distintas, solo con la fuente citada.
- **Dónde va un autor que vivió entre dos mundos:** en la tradición en cuyos textos y debates se formó. Maimónides es del pensamiento judío aunque escribiera en árabe; Kumārajīva, nacido en Kucha, es de la tradición china, porque su obra es la traducción y la enseñanza en Chang'an. Los dudosos se anotan en la ficha.

## 3. Dónde empieza y dónde acaba

La Edad Media es una división de la historia europea; en otras tradiciones se usa por comodidad, para que la línea del tiempo tenga cortes comparables. Cada archivo dice en su descripción qué abarca.

| Tradición | Empieza | Termina | Lo que queda para la época siguiente |
| --- | --- | --- | --- |
| Europa latina | Agustín (n. 354) | hacia 1450 | Nicolás de Cusa, el humanismo |
| Bizancio | 529 (cierre de la escuela de Atenas) | 1453 (caída de Constantinopla) | — |
| Mundo islámico | hacia 750 (traducciones de Bagdad) | Ibn Jaldún (m. 1406) | Mullā Ṣadrā y la escuela de Isfahán |
| Pensamiento judío | Saadia Gaón (n. 882) | hacia 1450 | Abravanel, Spinoza |
| India | Asaṅga y Vasubandhu (s. IV-V) | hacia 1500 | lo posterior a Gaṅgeśa |
| China | 220 (fin de los Han) | hacia 1450 | Wang Yangming (n. 1472) |

## 4. Europa latina (primera tanda)

### Épocas (contextos)

| Id propuesto | Nombre | Horquilla | Qué la define |
| --- | --- | --- | --- |
| `contexto.padres_latinos` | Los Padres latinos y el fin de Roma | 380-636 | De Ambrosio y Agustín a Isidoro: el cristianismo hereda la filosofía antigua mientras cae el Imperio de Occidente |
| `contexto.alta_edad_media` | La Alta Edad Media y el renacimiento carolingio | 636-1050 | Pocos textos, monasterios que copian; la corte de Carlomagno y la de Carlos el Calvo |
| `contexto.siglo_xii` | Las escuelas del siglo XII | 1050-1200 | Escuelas catedralicias y monasterios: Anselmo, Abelardo, Chartres, San Víctor; empiezan las traducciones del árabe |
| `contexto.universidades` | Las universidades y el siglo XIII | 1200-1300 | París y Oxford, las órdenes mendicantes, Aristóteles entero en latín; la condena de 1277 |
| `contexto.baja_edad_media` | La Baja Edad Media | 1300-1450 | Escoto, Ockham y la «vía moderna», la mística renana, la crisis del papado y los primeros textos en lenguas vulgares |

### Escuelas y corrientes

| Id propuesto | Naturaleza | Nota |
| --- | --- | --- |
| `escuela.escolastica` | rótulo historiográfico | Más un método (la pregunta disputada, el comentario) que una escuela |
| `escuela.chartres` | rótulo historiográfico | Se discute si fue una escuela o un grupo de maestros relacionados con la catedral |
| `escuela.san_victor` | real | Los canónigos de la abadía de San Víctor de París |
| `escuela.averroismo_latino` | rótulo historiográfico | Lo que hoy se llama más bien «aristotelismo radical» |
| `escuela.tomismo` | real | Seguidores de Tomás de Aquino; la orden dominica lo adopta |
| `escuela.escotismo` | real | Seguidores de Duns Escoto, sobre todo franciscanos |
| `escuela.nominalismo` | rótulo historiográfico | La «vía moderna» de Ockham y Buridán; el nombre es de época, pero agrupa posturas distintas |
| `escuela.mistica_renana` | rótulo historiográfico | Eckhart, Taulero y Suso |

### Canon por círculos

Fechas contrastadas con la Stanford Encyclopedia of Philosophy (SEP), la Internet Encyclopedia of Philosophy (IEP) y la Encyclopaedia Britannica (EB). Se guardarán como horquillas.

**Círculo 1** (el canon que todo estudiante debe encontrar):

| Autor | Fechas | Fuente | Debate o nota |
| --- | --- | --- | --- |
| Agustín de Hipona | 13 nov. 354, Tagaste – 28 ago. 430, Hipona | SEP | Muere con los vándalos sitiando la ciudad |
| Boecio | c. 475-477 – 526? | SEP | La fecha de la ejecución es probable, no segura |
| Juan Escoto Eriúgena | c. 800 – c. 877 | SEP | Ninguna de las dos fechas está documentada |
| Anselmo de Canterbury | 1033, cerca de Aosta – 21 abr. 1109 | SEP | *Proslogion*, 1077-1078 |
| Pedro Abelardo | c. 1079, Le Pallet – 21 abr. 1142 | SEP | Fechas de las obras muy inciertas |
| Alberto Magno | c. 1200, Lauingen – 1280, Colonia | SEP | Maestro de Tomás desde 1245 |
| Tomás de Aquino | c. 1225, cerca de Aquino – 7 mar. 1274, Fossanova | SEP | Año de nacimiento incierto |
| Buenaventura | c. 1217-1221, Bagnoregio – 15 jul. 1274, Lyon | SEP, IEP | La SEP da hacia 1221; la IEP deja abierto 1217/1221 |
| Roger Bacon | c. 1214-1220 – c. 1292, Oxford | SEP | Dos lecturas de su frase sobre «cuarenta años de estudio» |
| Ramon Llull | 1232, Mallorca – después de mar. 1316 | SEP | La muerte como mártir en Bugía es leyenda tardía; la SEP no la recoge |
| Juan Duns Escoto | 1263-1266, Duns – 8 nov. 1308, Colonia | SEP | Dumont (2023) adelanta el nacimiento a 1263-1264 por los registros de su ordenación |
| Guillermo de Ockham | finales de 1287 o principios de 1288 – noche del 9 al 10 abr. 1347 | SEP | Nacimiento estimado a partir de su carrera |
| Maestro Eckhart | c. 1260, Tambach – c. 28 ene. 1328 | SEP | Lugar de la muerte desconocido |
| Eloísa | c. 1090-1100 – 1163 o 1164 | Robl, *The birth of Heloise* | La fecha tradicional de nacimiento, c. 1101, es probablemente tardía |
| Christine de Pizan | 1364, Venecia – c. 1430 | EB | *La ciudad de las damas*, 1405 |

**Círculo 2** (figuras secundarias):

| Autor | Fechas | Fuente |
| --- | --- | --- |
| Isidoro de Sevilla | c. 560 – 4 abr. 636 | EB (nacido en Cartagena o en Sevilla) |
| Hildegarda de Bingen | 1098 – 17 sep. 1179, Rupertsberg | EB |
| Bernardo de Claraval | 1090 – 1153 | por cotejar |
| Hugo de San Víctor | c. 1096 – 1141 | por cotejar |
| Pedro Lombardo | c. 1100, Novara – 21 o 22 ago. 1160, París | EB; las *Sentencias*, 1148-1151 |
| Juan de Salisbury | c. 1115-1120 – 1180, Chartres | SEP; testigo del asesinato de Tomás Becket |
| Roberto Grosseteste | c. 1168 – 8-9 oct. 1253 | SEP |
| Siger de Brabante | c. 1240 – entre 1281 y 1284, Orvieto | EB; lo apuñaló su secretario, que había perdido la razón |
| Marsilio de Padua | 1275-1280 – en o antes de 1343, Múnich | SEP; *El defensor de la paz*, 24 jun. 1324 |
| Juan Buridán | c. 1300 – entre 1358 y 1361 | SEP |
| Nicolás Oresme | c. 1320 – 11 jul. 1382 | SEP |

**Círculo 3** (figuras puente): Ambrosio de Milán, Mónica (madre de Agustín), Pelagio, Teodorico el Grande (el rey que mandó ejecutar a Boecio), Casiodoro, Beda, Alcuino, Carlomagno, Carlos el Calvo, Gottschalk, Gaunilón, Bernardo de Chartres, Esteban Tempier (obispo de París, condenas de 1270 y 1277), Luis de Baviera, el papa Juan XXII y Dante. Sus fechas se cotejan al escribir cada ficha.

**Decidido por Juan (18 de octubre): Eloísa y Christine de Pizan suben al círculo 1.** El criterio es el de la Antigüedad: sube quien conserva obra con argumentos filosóficos propios (Hipatia se quedó en el 2 porque no conservamos nada suyo). Eloísa discute con Abelardo en sus cartas sobre la intención moral y el matrimonio; Christine escribe filosofía política y moral y abre la «querella de las mujeres». Hildegarda, cuya obra es sobre todo visionaria, teológica, médica y musical, sigue en el 2, como Isidoro de Sevilla.

### Obras, conceptos y tesis que saldrán

- **Obras:** *Confesiones* y *La ciudad de Dios* (Agustín), *La consolación de la filosofía* (Boecio), *Periphyseon* (Eriúgena), *Proslogion* (Anselmo) y la respuesta de Gaunilón, *Historia de mis desventuras* y las cartas con Eloísa, *Sic et non*, *Scivias* (Hildegarda), las *Sentencias* (Pedro Lombardo), *Itinerario de la mente a Dios* (Buenaventura), *Suma contra los gentiles* y *Suma teológica*, *Ars magna* y *Libro del gentil y los tres sabios* (Llull), *Opus maius* (Bacon), *Ordinatio* (Escoto), *Suma de lógica* (Ockham), los sermones alemanes de Eckhart, *El defensor de la paz*, *La ciudad de las damas*, las *Etimologías* (Isidoro).
- **Conceptos:** iluminación, las dos ciudades, eternidad (Boecio), argumento ontológico, universales (realismo, nominalismo, conceptualismo), *sic et non*, analogía del ser, *esse* y esencia, las cinco vías, unicidad de la forma sustancial, univocidad, *haecceitas*, distinción formal, navaja de Ockham, ímpetu, desasimiento (*Gelassenheit*) y fondo del alma, plenitud de poder del papa, soberanía popular en Marsilio.
- **Tesis:** el mal como privación, «creo para entender», la existencia de Dios es demostrable a partir de los efectos, la razón y la fe no se contradicen, la doble verdad (atribuida a los averroístas latinos, que no la defendieron en esos términos), no hay que multiplicar los entes sin necesidad (fórmula que no está en Ockham: la SEP lo señala).

### Anécdotas candidatas (a cotejar con el texto)

- Agustín roba unas peras de niño solo por el gusto de robar (*Confesiones* II 4-9) y oye «toma y lee» en el jardín de Milán (VIII 12).
- Boecio escribe la *Consolación* en la cárcel, esperando la ejecución.
- Abelardo y Eloísa: su historia, contada por él en la *Historia de mis desventuras* y por ella en sus cartas.
- Tomás, llamado «el buey mudo» por sus compañeros; Alberto profetiza que sus mugidos se oirán en todo el mundo (lo cuenta Guillermo de Tocco, biógrafo tardío: fiabilidad baja).
- Tomás deja de escribir en diciembre de 1273: todo lo escrito le parece paja.
- Ockham huye de Aviñón de noche, el 26 de mayo de 1328.
- La leyenda de Buridán arrojado al Sena en un saco (la SEP dice que no se puede verificar y que choca con lo que se sabe de él) y el «asno de Buridán», que no está en sus obras: sirven como anécdota con fiabilidad baja y la corrección dentro.
- Siger de Brabante, puesto por Dante en el cielo del Sol junto a Tomás, que lo había combatido.
- Juan de Salisbury atribuye a Bernardo de Chartres la imagen de los enanos a hombros de gigantes (*Metalogicon* III 4).

### Puentes con otros carriles

- **Del árabe al latín:** Avicena y Averroes en Alberto, Tomás y Siger; la escuela de traductores de Toledo (Gerardo de Cremona, Domingo Gundisalvo). Fuente: la entrada de la SEP sobre la influencia de la filosofía árabe en el Occidente latino.
- **Maimónides en Tomás:** la *Guía de perplejos* traducida al latín.
- **Avicebrón:** el *Fons vitae* de Ibn Gabirol se leyó en latín como obra de un autor cristiano o musulmán; Salomon Munk demostró en 1846 que era judío. Buena anécdota para el puente.
- **Llull y el islam:** escribió en árabe y viajó al norte de África para discutir con los sabios musulmanes.
- **Barlaam y Josafat:** la vida del Buda llegó a la Europa cristiana, a través de versiones en árabe, georgiano y griego, como la de un santo cristiano. Puente documentado entre India y la Europa latina.
- **Bizancio:** Eriúgena traduce del griego al Pseudo-Dionisio y a Máximo el Confesor.

## 5. Las demás tradiciones (canon provisional)

Fechas sin cotejar todavía. Sirven para planear; se revisan al empezar cada tanda.

### Bizancio (carril griego, `bizancio.json`)

Pseudo-Dionisio Areopagita (c. 500), Juan Filópono (c. 490 – c. 570), Máximo el Confesor (580-662), Juan Damasceno (c. 675-749), Focio (c. 810 – c. 893), Miguel Psello (1018 – c. 1078), Juan Ítalo (s. XI), Gregorio Palamás (1296-1359) y Jorge Gemisto Pletón (c. 1355 – 1452/1454), que llevó a Florencia el entusiasmo por Platón. Proclo y Damascio, en el archivo griego antiguo.

### Mundo islámico (`islamica-medieval.json`)

Épocas: las traducciones y el primer *kalām* (teología racional), la *falsafa* en Oriente, al-Ándalus y la época posterior a al-Ghazālī.

Canon: al-Kindī (c. 800 – c. 870), Abū Bakr al-Rāzī (854 – 925 o 935), al-Fārābī (c. 870 – 950), los Hermanos de la Pureza, al-Ashʿarī (874-936), Ibn Sīnā o Avicena (980-1037), Ibn Ḥazm (994-1064), al-Ghazālī (1058-1111), Ibn Bāŷŷa o Avempace (c. 1085 – 1138), Ibn Ṭufayl (c. 1110 – 1185), Ibn Rušd o Averroes (1126-1198), Suhrawardī (1154-1191), Fajr al-Dīn al-Rāzī (1149-1209), Ibn ʿArabī (1165-1240), Naṣīr al-Dīn al-Ṭūsī (1201-1274), Ibn Taymiyya (1263-1328) e Ibn Jaldún (1332-1406). Figuras puente: Ḥunayn ibn Isḥāq (traductor), Rābiʿa de Basora (mística).

### Pensamiento judío (`judia-medieval.json`)

Saadia Gaón (882-942), Isaac Israelí (c. 855 – c. 955), Salomón ibn Gabirol o Avicebrón (c. 1021 – c. 1058), Bahya ibn Paquda (s. XI), Yehudá Haleví (c. 1075 – 1141), Abraham ibn Ezra (1089-1167), Abraham ibn Daud (c. 1110 – 1180), Maimónides (1138-1204), Najmánides (1194-1270), Moisés de León y el *Zohar* (s. XIII), Gersónides (1288-1344), Hasdai Crescas (c. 1340 – 1410/1411) y Yosef Albo (c. 1380 – 1444). Muchos nacieron en al-Ándalus o en los reinos cristianos de la Península: es un carril con mucho que contar al lector español.

### India (`india-medieval.json`)

Asaṅga y Vasubandhu (s. IV-V, Yogācāra), Buddhaghosa (s. V), Bhartṛhari (s. V), Dignāga (c. 480 – 540) y Dharmakīrti (s. VI-VII), Candrakīrti (s. VII), Śāntideva (s. VIII), Śāntarakṣita y Kamalaśīla (s. VIII, los que llevaron el budismo al Tíbet), Kumārila Bhaṭṭa y Prabhākara (Mīmāṃsā, s. VII), Gauḍapāda y Śaṅkara (Advaita Vedānta, s. VII-VIII), Maṇḍana Miśra, Vācaspati Miśra, Jayarāśi (el último cārvāka con obra conservada), Udayana (s. X-XI), Abhinavagupta (c. 950 – 1016), Rāmānuja (s. XI-XII), Śrīharṣa (s. XII), Madhva (s. XIII) y Gaṅgeśa (s. XIV, la «nueva lógica»). Del jainismo, Haribhadra y Hemacandra. Las fechas tradicionales de Śaṅkara y Rāmānuja difieren de las académicas: irán como alternativas.

### China (`china-medieval.json`)

Épocas: el «estudio de lo profundo» (*xuanxue*) de los Wei y los Jin, la llegada y el arraigo del budismo, los Tang, y el neoconfucianismo de los Song y los Yuan.

Canon: Wang Bi (226-249), He Yan, Guo Xiang (m. 312), Xi Kang y Ruan Ji (los Siete Sabios del Bosque de Bambú), Ge Hong, Kumārajīva (344-413), Sengzhao (374-414), Huiyuan, Daosheng, Zhiyi (538-597, Tiantai), Jizang, Xuanzang (602-664), Fazang (643-712, Huayan), Huineng (638-713, chan), Zongmi, Linji, Han Yu (768-824), Li Ao, Zhou Dunyi (1017-1073), Shao Yong, Zhang Zai (1020-1077), Cheng Hao y Cheng Yi, Zhu Xi (1130-1200) y Lu Jiuyuan (1139-1193).

## 6. Bibliografía verificada

Contrastada con catálogos de librerías y bibliotecas el 18 de octubre de 2026.

**Historias generales en español:**

- Étienne Gilson, *La filosofía en la Edad Media. Desde los orígenes patrísticos hasta el fin del siglo XIV*, trad. de Arsenio Pacios. Madrid, Gredos (Manuales), 2014, 764 págs. ISBN 978-84-249-2891-9. Hay ediciones anteriores de la misma traducción (la Universidad de Cuenca tiene una segunda edición de 1976). Verificado (Marcial Pons; Universidad de Cuenca, Ecuador, para el traductor).
- Rafael Ramón Guerrero, *Historia de la filosofía medieval*. Madrid, Akal (Tractatus philosophiae, 2), 1996, 256 págs. ISBN 978-84-460-0673-2. Verificado (Documenta; descubridor de la Universidad Academia de Humanismo Cristiano).
- Frederick Copleston, *Historia de la filosofía 2. De la escolástica al empirismo*. Barcelona, Ariel, 2011, 992 págs. ISBN 978-84-344-6963-1. Verificado (Casa del Libro). Falta confirmar el traductor: la ficha de la librería no es coherente en ese punto.
- Francisco León Florido, *Las filosofías en la Edad Media. Crisis, controversias y condenas*. Madrid, Biblioteca Nueva, 2010, 299 págs. ISBN 978-84-9940-170-6. Verificado (Marcial Pons; agotado).

**Obras de referencia en línea,** que sirven también para «Para saber más»: Stanford Encyclopedia of Philosophy (entradas de cada autor, «Medieval Philosophy», «Condemnation of 1277», «Influence of Arabic and Islamic Philosophy on the Latin West»), Internet Encyclopedia of Philosophy y Philosophica (en español).

**No verificado todavía:** la *Nueva historia de la filosofía occidental* de Anthony Kenny, volumen 2 (*Filosofía medieval*): no he podido confirmar la edición española. Las traducciones de los textos de cada autor (*Confesiones*, *Consolación*, cartas de Abelardo y Eloísa, *Suma teológica*…) se verifican al escribir su ficha.

## 7. Lo que conviene saber antes de empezar

- **La línea del tiempo se alarga hasta 1450 y pasa de cinco a siete carriles.** El zoom y el tamaño de letra, que estaban aparcados, se vuelven más necesarios; conviene hacerlos antes de publicar la segunda tradición medieval.
- **Las fuentes latinas están abiertas:** The Latin Library, New Advent (con la *Suma* y las obras de Agustín), el Corpus Thomisticum (en latín) y las traducciones antiguas de Project Gutenberg. Las árabes y las chinas costarán más; las chinas, de nuevo, en el Chinese Text Project desde el Chrome de Juan.
- **Imágenes:** casi todo son miniaturas de manuscritos, vidrieras y retratos imaginarios posteriores. Hay que decir siempre en el pie de qué siglo es la imagen.

## 8. Registro de la redacción

Lo que se ha cotejado con el texto y lo que no, ficha a ficha, para que la revisión sepa dónde mirar.

### Europa latina · 18 de octubre de 2026

**Agustín, Ambrosio y Boecio.**
- Cotejado con el latín de The Latin Library: *Confesiones* II 4, VI 3, VIII 7 y VIII 12; *La ciudad de Dios* XI 26.
- La *Consolación*, libro I, prosa 1 y libro II, prosa 2: cotejada con la traducción inglesa de W. V. Cooper (1902).
- El *Anónimo Valesiano*: cotejado en la traducción de la Loeb publicada por Perseus.
- Posidio, *Vida de Agustín* 31: solo a través de una cita secundaria; falta abrir el texto.

**Anselmo.**
- El prólogo y los capítulos 1 y 2 del *Proslogion*: cotejados con la traducción de S. N. Deane (1903).
- Eadmero, *Vida de san Anselmo* I 19: a través de un estudio que resume el pasaje (*Nuntius Antiquus*, Universidad Federal de Minas Gerais).

**Abelardo y Eloísa.**
- La *Historia de mis desventuras*, caps. II, VI, VII, X y XI: cotejada con la traducción de H. A. Bellows en el Medieval Sourcebook de Fordham.
- La primera carta de Eloísa: cotejada en latín y en la traducción de M. M. McLaughlin (Epistolae, Universidad de Columbia).
- La carta 115 de Pedro el Venerable: revisada de memoria; falta abrirla.

**Eriúgena.**
- Las dos historias de Guillermo de Malmesbury (la mesa y los punzones) no se han podido abrir en el texto. Van con fiabilidad C y L, y la segunda con la advertencia de la Stanford Encyclopedia, que la considera apócrifa.

**Pendiente en todas:**
- Imágenes: Wikimedia y Wikidata pidieron permiso y no se pudo dar a tiempo.
- Fechas de las figuras puente (Gottschalk, Gaunilón, Guillermo de Champeaux, Carlos el Calvo), revisadas de memoria.
