// Injected before the page runs: estimates the GPU memory each WebGL context holds
// (textures, render buffers, vertex/index buffers) by watching the allocation calls.
(() => {
  const ctxs = [];
  const BPP = {
    // sized internal formats (WebGL2 enums)
    0x8058: 4, 0x8c43: 4, 0x8051: 4, 0x8c41: 4, 0x881a: 8, 0x8814: 16, 0x881b: 8, 0x8815: 16,
    0x8229: 1, 0x822b: 2, 0x822d: 2, 0x822e: 4, 0x822f: 4, 0x8230: 8, 0x8d62: 2, 0x8056: 2, 0x8057: 2,
    0x88f0: 4, 0x81a5: 2, 0x81a6: 4, 0x8cac: 4, 0x8cad: 8, 0x8c3a: 4, 0x8c3d: 4, 0x8059: 4,
    // unsized formats
    0x1908: 4, 0x1907: 4, 0x1909: 1, 0x190a: 2, 0x1906: 1, 0x1902: 4, 0x84f9: 4,
  };
  const typeMul = (type) => (type === 0x1406 ? 4 : type === 0x8d61 || type === 0x140b ? 2 : 1);
  const bpp = (ifmt, type) => {
    const base = BPP[ifmt] ?? 4;
    if (ifmt === 0x1908 || ifmt === 0x1907) return 4 * typeMul(type); // RGBA/RGB unsized: padded to 4
    return base;
  };
  const lbl = (src) => { const u = src.__url || src.currentSrc || src.src || ''; return (u ? u.split('/').slice(-2).join('/') : src.constructor?.name || '').slice(0, 70); };
  const of = window.fetch;
  window.fetch = function (...a) { const url = typeof a[0] === 'string' ? a[0] : a[0]?.url; return of.apply(this, a).then((r) => { const ob = r.blob.bind(r); r.blob = () => ob().then((b) => { try { b.__url = url; } catch {} return b; }); return r; }); };
  const cib = window.createImageBitmap;
  window.createImageBitmap = function (src, ...rest) { return cib.call(this, src, ...rest).then((bm) => { try { bm.__url = src?.__url || src?.currentSrc || src?.src; } catch {} return bm; }); };
  function track(gl) {
    if (gl.__mem) return;
    const s = { tex: new Map(), rb: new Map(), buf: new Map(), unit: 0, bound: new Map(), rbBound: null, bufBound: new Map(), canvas: gl.canvas };
    gl.__mem = s;
    ctxs.push(gl);
    const P = gl;
    const wrap = (name, fn) => {
      const orig = P[name];
      if (typeof orig !== 'function') return;
      P[name] = function (...a) { const r = orig.apply(this, a); try { fn(a, r); } catch {} return r; };
    };
    const levelSet = (tex, key, bytes, w, h) => {
      if (!tex) return;
      let e = s.tex.get(tex);
      if (!e) { e = { levels: new Map(), w: 0, h: 0, mips: false }; s.tex.set(tex, e); }
      e.levels.set(key, bytes);
      if (key.endsWith(':0')) { e.w = w; e.h = h; }
    };
    const cur = (target) => {
      const t = target >= 0x8515 && target <= 0x851a ? 0x8513 : target; // cube faces
      return s.bound.get(s.unit + ':' + t);
    };
    wrap('activeTexture', (a) => { s.unit = a[0]; });
    wrap('bindTexture', (a) => { s.bound.set(s.unit + ':' + a[0], a[1]); });
    wrap('deleteTexture', (a) => { s.tex.delete(a[0]); });
    wrap('texImage2D', (a) => {
      const [target, level, ifmt] = a;
      let w, h, type;
      if (a.length >= 8) { w = a[3]; h = a[4]; type = a[7]; } else { const src = a[5]; type = a[4]; w = src.videoWidth || src.naturalWidth || src.width; h = src.videoHeight || src.naturalHeight || src.height; }
      levelSet(cur(target), target + ':' + level, w * h * bpp(ifmt, type), w, h);
      const e = s.tex.get(cur(target)); if (e && a.length < 8 && !e.src) e.src = lbl(a[5]);
    });
    wrap('texStorage2D', (a) => {
      const [target, levels, ifmt, w, h] = a;
      const faces = target === 0x8513 ? 6 : 1;
      let bytes = 0, lw = w, lh = h;
      for (let i = 0; i < levels; i++) { bytes += lw * lh * bpp(ifmt); lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); }
      levelSet(cur(target), 'storage:0', bytes * faces, w, h);
    });
    wrap('texImage3D', (a) => { const [target, level, ifmt, w, h, d] = a; levelSet(cur(target), target + ':' + level, w * h * d * bpp(ifmt, a[8]), w, h); });
    wrap('texStorage3D', (a) => { const [target, levels, ifmt, w, h, d] = a; let bytes = 0, lw = w, lh = h; for (let i = 0; i < levels; i++) { bytes += lw * lh * d * bpp(ifmt); lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); } levelSet(cur(target), 'storage:0', bytes, w, h); });
    wrap('compressedTexImage2D', (a) => { const [target, level, , w, h] = a; const data = a[6]; levelSet(cur(target), target + ':' + level, data?.byteLength ?? w * h, w, h); });
    wrap('texSubImage2D', (a) => { const src = a.find((x) => x && typeof x === 'object' && !ArrayBuffer.isView(x)); const e = s.tex.get(cur(a[0])); if (e && src && !e.src) e.src = lbl(src); });
    wrap('generateMipmap', (a) => { const e = s.tex.get(cur(a[0])); if (e) e.mips = true; });
    wrap('bindRenderbuffer', (a) => { s.rbBound = a[1]; });
    wrap('deleteRenderbuffer', (a) => { s.rb.delete(a[0]); });
    wrap('renderbufferStorage', (a) => { if (s.rbBound) s.rb.set(s.rbBound, a[2] * a[3] * bpp(a[1])); });
    wrap('renderbufferStorageMultisample', (a) => { if (s.rbBound) s.rb.set(s.rbBound, a[3] * a[4] * bpp(a[2]) * Math.max(1, a[1])); });
    wrap('bindBuffer', (a) => { s.bufBound.set(a[0], a[1]); });
    wrap('deleteBuffer', (a) => { s.buf.delete(a[0]); });
    wrap('bufferData', (a) => { const b = s.bufBound.get(a[0]); if (!b) return; const v = a[1]; s.buf.set(b, typeof v === 'number' ? v : v?.byteLength ?? 0); });
  }
  const origGet = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = origGet.call(this, type, ...rest);
    if (gl && /webgl/.test(type)) track(gl);
    return gl;
  };
  if (typeof OffscreenCanvas !== 'undefined') {
    const o = OffscreenCanvas.prototype.getContext;
    OffscreenCanvas.prototype.getContext = function (type, ...rest) { const gl = o.call(this, type, ...rest); if (gl && /webgl/.test(type)) track(gl); return gl; };
  }
  const MB = (b) => Math.round(b / 1048576 * 10) / 10;
  window.__gpuReport = (top = 0) => {
    return ctxs.map((gl, i) => {
      const s = gl.__mem;
      let tex = 0; const list = [];
      for (const [, e] of s.tex) { let b = 0; for (const v of e.levels.values()) b += v; if (e.mips && e.levels.size === 1 && !e.levels.has('storage:0')) b *= 4 / 3; tex += b; list.push([b, e.w + 'x' + e.h + (e.mips ? ' mip' : '') + ' ' + (e.src || '')]); }
      let rb = 0; for (const v of s.rb.values()) rb += v;
      let buf = 0; for (const v of s.buf.values()) buf += v;
      const c = s.canvas;
      const fb = (c.width || 0) * (c.height || 0) * 4 * 2;
      list.sort((a, b) => b[0] - a[0]);
      return { ctx: i, lost: gl.isContextLost(), attached: !!(c.isConnected), canvas: c.width + 'x' + c.height, textures: s.tex.size, texMB: MB(tex), rbMB: MB(rb), bufMB: MB(buf), drawBufMB: MB(fb), totalMB: MB(tex + rb + buf + fb), top: list.slice(0, top).map(([b, d]) => MB(b) + 'MB ' + d) };
    });
  };
})();
