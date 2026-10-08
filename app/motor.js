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
    vista: "cronologica", centro: null, ficha: null, anterior: null,
    verObras: false, certezas: new Set(["D", "P", "C", "L"]),
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
    return `${a} d. C.`;
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

    const bCrono = crear("button", { "aria-pressed": "true", text: "Línea del tiempo", onclick: () => cambiarVista("cronologica") });
    const bRed = crear("button", { "aria-pressed": "false", text: "Red", onclick: () => cambiarVista("libre") });
    const vistas = crear("div", { class: "vistas", role: "group", "aria-label": "Punto de vista" }, [bCrono, bRed]);
    const azar = crear("button", { class: "boton azar", title: "Llévame a algún sitio", onclick: llevame }, [crear("span", { class: "largo", text: "Llévame a algún sitio" }), crear("span", { class: "corto", text: "Al azar" })]);
    const progreso = crear("button", { class: "boton", text: "Mi progreso", onclick: abrirProgreso });

    const barra = crear("header", { class: "barra" }, [marca, buscador, vistas, azar, progreso]);
    escenario = crear("main", { class: "escenario" });
    raiz.append(barra, escenario);
    svg = d3.select(escenario).append("svg").attr("role", "img").attr("aria-label", "Mapa del atlas");
    window.addEventListener("resize", () => dibujar());
    window.addEventListener("hashchange", desdeHash);
  }

  function cambiarVista(v, centro) {
    E.vista = v;
    if (centro) E.centro = centro;
    raiz.querySelectorAll(".vistas button").forEach((b, i) =>
      b.setAttribute("aria-pressed", String((i === 0) === (v === "cronologica"))));
    dibujar();
  }
  function dibujar() {
    svg.selectAll("*").remove();
    escenario.querySelectorAll(".controles").forEach((c) => c.remove());
    if (E.vista === "cronologica") dibujarCronologica();
    else dibujarRed();
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
    function empaquetar() {
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
          const px0 = Math.max(x(d.ext.a), margenIzq + 6);
          const px1 = Math.max(x(d.ext.b), px0 + 12 + d.n.nombre.length * 6.8);
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
        g.each(function (d) {
          for (const alt of (d.n.fechas && d.n.fechas.alternativas) || []) {
            const ea = extension(alt);
            if (ea && ea.a >= x0.domain()[0]) d3.select(this).append("rect").datum(Object.assign({ ea, alt }, {})).attr("class", "fantasma")
              .append("title").text(`${alt.etiqueta}: ${textoFechas(alt)}`);
          }
        });
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
      gi.each(function (d) {
        d3.select(this).selectAll("rect.fantasma").attr("x", (f) => x(f.ea.a)).attr("y", yc(d) - 2).attr("height", alto_(d) + 4).attr("rx", 3)
          .attr("width", (f) => Math.max(2, x(f.ea.b) - x(f.ea.a)));
      });
      // El nombre se queda a la vista aunque el comienzo de la barra salga por la izquierda.
      gi.select("text").attr("x", (d) => Math.max(x(d.ext.a), margenIzq + 6)).attr("y", (d) => d.yy + ty - 0.5)
        .attr("opacity", (d) => (x(d.ext.b) < margenIzq + 6 ? 0 : 1));

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
      })
      .on("end", () => { empaquetar(); ty = clampY(ty); posicionar(); });

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
    empaquetar();
    ty = clampY(ty);
    // La rueda desplaza (arriba y abajo, y a los lados en los paneles táctiles); con Ctrl, o pellizcando, acerca el tiempo.
    zoom.filter((ev) => (ev.type === "wheel" ? ev.ctrlKey : !ev.button));
    svg.call(zoom).on("dblclick.zoom", null);
    svg.on("wheel.desplazar", (ev) => {
      if (ev.ctrlKey) return;
      ev.preventDefault();
      const kActual = d3.zoomTransform(svg.node()).k;
      svg.call(zoom.translateBy, -ev.deltaX / kActual, -ev.deltaY / kActual);
    }, { passive: false });
    svg.call(zoom.transform, d3.zoomIdentity.translate(margenIzq + 10 - k * x0(inicio[0]), ty).scale(k));
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
  const FORMA = {
    autor: d3.symbolCircle, obra: d3.symbolSquare, concepto: d3.symbolDiamond, tesis: d3.symbolTriangle,
    escuela: d3.symbolWye, pregunta: d3.symbolStar, experimento: d3.symbolCross,
  };
  function dibujarRed() {
    const ancho = escenario.clientWidth, alto = escenario.clientHeight;
    const anchoUtil = fichaEl && !fichaEl.hidden && ancho > 720 ? ancho - fichaEl.offsetWidth : ancho;
    if (!E.centro || !E.nodos.has(E.centro)) E.centro = "autor.socrates";
    if (!E.nodos.has(E.centro)) E.centro = [...E.nodos.keys()].find((k) => k.startsWith("autor."));
    const c = E.centro;

    const rels = [...(E.salen.get(c) || []), ...(E.entran.get(c) || [])].filter((r) => E.certezas.has(r.certeza));
    const ids = new Set([c]);
    rels.forEach((r) => { ids.add(r.origen); ids.add(r.destino); });
    const nodos = [...ids].map((id) => ({ id, n: E.nodos.get(id) }));
    const porId = new Map(nodos.map((d) => [d.id, d]));
    const enlaces = rels.map((r) => ({ r, source: porId.get(r.origen), target: porId.get(r.destino) }));
    const central = porId.get(c);
    central.fx = anchoUtil / 2; central.fy = alto / 2;

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.3, 4]).on("zoom", (ev) => g.attr("transform", ev.transform));
    svg.call(zoom).on("dblclick.zoom", null);

    const radio = Math.min(anchoUtil, alto) * 0.36;
    const muchos = nodos.length > 26;
    const sim = d3.forceSimulation(nodos)
      .force("enlace", d3.forceLink(enlaces).distance(muchos ? radio * 0.95 : radio).strength(0.6))
      .force("carga", d3.forceManyBody().strength(muchos ? -260 : -420))
      .force("choque", d3.forceCollide().radius(muchos ? 34 : 46))
      .force("x", d3.forceX(anchoUtil / 2).strength(0.03))
      .force("y", d3.forceY(alto / 2).strength(0.05))
      .stop();
    for (let i = 0; i < 260; i++) sim.tick();

    const aristas = g.append("g").selectAll("line").data(enlaces).join("line")
      .attr("class", (d) => `arista c-${d.r.certeza} ${d.r.tipo === "paralelo_a" ? "paralelo" : ""}`)
      .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
    aristas.append("title").text((d) => leerRelacion(d.r, c).frase);

    if (!muchos) {
      g.append("g").selectAll("text").data(enlaces).join("text").attr("class", "arista-texto")
        .attr("x", (d) => (d.source.x + d.target.x) / 2).attr("y", (d) => (d.source.y + d.target.y) / 2)
        .attr("text-anchor", "middle").text((d) => leerRelacion(d.r, c).etiqueta);
    }

    const nodosG = g.append("g").selectAll("g").data(nodos).join("g")
      .attr("class", (d) => `nodo v${nivelNiebla(d.id)} ${d.id === c ? "centro" : ""}`)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("tabindex", 0).attr("role", "button").attr("aria-label", (d) => d.n.nombre)
      .on("click", (ev, d) => irA(d.id, c))
      .on("keydown", (ev, d) => { if (ev.key === "Enter") irA(d.id, c); });
    nodosG.append("path").attr("d", (d) => d3.symbol(FORMA[d.n.tipo] || d3.symbolCircle, d.id === c ? 420 : 170)());
    nodosG.append("text").attr("y", (d) => (d.id === c ? 30 : 22)).attr("text-anchor", "middle").text((d) => d.n.nombre);
    nodosG.append("title").text((d) => `${ETIQUETA_TIPO[d.n.tipo] || d.n.tipo}: ${d.n.nombre}`);

    function irA(id, desde) {
      E.centro = id;
      abrirFicha(id, desde);
    }

    const certezas = E.base.certezas;
    controles([
      ...Object.entries(certezas).map(([k, v]) => crear("button", {
        class: "chip", "aria-pressed": String(E.certezas.has(k)), text: v,
        title: `Mostrar u ocultar las relaciones con certeza «${v}»`,
        onclick: () => { E.certezas.has(k) ? E.certezas.delete(k) : E.certezas.add(k); dibujar(); },
      })),
      leyendaNiebla(),
    ]);
    if (rels.length === 0) {
      g.append("text").attr("x", anchoUtil / 2).attr("y", alto / 2 + 60).attr("text-anchor", "middle")
        .attr("class", "arista-texto").text("Este nodo no tiene relaciones con los filtros elegidos.");
    }
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
  function leyendaNiebla() {
    // «Cómo leer el mapa»: la niebla, y en la línea del tiempo, qué significa cada trazo.
    const cont = crear("div", { class: "leyenda" });
    const panel = crear("div", { class: "leyenda-panel", hidden: true, id: "leyenda-panel" });
    const muestra = (svgInterior) => { const sp = crear("span", { class: "muestra" }); sp.innerHTML = `<svg width="46" height="12" aria-hidden="true">${svgInterior}</svg>`; return sp; };
    const fila = (m, texto) => crear("li", {}, [m, document.createTextNode(texto)]);
    const niebla = crear("ul", {}, [
      fila(muestra('<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-v0"/>'), "Sin explorar"),
      fila(muestra('<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-v1"/>'), "Visitado una vez"),
      fila(muestra('<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-v2"/>'), "De 2 a 4 visitas"),
      fila(muestra('<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-v3"/>'), "5 visitas o más"),
    ]);
    panel.append(crear("h4", { text: "La niebla: lo explorado se enciende" }), niebla);
    if (E.vista === "cronologica") {
      panel.append(crear("h4", { text: "Las fechas" }), crear("ul", {}, [
        fila(muestra('<rect x="2" y="5" width="42" height="2" class="m-v2"/><rect x="14" y="2" width="20" height="7" rx="3.5" class="m-v2"/>'),
          "Barra gruesa: los años seguros. Línea fina: el margen de duda sobre el nacimiento o la muerte."),
        fila(muestra('<rect x="2" y="2" width="42" height="7" rx="3.5" class="m-dudosa"/>'), "Borde discontinuo: su existencia histórica es dudosa o legendaria."),
        fila(muestra('<rect x="2" y="1" width="42" height="10" rx="3" class="m-fantasma"/>'), "Punteado: otra cronología, como la tradicional. Pasa el ratón por encima para ver cuál."),
      ]));
      const cfg = configCarriles();
      if (cfg.secundarios.length) {
        panel.append(crear("p", { text: `${cfg.secundarios.map((c) => etiquetaCarril(c, cfg)).join(", ")}: ${cfg.rotuloSecundarios || "carril secundario"}. Va en un carril más discreto porque son sabidurías que preceden a la filosofía, no filosofía en sentido estricto.` }));
      }
    }
    if (E.vista === "libre") {
      panel.append(crear("h4", { text: "Las relaciones" }), crear("ul", {}, [
        fila(muestra('<line x1="2" y1="6" x2="44" y2="6" class="arista"/>'), "Línea continua: documentada."),
        fila(muestra('<line x1="2" y1="6" x2="44" y2="6" class="arista c-P"/>'), "Rayas: probable."),
        fila(muestra('<line x1="2" y1="6" x2="44" y2="6" class="arista c-C"/>'), "Puntos: conjetural."),
        fila(muestra('<line x1="2" y1="6" x2="44" y2="6" class="arista c-L"/>'), "Puntos sueltos: legendaria."),
        fila(muestra('<line x1="2" y1="6" x2="44" y2="6" class="arista paralelo"/>'), "Azul: paralelo entre tradiciones, sin influencia conocida."),
      ]));
      panel.append(crear("p", { text: "Forma de cada nodo: círculo, autor; cuadrado, obra; rombo, concepto; triángulo, tesis." }));
    }
    const boton = crear("button", {
      class: "chip", "aria-expanded": "false", "aria-controls": "leyenda-panel", text: "Cómo leer el mapa",
      onclick: () => { panel.hidden = !panel.hidden; boton.setAttribute("aria-expanded", String(!panel.hidden)); },
    });
    cont.append(panel, boton);
    return cont;
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
          if (d.r.certeza !== "D") li.append(crear("span", { class: "marca-certeza", text: E.base.certezas[d.r.certeza] }));
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
      fichaEl.append(crear("h3", { text: n.tipo === "contexto" ? "En esta época" : n.tipo === "escuela" ? "Pertenecen a esta escuela" : "Nodos de esta temática" }));
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
    if (rels.length) acciones.push(crear("button", { class: "boton", text: "Ver en la red", onclick: () => { recoger(); E.centro = id; cambiarVista("libre"); } }));
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
      if (E.vista === "cronologica" && !extension(n.fechas)) E.vista = "libre";
      E.centro = n.id;
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
    if (!extension(elegido.fechas)) E.vista = "libre";
    E.centro = elegido.id;
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
      mensaje.textContent = `Importado: ${Object.keys(memoria.visitas).length} nodos visitados.`;
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
      if (!extension(n.fechas)) E.vista = "libre";
      E.centro = id;
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
    montar();
    dibujar();
    avisoInicial();
    desdeHash();
  })();
})();
