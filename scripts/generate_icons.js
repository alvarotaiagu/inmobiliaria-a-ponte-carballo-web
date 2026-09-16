/* Rasteriza el icono y compone la imagen social (og.png) con Playwright.
   La og reutiliza el mapa de verdad: es la marca de la casa.
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/generate_icons.js */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const LOGO = path.join(RAIZ, 'assets', 'img', 'logo');
const icono = fs.readFileSync(path.join(LOGO, 'icon.svg'), 'utf8');
const wordmark = fs.readFileSync(path.join(LOGO, 'logo.svg'), 'utf8');
const mapa = fs.readFileSync(path.join(RAIZ, 'assets', 'map', 'mapa.svg'), 'utf8');
const css = fs.readFileSync(path.join(RAIZ, 'css', 'style.css'), 'utf8');

(async () => {
  const browser = await chromium.launch();

  for (const lado of [96, 180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: lado, height: lado } });
    await page.setContent(
      `<body style="margin:0"><div style="width:${lado}px;height:${lado}px">${icono}</div></body>`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(LOGO, `icon-${lado}.png`), omitBackground: true });
    await page.close();
    console.log('icon-' + lado + '.png');
  }

  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(`<!DOCTYPE html><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    ${css}
    body{margin:0;width:1200px;height:630px;background:#FAF8F4;overflow:hidden;position:relative}
    .fondo{position:absolute;right:8px;top:96px;width:790px;height:445px}
    .fondo .mapa{overflow:visible}
    .fondo .mapa{width:100%;height:100%}
    .fondo .mapa-ruta{stroke-dashoffset:0;stroke-width:5}
    .fondo .pin-marca{transform:scale(1.5)}
    .capa{position:absolute;inset:0;background:linear-gradient(95deg,#FAF8F4 44%,rgba(250,248,244,.7) 54%,rgba(250,248,244,0) 66%)}
    .txt{position:absolute;left:72px;top:0;height:630px;width:660px;display:flex;flex-direction:column;justify-content:center;gap:26px}
    .wm{width:330px}
    .lema{margin:0;font-family:Sora,system-ui,sans-serif;font-size:46px;line-height:1.06;letter-spacing:-.035em;color:#2A2A28;font-weight:400}
    .lema em{font-style:normal;color:#C44E1C}
    .datos{display:flex;gap:30px;font-family:Sora,system-ui,sans-serif;font-size:18px;color:#56534E;letter-spacing:.02em;align-items:center}
    .datos b{color:#2A2A28;font-weight:500}
    .sello{position:absolute;right:56px;bottom:40px;font-family:Sora,system-ui,sans-serif;font-size:14px;
      letter-spacing:.26em;text-transform:uppercase;color:#8B857D}
  </style>
  <div class="fondo">${mapa}</div>
  <div class="capa"></div>
  <div class="txt">
    <div class="wm">${wordmark}</div>
    <p class="lema">De Malpica a Sanxenxo,<br><em>conocemos cada rincón</em></p>
    <p class="datos"><b>8 municipios</b> · Venta, alquiler y búsqueda · <b>Carballo</b></p>
  </div>
  <p class="sello">Costa da Morte · Rías Baixas</p>`);
  await og.waitForTimeout(900);
  await og.screenshot({ path: path.join(LOGO, 'og.png') });
  console.log('og.png');

  await browser.close();
})();
