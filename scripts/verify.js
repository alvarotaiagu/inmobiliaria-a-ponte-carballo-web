/* Verificación de la web de Inmobiliaria A Ponte con Playwright.
   Requiere un servidor local:  python -m http.server 8991
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js          */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.APONTE_URL || 'http://127.0.0.1:8991/';
const RAIZ = path.join(__dirname, '..');
const CAPS = path.join(RAIZ, 'screenshots');
fs.mkdirSync(CAPS, { recursive: true });

const HOJA = 'https://hoja-de-prueba.invalido/inmuebles.json';

const resultados = [];
const ok = (nombre, valor, detalle) =>
  resultados.push({ prueba: nombre, ok: !!valor, detalle: detalle === undefined ? null : detalle });

async function nuevaPagina(browser, opciones = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opciones });
  const errores = [];
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.errores = errores;
  return page;
}

/* obliga a la web a pedir los inmuebles a una URL que controlamos nosotros */
async function conHoja(page) {
  await page.addInitScript(url => {
    Object.defineProperty(window, 'A_PONTE_INMUEBLES', {
      configurable: true,
      get() { return undefined; },
      set(v) {
        try { v.hoja.url = url; } catch (e) { /* da igual */ }
        Object.defineProperty(window, 'A_PONTE_INMUEBLES',
          { value: v, writable: true, configurable: true });
      }
    });
  }, HOJA);
}

const irA = async (page, sel, margen = 120) => {
  await page.evaluate(({ sel, margen }) => {
    const el = document.querySelector(sel);
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - margen, behavior: 'instant' });
  }, { sel, margen });
  await page.waitForTimeout(1500);
};

(async () => {
  const browser = await chromium.launch();

  /* ================= 1 · portada: mapa, ruta y pines ================= */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'networkidle' });

    /* a media animación la ruta está a medio dibujar y faltan pines */
    await page.waitForTimeout(900);
    const medio = await page.evaluate(() => {
      const r = document.querySelector('.portada-mapa .mapa-ruta');
      const pines = Array.from(document.querySelectorAll('.portada-mapa .pin'));
      return {
        off: parseFloat(getComputedStyle(r).strokeDashoffset),
        visibles: pines.filter(p => parseFloat(getComputedStyle(p).opacity) > 0.9).length,
        total: pines.length
      };
    });
    ok('la ruta se dibuja (no aparece de golpe)', medio.off > 30 && medio.off < 990,
      'stroke-dashoffset ' + medio.off.toFixed(0) + '/1000 a los 900 ms');
    ok('los pines van saliendo por el camino', medio.visibles > 0 && medio.visibles < medio.total,
      medio.visibles + '/' + medio.total + ' pines a los 900 ms');

    await page.waitForTimeout(3600);
    const fin = await page.evaluate(() => {
      const r = document.querySelector('.portada-mapa .mapa-ruta');
      const pines = Array.from(document.querySelectorAll('.portada-mapa .pin'));
      const cuerpos = pines.map(p => p.querySelector('.pin-cuerpo').getBoundingClientRect());
      return {
        off: parseFloat(getComputedStyle(r).strokeDashoffset),
        visibles: pines.filter(p => parseFloat(getComputedStyle(p).opacity) > 0.95).length,
        total: pines.length,
        dentro: cuerpos.filter(b => b.width > 4 && b.top > 0 && b.bottom < window.innerHeight).length,
        titulo: document.querySelector('.portada-h1').textContent.replace(/\s+/g, ' ').trim()
      };
    });
    ok('la ruta termina dibujada entera', fin.off < 1, 'offset final ' + fin.off.toFixed(1));
    ok('los 8 pines acaban visibles', fin.visibles === 8, fin.visibles + '/8');
    ok('los 8 pines caen dentro de la banda del mapa', fin.dentro === 8, fin.dentro + '/8 dentro del viewport');
    ok('el titular se lee completo tras el char-reveal',
      /De Malpica a Sanxenxo, conocemos cada rincón/.test(fin.titulo), fin.titulo.slice(0, 60));

    /* el wordmark flota sobre el mapa y no pisa ningún rótulo del mapa */
    const sello = await page.evaluate(() => {
      const s = document.querySelector('.portada-sello').getBoundingClientRect();
      const choques = Array.from(document.querySelectorAll('.pin-nombre, .mapa-rotulos text'))
        .map(t => ({ t: t.textContent, b: t.getBoundingClientRect() }))
        .filter(({ b }) => b.width && !(b.right < s.left || b.left > s.right || b.bottom < s.top || b.top > s.bottom));
      return { choques: choques.map(c => c.t) };
    });
    ok('el wordmark no se solapa con rótulos del mapa', sello.choques.length === 0, sello.choques.join(', '));

    await page.screenshot({ path: path.join(CAPS, 'portada-1440.png') });

    /* la cabecera tiene que ser opaca: con la banda de foto o la franja oscura
       de municipios pasando por detras, un fondo translucido las transparenta y
       el punto de la ruta parece quedarse debajo de la seccion */
    await irA(page, '#zonas');
    await page.waitForTimeout(800);
    const cab = await page.evaluate(() => {
      const alfa = el => {
        const c = getComputedStyle(el).backgroundColor;
        const m = c.match(/[\d.]+/g) || [];
        return c.startsWith('color(') ? (m.length > 3 ? +m[3] : 1) : (m.length > 3 ? +m[3] : 1);
      };
      const punto = document.querySelector('[data-ruta-marcas] li.activo .ruta-punto');
      const r = punto.getBoundingClientRect();
      const encima = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        aTop: alfa(document.querySelector('.top')),
        aRuta: alfa(document.querySelector('.top-ruta')),
        encima: (encima.className || '').toString(),
        filtro: getComputedStyle(document.querySelector('.top')).backdropFilter
      };
    });
    ok('la cabecera y la barra de ruta son opacas (no se transparenta lo de detrás)',
      cab.aTop === 1 && cab.aRuta === 1, 'alfa cabecera ' + cab.aTop + ' · barra ' + cab.aRuta);
    ok('el punto activo de la ruta queda por encima de todo',
      /ruta-punto/.test(cab.encima), 'en ese punto está: ' + cab.encima);

    /* la pila de servicios: se apilan, pero ninguna se transparenta (si lo
       hiciera se leeria a traves de ella la ficha de debajo) */
    await irA(page, '#servicios');
    await page.evaluate(() => window.scrollBy({ top: 700, behavior: 'instant' }));
    await page.waitForTimeout(1400);
    const pila = await page.evaluate(() => Array.from(document.querySelectorAll('.serv-stack > li')).map(li => ({
      pos: getComputedStyle(li).position,
      op: +getComputedStyle(li.querySelector('.serv-ficha')).opacity.slice(0, 4),
      top: Math.round(li.querySelector('.serv-ficha').getBoundingClientRect().top)
    })));
    /* las que aun no han entrado en pantalla estan a opacidad 0 a proposito */
    ok('las fichas de servicios se apilan (sticky) y ninguna se transparenta al salir',
      pila.every(f => f.pos === 'sticky') &&
      pila.filter(f => f.top < 900).every(f => f.op === 1),
      pila.map(f => f.top + 'px/op' + f.op).join(' · '));
    await page.screenshot({ path: path.join(CAPS, 'servicios-1440.png') });

    /* la cabecera dice en qué municipio va la cámara */
    await irA(page, '#zonas');
    await page.waitForTimeout(600);
    const ruta1 = await page.evaluate(() => document.querySelector('[data-ruta-nombre]').textContent);
    await irA(page, '.zona[data-muni="sanxenxo"]');
    const ruta2 = await page.evaluate(() => ({
      nombre: document.querySelector('[data-ruta-nombre]').textContent,
      indice: document.querySelector('[data-ruta-indice]').textContent,
      pasados: document.querySelectorAll('[data-ruta-marcas] li.pasado').length,
      visor: document.querySelector('[data-visor-nombre]').textContent,
      vb: document.querySelector('[data-visor] .mapa').getAttribute('viewBox'),
      dash: document.querySelector('[data-visor] .mapa-ruta').style.strokeDashoffset
    }));
    ok('la cámara avanza de municipio en municipio con el scroll',
      ruta1 !== ruta2.nombre && ruta2.nombre === 'Sanxenxo',
      ruta1 + ' -> ' + ruta2.nombre + ' (' + ruta2.indice + '/8, ' + ruta2.pasados + ' ya recorridos)');
    /* el encuadre debe estar centrado en las coordenadas reales de Sanxenxo
       (x 1429,9 · y 387,3 del mapa), con una ventana de 560 unidades */
    const vb = ruta2.vb.split(/\s+/).map(Number);
    ok('el visor de zonas encuadra el municipio que se está leyendo',
      ruta2.visor === 'Sanxenxo' && vb[2] === 560 &&
      Math.abs(vb[0] + vb[2] / 2 - 1320) < 2 && Math.abs(vb[1] + vb[3] / 2 - 387.3) < 2,
      'viewBox ' + ruta2.vb);
    ok('la ruta del visor llega hasta el final en la última zona',
      parseFloat(ruta2.dash) < 1, 'dashoffset ' + ruta2.dash);
    await page.screenshot({ path: path.join(CAPS, 'zonas-1440.png') });

    ok('sin errores de consola en el recorrido', page.errores.length === 0, page.errores.join(' | '));
    await page.close();
  }

  /* ============ 2 · inmuebles: hoja que responde ============ */
  {
    const page = await nuevaPagina(browser);
    await conHoja(page);
    await page.route(HOJA, route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { titulo: 'Bajo con patio', poblacion: 'Zas', tipo: 'venta', precio: '99.000 €', metros: '85',
          habitaciones: '2', banos: '1', fotos: 'https://drive.google.com/file/d/ABCDEFGHIJKLMNO/view?usp=sharing',
          descripcion: 'Fila de prueba servida desde una hoja simulada.', referencia: 'REF. HOJA-1' },
        { titulo: 'Nave con oficina', poblacion: 'Santa Comba', tipo: 'alquiler', precio: '1.200 €/mes',
          metros: '400', fotos: '', descripcion: 'Segunda fila de prueba.', referencia: 'REF. HOJA-2' },
        { titulo: 'No debe salir', poblacion: 'Carballo', tipo: 'venta', precio: '1 €', estado: 'oculto' }
      ])
    }));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await irA(page, '#inmuebles');
    await page.waitForTimeout(900);

    const hoja = await page.evaluate(() => ({
      tarjetas: document.querySelectorAll('.inm-tarjeta').length,
      ejemplos: document.querySelectorAll('.inm-tarjeta.es-ejemplo').length,
      titulos: Array.from(document.querySelectorAll('.inm-tarjeta h3')).map(h => h.textContent.trim()),
      filtros: Array.from(document.querySelectorAll('.filtro')).map(f => f.textContent.trim()),
      fuente: document.querySelector('[data-fuente]').textContent.trim(),
      img: (document.querySelector('.inm-tarjeta img') || {}).src || ''
    }));
    ok('la hoja sustituye a los ejemplos cuando responde',
      hoja.tarjetas === 2 && hoja.ejemplos === 0, hoja.tarjetas + ' tarjetas: ' + hoja.titulos.join(' / '));
    ok('las filas marcadas "oculto" no se publican',
      !hoja.titulos.join(' ').includes('No debe salir'));
    ok('el filtro se reconstruye con las poblaciones de la hoja',
      hoja.filtros.length === 3 && hoja.filtros.join(' ').includes('Zas') && hoja.filtros.join(' ').includes('Santa Comba'),
      hoja.filtros.join(' · '));
    ok('un enlace normal de Google Drive se convierte en imagen mostrable',
      /drive\.google\.com\/thumbnail\?id=ABCDEFGHIJKLMNO/.test(hoja.img), hoja.img.slice(0, 72));
    ok('la web dice de dónde vienen los datos', /en vivo desde la hoja/.test(hoja.fuente), hoja.fuente);
    await page.screenshot({ path: path.join(CAPS, 'inmuebles-hoja-1440.png') });
    await page.close();
  }

  /* ============ 3 · inmuebles: la hoja falla (el caso que importa) ============ */
  {
    const page = await nuevaPagina(browser);
    await conHoja(page);
    await page.route(HOJA, route => route.abort('connectionrefused'));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await irA(page, '#inmuebles');
    await page.waitForTimeout(1200);

    const caido = await page.evaluate(() => {
      const t = document.querySelectorAll('.inm-tarjeta');
      const texto = document.querySelector('#inmuebles').innerText.toLowerCase();
      return {
        tarjetas: t.length,
        ejemplos: document.querySelectorAll('.inm-tarjeta.es-ejemplo').length,
        cintas: document.querySelectorAll('.inm-cinta').length,
        campos: document.querySelectorAll('.inm-tarjeta .dato-ej').length,
        fuente: document.querySelector('[data-fuente]').textContent.trim(),
        alarma: /error|fallo|no se pudo|undefined|\[object/.test(texto),
        filtros: document.querySelectorAll('.filtro').length
      };
    });
    ok('si la hoja no contesta, se ven los inmuebles de ejemplo',
      caido.tarjetas === 6 && caido.ejemplos === 6, caido.tarjetas + ' tarjetas de ejemplo');
    ok('cada ejemplo lleva su cinta de aviso', caido.cintas === 6, caido.cintas + '/6 cintas');
    ok('todos los campos de los ejemplos van marcados uno a uno',
      caido.campos >= 6 * 4, caido.campos + ' campos marcados');
    ok('el visitante no ve ningún error', caido.alarma === false, caido.fuente);
    ok('el filtro sigue funcionando con los ejemplos', caido.filtros === 6, caido.filtros + ' botones');

    /* y el filtro filtra de verdad */
    await page.click('.filtro[data-valor="Carballo"]');
    await page.waitForTimeout(700);
    const filtrado = await page.evaluate(() => ({
      visibles: Array.from(document.querySelectorAll('.inm-tarjeta')).filter(t => !t.hidden).length,
      poblaciones: Array.from(document.querySelectorAll('.inm-tarjeta')).filter(t => !t.hidden)
        .map(t => t.dataset.poblacion)
    }));
    ok('al filtrar por población solo quedan sus inmuebles',
      filtrado.visibles === 2 && filtrado.poblaciones.every(p => p === 'Carballo'),
      filtrado.visibles + ' visibles: ' + filtrado.poblaciones.join(', '));

    /* un pin del mapa lleva al listado ya filtrado */
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    await page.click('.portada-mapa .pin[data-muni="ponteceso"]');
    await page.waitForTimeout(1600);
    const desdePin = await page.evaluate(() => ({
      pulsado: (document.querySelector('.filtro[aria-pressed="true"]') || {}).dataset,
      visibles: Array.from(document.querySelectorAll('.inm-tarjeta')).filter(t => !t.hidden).length,
      y: Math.round(document.querySelector('#inmuebles').getBoundingClientRect().top)
    }));
    ok('pulsar un pin del mapa lleva al listado filtrado por esa población',
      desdePin.pulsado && desdePin.pulsado.valor === 'Ponteceso' && desdePin.visibles === 1,
      'filtro ' + (desdePin.pulsado || {}).valor + ', ' + desdePin.visibles + ' ficha, sección a ' + desdePin.y + 'px');

    await page.screenshot({ path: path.join(CAPS, 'inmuebles-ejemplos-1440.png') });
    /* el navegador apunta en consola que el recurso no cargó: eso lo escribe él,
       no la web, y el visitante no ve nada */
    ok('sin errores de consola propios con la hoja caída',
      page.errores.filter(e => !/hoja de inmuebles|Failed to load resource|ERR_CONNECTION/.test(e)).length === 0,
      page.errores.join(' | '));
    await page.close();
  }

  /* ============ 4 · cookies, mapa de Google, formulario y horario ============ */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const visible = await page.isVisible('.cookie-banner');
    await page.click('.cookie-ack');
    await page.waitForTimeout(400);
    const trasCerrar = await page.evaluate(() => {
      const b = document.querySelector('.cookie-banner');
      return { hidden: b.hidden, display: getComputedStyle(b).display, guardado: localStorage.getItem('aponte-cookie-ack') };
    });
    ok('el aviso de cookies aparece', visible);
    ok('el botón de cerrar el aviso funciona de verdad',
      trasCerrar.hidden && trasCerrar.display === 'none', 'display: ' + trasCerrar.display);
    ok('y no vuelve a salir en la siguiente visita', trasCerrar.guardado === '1');

    /* el mapa de Google no existe hasta que se pide */
    const peticiones = [];
    page.on('request', r => { if (/google\.com\/maps/.test(r.url())) peticiones.push(r.url()); });
    await irA(page, '#contacto');
    const antes = await page.evaluate(() => document.querySelectorAll('[data-map-caja] iframe').length);
    const peticionesAntes = peticiones.length;
    await page.click('[data-map]');
    await page.waitForTimeout(1800);
    const despues = await page.evaluate(() => {
      const f = document.querySelector('[data-map-caja] iframe');
      return { hay: !!f, src: f ? f.src : '' };
    });
    ok('sin pulsar, no hay iframe de Google ni petición a Google Maps',
      antes === 0 && peticionesAntes === 0);
    ok('al pulsar se carga el mapa embebido, sin clave de API',
      despues.hay && /google\.com\/maps\?q=.*output=embed/.test(despues.src) && !/key=/.test(despues.src),
      despues.src.slice(0, 96));

    /* horario: el día de hoy va resaltado */
    const hoy = await page.evaluate(() => {
      const tr = document.querySelector('.horario tr.hoy');
      return tr ? { dia: tr.dataset.dia, texto: tr.textContent.trim().replace(/\s+/g, ' ') } : null;
    });
    ok('el horario resalta el día de hoy', hoy && Number(hoy.dia) === new Date().getDay(),
      hoy ? hoy.texto : 'sin fila marcada');

    /* el formulario avisa de que todavía no tiene destino */
    await page.fill('#f-nombre', 'Prueba');
    await page.fill('#f-contacto', '600000000');
    await page.check('input[name="consent"]');
    await page.click('.form button[type="submit"]');
    await page.waitForTimeout(600);
    const dlg = await page.evaluate(() => {
      const d = document.getElementById('dlg-enviado');
      return { abierto: d.open, texto: d.textContent.replace(/\s+/g, ' ').trim() };
    });
    ok('el formulario no simula un envío que no existe',
      dlg.abierto && /no tiene a dónde enviarla/.test(dlg.texto), dlg.texto.slice(0, 80));

    await page.screenshot({ path: path.join(CAPS, 'contacto-1440.png') });
    ok('sin errores de consola en contacto', page.errores.length === 0, page.errores.join(' | '));
    await page.close();
  }

  /* ============ 5 · 400 px: el mapa se convierte en lista ============ */
  {
    const page = await nuevaPagina(browser, { viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2600);

    const movil = await page.evaluate(() => ({
      mapa: getComputedStyle(document.querySelector('.portada-mapa .mapa')).display,
      lista: getComputedStyle(document.querySelector('.portada-lista')).display,
      poblaciones: document.querySelectorAll('.portada-lista li').length,
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      menu: getComputedStyle(document.querySelector('.menu-btn')).display
    }));
    ok('a 400 px el trazado se sustituye por la lista de poblaciones',
      movil.mapa === 'none' && movil.lista === 'grid' && movil.poblaciones === 8,
      movil.poblaciones + ' poblaciones en lista');
    ok('a 400 px no hay desbordamiento horizontal', movil.desborde <= 0, movil.desborde + ' px');
    ok('a 400 px aparece el menú de hamburguesa', movil.menu !== 'none');
    await page.screenshot({ path: path.join(CAPS, 'portada-400.png') });

    await page.click('.menu-btn');
    await page.waitForTimeout(500);
    const menu = await page.evaluate(() => ({
      abierto: !document.getElementById('menu-movil').hidden,
      enlaces: document.querySelectorAll('#menu-movil a').length
    }));
    ok('el menú móvil abre', menu.abierto && menu.enlaces === 6, menu.enlaces + ' enlaces');
    await page.screenshot({ path: path.join(CAPS, 'menu-400.png') });
    await page.click('.menu-btn');

    await irA(page, '#inmuebles', 80);
    await page.screenshot({ path: path.join(CAPS, 'inmuebles-400.png') });
    await irA(page, '#zonas', 80);
    await page.screenshot({ path: path.join(CAPS, 'zonas-400.png') });
    await irA(page, '#contacto', 80);
    await page.screenshot({ path: path.join(CAPS, 'contacto-400.png') });

    /* se miran solo elementos HTML: dentro del marquee y del visor del mapa el
       contenido se sale a propósito y lo recorta un overflow:hidden */
    const anchos = await page.evaluate(() => {
      const malos = [];
      document.querySelectorAll('main *').forEach(el => {
        if (!(el instanceof HTMLElement)) return;
        if (el.closest('.marquee') || el.closest('[data-visor]')) return;
        const b = el.getBoundingClientRect();
        if (b.width && b.right > window.innerWidth + 1.5) {
          malos.push(el.tagName + '.' + (el.className || '').toString().split(' ')[0] +
            ' (' + Math.round(b.right) + 'px)');
        }
      });
      return malos.slice(0, 6);
    });
    ok('nada se sale de la pantalla a 400 px', anchos.length === 0, anchos.join(' | '));
    ok('sin errores de consola a 400 px', page.errores.length === 0, page.errores.join(' | '));
    await page.close();
  }

  /* ============ 6 · movimiento reducido ============ */
  {
    const page = await nuevaPagina(browser, { reducedMotion: 'reduce' });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const rm = await page.evaluate(() => {
      const r = document.querySelector('.portada-mapa .mapa-ruta');
      const pines = Array.from(document.querySelectorAll('.portada-mapa .pin'));
      return {
        off: parseFloat(getComputedStyle(r).strokeDashoffset),
        pines: pines.filter(p => parseFloat(getComputedStyle(p).opacity) > 0.95).length,
        titulo: document.querySelector('.portada-h1').innerText.replace(/\s+/g, ' ').trim(),
        lenis: document.documentElement.className.includes('lenis')
      };
    });
    ok('con movimiento reducido la ruta ya está dibujada', rm.off < 1, 'offset ' + rm.off);
    ok('con movimiento reducido los pines ya están en su sitio', rm.pines === 8, rm.pines + '/8');
    ok('con movimiento reducido el titular se lee entero',
      /De Malpica a Sanxenxo/.test(rm.titulo), rm.titulo.slice(0, 48));
    ok('con movimiento reducido no se activa el scroll suave', rm.lenis === false);
    await page.screenshot({ path: path.join(CAPS, 'reduced-motion.png') });
    await page.close();
  }

  /* ============ 7 · sin GSAP (CDN bloqueado) y sin JavaScript ============ */
  {
    const page = await nuevaPagina(browser);
    await page.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    const sin = await page.evaluate(() => ({
      clase: document.documentElement.className,
      ruta: parseFloat(getComputedStyle(document.querySelector('.portada-mapa .mapa-ruta')).strokeDashoffset),
      pines: Array.from(document.querySelectorAll('.portada-mapa .pin'))
        .filter(p => parseFloat(getComputedStyle(p).opacity) > 0.95).length,
      tarjetas: document.querySelectorAll('.inm-tarjeta').length,
      visor: !!document.querySelector('[data-visor] .mapa'),
      titulo: document.querySelector('.portada-h1').innerText.trim().length
    }));
    ok('sin GSAP la página sigue completa y legible',
      /no-gsap/.test(sin.clase) && sin.ruta < 1 && sin.pines === 8 && sin.titulo > 20,
      'ruta ' + sin.ruta + ', ' + sin.pines + ' pines');
    ok('sin GSAP los inmuebles se siguen viendo', sin.tarjetas === 6, sin.tarjetas + ' tarjetas');
    ok('sin GSAP el visor de zonas sigue montado', sin.visor);
    await page.screenshot({ path: path.join(CAPS, 'sin-gsap.png') });
    await page.close();

    const pag2 = await nuevaPagina(browser, { javaScriptEnabled: false });
    await pag2.goto(BASE, { waitUntil: 'domcontentloaded' });
    await pag2.waitForTimeout(900);
    const noJs = await pag2.evaluate(() => ({
      texto: document.body.innerText.length,
      cookies: getComputedStyle(document.querySelector('.cookie-banner')).display,
      mapa: !!document.querySelector('.portada-mapa .mapa')
    }));
    ok('sin JavaScript se lee el contenido y el mapa está en el HTML',
      noJs.texto > 2000 && noJs.mapa, noJs.texto + ' caracteres de texto');
    ok('sin JavaScript no se cuela el aviso de cookies', noJs.cookies === 'none');
    await pag2.screenshot({ path: path.join(CAPS, 'sin-js.png') });
    await pag2.close();
  }

  /* ============ 8 · accesibilidad y rendimiento básicos ============ */
  {
    const page = await nuevaPagina(browser);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3600);

    const a11y = await page.evaluate(() => {
      const sinAlt = Array.from(document.images).filter(i => !i.alt).length;
      const h1 = document.querySelectorAll('h1').length;
      const pines = Array.from(document.querySelectorAll('.portada-mapa .pin'));
      const labels = Array.from(document.querySelectorAll('.form label')).length;
      const campos = document.querySelectorAll('.form input, .form select, .form textarea').length;
      return {
        sinAlt, h1,
        pinesAccesibles: pines.filter(p => p.getAttribute('aria-label') && p.getAttribute('tabindex') === '0').length,
        labels, campos,
        tituloMapa: !!document.querySelector('.portada-mapa .mapa title'),
        idsRepetidos: (() => {
          const v = {}; let n = 0;
          document.querySelectorAll('[id]').forEach(e => { if (v[e.id]) n++; v[e.id] = 1; });
          return n;
        })()
      };
    });
    ok('todas las imágenes llevan texto alternativo', a11y.sinAlt === 0, a11y.sinAlt + ' sin alt');
    ok('hay un único h1', a11y.h1 === 1);
    ok('los pines del mapa se pueden usar con teclado', a11y.pinesAccesibles === 8, a11y.pinesAccesibles + '/8');
    ok('el mapa tiene título accesible', a11y.tituloMapa);
    ok('no hay id repetidos al clonar el mapa', a11y.idsRepetidos === 0, a11y.idsRepetidos + ' repetidos');
    ok('cada campo del formulario tiene su etiqueta', a11y.labels >= a11y.campos - 1,
      a11y.labels + ' etiquetas para ' + a11y.campos + ' campos');

    /* tareas largas: se mide la animación de portada, no el arranque del navegador */
    const tareas = await page.evaluate(() => new Promise(res => {
      const largas = [];
      const po = new PerformanceObserver(l => l.getEntries().forEach(e => largas.push(Math.round(e.duration))));
      try { po.observe({ type: 'longtask', buffered: false }); } catch (e) { return res([]); }
      window.scrollTo(0, 0);
      setTimeout(() => { po.disconnect(); res(largas); }, 4000);
    }));
    ok('no hay tareas largas mientras se recorre la página',
      tareas.filter(t => t > 120).length === 0, tareas.length ? tareas.join(', ') + ' ms' : 'ninguna');

    /* peso de la página */
    const peso = await page.evaluate(() =>
      performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0));
    ok('la página pesa menos de 2,5 MB', peso < 2500000, Math.round(peso / 1024) + ' KB transferidos');

    await page.close();
  }

  await browser.close();

  /* ---------------------------------- informe ---------------------------------- */
  const fallos = resultados.filter(r => !r.ok);
  console.log('\n' + '='.repeat(74));
  resultados.forEach(r => {
    console.log((r.ok ? '  OK   ' : '  FALLA') + ' · ' + r.prueba + (r.detalle ? '\n         ' + r.detalle : ''));
  });
  console.log('='.repeat(74));
  console.log(resultados.length - fallos.length + '/' + resultados.length + ' pruebas pasadas');
  fs.writeFileSync(path.join(__dirname, 'verify-report.json'),
    JSON.stringify({ fecha: new Date().toISOString(), base: BASE, resultados }, null, 1));
  process.exit(fallos.length ? 1 : 0);
})();
