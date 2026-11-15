// Shared UI kit.
const { useState, useEffect, useRef } = React;

const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  sparkle: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  zin: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>', zout: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  wand: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  device: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>'
};
export function Icon({ n, size = 18, className }) {
  return <svg className={'ic ' + (className || '')} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[n] || '' }} />;
}

/* ---------- Toasts ---------- */
const toastSubs = new Set();
export const toast = (msg, tone) => toastSubs.forEach(f => f({ msg, tone, id: Math.random() }));
export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const f = t => { setItems(x => [...x.slice(-2), t]); setTimeout(() => setItems(x => x.filter(y => y.id !== t.id)), 2600); };
    toastSubs.add(f); return () => { toastSubs.delete(f); };
  }, []);
  return <div className="toasts" role="status" aria-live="polite">{items.map(t => <div key={t.id} className={'toast ' + (t.tone || '')}>{t.msg}</div>)}</div>;
}

/* ---------- Clipboard ---------- */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e2) { return false; }
  }
}
export function CopyBtn({ text, get, label = 'Copy', kind = 'ghost', size = 'sm', className }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    const t = get ? get() : text; if (!t) return;
    const ok = await copyText(t);
    if (!ok) { toast('Copy was blocked. Select the text and press Ctrl+C.', 'bad'); return; }
    setDone(true); setTimeout(() => setDone(false), 1400);
    toast(/\[[^\]]+\]|\$_{2,}|___/.test(t) ? 'Copied. Fill in the blanks before sending.' : 'Copied');
  };
  return <Btn kind={done ? 'ok' : kind} size={size} icon={done ? 'check' : 'copy'} onClick={go} className={className}>{done ? 'Copied' : label}</Btn>;
}

/* ---------- Basics ---------- */
export function Btn({ kind = 'ghost', size, icon, iconRight, children, className, ...rest }) {
  return <button type="button" className={`btn ${kind} ${size || ''} ${className || ''}`} {...rest}>{icon && <Icon n={icon} size={size === 'sm' ? 16 : 18} />}{children != null && <span>{children}</span>}{iconRight && <Icon n={iconRight} size={16} />}</button>;
}
export function Card({ title, sub, action, children, className, id, tight }) {
  return <section className={`card ${tight ? 'tight' : ''} ${className || ''}`} id={id}>
    {(title || action) && <header className="card-h"><div>{title && <h3>{title}</h3>}{sub && <p className="muted small">{sub}</p>}</div>{action && <div className="row">{action}</div>}</header>}
    {children}
  </section>;
}
export function Field({ label, hint, children, className }) {
  return <label className={'field ' + (className || '')}><span className="flabel">{label}</span>{children}{hint && <span className="fhint">{hint}</span>}</label>;
}
export function Input({ value, onChange, ...rest }) {
  return <input className="inp" value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}
export function NumIn({ value, onChange, suffix, prefix, className, ...rest }) {
  return <span className={'numin ' + (className || '')}>{prefix && <i>{prefix}</i>}<input className="inp" inputMode="decimal" value={value ?? ''} onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} {...rest} />{suffix && <i>{suffix}</i>}</span>;
}
export function Select({ value, onChange, options, className, ...rest }) {
  return <select className={className || 'inp'} value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest}>{options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.k} value={o.k}>{o.label}</option>)}</select>;
}
export function Toggle({ on, onChange, label, disabled }) {
  return <button type="button" role="switch" aria-checked={!!on} disabled={disabled} className={'toggle ' + (on ? 'on' : '')} onClick={() => onChange(!on)}><span className="knob" /><span className="tl">{label}</span></button>;
}
export function Check({ on, onChange, children, disabled }) {
  return <label className={'chk ' + (disabled ? 'dis' : '')}><input type="checkbox" checked={!!on} disabled={disabled} onChange={e => onChange(e.target.checked)} /><span>{children}</span></label>;
}
export function Chip({ on, onClick, children, icon }) {
  return <button type="button" className={'chip ' + (on ? 'on' : '')} aria-pressed={!!on} onClick={onClick}>{icon && <Icon n={icon} size={15} />}{children}</button>;
}
export function Badge({ tone = 'neutral', icon, children }) {
  return <span className={'badge ' + tone}>{icon && <Icon n={icon} size={14} />}{children}</span>;
}
export function Seg({ value, onChange, options }) {
  return <div className="seg" role="group">{options.map(o => <button type="button" key={o.k} aria-pressed={value === o.k} onClick={() => onChange(o.k)}>{o.label}</button>)}</div>;
}
export function Empty({ icon = 'sparkle', title, children, action }) {
  return <div className="empty"><Icon n={icon} size={26} /><b>{title}</b>{children && <p className="muted">{children}</p>}{action}</div>;
}
export function Note({ tone = 'warn', icon, title, children, src }) {
  return <div className={'note ' + tone}><Icon n={icon || (tone === 'ok' ? 'check' : tone === 'info' ? 'bulb' : 'alert')} size={18} /><div>{title && <b>{title} </b>}{children}{src && <div className="src">{src}</div>}</div></div>;
}
export function Modal({ open, onClose, title, children, wide, actions }) {
  useEffect(() => {
    if (!open) return undefined;
    const f = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [open]);
  if (!open) return null;
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={'modal ' + (wide ? 'wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-h"><h2>{title}</h2><div className="row">{actions}<Btn kind="subtle" icon="x" onClick={onClose} aria-label="Close" /></div></header>
      <div className="modal-b">{children}</div>
    </div>
  </div>;
}
export function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const f = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [open]);
  return <aside className={'drawer ' + (open ? 'open' : '')} aria-hidden={!open} aria-label={title}>
    <header className="drawer-h"><h2>{title}</h2><Btn kind="subtle" icon="x" onClick={onClose} aria-label="Close" /></header>
    <div className="drawer-b">{open && children}</div>
  </aside>;
}
export function Say({ label, text, src, after, big, extra }) {
  return <div className={'say ' + (big ? 'big' : '')}>
    <div className="say-h"><span className="eyebrow">{label}</span><CopyBtn text={text} /></div>
    <p className="say-t">{text}</p>
    {(after || src) && <div className="say-f">{after ? <span className="muted small">{after}</span> : <span />}{src && <span className="src">{src}</span>}</div>}
    {extra}
  </div>;
}
export function Collapse({ title, children, open: o, right }) {
  const [open, setOpen] = useState(!!o);
  return <div className={'collapse ' + (open ? 'open' : '')}>
    <button type="button" className="collapse-h" aria-expanded={open} onClick={() => setOpen(!open)}><Icon n="right" size={16} className="chev" /><span>{title}</span>{right}</button>
    {open && <div className="collapse-b">{children}</div>}
  </div>;
}
export function useDebounced(fn, ms) {
  const t = useRef(); const f = useRef(fn); f.current = fn;
  useEffect(() => () => clearTimeout(t.current), []);
  return (...a) => { clearTimeout(t.current); t.current = setTimeout(() => f.current(...a), ms); };
}
