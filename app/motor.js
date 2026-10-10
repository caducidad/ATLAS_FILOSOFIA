/* Atlas · motor de la colección (prototipo 0.1)
 *
 * Carga cualquier atlas a partir de su atlas.json y del catálogo común de
 * relaciones del núcleo. No contiene nada propio de una disciplina.
 *
 * Se monta en un elemento con estos atributos:
 *   <div id="atlas" data-atlas="ruta/al/atlas/" data-nucleo="ruta/al/nucleo/"></div>
 *
 * Necesita D3 v7 cargado antes (global d3).
 */
(function () {
  "use strict";

  const raiz = document.getElementById("atlas");
  const RUTA_ATLAS = raiz.dataset.atlas || "./";
  const RUTA_NUCLEO = raiz.dataset.nucleo || "./nucleo/";

  const ETIQUETA_TIPO = {
    autor: "Autor", obra: "Obra", concepto: "Concepto", tesis: "Tesis", escuela: "Escuela",
    contexto: "Época", tematica: "Temática", pregunta: "Gran pregunta", experimento: "Experimento",
  };
  const HISTORICIDAD = {
    probable: "existencia probable", debatido: "historicidad debatida",
    legendario: "figura legendaria", colectivo: "obra colectiva",
  };
  const AUTORIA = {
    autor: "de autor", atribuida: "atribuida", escuela: "de escuela", compilacion: "compilación", anonima: "anónima",
  };
  const TIPOS_AZAR = ["autor", "obra", "concepto", "tesis"];
  const PLURAL = { autor: "autores", obra: "obras", concepto: "conceptos", tesis: "tesis", escuela: "escuelas", contexto: "épocas", pregunta: "grandes preguntas", experimento: "experimentos" };

  // ------------------------------------------------------------------ estado
  const E = {
    atlas: null, nodos: new Map(), relaciones: [], tipos: {}, base: null,
    salen: new Map(), entran: new Map(), miembros: new Map(),
    vista: "cronologica", centro: null, ficha: null, anterior: null, pregunta: null,
    verObras: false, modoRed: "todo", certezas: new Set(["D", "P", "C", "L"]),
  };

  // ------------------------------------------------------------------ utilidades
  const $ = (sel, el = document) => el.querySelector(sel);
  const crear = (etiqueta, props = {}, hijos = []) => {
    const el = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
    }
    for (const h of [].concat(hijos)) if (h !== null && h !== undefined) el.append(h);
    return el;
  };
  const sinTildes = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const pid = (id) => `${E.atlas.atlas}:${id}`;

  function anio(a) {
    if (a < 0) return `${-a} a. C.`;
    // «d. C.» solo donde hace falta distinguir: en los primeros siglos de la era.
    return a < 1000 ? `${a} d. C.` : `${a}`;
  }
  function tramo(t, aprox) {
    if (!t) return "";
    const c = aprox ? "c. " : "";
    if (t.min === t.max) return c + anio(t.min);
    const mismaEra = (t.min < 0) === (t.max < 0);
    const ini = mismaEra ? Math.abs(t.min) : anio(t.min);
    return `${c}${ini}–${anio(t.max)}`;
  }
  function textoFechas(f) {
    if (!f) return "";
    const aprox = f.tipo === "aproximada" || f.tipo === "actividad";
    if (f.activo) return `Activo ${tramo(f.activo, aprox)}`;
    if (f.composicion) return `Compuesta ${tramo(f.composicion, aprox)}`;
    const partes = [tramo(f.nacimiento, aprox), tramo(f.muerte, aprox)].filter(Boolean);
    return partes.join(" — ");
  }
  function extension(f) {
    if (!f) return null;
    const ini = f.nacimiento || f.activo || f.composicion;
    const fin = f.muerte || f.activo || f.composicion;
    if (!ini || !fin) return null;
    // Periodo de actividad o de composición: todo el tramo es la parte central.
    if (f.activo || f.composicion) return { a: ini.min, b: fin.max, nucleoA: ini.min, nucleoB: fin.max };
    // Vida: la parte central va del último año posible de nacimiento al primero posible de muerte.
    return { a: ini.min, b: fin.max, nucleoA: Math.min(ini.max, fin.min), nucleoB: Math.max(ini.max, fin.min) };
  }

  // ------------------------------------------------------------------ progreso
  const CLAVE = "atlas-progreso:principal";
  let memoria = null;
  function progresoVacio() {
    return {
      formato: "atlas-progreso", version: "0.2",
      perfil: { nombre: "", creado: new Date().toISOString().slice(0, 10) },
      visitas: {}, recorrido: [], busquedas: [], retos: {}, misiones: {}, niveles: {},
    };
  }
  function leerProgreso() {
    if (memoria) return memoria;
    try {
      const crudo = localStorage.getItem(CLAVE);
      memoria = crudo ? JSON.parse(crudo) : progresoVacio();
    } catch (e) {
      memoria = progresoVacio();
    }
    return memoria;
  }
  function guardarProgreso() {
    try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }
  function visitas(id) {
    const v = leerProgreso().visitas[pid(id)];
    return v ? v.veces : 0;
  }
  function nivelNiebla(id) {
    const v = visitas(id);
    return v === 0 ? 0 : v === 1 ? 1 : v <= 4 ? 2 : 3;
  }
  function registrarVisita(id, desde) {
    const p = leerProgreso();
    const ahora = new Date().toISOString().slice(0, 16);
    const clave = pid(id);
    const v = p.visitas[clave] || { veces: 0, primera: ahora };
    v.veces += 1; v.ultima = ahora;
    p.visitas[clave] = v;
    p.recorrido.push({ id: clave, t: ahora, desde: desde ? pid(desde) : null });
    if (p.recorrido.length > 2000) p.recorrido = p.recorrido.slice(-2000);
    guardarProgreso();
  }

  // ------------------------------------------------------------------ carga
  async function cargarJSON(ruta) {
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`No se pudo cargar ${ruta} (${r.status})`);
    return r.json();
  }
  async function cargar() {
    const [atlas, catalogo, base] = await Promise.all([
      cargarJSON(RUTA_ATLAS + "atlas.json"),
      cargarJSON(RUTA_NUCLEO + "esquema/relaciones.json"),
      cargarJSON(RUTA_NUCLEO + "esquema/base.json"),
    ]);
    E.atlas = atlas;
    E.base = base;
    E.tipos = Object.assign({}, catalogo.tiposRelacion, atlas.relaciones || {});
    const archivos = await Promise.all(atlas.archivos.map((a) => cargarJSON(RUTA_ATLAS + a)));
    for (const datos of archivos) {
      for (const n of datos.nodos || []) E.nodos.set(n.id, n);
      for (const r of datos.relaciones || []) E.relaciones.push(r);
    }
    for (const r of E.relaciones) {
      if (!E.nodos.has(r.origen) || !E.nodos.has(r.destino)) continue;
      if (!E.salen.has(r.origen)) E.salen.set(r.origen, []);
      if (!E.entran.has(r.destino)) E.entran.set(r.destino, []);
      E.salen.get(r.origen).push(r);
      E.entran.get(r.destino).push(r);
    }
    for (const n of E.nodos.values()) {
      for (const campo of ["contextos", "escuelas", "tematicas"]) {
        for (const ref of n[campo] || []) {
          if (!E.miembros.has(ref)) E.miembros.set(ref, []);
          E.miembros.get(ref).push(n.id);
        }
      }
    }
  }

  // ------------------------------------------------------------------ configuración del atlas
  // Cada atlas puede declarar en atlas.json su color (tema), textos propios de su disciplina
  // y la etiqueta, el plural y la forma de sus tipos de nodo propios.
  const FORMAS_POR_NOMBRE = {
    circulo: d3.symbolCircle, cuadrado: d3.symbolSquare, rombo: d3.symbolDiamond, triangulo: d3.symbolTriangle,
    estrella: d3.symbolStar, cruz: d3.symbolCross, y: d3.symbolWye,
  };
  const VARIABLES_TEMA = {
    acento: "--enlace", acentoClaro: "--foco", cielo: "--cielo", cieloAlto: "--cielo-alto", panel: "--panel", linea: "--linea",
  };
  function aplicarAtlas() {
    const tema = E.atlas.tema || {};
    for (const [clave, variable] of Object.entries(VARIABLES_TEMA)) {
      if (tema[clave]) document.documentElement.style.setProperty(variable, tema[clave]);
    }
    for (const [tipo, def] of Object.entries(E.atlas.tiposNodo || {})) {
      if (def.etiqueta) ETIQUETA_TIPO[tipo] = def.etiqueta;
      if (def.plural) PLURAL[tipo] = def.plural;
      if (def.forma && FORMAS_POR_NOMBRE[def.forma]) FORMA[tipo] = FORMAS_POR_NOMBRE[def.forma];
    }
  }
  function texto(clave, porDefecto, datos = {}) {
    const t = (E.atlas.textos && E.atlas.textos[clave]) || porDefecto;
    return t.replace(/\{(\w+)\}/g, (m, k) => (k in datos ? datos[k] : m));
  }

  // ------------------------------------------------------------------ carriles
  function configCarriles() {
    let c = E.atlas.carriles;
    if (!c) return { campo: null, orden: ["_"], secundarios: [] };
    if (typeof c === "string") c = { campo: c };
    const campo = c.campo;
    const etiquetas = (E.atlas.camposPropios && E.atlas.camposPropios[campo] && E.atlas.camposPropios[campo].etiquetas) || {};
    let orden = c.orden;
    if (!orden) {
      orden = [...new Set([...E.nodos.values()].map((n) => valorCarril(n, c)).filter(Boolean))];
    }
    return { campo, orden, secundarios: c.secundarios || [], rotuloSecundarios: c.rotuloSecundarios, etiquetas, regla: c.regla, sinValor: c.sinValor };
  }
  function valorCarril(n, c) {
    if (!c || !c.campo) return "_";
    const v = n[c.campo];
    if (Array.isArray(v)) return v.length ? v[0] : c.sinValor || null;
    return v || c.sinValor || null;
  }
  function etiquetaCarril(v, cfg) {
    if (cfg.etiquetas[v]) return cfg.etiquetas[v];
    const n = E.nodos.get(v);
    return n ? n.nombre : v;
  }

  // ------------------------------------------------------------------ interfaz base
  let svg, escenario, fichaEl;
  function montar() {
    raiz.innerHTML = "";
    const nombre = E.atlas.nombre || "Atlas";
    const partes = nombre.split(" ");
    const marca = crear("div", { class: "marca" });
    marca.innerHTML = `<span>${partes.slice(0, -1).join(" ")} </span><b>${partes.slice(-1)}</b>`;

    const entrada = crear("input", {
      id: "buscar", type: "search", placeholder: "Buscar un autor, una obra, un concepto…",
      "aria-label": "Buscar en el atlas", autocomplete: "off",
    });
    const lista = crear("ul", { class: "sugerencias", role: "listbox", hidden: true });
    const buscador = crear("div", { class: "buscador" }, [entrada, lista]);
    prepararBuscador(entrada, lista);

    const bCrono = crear("button", { "aria-pressed": "true", "data-vista": "cronologica", text: "Línea del tiempo", onclick: () => cambiarVista("cronologica") });
    const bRed = crear("button", { "aria-pressed": "false", "data-vista": "libre", text: "Red", onclick: () => cambiarVista("libre") });
    // Las grandes preguntas son otra puerta de entrada, si el atlas las tiene.
    const bPreg = hayPreguntas() ? crear("button", {
      "aria-pressed": "false", "data-vista": "preguntas", title: "Grandes preguntas: cómo respondió cada tradición",
      onclick: () => { E.pregunta = null; cambiarVista("preguntas"); },
    }, [crear("span", { class: "largo", text: "Grandes preguntas" }), crear("span", { class: "corto", text: "Preguntas" })]) : null;
    const vistas = crear("div", { class: "vistas", role: "group", "aria-label": "Punto de vista" }, [bCrono, bRed, bPreg]);
    const azar = crear("button", { class: "boton azar", title: "Llévame a algún sitio", onclick: llevame }, [crear("span", { class: "largo", text: "Llévame a algún sitio" }), crear("span", { class: "corto", text: "Al azar" })]);
    const progreso = crear("button", { class: "boton", text: "Mi progreso", onclick: abrirProgreso });

    // Dentro del blog el atlas va en un marco: se ofrece verlo a pantalla completa.
    const enMarco = window.self !== window.top;
    const pantalla = enMarco && document.fullscreenEnabled ? crear("button", {
      class: "boton", title: "Ver el atlas a pantalla completa",
      onclick: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); },
    }, [crear("span", { class: "largo", text: "Pantalla completa" }), crear("span", { class: "corto", text: "⛶" })]) : null;
    const barra = crear("header", { class: "barra" }, [marca, buscador, vistas, azar, progreso, pantalla]);
    escenario = crear("main", { class: "escenario" });
    raiz.append(barra, escenario);
    svg = d3.select(escenario).append("svg").attr("role", "img").attr("aria-label", "Mapa del atlas");
    window.addEventListener("resize", () => dibujar());
    window.addEventListener("hashchange", desdeHash);
    document.addEventListener("keydown", (ev) => {
      const t = ev.target;
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) return;
      if (raiz.querySelector(".capa")) return;
      if (E.vista === "cronologica" && crono && crono.teclado && crono.teclado(ev)) ev.preventDefault();
      else if (E.vista === "libre" && teclaRed(ev)) ev.preventDefault();
    });
  }

  function cambiarVista(v, centro) {
    if (v !== E.vista) posPrevias = new Map();
    E.vista = v;
    if (centro) E.centro = centro;
    raiz.querySelectorAll(".barra .vistas button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.vista === v)));
    dibujar();
  }
  function dibujar() {
    svg.selectAll("*").remove();
    escenario.querySelectorAll(".controles").forEach((c) => c.remove());
    const enPreguntas = E.vista === "preguntas";
    svg.style("display", enPreguntas ? "none" : null);
    if (panelPreguntas && !enPreguntas) { panelPreguntas.remove(); panelPreguntas = null; }
    if (enPreguntas) dibujarPreguntas();
    else if (E.vista === "cronologica") dibujarCronologica();
    else dibujarRed();
  }
  // Al ir a un nodo desde el buscador, el azar o un enlace: qué vista conviene.
  function vistaPara(n) {
    if (E.vista === "preguntas") return "preguntas";
    if (E.vista === "cronologica" && !extension(n.fechas)) return "libre";
    return E.vista;
  }

  // ------------------------------------------------------------------ vista cronológica
  let crono = null;
  function anchoFicha() {
    return fichaEl && !fichaEl.hidden && escenario.clientWidth > 720 ? fichaEl.offsetWidth : 0;
  }
  function dibujarCronologica() {
    const cfg = configCarriles();
    const ancho = escenario.clientWidth;
    const alto = escenario.clientHeight;
    const margenIzq = ancho < 720 ? 0 : 150;
    const filaAlto = 20, epocaAlto = 18, cabecera = 34;

    const items = [];
    for (const n of E.nodos.values()) {
      if (n.tipo !== "autor" && !(E.verObras && n.tipo === "obra")) continue;
      const ext = extension(n.fechas);
      if (!ext) continue;
      items.push({ id: n.id, n, ext, carril: valorCarril(n, cfg) || "_", fila: 0 });
    }
    const epocas = [...E.nodos.values()].filter((n) => n.tipo === "contexto" && n.horquilla);
    const minA = d3.min(items, (d) => d.ext.a), maxA = d3.max(items, (d) => d.ext.b);
    const x0 = d3.scaleLinear().domain([Math.min(minA, -2600), Math.max(maxA, 650)]).range([margenIzq + 10, ancho - 20]);
    let x = x0.copy();

    const capaFondo = svg.append("g");
    const capaRejilla = svg.append("g").attr("class", "rejilla");
    const capaEpocas = svg.append("g");
    const capaItems = svg.append("g");
    const capaNombres = svg.append("g");
    const capaEje = svg.append("g").attr("class", "eje");
    capaEje.append("rect").attr("x", 0).attr("y", 0).attr("width", ancho).attr("height", cabecera - 4).attr("fill", "var(--cielo-alto)");

    // Reparte cada carril en filas sin solapes, contando el ancho del nombre en pantalla.
    let carriles = [], altoTotal = 0;
    // El reparto en filas depende solo del nivel de acercamiento, no de hacia dónde se ha movido el lector,
    // así que desplazarse nunca recoloca los nombres. A poca escala solo se rotulan los autores principales.
    let kEmpaquetado = 1;
    const rotulado = (d) => d.n.circulo === 1 || d.n.tipo !== "autor" || kEmpaquetado * (x0.range()[1] - x0.range()[0]) / (x0.domain()[1] - x0.domain()[0]) > 0.55;
    function empaquetar(k) {
      kEmpaquetado = k;
      const u = (a) => k * x0(a);
      const porCarril = d3.group(items, (d) => d.carril);
      const epocasPorCarril = d3.group(epocas, (n) => valorCarril(n, cfg) || "_");
      let y = cabecera;
      carriles = cfg.orden.map((c, i) => {
        const filasEp = [];
        const eps = (epocasPorCarril.get(c) || []).slice().sort((a, b) => a.horquilla.inicio - b.horquilla.inicio).map((n) => {
          let f = filasEp.findIndex((fin) => fin <= n.horquilla.inicio);
          if (f < 0) { f = filasEp.length; filasEp.push(0); }
          filasEp[f] = n.horquilla.fin;
          return { id: n.id, n, fila: f };
        });
        const altoEp = Math.max(1, filasEp.length) * epocaAlto;
        const filas = [];
        const lista = (porCarril.get(c) || []).slice().sort((a, b) => a.ext.a - b.ext.a);
        for (const d of lista) {
          d.rotulo = rotulado(d);
          const px0 = u(d.ext.a);
          const px1 = Math.max(u(d.ext.b), px0 + (d.rotulo ? 12 + d.n.nombre.length * 6.8 : 6));
          let f = filas.findIndex((fin) => fin + 8 <= px0);
          if (f < 0) { f = filas.length; filas.push(-Infinity); }
          filas[f] = px1;
          d.fila = f;
        }
        const L = { c, i, y, altoEp, eps, lista, secundario: cfg.secundarios.includes(c) };
        L.alto = 20 + altoEp + Math.max(1, filas.length) * filaAlto + 12;
        y += L.alto;
        return L;
      });
      altoTotal = y;
      for (const L of carriles) for (const d of L.lista) d.yy = L.y + 20 + L.altoEp + d.fila * filaAlto;
    }

    let ty = crono && crono.ty ? crono.ty : 0;
    const clampY = (v) => Math.max(Math.min(0, alto - altoTotal - 70), Math.min(0, v));

    function posicionar() {
      // Fondo de cada carril y su nombre
      capaFondo.selectAll("rect").data(carriles, (L) => L.c).join("rect")
        .attr("class", (L) => `carril-fondo ${L.i % 2 ? "par" : ""}`)
        .attr("x", 0).attr("y", (L) => L.y + ty).attr("width", ancho).attr("height", (L) => L.alto);
      const nombres = capaNombres.selectAll("g").data(carriles, (L) => L.c).join((en) => {
        const g = en.append("g");
        if (margenIzq) g.append("rect").attr("class", "carril-etiqueta-fondo");
        g.append("text").attr("class", (L) => `carril-nombre ${L.secundario ? "secundario" : ""}`).text((L) => etiquetaCarril(L.c, cfg));
        g.filter((L) => L.secundario).append("text").attr("class", "carril-nota").text(cfg.rotuloSecundarios || "carril secundario");
        return g;
      });
      nombres.select("rect").attr("x", 0).attr("y", (L) => L.y + ty).attr("width", margenIzq).attr("height", (L) => L.alto);
      nombres.select("text.carril-nombre").attr("x", margenIzq ? 16 : 12).attr("y", (L) => L.y + ty + (margenIzq ? 22 : L.altoEp + 18));
      nombres.select("text.carril-nota").attr("x", margenIzq ? 16 : 12).attr("y", (L) => L.y + ty + (margenIzq ? 38 : L.altoEp + 31));

      // Épocas
      const eps = carriles.flatMap((L) => L.eps.map((e) => Object.assign(e, { yb: L.y })));
      const ge = capaEpocas.selectAll("g").data(eps, (e) => e.id).join((en) => {
        const g = en.append("g").attr("class", "epoca").on("click", (ev, e) => abrirFicha(e.id));
        g.append("rect").attr("rx", 2).attr("height", epocaAlto - 4);
        g.append("text").text((e) => e.n.nombre);
        g.append("title").text((e) => `${e.n.nombre} · ${tramo({ min: e.n.horquilla.inicio, max: e.n.horquilla.fin })}`);
        return g;
      });
      ge.classed("superada", (e) => !!leerProgreso().niveles[pid(e.id)]);
      ge.select("rect").attr("x", (e) => x(e.n.horquilla.inicio)).attr("y", (e) => e.yb + ty + 8 + e.fila * epocaAlto)
        .attr("width", (e) => Math.max(2, x(e.n.horquilla.fin) - x(e.n.horquilla.inicio)));
      ge.select("text").attr("x", (e) => Math.max(x(e.n.horquilla.inicio), margenIzq + 6) + 4).attr("y", (e) => e.yb + ty + 18.5 + e.fila * epocaAlto);

      // Autores y obras
      const todos = carriles.flatMap((L) => L.lista);
      const gi = capaItems.selectAll("g.item").data(todos, (d) => d.id).join((en) => {
        const g = en.append("g").attr("tabindex", 0).attr("role", "button").attr("aria-label", (d) => d.n.nombre)
          .on("click", (ev, d) => abrirFicha(d.id))
          .on("keydown", (ev, d) => { if (ev.key === "Enter") abrirFicha(d.id); });
        g.append("rect").attr("class", "borde");
        g.append("rect").attr("class", "nucleo");
        g.append("text").text((d) => (d.n.tipo === "obra" ? `«${d.n.nombre}»` : d.n.nombre));
        g.append("title").text((d) => `${d.n.nombre} · ${textoFechas(d.n.fechas)}`);
        return g;
      });
      gi.attr("class", (d) => `item v${nivelNiebla(d.id)} ${d.n.fechas && ["legendario", "debatido"].includes(d.n.fechas.historicidad) ? "dudosa" : ""} ${E.ficha === d.id ? "activo" : ""}`);
      const alto_ = (d) => (d.n.tipo === "obra" ? 5 : 7);
      const yc = (d) => d.yy + ty + 9 - alto_(d) / 2;
      // Línea fina: todo el intervalo posible. Barra gruesa: la parte segura.
      gi.select("rect.borde").attr("x", (d) => x(d.ext.a)).attr("y", (d) => yc(d) + alto_(d) / 2 - 1).attr("height", 2)
        .attr("width", (d) => Math.max(1, x(d.ext.b) - x(d.ext.a)));
      gi.select("rect.nucleo").attr("y", yc).attr("height", alto_).attr("rx", (d) => alto_(d) / 2)
        .attr("x", (d) => x(Math.min(Math.max(d.ext.nucleoA, d.ext.a), d.ext.b)))
        .attr("width", (d) => Math.max(3, x(Math.max(Math.min(d.ext.nucleoB, d.ext.b), d.ext.a)) - x(Math.min(Math.max(d.ext.nucleoA, d.ext.a), d.ext.b))));
      // El nombre se queda a la vista aunque el comienzo de la barra salga por la izquierda.
      gi.select("text").attr("x", (d) => Math.max(x(d.ext.a), margenIzq + 6)).attr("y", (d) => d.yy + ty - 0.5)
        .attr("opacity", (d) => (!d.rotulo || x(d.ext.b) < margenIzq + 6 ? 0 : 1));

      // Eje y rejilla
      const ticks = x.ticks(Math.max(4, Math.floor((ancho - margenIzq) / 110))).filter((t) => t !== 0);
      capaRejilla.selectAll("line").data(ticks).join("line")
        .attr("x1", (t) => x(t)).attr("x2", (t) => x(t)).attr("y1", cabecera).attr("y2", alto);
      capaEje.selectAll("text").data(ticks).join("text")
        .attr("x", (t) => x(t)).attr("y", 20).attr("text-anchor", "middle").text((t) => anio(t));
    }

    const zoom = d3.zoom().scaleExtent([1, 40])
      .extent([[margenIzq + 10, 0], [ancho - 20, alto]])
      .translateExtent([[x0.range()[0], -1e6], [x0.range()[1], 1e6]])
      .on("zoom", (ev) => {
        const t = ev.transform;
        // La rueda y el pellizco solo acercan el tiempo; el arrastre mueve en las dos direcciones.
        const se = ev.sourceEvent;
        if (se && (se.type === "wheel" || (se.touches && se.touches.length > 1))) t.y = ty;
        ty = clampY(t.y); t.y = ty;
        x = t.rescaleX(x0);
        crono.dominio = x.domain(); crono.ty = ty;
        posicionar();
        if (Math.abs(t.k - kEmpaquetado) / kEmpaquetado > 0.03) {
          clearTimeout(crono.espera);
          crono.espera = setTimeout(() => { empaquetar(t.k); ty = clampY(ty); posicionar(); }, 250);
        }
      });

    const inicio = crono && crono.dominio ? crono.dominio : [-800, 300];
    crono = Object.assign(crono || {}, {
      dominio: inicio, ty,
      irA(id) {
        const n = E.nodos.get(id);
        const ext = n && extension(n.fechas);
        if (!ext) return;
        const d = x.domain();
        const kk = (x0.domain()[1] - x0.domain()[0]) / (d[1] - d[0]);
        const medio = (margenIzq + 10 + ancho - anchoFicha()) / 2;
        const item = items.find((i) => i.id === id);
        const objetivoY = item && item.yy !== undefined ? clampY(alto / 2 - item.yy) : ty;
        svg.transition().duration(500).call(zoom.transform,
          d3.zoomIdentity.translate(medio - kk * x0((ext.a + ext.b) / 2), objetivoY).scale(kk));
      },
    });
    const k = (x0.domain()[1] - x0.domain()[0]) / (inicio[1] - inicio[0]);
    x = d3.zoomIdentity.translate(margenIzq + 10 - k * x0(inicio[0]), ty).scale(k).rescaleX(x0);
    empaquetar(k);
    ty = clampY(ty);
    // La rueda desplaza (arriba y abajo, y a los lados en los paneles táctiles); con Ctrl, o pellizcando, acerca el tiempo.
    zoom.filter((ev) => (ev.type === "wheel" ? ev.ctrlKey : !ev.button)).wheelDelta(ruedaSuave);
    svg.call(zoom).on("dblclick.zoom", null);
    svg.on("wheel.desplazar", (ev) => {
      if (ev.ctrlKey) return;
      ev.preventDefault();
      const kActual = d3.zoomTransform(svg.node()).k;
      svg.call(zoom.translateBy, -ev.deltaX / kActual, -ev.deltaY / kActual);
    }, { passive: false });
    svg.call(zoom.transform, d3.zoomIdentity.translate(margenIzq + 10 - k * x0(inicio[0]), ty).scale(k));
    // Teclado: flechas para moverse, + y − para acercar o alejar.
    crono.teclado = (ev) => {
      const kActual = d3.zoomTransform(svg.node()).k;
      const pasos = { ArrowLeft: [120, 0], ArrowRight: [-120, 0], ArrowUp: [0, 90], ArrowDown: [0, -90] };
      if (pasos[ev.key]) { svg.transition().duration(150).call(zoom.translateBy, pasos[ev.key][0] / kActual, pasos[ev.key][1] / kActual); return true; }
      if (ev.key === "+" || ev.key === "=") { crono.acercar(1.4); return true; }
      if (ev.key === "-" || ev.key === "_") { crono.acercar(1 / 1.4); return true; }
      return false;
    };
    crono.acercar = (f) => svg.transition().duration(250).call(zoom.scaleBy, f, [(margenIzq + ancho - anchoFicha()) / 2, alto / 2]);

    controles([
      crear("button", { class: "chip", text: "＋", "aria-label": "Acercar", title: "Acercar (también Ctrl y rueda, o pellizcar)", onclick: () => crono.acercar(1.6) }),
      crear("button", { class: "chip", text: "－", "aria-label": "Alejar", title: "Alejar", onclick: () => crono.acercar(1 / 1.6) }),
      crear("button", {
        class: "chip", "aria-pressed": String(E.verObras), text: "Mostrar obras",
        onclick: () => { E.verObras = !E.verObras; dibujar(); },
      }),
      leyendaNiebla(),
    ]);
  }

  // ------------------------------------------------------------------ vista en red
  // El nodo elegido en el centro y sus relaciones alrededor, agrupadas por tipo en sectores,
  // con un solo rótulo por grupo. Al cambiar de centro, los nodos se desplazan con una transición.
  const FORMA = {
    autor: d3.symbolCircle, obra: d3.symbolSquare, concepto: d3.symbolDiamond, tesis: d3.symbolTriangle,
    escuela: d3.symbolStar, pregunta: d3.symbolCross, experimento: d3.symbolWye,
  };
  let posPrevias = new Map();
  function ordenGrupo(etiqueta) {
    // Orden de lectura alrededor del reloj: personas, obras, ideas, debates y paralelos.
    const orden = ["fue discípulo de", "fue maestro de", "recibió influencia de", "influyó en", "escribió", "escrita por",
      "se conoce a través de", "es fuente sobre", "desarrolla", "es desarrollado por", "defiende", "es defendida por",
      "trata sobre", "se trata en", "responde a", "recibe respuesta de", "critica", "es criticado por", "se opone a",
      "comenta", "es comentada por", "es parte de", "contiene", "es paralelo a"];
    const k = orden.indexOf(etiqueta);
    return k < 0 ? 50 : k;
  }
  function dibujarRed() {
    // Sin ningún nodo elegido, la red se abre entera.
    if (E.modoRed === "todo" || !E.centro || !E.nodos.has(E.centro)) { E.modoRed = "todo"; dibujarRedCompleta(); return; }
    const ancho = escenario.clientWidth, alto = escenario.clientHeight;
    const anchoUtil = ancho - anchoFicha();
    const c = E.centro;
    const cx = anchoUtil / 2, cy = alto / 2;

    // Vecinos agrupados por cómo se leen desde el centro
    const rels = [...(E.salen.get(c) || []), ...(E.entran.get(c) || [])].filter((r) => E.certezas.has(r.certeza));
    const grupos = [...d3.group(rels.map((r) => ({ r, ...leerRelacion(r, c) })), (d) => d.etiqueta)]
      .sort((a, b) => ordenGrupo(a[0]) - ordenGrupo(b[0]));
    const total = rels.length;
    const R = Math.max(130, Math.min(anchoUtil, alto) * 0.36);
    const hueco = total > 1 ? 0.18 : 0;              // separación entre sectores, en radianes
    const libre = 2 * Math.PI - hueco * grupos.length;
    let angulo = -Math.PI / 2 - (grupos.length > 1 ? 0 : 0);
    const vecinos = [], rotulos = [];
    for (const [etiqueta, lista] of grupos) {
      const ancho_ = total ? (libre * lista.length) / total : 0;
      lista.forEach((d, k) => {
        const a = angulo + ancho_ * (lista.length === 1 ? 0.5 : (k + 0.5) / lista.length);
        // Si hay muchos vecinos, alternan dos radios para que los nombres no choquen.
        const radio = total > 14 && k % 2 ? R + 46 : R;
        vecinos.push({ id: d.otro, n: E.nodos.get(d.otro), r: d.r, a, x: cx + radio * Math.cos(a), y: cy + radio * Math.sin(a), etiqueta });
      });
      const medio = angulo + ancho_ / 2;
      rotulos.push({ etiqueta, n: lista.length, a: medio, a0: angulo, a1: angulo + ancho_ });
      angulo += ancho_ + hueco;
    }

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.4, 3]).on("zoom", (ev) => g.attr("transform", ev.transform));
    prepararZoomRed(zoom, [cx, cy]);
    svg.call(zoom).on("dblclick.zoom", null);

    // Posición de partida para la transición: donde estaba cada nodo, o donde estaba el nuevo centro.
    const origen = posPrevias.get(c) || { x: cx, y: cy };
    const desde = (id) => posPrevias.get(id) || origen;
    const dur = posPrevias.size && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 550 : 0;

    // Un sector sombreado por grupo: las líneas que caen dentro comparten la misma relación.
    const exterior = R + (total > 14 ? 70 : 34);
    g.append("g").selectAll("path").data(rotulos).join("path")
      .attr("class", (d, i) => `cuna ${i % 2 ? "impar" : ""}`)
      .attr("transform", `translate(${cx},${cy})`)
      .attr("d", (d) => d3.arc().innerRadius(34).outerRadius(exterior).cornerRadius(6)
        .startAngle(d.a0 - 0.06 + Math.PI / 2).endAngle(d.a1 + 0.06 + Math.PI / 2)())
      .attr("opacity", 0).transition().delay(dur * 0.5).duration(300).attr("opacity", 1);

    // Aristas
    const aristas = g.append("g").selectAll("line").data(vecinos).join("line")
      .attr("class", (d) => `arista c-${d.r.certeza} ${d.r.tipo === "paralelo_a" ? "paralelo" : ""}`)
      .attr("x1", origen.x).attr("y1", origen.y).attr("x2", (d) => desde(d.id).x).attr("y2", (d) => desde(d.id).y);
    aristas.append("title").text((d) => leerRelacion(d.r, c).frase);
    aristas.transition().duration(dur).attr("x1", cx).attr("y1", cy).attr("x2", (d) => d.x).attr("y2", (d) => d.y);

    // Un rótulo por grupo, sobre el sector
    g.append("g").selectAll("text").data(rotulos).join("text").attr("class", "sector")
      .attr("text-anchor", "middle")
      .attr("x", (d, i) => cx + R * (0.42 + 0.17 * (i % 2)) * Math.cos(d.a)).attr("y", (d, i) => cy + R * (0.42 + 0.17 * (i % 2)) * Math.sin(d.a) + 4)
      .text((d) => (d.n > 1 ? `${d.etiqueta} (${d.n})` : d.etiqueta))
      .attr("opacity", 0).transition().delay(dur * 0.6).duration(250).attr("opacity", 1);

    // Nodos
    const nodosDatos = [{ id: c, n: E.nodos.get(c), x: cx, y: cy, centro: true }, ...vecinos];
    const nodosG = g.append("g").selectAll("g").data(nodosDatos).join("g")
      .attr("class", (d) => `nodo v${nivelNiebla(d.id)} ${d.centro ? "centro" : ""}`)
      .attr("transform", (d) => `translate(${desde(d.id).x},${desde(d.id).y})`)
      .attr("tabindex", 0).attr("role", "button").attr("aria-label", (d) => d.n.nombre)
      .on("click", (ev, d) => irA(d.id))
      .on("keydown", (ev, d) => { if (ev.key === "Enter") irA(d.id); });
    nodosG.transition().duration(dur).attr("transform", (d) => `translate(${d.x},${d.y})`);
    nodosG.append("path").attr("d", (d) => d3.symbol(FORMA[d.n.tipo] || d3.symbolCircle, d.centro ? 700 : 260)());
    // El nombre va hacia fuera del círculo, para no pisar las aristas.
    nodosG.append("text")
      .attr("text-anchor", (d) => (d.centro ? "middle" : Math.cos(d.a) > 0.25 ? "start" : Math.cos(d.a) < -0.25 ? "end" : "middle"))
      .attr("x", (d) => (d.centro ? 0 : Math.cos(d.a) > 0.25 ? 14 : Math.cos(d.a) < -0.25 ? -14 : 0))
      .attr("y", (d) => (d.centro ? 38 : Math.sin(d.a) > 0.5 ? 26 : Math.sin(d.a) < -0.5 ? -16 : 5))
      .text((d) => corto(d.n.nombre, d.centro ? 40 : 28));
    nodosG.append("title").text((d) => `${ETIQUETA_TIPO[d.n.tipo] || d.n.tipo}: ${d.n.nombre}`);

    // Encuadre: si los nombres se salen de la pantalla, se aleja lo justo para que quepa todo.
    let x0_ = cx, x1_ = cx, y0_ = cy - 30, y1_ = cy + 50;
    for (const d of vecinos) {
      const w = corto(d.n.nombre, 28).length * 7.4 + 16;
      const izq = Math.cos(d.a) < -0.25 ? d.x - w : Math.cos(d.a) > 0.25 ? d.x : d.x - w / 2;
      x0_ = Math.min(x0_, izq); x1_ = Math.max(x1_, izq + w);
      y0_ = Math.min(y0_, d.y - 30); y1_ = Math.max(y1_, d.y + 34);
    }
    const margen = 20, abajo = 60;
    const escala = Math.min(1, (anchoUtil - 2 * margen) / (x1_ - x0_), (alto - margen - abajo) / (y1_ - y0_));
    const tx = anchoUtil / 2 - escala * (x0_ + x1_) / 2, tyR = (alto - abajo + margen) / 2 - escala * (y0_ + y1_) / 2;
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, tyR).scale(escala));

    posPrevias = new Map(nodosDatos.map((d) => [d.id, { x: d.x, y: d.y }]));

    function irA(id) {
      if (id === c) { abrirFicha(id); return; }
      E.centro = id;
      abrirFicha(id, c);
    }

    controles([
      ...botonesZoom((f) => zoomRed.acercar(f)),
      conmutadorRed(),
      ...botonesCerteza(),
      leyendaNiebla(),
    ]);
    if (rels.length === 0) {
      g.append("text").attr("x", cx).attr("y", cy + 70).attr("text-anchor", "middle")
        .attr("class", "sector").text("No tiene relaciones con los filtros elegidos.");
    }
  }

  // Zoom de las vistas de red: rueda suave, botones + y −, teclas + y − y flechas, todo con transición.
  let zoomRed = null;
  const ruedaSuave = (ev) => -ev.deltaY * (ev.deltaMode === 1 ? 0.03 : ev.deltaMode ? 1 : 0.0012) * (ev.ctrlKey ? 6 : 1);
  function prepararZoomRed(zoom, punto) {
    zoom.wheelDelta(ruedaSuave);
    zoomRed = {
      acercar(f) { svg.transition().duration(250).call(zoom.scaleBy, f, punto); },
      mover(dx, dy) { const k = d3.zoomTransform(svg.node()).k; svg.transition().duration(150).call(zoom.translateBy, dx / k, dy / k); },
    };
  }
  function botonesZoom(acercar) {
    return [
      crear("button", { class: "chip", text: "＋", "aria-label": "Acercar", title: "Acercar (también la tecla +, la rueda o pellizcando)", onclick: () => acercar(1.5) }),
      crear("button", { class: "chip", text: "－", "aria-label": "Alejar", title: "Alejar (también la tecla −)", onclick: () => acercar(1 / 1.5) }),
    ];
  }
  function teclaRed(ev) {
    if (!zoomRed) return false;
    const pasos = { ArrowLeft: [100, 0], ArrowRight: [-100, 0], ArrowUp: [0, 100], ArrowDown: [0, -100] };
    if (pasos[ev.key]) { zoomRed.mover(...pasos[ev.key]); return true; }
    if (ev.key === "+" || ev.key === "=") { zoomRed.acercar(1.4); return true; }
    if (ev.key === "-" || ev.key === "_") { zoomRed.acercar(1 / 1.4); return true; }
    return false;
  }

  function conmutadorRed() {
    const elegido = E.nodos.get(E.centro);
    const nombre = elegido ? elegido.nombre : "…";
    const grupo = crear("div", { class: "vistas pequena", role: "group", "aria-label": "Qué parte de la red" }, [
      crear("button", {
        "aria-pressed": String(E.modoRed === "centro"), text: `Alrededor de ${corto(nombre, 22)}`, disabled: !elegido,
        title: elegido ? "" : "Elige antes un autor, una obra o un concepto: pulsa uno, búscalo o usa «Llévame a algún sitio»",
        onclick: () => { E.modoRed = "centro"; dibujar(); },
      }),
      crear("button", { "aria-pressed": String(E.modoRed === "todo"), text: "Toda la red", onclick: () => { E.modoRed = "todo"; dibujar(); } }),
    ]);
    return grupo;
  }

  // Toda la red: cada tradición es una constelación. Lo explorado brilla; al acercarse aparecen los nombres.
  let redCompleta = null;
  function calcularRedCompleta() {
    const cfg = configCarriles();
    const nodos = [...E.nodos.values()].filter((n) => !["tematica", "contexto"].includes(n.tipo)).map((n) => ({ id: n.id, n }));
    const porId = new Map(nodos.map((d) => [d.id, d]));
    const enlaces = E.relaciones.filter((r) => porId.has(r.origen) && porId.has(r.destino))
      .map((r) => ({ r, source: porId.get(r.origen), target: porId.get(r.destino) }));
    // Centro de cada constelación: las tradiciones principales en círculo, las secundarias más cerca del borde.
    const carriles = cfg.orden;
    const centros = new Map(carriles.map((c, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / carriles.length;
      const r = cfg.secundarios.includes(c) ? 330 : 300;
      return [c, { x: r * Math.cos(a), y: r * Math.sin(a) }];
    }));
    const centroDe = (d) => centros.get(valorCarril(d.n, cfg)) || { x: 0, y: 0 };
    nodos.forEach((d, i) => { const c0 = centroDe(d); d.x = c0.x + Math.cos(i) * 40; d.y = c0.y + Math.sin(i) * 40; });
    const sim = d3.forceSimulation(nodos)
      .force("enlace", d3.forceLink(enlaces).distance((l) => (l.r.tipo === "paralelo_a" ? 200 : 34)).strength((l) => (l.r.tipo === "paralelo_a" ? 0.005 : 0.25)))
      .force("carga", d3.forceManyBody().strength(-38).distanceMax(220))
      .force("choque", d3.forceCollide(9))
      .force("x", d3.forceX((d) => centroDe(d).x).strength(0.09))
      .force("y", d3.forceY((d) => centroDe(d).y).strength(0.09))
      .stop();
    for (let i = 0; i < 420; i++) sim.tick();
    const rotulos = carriles.map((c) => {
      const del = nodos.filter((d) => valorCarril(d.n, cfg) === c);
      const minY = d3.min(del, (d) => d.y), mx = d3.mean(del, (d) => d.x);
      return { c, x: mx, y: minY - 22, nombre: etiquetaCarril(c, cfg), secundario: cfg.secundarios.includes(c) };
    });
    return { nodos, enlaces, rotulos, porId };
  }
  function dibujarRedCompleta() {
    if (!redCompleta) redCompleta = calcularRedCompleta();
    const { nodos, enlaces, rotulos } = redCompleta;
    const ancho = escenario.clientWidth, alto = escenario.clientHeight;
    const anchoUtil = ancho - anchoFicha();
    const g = svg.append("g").attr("class", "red-completa");

    // Si hay una ficha abierta, se resaltan el nodo y sus vecinos.
    const foco = E.ficha && redCompleta.porId.has(E.ficha) ? E.ficha : null;
    const vecinos = new Set();
    if (foco) {
      vecinos.add(foco);
      for (const r of [...(E.salen.get(foco) || []), ...(E.entran.get(foco) || [])]) { vecinos.add(r.origen); vecinos.add(r.destino); }
    }
    g.classed("con-foco", !!foco);

    g.append("g").selectAll("line").data(enlaces.filter((l) => E.certezas.has(l.r.certeza))).join("line")
      .attr("class", (l) => `arista tenue c-${l.r.certeza} ${l.r.tipo === "paralelo_a" ? "paralelo" : ""} ${foco && (l.r.origen === foco || l.r.destino === foco) ? "resaltada" : ""}`)
      .attr("x1", (l) => l.source.x).attr("y1", (l) => l.source.y).attr("x2", (l) => l.target.x).attr("y2", (l) => l.target.y);

    g.append("g").selectAll("text").data(rotulos).join("text")
      .attr("class", (d) => `constelacion ${d.secundario ? "secundario" : ""}`).attr("text-anchor", "middle")
      .attr("x", (d) => d.x).attr("y", (d) => d.y).text((d) => d.nombre);

    const principal = (d) => d.n.circulo === 1;
    const ng = g.append("g").selectAll("g").data(nodos).join("g")
      .attr("class", (d) => `nodo v${nivelNiebla(d.id)} ${principal(d) ? "principal" : "menor"} ${foco ? (vecinos.has(d.id) ? "en-foco" : "fuera") : ""} ${d.id === foco ? "centro" : ""}`)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("tabindex", 0).attr("role", "button").attr("aria-label", (d) => d.n.nombre)
      .on("click", (ev, d) => { E.centro = d.id; abrirFicha(d.id); })
      .on("keydown", (ev, d) => { if (ev.key === "Enter") { E.centro = d.id; abrirFicha(d.id); } });
    ng.append("path").attr("d", (d) => d3.symbol(FORMA[d.n.tipo] || d3.symbolCircle, principal(d) ? 110 : 45)());
    ng.append("text").attr("text-anchor", "middle").attr("y", (d) => (principal(d) ? 18 : 14)).text((d) => corto(d.n.nombre, 26));
    ng.append("title").text((d) => `${ETIQUETA_TIPO[d.n.tipo] || d.n.tipo}: ${d.n.nombre}`);

    // Zum semántico: con poco acercamiento solo se leen los autores principales y lo que está en foco.
    const zoom = d3.zoom().scaleExtent([0.2, 5]).on("zoom", (ev) => {
      g.attr("transform", ev.transform);
      g.classed("cerca", ev.transform.k >= 1.6);
      E.transRed = ev.transform;
    });
    prepararZoomRed(zoom, [anchoUtil / 2, alto / 2]);
    svg.call(zoom).on("dblclick.zoom", null);
    if (E.transRed) svg.call(zoom.transform, E.transRed);
    else {
      const x0 = d3.min(nodos, (d) => d.x) - 40, x1 = d3.max(nodos, (d) => d.x) + 40;
      const y0 = d3.min(nodos, (d) => d.y) - 50, y1 = d3.max(nodos, (d) => d.y) + 30;
      const k = Math.min(1.4, (anchoUtil - 20) / (x1 - x0), (alto - 80) / (y1 - y0));
      svg.call(zoom.transform, d3.zoomIdentity.translate(anchoUtil / 2 - k * (x0 + x1) / 2, (alto - 60) / 2 - k * (y0 + y1) / 2).scale(k));
    }
    controles([
      ...botonesZoom((f) => zoomRed.acercar(f)),
      conmutadorRed(),
      ...botonesCerteza(),
      leyendaNiebla(),
    ]);
  }

  function corto(texto, max) {
    return texto.length <= max ? texto : texto.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  }
  function leerRelacion(r, desde) {
    const t = E.tipos[r.tipo] || { directo: r.tipo, inverso: r.tipo };
    const sale = r.origen === desde;
    const otro = sale ? r.destino : r.origen;
    const etiqueta = sale || t.simetrica ? t.directo : t.inverso;
    const a = E.nodos.get(desde), b = E.nodos.get(otro);
    return { etiqueta, otro, frase: `${a.nombre} ${etiqueta} ${b ? b.nombre : otro}` };
  }

  function controles(elementos) {
    escenario.append(crear("div", { class: "controles" }, elementos));
  }
  // Palabras que ve el lector para la certeza de cada relación (los botones y la leyenda dicen lo mismo).
  const CERTEZA_UI = { D: "Consta", P: "Probable", C: "Hipótesis", L: "Leyenda" };
  const CERTEZA_FRASE = {
    D: "Línea continua: consta en las fuentes.",
    P: "Rayas: es probable, aunque no consta directamente.",
    C: "Puntos: es una hipótesis de los estudiosos.",
    L: "Puntos separados: solo lo cuenta una leyenda.",
  };
  function botonesCerteza() {
    return Object.keys(E.base.certezas).map((k) => crear("button", {
      class: "chip", "aria-pressed": String(E.certezas.has(k)), text: CERTEZA_UI[k] || E.base.certezas[k],
      title: `Mostrar u ocultar las líneas de este tipo: ${(CERTEZA_FRASE[k] || "").toLowerCase()}`,
      onclick: () => { E.certezas.has(k) ? E.certezas.delete(k) : E.certezas.add(k); dibujar(); },
    }));
  }

  function leyendaNiebla() {
    // «Cómo leer el mapa»: primero cómo se lee la vista en que estás; después los detalles.
    const cont = crear("div", { class: "leyenda" });
    const panel = crear("div", { class: "leyenda-panel", hidden: true, id: "leyenda-panel" });
    const muestra = (svgInterior, alto = 12) => { const sp = crear("span", { class: "muestra" }); sp.innerHTML = `<svg width="46" height="${alto}" aria-hidden="true">${svgInterior}</svg>`; return sp; };
    const fila = (m, texto) => crear("li", {}, [m, document.createTextNode(texto)]);
    const seccion = (titulo, ...hijos) => panel.append(crear("h4", { text: titulo }), ...hijos);
    const textoVisitas = "Cada vez que abres la ficha de un autor, una obra o un concepto, se ilumina un poco más. Así ves de un vistazo qué parte del mapa ya conoces.";
    const visitas = (forma) => crear("ul", {}, ["Aún sin visitar", "Visitado una vez", "Visitado de 2 a 4 veces", "Visitado 5 veces o más"]
      .map((t, k) => fila(forma === "barra"
        ? muestra(`<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-v${k}"/>`)
        : muestra(`<circle cx="23" cy="8" r="6" class="m-v${k}"/>`, 16), t)));
    const moverte = (texto) => crear("p", { text: texto });

    if (E.vista === "cronologica") {
      seccion("Lo que ya has visitado se ilumina", crear("p", { class: "intro", text: textoVisitas }), visitas("barra"));
      seccion("Las fechas", crear("ul", {}, [
        fila(muestra('<rect x="2" y="5" width="42" height="2" class="m-v2"/><rect x="14" y="2" width="20" height="7" rx="3.5" class="m-v2"/>'),
          "Cada barra es una vida. La parte gruesa son los años seguros; la línea fina, el margen de duda."),
        fila(crear("span", { class: "muestra-texto", text: "Laozi" }), "Nombre en cursiva: su existencia histórica es dudosa o legendaria."),
      ]), crear("p", { text: texto("leyenda.fechasAlternativas", "Algunas figuras tienen fechas distintas según quién las cuente. El mapa usa las fechas de los historiadores actuales; las demás aparecen en la ficha de cada autor.") }));
      const cfg = configCarriles();
      if (cfg.secundarios.length) {
        panel.append(crear("p", { text: texto("leyenda.carrilesSecundarios", "{carriles} aparece en una franja más discreta.", { carriles: cfg.secundarios.map((c) => etiquetaCarril(c, cfg)).join(", ") }) }));
      }
      seccion("Cómo moverte", moverte("Arrastra, usa la rueda del ratón o las flechas del teclado. Para acercar o alejar: los botones + y −, las teclas + y −, Ctrl con la rueda o pellizcando con dos dedos. Con el mapa alejado solo se rotulan los autores principales."));
    } else {
      seccion("Cómo se lee", crear("p", { class: "intro", text: E.modoRed === "todo"
        ? "Toda la red a la vez: cada tradición forma un grupo, como una constelación, y las líneas que cruzan de un grupo a otro unen tradiciones distintas. Al acercarte aparecen todos los nombres. Pulsa un autor, una obra o un concepto para abrir su ficha y resaltar lo que se relaciona con él."
        : "En el centro, el elemento elegido. Alrededor, todo lo que se relaciona con él, agrupado en sectores sombreados: cada sector es un tipo de relación, y se lee desde el centro hacia fuera. «Fue maestro de (3)» quiere decir que el del centro fue maestro de los tres de ese sector. Pulsa cualquiera para ponerlo en el centro." }));
      const linea = (clase) => muestra(`<line x1="2" y1="7" x2="44" y2="7" class="m-linea ${clase}"/>`, 14);
      seccion("¿Qué seguridad hay?", crear("ul", {}, [
        ...Object.keys(E.base.certezas).map((k) => fila(linea(`c-${k}`), CERTEZA_FRASE[k] || E.base.certezas[k])),
        fila(linea("paralelo"), "Línea azul: se parecen, pero no consta que uno influyera en el otro."),
      ]), crear("p", { class: "intro", text: "Los botones de abajo (Consta, Probable, Hipótesis y Leyenda) muestran u ocultan cada tipo de línea." }));
      const forma = (tipo) => muestra(`<path transform="translate(23,9)" class="m-forma" d="${d3.symbol(FORMA[tipo], 90)()}"/>`, 18);
      const presentes = new Set([...E.nodos.values()].map((n) => n.tipo));
      const nombreForma = { escuela: "Escuela o corriente" };
      seccion("Las formas", crear("ul", {}, Object.keys(FORMA).filter((t) => presentes.has(t))
        .map((t) => fila(forma(t), nombreForma[t] || ETIQUETA_TIPO[t] || t))));
      seccion("Lo que ya has visitado se ilumina", crear("p", { class: "intro", text: textoVisitas }), visitas("circulo"));
      seccion("Cómo moverte", moverte("Arrastra o usa las flechas del teclado. Para acercar o alejar: los botones + y −, las teclas + y −, la rueda del ratón o pellizcando con dos dedos."));
    }
    const boton = crear("button", {
      class: "chip", "aria-expanded": "false", "aria-controls": "leyenda-panel", text: "Cómo leer el mapa",
      onclick: () => { panel.hidden = !panel.hidden; boton.setAttribute("aria-expanded", String(!panel.hidden)); },
    });
    cont.append(panel, boton);
    return cont;
  }



  // ------------------------------------------------------------------ grandes preguntas
  // Primero, la lista de preguntas; al elegir una, sus respuestas agrupadas por carril (en filosofía, por tradición).
  let panelPreguntas = null;
  const hayPreguntas = () => [...E.nodos.values()].some((n) => n.tipo === "pregunta");
  function respuestasDe(idPregunta) {
    return (E.entran.get(idPregunta) || []).filter((r) => r.tipo === "responde_a").map((r) => ({ r, n: E.nodos.get(r.origen) }));
  }
  // Quién sostiene una respuesta: los autores que la defienden, la desarrollan o la escribieron.
  function autoresDe(id) {
    const tipos = ["defiende", "desarrolla", "escribio"];
    const ids = (E.entran.get(id) || []).filter((r) => tipos.includes(r.tipo) && E.nodos.get(r.origen).tipo === "autor").map((r) => r.origen);
    return [...new Set(ids)].slice(0, 3);
  }
  // Una pregunta se abre en su propia vista, no en la ficha: allí se ven sus respuestas.
  function irAPregunta(id, desde) {
    E.pregunta = id;
    registrarVisita(id, desde || null);
    // En el móvil la ficha taparía la pregunta: se recoge.
    if (fichaEl && (E.ficha === id || escenario.clientWidth <= 720)) { fichaEl.hidden = true; E.ficha = null; }
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    if (E.vista === "preguntas") dibujar(); else cambiarVista("preguntas");
  }
  function dibujarPreguntas() {
    const nuevo = !panelPreguntas;
    if (nuevo) {
      panelPreguntas = crear("section", { class: "preguntas", "aria-label": "Grandes preguntas" });
      escenario.prepend(panelPreguntas);
    }
    const p = panelPreguntas;
    const mismaPregunta = p.dataset.pregunta === (E.pregunta || "");
    const scroll = mismaPregunta ? p.scrollTop : 0;
    p.dataset.pregunta = E.pregunta || "";
    p.style.paddingRight = anchoFicha() ? `calc(${anchoFicha()}px + 1.5rem)` : "";
    p.innerHTML = "";
    const cfg = configCarriles();
    const interior = crear("div", { class: "preguntas-interior" });
    p.append(interior);
    const preguntas = [...E.nodos.values()].filter((n) => n.tipo === "pregunta");

    if (!E.pregunta || !E.nodos.has(E.pregunta)) {
      interior.append(crear("h2", { text: "Grandes preguntas" }));
      interior.append(crear("p", { class: "intro", text: texto("preguntas.intro", "Hay preguntas que se hicieron, cada una a su manera, tradiciones que apenas sabían unas de otras. Elige una para ver qué respondió cada una.") }));
      const lista = crear("ul", { class: "lista-preguntas" });
      for (const q of preguntas) {
        const resp = respuestasDe(q.id);
        const carriles = [...new Set(resp.map((d) => valorCarril(d.n, cfg)).filter(Boolean))]
          .sort((a, b) => cfg.orden.indexOf(a) - cfg.orden.indexOf(b)).map((c) => etiquetaCarril(c, cfg));
        lista.append(crear("li", {}, crear("button", {
          class: `tarjeta-pregunta v${nivelNiebla(q.id)}`,
          onclick: () => irAPregunta(q.id),
        }, [
          crear("span", { class: "q", text: q.nombre }),
          crear("span", { class: "meta", text: `${resp.length} ${resp.length === 1 ? "respuesta" : "respuestas"}${carriles.length ? " · " + carriles.join(", ") : ""}` }),
        ])));
      }
      interior.append(lista);
    } else {
      const q = E.nodos.get(E.pregunta);
      interior.append(crear("button", { class: "volver", text: "← Todas las preguntas", onclick: () => { E.pregunta = null; history.replaceState(null, "", location.pathname); dibujar(); } }));
      interior.append(crear("h2", { text: q.nombre }));
      if (q.enunciado && q.enunciado !== q.nombre) interior.append(crear("p", { class: "enunciado", text: q.enunciado }));
      if (q.resumen) interior.append(crear("p", { class: "intro" }, textoEnlazado(q.resumen, q.id)));
      // Columnas en el orden de los carriles; lo que no tiene carril, al final.
      const grupos = d3.group(respuestasDe(q.id), (d) => valorCarril(d.n, cfg) || "_otras");
      const orden = [...grupos.keys()].sort((a, b) => {
        const ia = cfg.orden.indexOf(a), ib = cfg.orden.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const columnas = crear("div", { class: "columnas" });
      for (const c of orden) {
        const col = crear("section", { class: "columna" }, crear("h3", { text: c === "_otras" ? "Otras respuestas" : etiquetaCarril(c, cfg) }));
        const ul = crear("ul");
        for (const { r, n } of grupos.get(c)) {
          const li = crear("li", { class: `v${nivelNiebla(n.id)}` });
          li.append(crear("span", { class: "tipo", text: ETIQUETA_TIPO[n.tipo] || n.tipo }));
          li.append(crear("button", { class: "e nombre", text: n.nombre, onclick: () => abrirFicha(n.id, q.id) }));
          if (n.enunciado) li.append(crear("span", { class: "enunciado-tesis", text: n.enunciado }));
          if (r.nota) li.append(crear("span", { class: "nota" }, textoEnlazado(r.nota, q.id)));
          const autores = autoresDe(n.id);
          if (autores.length && !(r.nota || "").includes(autores[0])) {
            const s = crear("span", { class: "quien" }, document.createTextNode("— "));
            autores.forEach((a, i) => { if (i) s.append(document.createTextNode(", ")); s.append(crear("button", { class: "e", text: E.nodos.get(a).nombre, onclick: () => abrirFicha(a, q.id) })); });
            li.append(s);
          }
          if (r.certeza && r.certeza !== "D") li.append(crear("span", { class: "marca-certeza", text: (CERTEZA_UI[r.certeza] || "").toLowerCase() }));
          ul.append(li);
        }
        col.append(ul);
        columnas.append(col);
      }
      interior.append(columnas);
      const otras = preguntas.filter((o) => o.id !== q.id);
      if (otras.length) {
        interior.append(crear("h3", { class: "otras", text: "Otras grandes preguntas" }));
        interior.append(crear("div", { class: "chips" }, otras.map((o) => crear("button", {
          class: `chip-pregunta v${nivelNiebla(o.id)}`, text: o.nombre,
          onclick: () => irAPregunta(o.id, q.id),
        }))));
      }
    }
    p.scrollTop = scroll;
  }

  // ------------------------------------------------------------------ textos con enlaces
  function textoEnlazado(texto, desde) {
    // Convierte [[id|texto]] en botones y marca las referencias de las anécdotas.
    const frag = document.createDocumentFragment();
    const patron = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
    let ultimo = 0, m;
    while ((m = patron.exec(texto))) {
      frag.append(...referencias(texto.slice(ultimo, m.index)));
      const id = m[1], visible = m[2] || (E.nodos.get(id) || {}).nombre || id;
      if (E.nodos.has(id)) {
        frag.append(crear("button", { class: `e v${nivelNiebla(id)}`, text: visible, onclick: () => abrirFicha(id, desde) }));
      } else {
        frag.append(document.createTextNode(visible));
      }
      ultimo = patron.lastIndex;
    }
    frag.append(...referencias(texto.slice(ultimo)));
    return frag;
  }
  function referencias(trozo) {
    // «· A)» al final de una referencia se convierte en su significado; la letra suelta no se muestra.
    const fiab = E.base.fiabilidadAnecdotas;
    const salida = [];
    const patron = / · ([ABCL])\)/g;
    let ultimo = 0, m;
    while ((m = patron.exec(trozo))) {
      salida.push(document.createTextNode(trozo.slice(ultimo, m.index)));
      salida.push(crear("span", { class: "ref" }, [document.createTextNode("; "), crear("abbr", { title: fiab[m[1]], text: fiab[m[1]] }), document.createTextNode(")")]));
      ultimo = patron.lastIndex;
    }
    salida.push(document.createTextNode(trozo.slice(ultimo)));
    return salida;
  }
  function parrafos(texto, desde) {
    const cont = crear("div", { class: "texto" });
    // Las anécdotas se separan por su referencia final: «… · C).»
    const trozos = texto.split(/(?<=· [ABCL]\)\.?)\s+/);
    for (const t of trozos) cont.append(crear("p", {}, textoEnlazado(t, desde)));
    return cont;
  }
  function enlaceNodo(id, desde) {
    const n = E.nodos.get(id);
    if (!n) return document.createTextNode(id);
    return crear("button", { class: `e v${nivelNiebla(id)}`, text: n.nombre, onclick: () => abrirFicha(id, desde) });
  }

  // ------------------------------------------------------------------ ficha
  function abrirFicha(id, desde) {
    const n = E.nodos.get(id);
    if (!n) return;
    if (n.tipo === "pregunta" && E.vista === "preguntas") { irAPregunta(id, desde !== undefined ? desde : E.ficha); return; }
    registrarVisita(id, desde !== undefined ? desde : E.ficha);
    E.anterior = E.ficha;
    E.ficha = id;
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    pintarFicha(n);
    if (E.vista === "libre") E.centro = id;
    dibujar();
  }

  function pintarFicha(n) {
    if (!fichaEl) {
      fichaEl = crear("aside", { class: "ficha", "aria-live": "polite" });
      escenario.append(fichaEl);
    }
    fichaEl.hidden = false;
    fichaEl.innerHTML = "";
    fichaEl.scrollTop = 0;
    const id = n.id;
    const cfg = configCarriles();

    fichaEl.append(crear("button", {
      class: "cerrar", "aria-label": "Cerrar la ficha", text: "×",
      onclick: () => { fichaEl.hidden = true; E.ficha = null; history.replaceState(null, "", location.pathname); dibujar(); },
    }));
    const brasa = crear("span", { class: "brasa" });
    brasa.style.background = ["transparent", "var(--brasa-1)", "var(--brasa-2)", "var(--brasa-3)"][nivelNiebla(id)];
    const carril = cfg.campo && n[cfg.campo] ? etiquetaCarril(valorCarril(n, cfg), cfg) : "";
    fichaEl.append(crear("div", { class: "antetitulo" }, [brasa, document.createTextNode([ETIQUETA_TIPO[n.tipo] || n.tipo, carril].filter(Boolean).join(" · "))]));
    fichaEl.append(crear("h2", { text: n.nombre }));
    if (n.nombreOriginal && n.nombreOriginal !== n.nombre) fichaEl.append(crear("p", { class: "original", text: n.nombreOriginal }));

    // Fechas
    if (n.fechas || n.horquilla) {
      const f = crear("p", { class: "fechas" });
      if (n.horquilla) f.append(tramo({ min: n.horquilla.inicio, max: n.horquilla.fin }));
      if (n.fechas) {
        f.append(textoFechas(n.fechas));
        if (HISTORICIDAD[n.fechas.historicidad]) f.append(` · ${HISTORICIDAD[n.fechas.historicidad]}`);
        for (const alt of n.fechas.alternativas || []) f.append(crear("span", { class: "alt", text: `${alt.etiqueta}: ${textoFechas(alt)}` }));
        if (n.fechas.nota) f.append(crear("span", { class: "alt", text: n.fechas.nota }));
      }
      fichaEl.append(f);
    }

    if (n.enunciado) fichaEl.append(crear("blockquote", { class: "enunciado", text: n.enunciado }));
    fichaEl.append(parrafos(n.resumen || "", id));

    // Datos propios del tipo
    const datos = [];
    const fila = (k, v) => v && datos.push(crear("dt", { text: k }), crear("dd", {}, v));
    if (n.terminoOriginal) fila("Término", `${n.terminoOriginal}${n.transliteracion && n.transliteracion !== n.terminoOriginal ? " · " + n.transliteracion : ""}`);
    if (n.traduccion) fila("Traducción", n.traduccion);
    if (n.lugarOrigen) fila("Origen", n.lugarOrigen);
    if (n.lugar) fila("Lugar", n.lugar);
    if (n.autoria) fila("Autoría", AUTORIA[n.autoria] || n.autoria);
    if (n.idiomaOriginal) fila("Lengua", n.idiomaOriginal);
    if (n.primerTestimonio) fila("Testimonio más antiguo", n.primerTestimonio);
    if (datos.length) fichaEl.append(crear("dl", {}, datos));
    if (n.notaTraduccion) fichaEl.append(crear("p", { class: "nota", text: n.notaTraduccion }));
    if (n.capas && n.capas.length) {
      fichaEl.append(crear("h3", { text: "Capas del texto" }));
      fichaEl.append(crear("ul", { class: "nota" }, n.capas.map((c) => crear("li", { text: `${c.nombre} (${anio(c.fecha)}): ${c.testimonio}` }))));
    }

    if (n.profundizacion) {
      const d = crear("details", {}, [crear("summary", { text: "Profundizar" })]);
      d.append(parrafos(n.profundizacion, id));
      fichaEl.append(d);
    }

    if (n.anecdotas) {
      fichaEl.append(crear("section", { class: "anecdotas" }, [crear("h3", { text: "Anécdotas" }), parrafos(n.anecdotas, id)]));
    }

    // Época como nivel del juego
    if (n.tipo === "contexto") fichaEl.append(cajaNivel(n));

    // Relaciones agrupadas
    const rels = [...(E.salen.get(id) || []), ...(E.entran.get(id) || [])];
    if (rels.length) {
      fichaEl.append(crear("h3", { text: "Relaciones" }));
      const grupos = d3.group(rels.map((r) => ({ r, ...leerRelacion(r, id) })), (d) => d.etiqueta);
      for (const [etiqueta, lista] of grupos) {
        const ul = crear("ul");
        for (const d of lista) {
          const li = crear("li", {}, [enlaceNodo(d.otro, id)]);
          if (d.r.certeza !== "D") li.append(crear("span", { class: "marca-certeza", text: (CERTEZA_UI[d.r.certeza] || "").toLowerCase() }));
          if (d.r.ejeComparacion) li.append(crear("span", { class: "nota", text: `Comparten: ${d.r.ejeComparacion}` }));
          if (d.r.nota) { const s = crear("span", { class: "nota" }); s.append(textoEnlazado(d.r.nota, id)); li.append(s); }
          if (d.r.fuente) li.append(crear("span", { class: "nota", text: `Fuente: ${d.r.fuente}` }));
          ul.append(li);
        }
        fichaEl.append(crear("div", { class: "grupo" }, [crear("div", { class: "rel", text: etiqueta[0].toUpperCase() + etiqueta.slice(1) }), ul]));
      }
    }

    // Miembros (épocas, escuelas, temáticas)
    const miembros = (E.miembros.get(id) || []).filter((m) => E.nodos.get(m).tipo !== "tematica");
    if (miembros.length) {
      fichaEl.append(crear("h3", { text: n.tipo === "contexto" ? "En esta época" : n.tipo === "escuela" ? "Pertenecen a esta escuela" : "En esta temática" }));
      const orden = ["autor", "obra", "concepto", "tesis", "escuela"];
      const lista = miembros.slice().sort((a, b) => orden.indexOf(E.nodos.get(a).tipo) - orden.indexOf(E.nodos.get(b).tipo));
      fichaEl.append(crear("div", { class: "chips" }, lista.slice(0, 60).map((m) => enlaceNodo(m, id))));
    }

    // Clasificación
    const clasif = [];
    for (const [campo, titulo] of [["contextos", "Época"], ["escuelas", "Escuela"], ["tematicas", "Temáticas"]]) {
      if (n[campo] && n[campo].length) clasif.push(crear("dt", { text: titulo }), crear("dd", {}, crear("div", { class: "chips" }, n[campo].map((r) => enlaceNodo(r, id)))));
    }
    if (clasif.length) fichaEl.append(crear("h3", { text: "Clasificación" }), crear("dl", {}, clasif));

    // Acciones
    const acciones = [];
    // En el móvil la ficha tapa el mapa: al pedir verlo, se recoge.
    const recoger = () => { if (escenario.clientWidth <= 720) fichaEl.hidden = true; };
    if (n.tipo === "pregunta") acciones.push(crear("button", {
      class: "boton", text: "Ver las respuestas de cada tradición",
      onclick: () => irAPregunta(id),
    }));
    if (rels.length) acciones.push(crear("button", { class: "boton", text: "Ver en la red", onclick: () => { recoger(); E.centro = id; E.modoRed = "centro"; cambiarVista("libre"); } }));
    if (extension(n.fechas)) acciones.push(crear("button", {
      class: "boton", text: "Ver en la línea del tiempo",
      onclick: () => { recoger(); cambiarVista("cronologica"); setTimeout(() => crono && crono.irA(id), 30); },
    }));
    if (E.anterior && E.nodos.has(E.anterior)) {
      const ant = E.anterior;
      acciones.push(crear("button", { class: "boton", text: `← ${E.nodos.get(ant).nombre}`, onclick: () => abrirFicha(ant, id) }));
    }
    fichaEl.append(crear("div", { class: "acciones" }, acciones));
  }

  function estadoNivel(ctx) {
    const autores = (E.miembros.get(ctx.id) || []).map((m) => E.nodos.get(m)).filter((m) => m.tipo === "autor");
    const canon = autores.filter((a) => a.circulo === 1);
    const objetivo = canon.length ? canon : autores;
    const vistos = objetivo.filter((a) => visitas(a.id) > 0).length;
    const superado = leerProgreso().niveles[pid(ctx.id)];
    return { total: objetivo.length, vistos, explorado: objetivo.length > 0 && vistos === objetivo.length, superado };
  }
  function cajaNivel(ctx) {
    const s = estadoNivel(ctx);
    const caja = crear("div", { class: "nivel" });
    const texto = s.superado ? "Nivel superado."
      : s.explorado ? "Época explorada: has visitado todos sus autores principales. El examen opcional llegará pronto."
      : s.total === 0 ? "Esta época todavía no tiene autores en el atlas."
      : `Para explorar esta época, visita sus autores principales: llevas ${s.vistos} de ${s.total}.`;
    caja.append(crear("div", { text: texto }));
    const barra = crear("div", { class: "barra-nivel" }, crear("span"));
    barra.firstChild.style.width = s.total ? `${(100 * s.vistos) / s.total}%` : "0";
    caja.append(barra);
    return caja;
  }

  // ------------------------------------------------------------------ buscador
  function prepararBuscador(entrada, lista) {
    const indice = () => [...E.nodos.values()].map((n) => ({
      n, claves: [n.nombre, n.nombreOriginal, ...(n.alias || [])].filter(Boolean).map(sinTildes),
    }));
    let cache = null, resultados = [], sel = 0;
    function pintar() {
      lista.innerHTML = "";
      resultados.forEach((n, i) => {
        const li = crear("li", { role: "option", "aria-selected": String(i === sel) }, [
          crear("span", { class: "tipo", text: ETIQUETA_TIPO[n.tipo] || n.tipo }), crear("span", { class: "nom", text: n.nombre }),
        ]);
        li.addEventListener("mousedown", (ev) => { ev.preventDefault(); elegir(n); });
        lista.append(li);
      });
      lista.hidden = resultados.length === 0;
    }
    function elegir(n) {
      const p = leerProgreso();
      p.busquedas.push({ atlas: E.atlas.atlas, texto: entrada.value, t: new Date().toISOString().slice(0, 16) });
      if (p.busquedas.length > 200) p.busquedas = p.busquedas.slice(-200);
      entrada.value = ""; resultados = []; pintar(); entrada.blur();
      if (n.tipo === "pregunta" && hayPreguntas()) { irAPregunta(n.id); return; }
      E.vista = vistaPara(n);
      E.centro = n.id;
      E.modoRed = "centro";
      abrirFicha(n.id, null);
      cambiarVista(E.vista);
      if (E.vista === "cronologica") setTimeout(() => crono && crono.irA(n.id), 30);
    }
    entrada.addEventListener("input", () => {
      cache = cache || indice();
      const q = sinTildes(entrada.value.trim());
      if (q.length < 2) { resultados = []; pintar(); return; }
      const puntuados = [];
      for (const { n, claves } of cache) {
        let p = 0;
        for (const c of claves) {
          if (c === q) p = Math.max(p, 100);
          else if (c.startsWith(q)) p = Math.max(p, 60);
          else if (c.includes(" " + q)) p = Math.max(p, 40);
          else if (c.includes(q)) p = Math.max(p, 20);
        }
        if (p) puntuados.push({ n, p: p + (n.tipo === "autor" ? 5 : 0) + (n.circulo === 1 ? 3 : 0) });
      }
      resultados = puntuados.sort((a, b) => b.p - a.p).slice(0, 8).map((d) => d.n);
      sel = 0; pintar();
    });
    entrada.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") { sel = Math.min(sel + 1, resultados.length - 1); pintar(); ev.preventDefault(); }
      else if (ev.key === "ArrowUp") { sel = Math.max(sel - 1, 0); pintar(); ev.preventDefault(); }
      else if (ev.key === "Enter" && resultados[sel]) elegir(resultados[sel]);
      else if (ev.key === "Escape") { resultados = []; pintar(); }
    });
    entrada.addEventListener("blur", () => setTimeout(() => { lista.hidden = true; }, 120));
  }

  // ------------------------------------------------------------------ azar
  function llevame() {
    const candidatos = [...E.nodos.values()].filter((n) => TIPOS_AZAR.includes(n.tipo) && n.id !== E.ficha);
    const peso = (n) => (visitas(n.id) === 0 ? 5 : 1);
    const total = candidatos.reduce((s, n) => s + peso(n), 0);
    let r = Math.random() * total;
    let elegido = candidatos[0];
    for (const n of candidatos) { r -= peso(n); if (r <= 0) { elegido = n; break; } }
    E.vista = vistaPara(elegido);
    E.centro = elegido.id;
    E.modoRed = "centro";
    abrirFicha(elegido.id, null);
    cambiarVista(E.vista);
    if (E.vista === "cronologica") setTimeout(() => crono && crono.irA(elegido.id), 30);
  }

  // ------------------------------------------------------------------ progreso: panel, exportar, importar
  function abrirProgreso() {
    const p = leerProgreso();
    const propias = Object.keys(p.visitas).filter((k) => k.startsWith(E.atlas.atlas + ":") && E.nodos.has(k.split(":")[1]));
    const porTipo = d3.rollup(propias, (v) => v.length, (k) => E.nodos.get(k.split(":")[1]).tipo);
    const totalTipo = d3.rollup([...E.nodos.values()], (v) => v.length, (n) => n.tipo);
    const conAnecdotas = [...E.nodos.values()].filter((n) => n.anecdotas);
    const anecdotas = conAnecdotas.filter((n) => visitas(n.id) > 0).length;

    const capa = crear("div", { class: "capa", onclick: (ev) => { if (ev.target === capa) capa.remove(); } });
    const d = crear("div", { class: "dialogo", role: "dialog", "aria-modal": "true", "aria-labelledby": "titulo-progreso" });
    d.append(crear("h2", { id: "titulo-progreso", text: "Mi progreso" }));
    d.append(crear("p", { class: "sub", text: "Se guarda solo en este navegador. Exporta una copia de vez en cuando para no perderla." }));
    const cifras = crear("div", { class: "cifras" });
    for (const t of ["autor", "obra", "concepto", "tesis"]) {
      cifras.append(crear("div", {}, [crear("b", { text: `${porTipo.get(t) || 0}` }), crear("span", { text: `de ${totalTipo.get(t) || 0} ${PLURAL[t] || t}` })]));
    }
    cifras.append(crear("div", {}, [crear("b", { text: `${anecdotas}` }), crear("span", { text: `de ${conAnecdotas.length} cajas de anécdotas` })]));
    d.append(cifras);

    d.append(crear("h3", { text: "Épocas" }));
    const ul = crear("ul", { class: "niveles" });
    const epocas = [...E.nodos.values()].filter((n) => n.tipo === "contexto").sort((a, b) => a.horquilla.inicio - b.horquilla.inicio);
    for (const ctx of epocas) {
      const s = estadoNivel(ctx);
      const estado = s.superado ? "superada" : s.explorado ? "explorada" : s.total === 0 ? "sin autores todavía" : `${s.vistos} de ${s.total} ${s.total === 1 ? "autor" : "autores"}`;
      ul.append(crear("li", {}, [
        crear("button", { class: "e", text: ctx.nombre, onclick: () => { capa.remove(); abrirFicha(ctx.id); } }),
        crear("span", { class: `estado ${s.explorado ? "explorado" : ""}`, text: estado }),
      ]));
    }
    d.append(ul);

    if (p.recorrido.length) {
      d.append(crear("h3", { text: "Últimos pasos" }));
      const pasos = p.recorrido.slice(-12).reverse().map((paso) => paso.id.split(":")[1]).filter((i) => E.nodos.has(i));
      d.append(crear("div", { class: "chips" }, pasos.map((i) => crear("button", { class: "boton", text: E.nodos.get(i).nombre, onclick: () => { capa.remove(); abrirFicha(i); } }))));
    }

    d.append(crear("h3", { text: "Copia de seguridad" }));
    const area = crear("textarea", { id: "progreso-texto", "aria-label": "Progreso en formato de texto", spellcheck: "false" });
    const mensaje = crear("span", { class: "mensaje", role: "status" });
    const exportar = crear("button", {
      class: "boton", text: "Copiar mi progreso",
      onclick: async () => {
        area.value = JSON.stringify(leerProgreso(), null, 1);
        try { await navigator.clipboard.writeText(area.value); mensaje.textContent = "Copiado. Guárdalo en un archivo de texto."; }
        catch (e) { area.select(); mensaje.textContent = "Selecciona el texto y cópialo."; }
      },
    });
    const descargar = crear("button", {
      class: "boton", text: "Descargar archivo",
      onclick: () => {
        const blob = new Blob([JSON.stringify(leerProgreso(), null, 1)], { type: "application/json" });
        const a = crear("a", { href: URL.createObjectURL(blob), download: "atlas-progreso.json" });
        document.body.append(a); a.click(); a.remove();
        mensaje.textContent = "Si no se descarga nada, usa «Copiar mi progreso».";
      },
    });
    const archivo = crear("input", { type: "file", id: "progreso-archivo", accept: ".json,application/json", hidden: true });
    archivo.addEventListener("change", async () => {
      const f = archivo.files[0];
      if (f) importar(await f.text(), mensaje);
    });
    const importarTexto = crear("button", { class: "boton", text: "Importar el texto pegado", onclick: () => importar(area.value, mensaje) });
    const importarArchivo = crear("button", { class: "boton", text: "Importar un archivo", onclick: () => archivo.click() });
    d.append(crear("p", { class: "sub", text: "Para seguir en otro dispositivo, copia o descarga tu progreso aquí y pégalo o impórtalo allí." }));
    d.append(area, crear("div", { class: "acciones" }, [exportar, descargar, importarTexto, importarArchivo, archivo, mensaje]));
    d.append(crear("div", { class: "acciones" }, [crear("button", { class: "boton", text: "Cerrar", onclick: () => capa.remove() })]));
    capa.append(d);
    raiz.append(capa);
  }
  function importar(texto, mensaje) {
    try {
      const nuevo = JSON.parse(texto);
      if (nuevo.formato !== "atlas-progreso" || typeof nuevo.visitas !== "object") throw new Error("formato");
      memoria = Object.assign(progresoVacio(), nuevo);
      guardarProgreso();
      mensaje.textContent = `Importado: ${Object.keys(memoria.visitas).length} fichas visitadas.`;
      dibujar();
    } catch (e) {
      mensaje.textContent = "Ese texto no es un progreso del Atlas. Comprueba que lo has copiado entero.";
    }
  }

  function avisoInicial() {
    let visto = false;
    try { visto = localStorage.getItem("atlas-aviso-visto") === "1"; } catch (e) { /* sin almacenamiento */ }
    if (visto) return;
    const caja = crear("div", { class: "aviso", role: "note" }, [
      crear("p", { text: "Tu recorrido se guarda solo en este navegador y en este dispositivo. Si usas una ventana privada o borras los datos del navegador, se pierde. Desde «Mi progreso» puedes copiarlo para guardarlo o seguir en otro dispositivo." }),
      crear("button", {
        class: "boton", text: "Entendido",
        onclick: () => { try { localStorage.setItem("atlas-aviso-visto", "1"); } catch (e) { /* nada */ } caja.remove(); },
      }),
    ]);
    escenario.append(caja);
  }

  function desdeHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && E.nodos.has(id) && id !== E.ficha) {
      const n = E.nodos.get(id);
      if (n.tipo === "pregunta" && hayPreguntas()) { irAPregunta(id); return; }
      E.vista = extension(n.fechas) ? E.vista : "libre";
      E.centro = id;
      E.modoRed = "centro";
      abrirFicha(id, null);
      cambiarVista(E.vista);
    }
  }

  // ------------------------------------------------------------------ arranque
  (async function arrancar() {
    raiz.innerHTML = '<div class="cargando">Abriendo el atlas…</div>';
    try {
      await cargar();
    } catch (e) {
      raiz.innerHTML = `<div class="cargando">No se pudieron cargar los datos del atlas. ${e.message}</div>`;
      return;
    }
    document.title = E.atlas.nombre || document.title;
    aplicarAtlas();
    montar();
    dibujar();
    avisoInicial();
    desdeHash();
  })();
})();
