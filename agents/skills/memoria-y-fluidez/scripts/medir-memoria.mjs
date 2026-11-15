// Mide memoria (JS + GPU estimada) y fluidez (tareas largas, cuadros lentos) de Travix-3D
// recorriendo la app en un Chrome headless que emula un celular o un computador.
//
// Uso (con `npm run build` y `npx vite preview --port 4180 --strictPort` corriendo):
//   node agents/skills/memoria-y-fluidez/scripts/medir-memoria.mjs <carpetaSalida> [iphone|android|desktop]
// Variables: URL (por defecto http://localhost:4180/), PARADAS (paradas del tour de hardware, 8),
//            CHROME (ruta al ejecutable de Chrome/Edge/Brave), CPU (ralentizar CPU, p. ej. 4).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(process.argv[2] || 'medicion-memoria');
const DEVICE = process.argv[3] || 'iphone';
mkdirSync(outDir, { recursive: true });
const URL = process.env.URL || 'http://localhost:4180/';
const STOPS = Number(process.env.PARADAS || 8);
const CHROME =
  process.env.CHROME ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p));
if (!CHROME) {
  console.error('No encontré Chrome: pasa su ruta en la variable CHROME');
  process.exit(1);
}
const devices = {
  desktop: { w: 1366, h: 768, dpr: 1, mobile: false, ua: null },
  android: { w: 412, h: 915, dpr: 2.625, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' },
  iphone: { w: 390, h: 844, dpr: 3, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
};
const d = devices[DEVICE];
const hook = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'gpu-hook.js'), 'utf8');
const PORT = 9600 + Math.floor(Math.random() * 300);
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(outDir, 'perfil')}`, `--window-size=${d.w},${d.h}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 200 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
if (!target) { console.error('Chrome no arrancó'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('ERR ' + JSON.stringify(m.params.args.map((a) => a.value ?? a.description)).slice(0, 200));
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { const mid = ++id; pending.set(mid, r); ws.send(JSON.stringify({ id: mid, method, params })); });
const evaluate = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value;
const click = (js) => evaluate(`(() => { const el = ${js}; if (!el) return false; el.click(); return true; })()`);
const btn = (re) => `[...document.querySelectorAll('button')].find(b => b.offsetParent && (${re}.test(b.textContent.trim()) || ${re}.test(b.getAttribute('aria-label')||'')))`;
const mark = (m) => evaluate(`window.__mark = ${JSON.stringify(m)}`);

const rows = [];
let peakGpu = 0;
const mem = async (label) => {
  const m = (await send('Performance.getMetrics')).result.metrics;
  const heap = Math.round(m.find((x) => x.name === 'JSHeapUsedSize').value / 1048576);
  const gpu = JSON.parse(await evaluate('JSON.stringify(window.__gpuReport())'));
  const live = gpu.filter((g) => !g.lost && g.textures > 0);
  const gpuMB = Math.round(live.reduce((a, g) => a + g.totalMB, 0));
  const tex = live.reduce((a, g) => a + g.textures, 0);
  peakGpu = Math.max(peakGpu, gpuMB);
  const row = { label, heap, gpuMB, tex, contexts: live.length };
  // DETALLE=1: guarda la lista completa de texturas en cada momento (para ver qué no se libera)
  if (process.env.DETALLE) row.textures = JSON.parse(await evaluate('JSON.stringify(window.__gpuReport(100000))')).filter((g) => !g.lost).map((g) => g.top);
  rows.push(row);
  console.log(`${label.padEnd(26)} JS=${String(heap).padStart(4)} MB   GPU≈${String(gpuMB).padStart(5)} MB   texturas=${String(tex).padStart(4)}   contextos=${live.length}`);
};

await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: hook });
await send('Emulation.setDeviceMetricsOverride', { width: d.w, height: d.h, deviceScaleFactor: d.dpr, mobile: d.mobile });
if (d.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
if (d.ua) await send('Emulation.setUserAgentOverride', { userAgent: d.ua });
await send('Page.navigate', { url: URL });
await sleep(1500);
await evaluate(`localStorage.setItem('travix-lang','es'); localStorage.setItem('travix-tutorial-seen','1'); true`);
await send('Page.reload');
await sleep(10000);
if (process.env.CPU) await send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) });
await evaluate(`(() => { window.__alive = 1; window.__lt = []; window.__fr = []; window.__mark = 'inicio';
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([window.__mark, Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: false }); } catch {}
  let last = performance.now(); const f = (now) => { const dt = now - last; last = now; if (dt > 50) window.__fr.push([window.__mark, Math.round(dt)]); requestAnimationFrame(f); }; requestAnimationFrame(f); return true; })()`);
await mark('bienvenida');
await click(btn('/^Comenzar a explorar$/')); await sleep(4000);
await mem('inicio');

const go = async (name) => {
  await click(btn('/^Abrir buscador espacial$/')); await sleep(700);
  await click(`[...document.querySelectorAll('button')].find(b => /^Planetas/.test(b.textContent.trim()) && b.offsetParent)`); await sleep(700);
  const ok = await click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(name)}) && b.offsetParent)`);
  if (!ok) await click(btn('/^Cerrar buscador/'));
  return ok;
};
for (const p of ['Tierra', 'Marte', 'Júpiter', 'Saturno', 'Cometa 67P']) {
  await mark('vuelo ' + p);
  const ok = await go(p);
  await sleep(14000);
  await mem(p + (ok ? '' : ' (no se pudo abrir)'));
}

// Tour «Legado de Hardware NASA»: entra en las misiones de superficie una tras otra
await mark('tour hardware');
await click(btn('/^Guías interactivas NASA$/')); await sleep(1200);
await click(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Legado de Hardware'))`); await sleep(800);
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-pressed') === 'true' && /autom/i.test(b.textContent + (b.getAttribute('aria-label')||''))); if (b) b.click(); return !!b; })()`);
const skipDescent = () => evaluate(`(() => { const el = [...document.querySelectorAll('p,div,span')].find(e => e.textContent.trim().startsWith('Ilustración esquemática')); if (!el) return false; let n = el; for (let i = 0; i < 6 && n; i++) { n.click && n.click(); n = n.parentElement; } return true; })()`);
for (let i = 0; i < STOPS; i++) {
  if (i > 0) {
    await mark('parada ' + (i + 1));
    await click(btn('/^(Siguiente|Parada siguiente)$/'));
  }
  for (let k = 0; k < 14; k++) { await sleep(1000); await skipDescent(); }
  await sleep(3000);
  const title = await evaluate(`(() => { const a = document.querySelector('aside[aria-label^="Guía NASA"] h3'); return a ? a.textContent.trim() : '?'; })()`);
  await mem(`parada ${i + 1} ${title}`.slice(0, 26));
}
await mark('salir del tour');
await click(btn('/^Vista general del sistema$/')); await sleep(8000);
await mem('sistema tras el tour');
await mark('modo nave');
await click(btn('/^Modo nave/')); await sleep(6000);
await mem('modo nave');
await mark('hipersalto');
await click(`[...document.querySelectorAll('button')].find(b => /^(Saturno|Júpiter)$/.test(b.textContent.trim()) && b.offsetParent)`); await sleep(12000);
await mem('tras hipersalto');
await mark('nave apagada');
await click(btn('/^Modo nave/')); await sleep(4000);
await click(btn('/^Vista general del sistema$/')); await sleep(6000);
await mem('nave apagada');
await send('HeapProfiler.enable'); await send('HeapProfiler.collectGarbage'); await sleep(3000);
await mem('tras liberar memoria (GC)');

const top = JSON.parse(await evaluate('JSON.stringify(window.__gpuReport(30))'));
console.log('\nTexturas más pesadas en la GPU al final:');
for (const g of top.filter((x) => !x.lost && x.textures > 0)) console.log(`  contexto #${g.ctx} (${g.canvas}): ${g.textures} texturas, ${g.texMB} MB\n    ` + g.top.join('\n    '));
const agg = (arr) => { const m = new Map(); for (const [k, v] of arr) { const a = m.get(k) || []; a.push(v); m.set(k, a); } return [...m].map(([k, a]) => `  ${k.padEnd(22)} n=${String(a.length).padStart(3)}  peor=${String(Math.max(...a)).padStart(5)} ms  total=${a.reduce((x, y) => x + y, 0)} ms`).join('\n'); };
const lt = JSON.parse(await evaluate('JSON.stringify(window.__lt)'));
const fr = JSON.parse(await evaluate('JSON.stringify(window.__fr)'));
console.log('\nTareas largas del hilo principal (> 50 ms), por momento:\n' + (agg(lt) || '  ninguna'));
console.log('\nCuadros lentos (> 50 ms), por momento:\n' + (agg(fr) || '  ninguno'));
const alive = await evaluate('window.__alive === 1');
console.log(`\nRESUMEN dispositivo=${DEVICE} pico GPU≈${peakGpu} MB  recargóSola=${!alive}  errores=${errors.length}`);
for (const e of [...new Set(errors)].slice(0, 8)) console.log('   ', e);
writeFileSync(join(outDir, 'medicion.json'), JSON.stringify({ device: DEVICE, peakGpu, rows, longTasks: lt, slowFrames: fr, errors }, null, 1));
ws.close(); proc.kill(); process.exit(0);
