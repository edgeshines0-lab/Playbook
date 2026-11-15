// Measuring workspace: map links + a screenshot tracer that only reports feet once a real scale is set.
import { Icon, Btn, Seg, NumIn, Select, Note, toast, Input } from './ui.jsx';
import { images, shrinkImage } from './storage.js';
import { lineFt, ftPerPx } from './pricing.js';
import { num, round2, pitchFactor } from './util.js';
const { useState, useEffect, useRef } = React;

export const KINDS = [
  { k: 'roof', label: 'Roofline', color: '#22c55e' },
  { k: 'peak', label: 'Peak / gable', color: '#f59e0b' },
  { k: 'garage', label: 'Garage', color: '#38bdf8' },
  { k: 'stake', label: 'Ground stakes', color: '#c084fc' },
  { k: 'garland', label: 'Garland', color: '#2dd4bf' },
  { k: 'note', label: 'Note only', color: '#f8fafc' }
];
const KIND = Object.fromEntries(KINDS.map(k => [k.k, k]));
export const PITCHES = [{ k: '', label: 'Pitch unknown' }, ...[4, 6, 8, 10, 12].map(p => ({ k: String(p), label: `${p}/12  (×${pitchFactor(p).toFixed(2)})` }))];

export function mapLinks(addr) {
  const a = encodeURIComponent(addr || '');
  return [
    { label: 'Google Maps', sub: 'Satellite + scale bar', href: `https://www.google.com/maps/search/?api=1&query=${a}` },
    { label: 'Google Earth', sub: '3D view and ruler', href: `https://earth.google.com/web/search/${a}` },
    { label: 'Bing aerial', sub: 'Second satellite view', href: `https://www.bing.com/maps?q=${a}&style=a` },
    { label: 'Bing bird’s eye', sub: 'Angled view of the front', href: `https://www.bing.com/maps?q=${a}&style=o` },
    { label: 'Zillow', sub: 'Listing photos for mockups', href: `https://www.zillow.com/homes/${a}_rb/` }
  ];
}
export function MapLinks({ address }) {
  if (!String(address || '').trim()) return <Note tone="info" title="Add the property address first.">Then these buttons open the house in Google Maps, Google Earth, Bing and Zillow.</Note>;
  return <div className="maplinks">{mapLinks(address).map(l => <a key={l.label} className="maplink" href={l.href} target="_blank" rel="noopener noreferrer"><Icon n="external" size={15} /><span><b>{l.label}</b><small>{l.sub}</small></span></a>)}</div>;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const defaultLabel = (kind, n) => ({ roof: 'Front roofline', peak: 'Front peak', garage: 'Garage', stake: 'Ground stakes', garland: 'Garland', note: 'Note' }[kind] + (n > 1 ? ' ' + n : ''));

export function MeasureTool({ q, set }) {
  const key = 'photo:' + q.id;
  const photo = q.photo || { lines: [], calib: null };
  const [img, setImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('roof');
  const [pts, setPts] = useState([]);
  const [hover, setHover] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pending, setPending] = useState(null);
  const [calFt, setCalFt] = useState('20');
  const [wrapW, setWrapW] = useState(800);
  const [drag, setDrag] = useState(false);
  const wrapRef = useRef(), cvRef = useRef(), fileRef = useRef();
  const k = ftPerPx(photo);

  const loadBlob = b => { const url = URL.createObjectURL(b); const im = new Image(); im.onload = () => setImg(im); im.src = url; };
  useEffect(() => { let live = true; setImg(null); setLoading(true); images.get(key).then(b => { if (!live) return; if (b) loadBlob(b); setLoading(false); }); return () => { live = false; }; }, [q.id]);

  async function takeFile(file) {
    if (!file || !/^image\//.test(file.type || '')) { toast('Paste or choose an image. A screenshot works best.', 'bad'); return; }
    try {
      const b = await shrinkImage(file, 2400);
      await images.put(key, b); loadBlob(b);
      set(d => {
        // Lines from an older screenshot no longer line up: keep their feet as typed values and start fresh.
        const old = d.photo || { lines: [] };
        const keep = row => { if (row.lineId) { const ln = (old.lines || []).find(l => l.id === row.lineId); row.ft = ln ? String(lineFt(old, ln) || '') : row.ft; delete row.lineId; } };
        d.roof.forEach(keep); d.stakes.forEach(keep); d.garland.forEach(keep);
        d.photo = { lines: [], calib: null, hasImage: true };
      });
      setPts([]); setPending(null); setZoom(1); setMode('calib');
      toast('Screenshot added. Now set the scale.');
    } catch (e) { toast(e.message || 'Could not read that image.', 'bad'); }
  }
  useEffect(() => {
    const f = e => { const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { e.preventDefault(); takeFile(it.getAsFile()); return; } } };
    window.addEventListener('paste', f); return () => window.removeEventListener('paste', f);
  }, [q.id]);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth)); ro.observe(el); setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, [img]);
  const fit = img ? (wrapW - 4) / img.naturalWidth : 1;
  const scale = fit * zoom;

  useEffect(() => {
    const cv = cvRef.current; if (!cv || !img) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.drawImage(img, 0, 0);
    const lw = 3.2 / scale, fs = 13 / scale;
    const label = (x, y, text, color) => {
      ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      const tw = ctx.measureText(text).width, pad = 4 / scale;
      ctx.fillStyle = 'rgba(10,16,13,.82)'; ctx.fillRect(x - tw / 2 - pad, y - fs - pad, tw + pad * 2, fs + pad * 2);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(text, x, y + pad / 2);
    };
    const path = (P, color, dashed) => {
      if (P.length < 1) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.setLineDash(dashed ? [8 / scale, 6 / scale] : []);
      ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = lw + 2.5 / scale;
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.setLineDash([]);
      P.forEach(p => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2 / scale, 0, Math.PI * 2); ctx.fill(); });
    };
    const mid = P => { let best = 0, bi = 1; for (let i = 1; i < P.length; i++) { const d = dist(P[i], P[i - 1]); if (d > best) { best = d; bi = i; } } return [(P[bi][0] + P[bi - 1][0]) / 2, (P[bi][1] + P[bi - 1][1]) / 2]; };
    if (photo.calib) { const P = [photo.calib.a, photo.calib.b]; path(P, '#f87171', true); const m = mid(P); label(m[0], m[1] - 6 / scale, `Scale ${num(photo.calib.ft)} ft`, '#fecaca'); }
    (photo.lines || []).forEach(l => {
      const col = (KIND[l.kind] || KIND.note).color; path(l.pts, col, l.kind === 'note');
      const m = mid(l.pts), ft = lineFt(photo, l);
      label(m[0], m[1] - 6 / scale, `${l.label || ''}${l.kind === 'note' ? '' : k ? ` · ${ft} ft` : ' · no scale'}`, col);
    });
    const cur = hover && pts.length ? [...pts, hover] : pts;
    if (cur.length) {
      const col = mode === 'calib' ? '#f87171' : (KIND[mode] || KIND.roof).color;
      path(cur, col, mode === 'calib' || mode === 'note');
      if (cur.length > 1 && mode !== 'calib' && k) { let L = 0; for (let i = 1; i < cur.length; i++) L += dist(cur[i], cur[i - 1]); const e = cur[cur.length - 1]; label(e[0], e[1] - 10 / scale, `${round2(L * k)} ft`, col); }
    }
  });

  const toImg = e => { const r = cvRef.current.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * img.naturalWidth, (e.clientY - r.top) / r.height * img.naturalHeight]; };
  function onClick(e) {
    if (!img || pending) return;
    const p = toImg(e);
    if (mode === 'calib') { const np = [...pts, p]; if (np.length >= 2) { setPending({ a: np[0], b: np[1] }); setPts([]); } else setPts(np); return; }
    setPts(prev => (prev.length && dist(prev[prev.length - 1], p) < 3 / scale ? prev : [...prev, p]));
  }
  function finish() {
    if (mode === 'calib') return;
    const P = pts; if (P.length < 2) { setPts([]); return; }
    const id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
    set(d => {
      d.photo = d.photo || { lines: [], calib: null };
      const n = d.photo.lines.filter(l => l.kind === mode).length + 1, label = defaultLabel(mode, n);
      d.photo.lines.push({ id, kind: mode, pts: P.map(p => [round2(p[0]), round2(p[1])]), label, pitch: '' });
      if (mode === 'roof' || mode === 'peak' || mode === 'garage') d.roof.push({ id: 'r_' + id, label, area: mode === 'roof' ? 'front' : mode, lineId: id, include: true, source: 'photo', verified: false });
      else if (mode === 'stake') d.stakes.push({ id: 's_' + id, label, lineId: id, include: true, source: 'photo', verified: false });
      else if (mode === 'garland') d.garland.push({ id: 'g_' + id, label, lineId: id, pieces: '', include: true });
    });
    setPts([]);
  }
  function setScale() {
    if (!num(calFt) || !pending) return;
    set(d => { d.photo.calib = { a: pending.a.map(round2), b: pending.b.map(round2), ft: String(num(calFt)) }; });
    setPending(null); setMode('roof');
    toast('Scale set. Now trace the edges you’re quoting.');
  }
  useEffect(() => {
    const f = e => {
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
      if (e.key === 'Enter' && pts.length) { e.preventDefault(); finish(); }
      else if (e.key === 'Escape' && (pts.length || pending)) { setPts([]); setPending(null); }
      else if (e.key === 'Backspace' && pts.length) { e.preventDefault(); setPts(p => p.slice(0, -1)); }
    };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });
  const updLine = (id, fn) => set(d => { const l = d.photo.lines.find(x => x.id === id); if (l) fn(l, d); });
  const delLine = id => set(d => {
    d.photo.lines = d.photo.lines.filter(l => l.id !== id);
    ['roof', 'stakes', 'garland'].forEach(g => { d[g] = d[g].filter(r => r.lineId !== id); });
  });
  const clearAll = async () => {
    await images.del(key); setImg(null); setPts([]); setPending(null);
    set(d => { const keep = row => { if (row.lineId) { const ln = (d.photo.lines || []).find(l => l.id === row.lineId); row.ft = ln ? String(lineFt(d.photo, ln) || '') : row.ft; delete row.lineId; } }; d.roof.forEach(keep); d.stakes.forEach(keep); d.garland.forEach(keep); d.photo = { lines: [], calib: null }; });
    toast('Screenshot removed. Traced feet stay in the quote as typed values.');
  };

  const drop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) takeFile(f); };
  const fileIn = <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { takeFile(e.target.files[0]); e.target.value = ''; }} />;

  if (loading) return <div className="mt-empty muted">Loading…</div>;
  if (!img) return <div className={'mt-drop ' + (drag ? 'drag' : '')} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={drop}>
    {fileIn}
    <Icon n="image" size={30} />
    <b>Paste a satellite screenshot here</b>
    <p className="muted">Open the house in Google Maps (Satellite) or Google Earth, zoom in until the roof fills the screen with the scale bar showing, take a screenshot, then press <kbd>Ctrl</kbd>+<kbd>V</kbd> (<kbd>⌘</kbd>+<kbd>V</kbd> on Mac).</p>
    <div className="row center"><Btn kind="primary" icon="upload" onClick={() => fileRef.current.click()}>Choose a screenshot</Btn></div>
    {(photo.lines || []).length > 0 && <Note tone="info">This quote has {photo.lines.length} traced line(s), but its screenshot was added on another device. Their feet are still in the quote.</Note>}
  </div>;

  const traced = (photo.lines || []);
  return <div className="mt">
    {fileIn}
    <div className="mt-bar">
      <Seg value={mode} onChange={m => { setMode(m); setPts([]); setPending(null); }} options={[{ k: 'calib', label: k ? 'Scale ✓' : 'Set scale' }, ...KINDS.map(x => ({ k: x.k, label: x.label }))]} />
      <div className="row">
        <Btn size="sm" icon="undo" onClick={() => setPts(p => p.slice(0, -1))} disabled={!pts.length}>Undo point</Btn>
        <Btn size="sm" kind="primary" icon="check" onClick={finish} disabled={mode === 'calib' || pts.length < 2}>Finish line</Btn>
        <span className="sep" />
        <Btn size="sm" icon="zout" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.5, round2(z / 1.25)))} />
        <span className="small muted tnum">{Math.round(zoom * 100)}%</span>
        <Btn size="sm" icon="zin" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(6, round2(z * 1.25)))} />
        <Btn size="sm" onClick={() => setZoom(1)}>Fit</Btn>
      </div>
    </div>
    {!k && !pending && <Note tone="warn" title={mode === 'calib' ? 'Click both ends of the map’s scale bar.' : 'No scale yet.'}>{mode === 'calib' ? 'Google Maps shows it bottom-right (click it to switch to feet). Any known length works too, like a two-car garage door you’ve measured.' : 'Lines can be traced now, but they show feet only after you set the scale.'}</Note>}
    {pending && <div className="mt-cal"><b>How long is the line you just drew?</b><NumIn value={calFt} onChange={setCalFt} suffix="ft" autoFocus onKeyDown={e => { if (e.key === 'Enter') setScale(); }} /><Btn kind="primary" onClick={setScale} disabled={!num(calFt)}>Set scale</Btn><Btn kind="subtle" onClick={() => setPending(null)}>Cancel</Btn></div>}
    {k > 0 && !pending && <div className="small muted">Scale: {num(photo.calib.ft)} ft = {Math.round(Math.hypot(photo.calib.b[0] - photo.calib.a[0], photo.calib.b[1] - photo.calib.a[1]))} px. {mode !== 'calib' && 'Click along an edge; double-click or press Enter to finish the line.'}</div>}
    <div className="mt-canvas" ref={wrapRef}>
      <canvas ref={cvRef} className={'mt-cv ' + (mode === 'calib' ? 'cal' : '')} onClick={onClick} onDoubleClick={e => { e.preventDefault(); finish(); }} onMouseMove={e => img && pts.length && setHover(toImg(e))} onMouseLeave={() => setHover(null)} aria-label="Screenshot for tracing" />
    </div>
    <div className="row between">
      <span className="small muted">Traced lines go straight into the quote. A top-down view misses roof slope, so set the pitch on peaks.</span>
      <div className="row"><Btn size="sm" icon="image" onClick={() => fileRef.current.click()}>Replace screenshot</Btn><Btn size="sm" kind="subtle" icon="trash" onClick={clearAll}>Remove</Btn></div>
    </div>
    {traced.length > 0 && <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th></th><th>Line</th><th>Type</th><th>Roof pitch</th><th className="r">Feet</th><th></th></tr></thead>
      <tbody>{traced.map(l => <tr key={l.id}>
        <td><span className="dot" style={{ background: (KIND[l.kind] || KIND.note).color }} /></td>
        <td><Input value={l.label} onChange={v => updLine(l.id, (x, d) => { x.label = v; ['roof', 'stakes', 'garland'].forEach(g => d[g].forEach(r => { if (r.lineId === l.id) r.label = v; })); })} aria-label="Line name" /></td>
        <td className="small">{(KIND[l.kind] || {}).label}</td>
        <td>{l.kind === 'peak' ? <Select value={l.pitch || ''} onChange={v => updLine(l.id, x => { x.pitch = v; })} options={PITCHES} aria-label="Roof pitch" /> : <span className="muted small">—</span>}</td>
        <td className="r tnum"><b>{l.kind === 'note' ? '—' : k ? lineFt(photo, l) : 'no scale'}</b></td>
        <td className="r"><Btn size="sm" kind="subtle" icon="trash" aria-label="Delete line" onClick={() => delLine(l.id)} /></td>
      </tr>)}</tbody></table></div>}
  </div>;
}
