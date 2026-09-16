/* Inmobiliaria A Ponte · "Territorio"
   Todo el movimiento es el de un viaje por el mapa: la ruta se dibuja de
   Malpica a Sanxenxo, los pines van apareciendo a su paso, la cabecera dice en
   qué municipio va la cámara y, en la sección de zonas, el mapa se acerca a
   cada población mientras se lee.
   Sin canvas y sin filtros por frame: SVG, transform y opacidad. */

(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finoPuntero = window.matchMedia("(pointer: fine)").matches;

  /* orden de la ruta; el mismo que dibuja scripts/generate_map.py */
  var MUNIS = [
    { slug: "malpica", nombre: "Malpica", nota: "costa" },
    { slug: "laracha", nombre: "A Laracha", nota: "interior" },
    { slug: "carballo", nombre: "Carballo", nota: "sede" },
    { slug: "coristanco", nombre: "Coristanco", nota: "interior" },
    { slug: "ponteceso", nombre: "Ponteceso", nota: "costa" },
    { slug: "zas", nombre: "Zas", nota: "interior" },
    { slug: "santa-comba", nombre: "Santa Comba", nota: "interior" },
    { slug: "sanxenxo", nombre: "Sanxenxo", nota: "rías baixas" }
  ];
  var indiceDe = {};
  MUNIS.forEach(function (m, i) { indiceDe[m.slug] = i; });

  /* ================================================================
     1 · lo que funciona siempre, con GSAP o sin él
     ================================================================ */

  function iniciarBasico(motor) {

    /* --- aviso de cookies --- */
    var banner = document.querySelector(".cookie-banner");
    var CLAVE = "aponte-cookie-ack";
    var visto = false;
    try { visto = localStorage.getItem(CLAVE) === "1"; } catch (e) { visto = false; }

    if (banner && !visto) banner.hidden = false;
    if (banner) {
      banner.querySelector(".cookie-ack").addEventListener("click", function () {
        banner.hidden = true;
        try { localStorage.setItem(CLAVE, "1"); } catch (e) { /* modo privado */ }
      });
    }

    /* --- año del pie --- */
    var anio = document.querySelector("[data-anio]");
    if (anio) anio.textContent = String(new Date().getFullYear());

    /* --- diálogos --- */
    document.querySelectorAll("[data-dialog]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dlg = document.getElementById(btn.dataset.dialog);
        if (dlg && dlg.showModal) dlg.showModal();
      });
    });
    document.querySelectorAll("[data-cerrar]").forEach(function (btn) {
      btn.addEventListener("click", function () { btn.closest("dialog").close(); });
    });

    /* --- el día de hoy, resaltado en el horario --- */
    var hoy = document.querySelector('.horario tr[data-dia="' + new Date().getDay() + '"]');
    if (hoy) hoy.classList.add("hoy");

    /* --- mapa de Google: el iframe solo existe si lo pide el visitante --- */
    var mapBtn = document.querySelector("[data-map]");
    if (mapBtn) {
      mapBtn.addEventListener("click", function () {
        var caja = mapBtn.closest("[data-map-caja]");
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.google.com/maps?q=" +
          encodeURIComponent("Inmobiliaria A Ponte, Rúa Perú, 2, 15100 Carballo, A Coruña") +
          "&output=embed";
        iframe.loading = "lazy";
        iframe.title = "Mapa de la ubicación de la oficina en Carballo";
        iframe.referrerPolicy = "no-referrer-when-downgrade";
        caja.innerHTML = "";
        caja.style.padding = "0";
        caja.appendChild(iframe);
      });
    }

    /* --- menú móvil --- */
    var menuBtn = document.querySelector(".menu-btn");
    var menu = document.getElementById("menu-movil");
    if (menuBtn && menu) {
      var abrir = function (si) {
        menu.hidden = !si;
        menuBtn.setAttribute("aria-expanded", String(si));
        menuBtn.setAttribute("aria-label", si ? "Cerrar menú" : "Abrir menú");
        document.body.style.overflow = si ? "hidden" : "";
        if (motor) { si ? motor.stop() : motor.start(); }
      };
      menuBtn.addEventListener("click", function () {
        abrir(menuBtn.getAttribute("aria-expanded") !== "true");
      });
      menu.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { abrir(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !menu.hidden) abrir(false);
      });
    }

    /* --- anclas --- */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === "#" || a.classList.contains("skip")) return;
      a.addEventListener("click", function (e) {
        if (!document.querySelector(href)) return;
        e.preventDefault();
        irA(href);
      });
    });

    /* --- formulario: valida, pero todavía no tiene a dónde enviar --- */
    var form = document.querySelector("[data-form]");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var dlg = document.getElementById("dlg-enviado");
        if (dlg && dlg.showModal) dlg.showModal();
      });
    }
  }

  function alturaCabecera() {
    var top = document.querySelector(".top");
    return top ? top.offsetHeight : 94;
  }

  var lenis = null;

  function irA(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - alturaCabecera() + 1;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  /* ================================================================
     2 · la barra de ruta: en qué municipio va la cámara
     ================================================================ */

  var muniActual = null;

  function marcarMuni(slug) {
    if (slug === muniActual || indiceDe[slug] === undefined) return;
    muniActual = slug;
    var i = indiceDe[slug];

    var nombre = document.querySelector("[data-ruta-nombre]");
    var nota = document.querySelector("[data-ruta-nota]");
    var indice = document.querySelector("[data-ruta-indice]");
    if (nombre) nombre.textContent = MUNIS[i].nombre;
    if (nota) nota.textContent = MUNIS[i].nota;
    if (indice) indice.textContent = String(i + 1);

    document.querySelectorAll("[data-ruta-marcas] li").forEach(function (li, j) {
      li.classList.toggle("pasado", j < i);
      li.classList.toggle("activo", j === i);
    });

    document.querySelectorAll(".portada-mapa .pin").forEach(function (p) {
      p.classList.toggle("activo", p.dataset.muni === slug);
    });
  }

  /* ================================================================
     3 · inmuebles: hoja de cálculo del cliente, con ejemplos de respaldo
     ================================================================ */

  var TODAS = "__todas__";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* un enlace normal de Google Drive no se puede poner en un <img>; este sí */
  function urlFoto(u) {
    u = String(u || "").trim();
    var m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([-\w]{10,})/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1200";
    return u;
  }

  function normalizarFilas(datos) {
    var filas = datos;
    if (!Array.isArray(filas)) {
      filas = null;
      ["datos", "inmuebles", "rows", "records", "values", "data", "Hoja1", "Sheet1"].forEach(function (k) {
        if (!filas && datos && Array.isArray(datos[k])) filas = datos[k];
      });
    }
    if (!Array.isArray(filas)) return [];

    return filas.map(function (f) {
      var o = {};
      Object.keys(f || {}).forEach(function (k) {
        o[String(k).trim().toLowerCase()] = typeof f[k] === "string" ? f[k].trim() : f[k];
      });
      return o;
    }).filter(function (o) {
      var estado = String(o.estado || "").toLowerCase();
      if (estado === "oculto" || estado === "no" || estado === "borrador") return false;
      return o.titulo || o.poblacion || o.precio;
    });
  }

  function tarjeta(inm) {
    var ej = !!inm.ejemplo;
    var fotos = String(inm.fotos || "").split(",").map(urlFoto).filter(Boolean);
    var tipo = String(inm.tipo || "").toLowerCase().indexOf("alquil") === 0 ? "En alquiler" : "En venta";
    var marca = ej ? ' title="[EJEMPLO — SUSTITUIR POR INMUEBLE REAL]"' : "";
    var cl = ej ? ' class="dato-ej"' : "";

    var ficha = [];
    if (inm.metros) ficha.push(esc(inm.metros) + " m²");
    if (inm.habitaciones) ficha.push(esc(inm.habitaciones) + " hab.");
    if (inm.banos) ficha.push(esc(inm.banos) + " baños");
    if (fotos.length > 1) ficha.push(fotos.length + " fotos");

    return '' +
      '<article class="inm-tarjeta' + (ej ? " es-ejemplo" : "") + '" data-poblacion="' + esc(inm.poblacion) + '">' +
        (ej ? '<p class="inm-cinta">Ejemplo — sustituir por inmueble real</p>' : "") +
        '<div class="inm-foto">' +
          (fotos[0]
            ? '<img src="' + esc(fotos[0]) + '" alt="' + esc(inm.titulo || "Inmueble") + '" loading="lazy" decoding="async">'
            : '<span class="sin-foto">Sin fotografía</span>') +
          '<p class="inm-tipo">' + tipo + '</p>' +
        '</div>' +
        '<div class="inm-cuerpo">' +
          '<p class="inm-poblacion"><span' + cl + marca + '>' + esc(inm.poblacion || "Sin población") + '</span></p>' +
          '<h3><span' + cl + marca + '>' + esc(inm.titulo || "Sin título") + '</span></h3>' +
          '<p class="inm-precio"><span' + cl + marca + '>' + esc(inm.precio || "Precio a consultar") + '</span></p>' +
          (ficha.length ? '<p class="inm-metros"><span' + cl + marca + '>' + ficha.join(" · ") + '</span></p>' : "") +
          '<div class="inm-extra"><div>' +
            (inm.descripcion ? '<p><span' + cl + marca + '>' + esc(inm.descripcion) + '</span></p>' : "") +
          '</div></div>' +
          '<p class="inm-pie">' +
            '<span class="inm-ref"' + marca + '>' + esc(inm.referencia || "") + '</span>' +
            '<a class="inm-consultar" href="#contacto">Consultar</a>' +
          '</p>' +
        '</div>' +
        (ej ? '<span class="sr-solo">Todos los datos de esta ficha son de ejemplo y hay que sustituirlos por los de un inmueble real.</span>' : "") +
      '</article>';
  }

  function montarInmuebles() {
    var cfg = window.A_PONTE_INMUEBLES || {};
    var caja = document.querySelector("[data-inmuebles]");
    var barra = document.querySelector("[data-filtros]");
    var fuente = document.querySelector("[data-fuente]");
    if (!caja) return;

    var CLAVE_FILTRO = "aponte-filtro";
    var filtro = TODAS;
    try { filtro = localStorage.getItem(CLAVE_FILTRO) || TODAS; } catch (e) { /* modo privado */ }

    function pintar(lista, origen) {
      if (!lista.length) return;

      caja.innerHTML = lista.map(tarjeta).join("");

      /* el filtro se construye con las poblaciones que haya de verdad, en el
         orden de la ruta; si la hoja trae una nueva, se añade al final */
      var cuenta = {};
      lista.forEach(function (i) {
        var p = String(i.poblacion || "").trim() || "Sin población";
        cuenta[p] = (cuenta[p] || 0) + 1;
      });
      var orden = Object.keys(cuenta).sort(function (a, b) {
        var ia = MUNIS.findIndex(function (m) { return m.nombre === a; });
        var ib = MUNIS.findIndex(function (m) { return m.nombre === b; });
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

      if (barra) {
        barra.querySelectorAll(".filtro").forEach(function (b) { b.remove(); });
        var botones = [{ v: TODAS, t: "Todas", n: lista.length }].concat(
          orden.map(function (p) { return { v: p, t: p, n: cuenta[p] }; }));
        if (!cuenta[filtro] && filtro !== TODAS) filtro = TODAS;
        botones.forEach(function (b) {
          var el = document.createElement("button");
          el.type = "button";
          el.className = "filtro";
          el.dataset.valor = b.v;
          el.setAttribute("aria-pressed", String(b.v === filtro));
          el.innerHTML = esc(b.t) + ' <span class="cuenta">' + b.n + "</span>";
          el.addEventListener("click", function () { aplicar(b.v); });
          barra.appendChild(el);
        });
      }

      if (fuente) {
        fuente.hidden = false;
        fuente.innerHTML = origen === "hoja"
          ? "<b>" + lista.length + " inmuebles</b> · datos en vivo desde la hoja de la agencia"
          : "<b>" + lista.length + " inmuebles de ejemplo</b> · la hoja de la agencia todavía no está conectada";
      }

      aplicar(filtro, true);
    }

    function aplicar(valor, silencioso) {
      filtro = valor;
      if (!silencioso) {
        try { localStorage.setItem(CLAVE_FILTRO, valor); } catch (e) { /* modo privado */ }
      }
      if (barra) {
        barra.querySelectorAll(".filtro").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.dataset.valor === valor));
        });
      }
      var visibles = 0;
      caja.querySelectorAll(".inm-tarjeta").forEach(function (t) {
        var ok = valor === TODAS || t.dataset.poblacion === valor;
        t.hidden = !ok;
        if (ok) visibles++;
      });
      var vacio = caja.querySelector(".inm-vacio");
      if (!visibles && !vacio) {
        caja.insertAdjacentHTML("beforeend",
          '<p class="inm-vacio">Ahora mismo no hay nada publicado en esa población. ' +
          'Dígannos qué busca y lo buscamos: <a href="#buscamos" style="color:var(--naranja-txt)">buscamos por usted</a>.</p>');
      } else if (visibles && vacio) {
        vacio.remove();
      }
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    /* 1 · se pintan ya los ejemplos: la sección nunca aparece vacía ni rota */
    pintar(cfg.ejemplos || [], "ejemplos");

    /* 2 · y si hay hoja, se sustituyen en cuanto conteste */
    var url = cfg.hoja && cfg.hoja.url;
    if (!url) return;

    var corte = ((cfg.hoja && cfg.hoja.corteSegundos) || 7) * 1000;
    var ctrl = window.AbortController ? new AbortController() : null;
    var reloj = setTimeout(function () { if (ctrl) ctrl.abort(); }, corte);

    fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
      .then(function (j) {
        var filas = normalizarFilas(j);
        if (filas.length) pintar(filas, "hoja");
      })
      .catch(function (e) {
        /* nunca se le enseña un error al visitante: se queda con los ejemplos */
        console.warn("[A Ponte] la hoja de inmuebles no contestó; se mantienen los ejemplos.", e);
      })
      .then(function () { clearTimeout(reloj); });
  }

  /* ================================================================
     4 · estrellas de la valoración (3,5 sobre 5)
     ================================================================ */

  function montarEstrellas() {
    var caja = document.querySelector("[data-estrellas]");
    if (!caja) return;
    var nota = parseFloat(caja.dataset.estrellas) || 0;
    var d = "M12 2.4l2.9 6.1 6.7.9-4.9 4.6 1.2 6.6L12 17.5 6.1 20.6l1.2-6.6L2.4 9.4l6.7-.9z";
    var html = "";
    for (var i = 0; i < 5; i++) {
      var p = Math.max(0, Math.min(1, nota - i));
      html += '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path class="fondo" d="' + d + '"/>' +
        (p > 0 ? '<path class="relleno" d="' + d + '" style="clip-path:inset(0 ' +
          ((1 - p) * 100).toFixed(0) + '% 0 0)"/>' : "") +
        "</svg>";
    }
    caja.innerHTML = html;
  }

  /* ================================================================
     5 · el visor de zonas: una copia del mapa que se acerca a cada pueblo
     ================================================================ */

  var visor = null;

  function montarVisor() {
    var caja = document.querySelector("[data-visor]");
    var mapa = document.querySelector(".portada-mapa .mapa");
    if (!caja || !mapa) return null;

    var copia = mapa.cloneNode(true);
    /* la copia es decorativa: fuera el título y los id, que no se repitan */
    copia.removeAttribute("aria-labelledby");
    copia.setAttribute("aria-hidden", "true");
    copia.setAttribute("preserveAspectRatio", "xMidYMid meet");
    var t = copia.querySelector("title");
    if (t) t.remove();
    copia.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
    copia.querySelectorAll(".pin").forEach(function (p) {
      p.removeAttribute("role");
      p.removeAttribute("tabindex");
      p.removeAttribute("aria-label");
    });
    caja.innerHTML = "";
    caja.appendChild(copia);

    var pines = {};
    copia.querySelectorAll(".pin").forEach(function (p) { pines[p.dataset.muni] = p; });

    return {
      svg: copia,
      ruta: copia.querySelector(".mapa-ruta"),
      pines: pines,
      nombre: document.querySelector("[data-visor-nombre]"),
      coord: document.querySelector("[data-visor-coord]")
    };
  }

  function encuadrar(slug, animado) {
    if (!visor) return;
    var pin = visor.pines[slug];
    if (!pin) return;
    var m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(pin.getAttribute("transform") || "");
    if (!m) return;
    var cx = parseFloat(m[1]), cy = parseFloat(m[2]);
    var lado = 560;
    /* el encuadre no se sale del lienzo del mapa: en Sanxenxo, pegado al borde
       este, se veria medio recuadro vacio */
    var mitad = lado / 2;
    cx = Math.min(Math.max(cx, mitad), 1600 - mitad);
    cy = Math.min(Math.max(cy, -60 + mitad), 840 - mitad);

    Object.keys(visor.pines).forEach(function (k) {
      visor.pines[k].classList.toggle("activo", k === slug);
    });

    var i = indiceDe[slug];
    var zona = document.querySelector('.zona[data-muni="' + slug + '"]');
    if (visor.nombre) visor.nombre.textContent = MUNIS[i].nombre;
    if (visor.coord && zona) visor.coord.textContent = zona.dataset.lat;

    /* la ruta del visor se dibuja hasta donde va la lectura: se usa el punto
       real del municipio sobre el trazado, con un minimo para que en la
       primera zona ya se vea de donde arranca */
    var t = Math.max(0.05, parseFloat(pin.dataset.t || "0"));
    var resto = Math.max(0, 1000 - 1000 * Math.min(1, t));

    if (!animado || reduce || !window.gsap) {
      visor.svg.setAttribute("viewBox", (cx - lado / 2) + " " + (cy - lado / 2) + " " + lado + " " + lado);
      if (visor.ruta) visor.ruta.style.strokeDashoffset = resto;
      return;
    }

    var vb = visor.svg.getAttribute("viewBox").split(/\s+/).map(Number);
    gsap.to({ x: vb[0], y: vb[1], w: vb[2] }, {
      x: cx - lado / 2, y: cy - lado / 2, w: lado,
      duration: 1, ease: "power3.inOut",
      onUpdate: function () {
        var s = this.targets()[0];
        visor.svg.setAttribute("viewBox", s.x.toFixed(1) + " " + s.y.toFixed(1) + " " + s.w.toFixed(1) + " " + s.w.toFixed(1));
      }
    });
    gsap.to(visor.ruta, { strokeDashoffset: resto, duration: 1, ease: "power2.out" });
  }

  /* ================================================================
     6 · texto partido en letras (respetando los tramos marcados)
     ================================================================ */

  function partir(el) {
    var original = el.cloneNode(true);
    var plano = el.cloneNode(true);
    Array.prototype.slice.call(plano.querySelectorAll("br")).forEach(function (br) {
      br.parentNode.replaceChild(document.createTextNode(" "), br);
    });
    var texto = plano.textContent.replace(/\s+/g, " ").trim();
    var chars = [];

    function meterTexto(txt, destino) {
      txt.split(/(\s+)/).forEach(function (trozo) {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) { destino.appendChild(document.createTextNode(" ")); return; }
        var pal = document.createElement("span");
        pal.className = "pal";
        trozo.split("").forEach(function (c) {
          var mask = document.createElement("span");
          mask.className = "ch-mask";
          var ch = document.createElement("span");
          ch.className = "ch";
          ch.textContent = c;
          mask.appendChild(ch);
          pal.appendChild(mask);
          chars.push(ch);
        });
        destino.appendChild(pal);
      });
    }

    function recorrer(origen, destino) {
      Array.prototype.slice.call(origen.childNodes).forEach(function (n) {
        if (n.nodeType === 3) { meterTexto(n.textContent, destino); return; }
        if (n.nodeType !== 1) return;
        if (n.tagName === "BR") { destino.appendChild(document.createElement("br")); return; }
        var copia = n.cloneNode(false);
        copia.textContent = "";
        destino.appendChild(copia);
        recorrer(n, copia);
      });
    }

    el.textContent = "";
    var lector = document.createElement("span");
    lector.className = "sr-solo";
    lector.textContent = texto;
    el.appendChild(lector);
    var visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    recorrer(original, visual);
    el.appendChild(visual);
    return chars;
  }

  /* ================================================================
     7 · arranque
     ================================================================ */

  montarInmuebles();
  montarEstrellas();
  visor = montarVisor();
  if (visor) encuadrar("malpica", false);

  /* pines de la portada: llevan al listado, ya filtrado por su población */
  document.querySelectorAll(".portada-mapa .pin").forEach(function (pin) {
    var slug = pin.dataset.muni;
    var ir = function () {
      var nombre = MUNIS[indiceDe[slug]].nombre;
      var btn = document.querySelector('.filtro[data-valor="' + nombre + '"]');
      if (btn) btn.click();
      irA("#inmuebles");
    };
    pin.addEventListener("click", ir);
    pin.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); }
    });
  });

  if (!window.gsap || !window.ScrollTrigger) {
    doc.classList.add("no-gsap");
    iniciarBasico(null);
    /* sin GSAP, la cabecera sigue diciendo dónde está el lector */
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting && e.target.dataset.muni) marcarMuni(e.target.dataset.muni);
        });
      }, { rootMargin: "-40% 0px -50% 0px" });
      document.querySelectorAll("[data-muni]").forEach(function (s) {
        if (s.tagName === "SECTION" || s.classList.contains("zona")) io.observe(s);
      });
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add("gsap");

  /* ---------- scroll suave ---------- */
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.13, wheelMultiplier: 0.9 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  iniciarBasico(lenis);

  function cuandoSePueda(fn) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { requestAnimationFrame(fn); });
    } else {
      requestAnimationFrame(fn);
    }
  }

  cuandoSePueda(function montar() {

    /* ---------- I · la portada: la ruta se dibuja y van saliendo los pines ---------- */

    (function () {
      var ruta = document.querySelector(".portada-mapa .mapa-ruta");
      var pines = Array.prototype.slice.call(document.querySelectorAll(".portada-mapa .pin"));
      var cartucho = document.querySelector(".portada-cartucho");
      var DUR = 2.6;

      var titulo = document.querySelector(".portada-h1[data-chars]");
      var chars = titulo ? partir(titulo) : [];

      if (reduce) {
        if (ruta) ruta.style.strokeDashoffset = 0;
        gsap.set(pines, { opacity: 1 });
        gsap.set(chars, { opacity: 1, yPercent: 0 });
        marcarMuni("malpica");
        return;
      }

      gsap.set(pines, { opacity: 0 });
      gsap.set(pines.map(function (p) { return p.querySelector(".pin-cuerpo"); }),
        { scale: 0, transformOrigin: "50% 75%" });
      gsap.set(chars, { yPercent: 118, opacity: 0 });

      var tl = gsap.timeline({ delay: 0.15 });

      tl.to(chars, { yPercent: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.012 }, 0);

      if (ruta) {
        tl.to(ruta, { strokeDashoffset: 0, duration: DUR, ease: "power1.inOut" }, 0.25);
      }

      pines.forEach(function (pin) {
        var t = parseFloat(pin.dataset.t || "0");
        var cuando = 0.25 + t * DUR;
        tl.to(pin, { opacity: 1, duration: 0.25 }, cuando);
        tl.to(pin.querySelector(".pin-cuerpo"),
          { scale: 1, duration: 0.62, ease: "back.out(3)" }, cuando);
      });

      if (cartucho) {
        tl.from(cartucho, { opacity: 0, y: 26, duration: 0.9, ease: "power3.out" }, 0);
      }
    })();

    /* ---------- II · la cámara avanza de municipio en municipio ----------
       No se usa un disparador por sección: con un salto de scroll (un ancla,
       la rueda a fondo, el buscador del navegador) una sección entra y sale
       en la misma actualización y el aviso nunca llega. Se mira en cada
       actualización qué parada cruza la línea de lectura. */

    var paradas = Array.prototype.slice
      .call(document.querySelectorAll("section[data-muni], .zona[data-muni]"))
      .map(function (el) { return { el: el, muni: el.dataset.muni, zona: el.classList.contains("zona") }; });

    var ultimoY = -9999;

    function evaluarCamara() {
      if (Math.abs(window.scrollY - ultimoY) < 6) return;
      ultimoY = window.scrollY;

      var linea = window.innerHeight * 0.45;
      var mejor = null, mejorD = Infinity;
      paradas.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        var d = (r.top <= linea && r.bottom >= linea)
          ? 0
          : Math.min(Math.abs(r.top - linea), Math.abs(r.bottom - linea));
        /* con empate manda la zona: es la que manda sobre el visor */
        if (d < mejorD || (d === mejorD && p.zona)) { mejorD = d; mejor = p; }
      });
      if (!mejor) return;

      document.querySelectorAll(".zona").forEach(function (z) {
        z.classList.toggle("activa", mejor.zona && z === mejor.el);
      });

      if (mejor.muni === muniActual) return;
      marcarMuni(mejor.muni);
      if (mejor.zona) encuadrar(mejor.muni, true);
    }

    ScrollTrigger.create({
      trigger: document.body, start: "top top", end: "bottom bottom",
      onUpdate: evaluarCamara, onRefresh: function () { ultimoY = -9999; evaluarCamara(); }
    });
    evaluarCamara();

    /* ---------- III · titulares y bloques que aparecen ---------- */

    document.querySelectorAll("[data-chars]").forEach(function (t) {
      if (t.classList.contains("portada-h1")) return;
      var chars = partir(t);
      if (reduce) { gsap.set(chars, { opacity: 1 }); return; }
      gsap.fromTo(chars, { yPercent: 115, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.75, ease: "power3.out", stagger: 0.011,
        scrollTrigger: { trigger: t, start: "top 82%" }
      });
    });

    document.querySelectorAll("[data-aparece]").forEach(function (el) {
      if (reduce) { gsap.set(el, { opacity: 1 }); return; }
      gsap.fromTo(el, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%" }
      });
    });

    /* ---------- IV · contadores ---------- */

    document.querySelectorAll("[data-contador]").forEach(function (el) {
      var fin = parseFloat(el.dataset.contador);
      var dec = parseInt(el.dataset.decimales || "0", 10);
      var pintar = function (v) {
        el.textContent = v.toFixed(dec).replace(".", ",");
      };
      if (reduce) { pintar(fin); return; }
      var estado = { v: 0 };
      pintar(0);
      ScrollTrigger.create({
        trigger: el, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(estado, {
            v: fin, duration: 1.5, ease: "power2.out",
            onUpdate: function () { pintar(estado.v); }
          });
        }
      });
    });

    /* ---------- V · la pila de servicios ---------- */

    if (!reduce) {
      var fichas = Array.prototype.slice.call(document.querySelectorAll(".serv-stack > li"));
      fichas.forEach(function (li, i) {
        if (i === fichas.length - 1) return;
        /* la ficha que sale se encoge, pero NO se transparenta: si bajara la
           opacidad se leeria a traves de ella la ficha de debajo */
        gsap.to(li.querySelector(".serv-ficha"), {
          scale: 0.945, ease: "none",
          scrollTrigger: {
            trigger: fichas[i + 1],
            start: "top 88%",
            end: "top 42%",
            scrub: true
          }
        });
      });
    }

    /* ---------- VI · banda de municipios ---------- */

    var pista = document.querySelector(".marquee-pista");
    if (pista && !reduce) {
      gsap.to(pista, { xPercent: -50, duration: 48, ease: "none", repeat: -1 });
    }

    /* ---------- VII · botones magnéticos ---------- */

    if (!reduce && finoPuntero) {
      document.querySelectorAll(".magnetico").forEach(function (btn) {
        var qx = gsap.quickTo(btn, "x", { duration: 0.45, ease: "power3.out" });
        var qy = gsap.quickTo(btn, "y", { duration: 0.45, ease: "power3.out" });
        btn.addEventListener("pointermove", function (e) {
          var r = btn.getBoundingClientRect();
          qx((e.clientX - (r.left + r.width / 2)) * 0.26);
          qy((e.clientY - (r.top + r.height / 2)) * 0.38);
        });
        btn.addEventListener("pointerleave", function () { qx(0); qy(0); });
      });
    }

    /* ---------- VIII · el enlace del menú que toca ---------- */

    document.querySelectorAll(".top-nav a").forEach(function (a) {
      var destino = document.querySelector(a.getAttribute("href"));
      if (!destino) return;
      ScrollTrigger.create({
        trigger: destino, start: "top 45%", end: "bottom 45%",
        onToggle: function (self) { a.classList.toggle("activo", self.isActive); }
      });
    });

    ScrollTrigger.refresh();
  });

  /* si la página cambia de alto (mapa de Google, filtros), se recalcula */
  if (window.ResizeObserver) {
    var alto = document.body.scrollHeight, espera = null;
    new ResizeObserver(function () {
      if (document.body.scrollHeight === alto) return;
      alto = document.body.scrollHeight;
      clearTimeout(espera);
      espera = setTimeout(function () { ScrollTrigger.refresh(); }, 160);
    }).observe(document.body);
  }
})();
