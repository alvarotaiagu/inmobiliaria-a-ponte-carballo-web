/* Hojas de contacto de Pexels para elegir fotografia a mano (A Ponte).
   Pexels bloquea el headless "limpio": un navegador nuevo por consulta,
   UA realista y ~9 s de espera. Los <img> de la rejilla son lazy y salen
   negros en la captura, asi que se recogen las URL y se monta una hoja
   de contacto propia (HTML local) que si se captura bien.
   Uso: NODE_PATH=/c/Users/alvar/node_modules node scripts/contact_sheets.js [consulta...] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'contact_sheets');
fs.mkdirSync(OUT, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const CONSULTAS = process.argv.slice(2).length ? process.argv.slice(2) : [
  'warm office interior pink wall',
  'wooden desk documents pen window light',
  'white modern chairs wooden table office',
  'paperwork signing pen close up warm',
  'professional woman portrait window light',
  'empty office room natural light plant',
];

const hoja = (titulo, fotos) => `<!DOCTYPE html><meta charset="utf-8">
<style>
 body{margin:0;background:#111;color:#0f0;font:12px/1.3 monospace}
 h1{color:#fff;font:600 16px monospace;padding:10px 12px;margin:0}
 .g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 12px 12px}
 figure{margin:0;background:#000}
 img{width:100%;height:200px;object-fit:cover;display:block}
 figcaption{padding:3px 5px;background:#000;color:#0f0;font-weight:700}
</style><h1>${titulo}</h1><div class="g">
${fotos.map(f => `<figure><img src="${f.src}"><figcaption>${f.id}</figcaption></figure>`).join('\n')}
</div>`;

(async () => {
  for (const q of CONSULTAS) {
    const slug = q.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1500, height: 2000 }, userAgent: UA, locale: 'en-US' });
    try {
      await page.goto('https://www.pexels.com/search/' + encodeURIComponent(q) + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(9000);
      for (const y of [1200, 2400, 3600]) { await page.evaluate(s => window.scrollTo(0, s), y); await page.waitForTimeout(1800); }
      const fotos = await page.evaluate(() => {
        const vistos = new Map();
        document.querySelectorAll('img[src*="images.pexels.com/photos/"]').forEach(img => {
          const m = img.src.match(/photos\/(\d+)\//);
          if (!m || vistos.has(m[1])) return;
          vistos.set(m[1], { id: m[1], src: img.src.replace(/([?&])w=\d+/, '$1w=600').replace(/([?&])h=\d+/, '$1h=600') });
        });
        return Array.from(vistos.values());
      });
      fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(fotos, null, 1));
      const f = path.join(OUT, slug + '.html');
      fs.writeFileSync(f, hoja(q, fotos));
      const p2 = await browser.newPage({ viewport: { width: 1500, height: 1000 }, userAgent: UA });
      await p2.goto('file://' + f.split(path.sep).join('/'), { waitUntil: 'networkidle', timeout: 60000 });
      await p2.waitForTimeout(2500);
      await p2.screenshot({ path: path.join(OUT, slug + '.png'), fullPage: true });
      console.log(slug, '->', fotos.length, 'fotos');
    } catch (e) {
      console.log(slug, 'ERROR', e.message);
    }
    await browser.close();
  }
})();
