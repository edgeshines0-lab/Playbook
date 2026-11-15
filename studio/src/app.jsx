// EDGE SHINES | HOLIDAY LIGHTING SALES STUDIO
import { Icon, Btn, Toasts, toast, Badge, Empty, Input } from './ui.jsx';
import { initCaps, useCaps, useLeads, useSettings, saveLead, deleteLead, saveSettings, markSettingsEdited, LS, caps, images } from './storage.js';
import { newQuote, normQuote, calc, WREATH_SIZES, LEVELS } from './pricing.js';
import { LiveCall } from './live.jsx';
import { Dashboard, Leads, MeasurePage, KBPage, Templates, SettingsPage, StorageNote, LevelBadge } from './pages.jsx';
import { search } from './kb.js';
import { clone, firstName, todayISO, num, money, fmtDateTime } from './util.js';
const { useState, useEffect, useRef, useMemo } = React;

const ROUTES = [
  { k: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { k: 'quote', label: 'New Quote', icon: 'phone' },
  { k: 'leads', label: 'Leads', icon: 'users' },
  { k: 'measuring', label: 'Measuring', icon: 'ruler' },
  { k: 'kb', label: 'Knowledge Base', icon: 'book' },
  { k: 'templates', label: 'Templates', icon: 'message' },
  { k: 'pricing', label: 'Pricing & Settings', icon: 'sliders' }
];
const routeFromHash = () => { const h = location.hash.slice(1); return ROUTES.some(r => r.k === h) ? h : 'dashboard'; };

function useNames(ids) {
  const c = useCaps();
  const [names, setNames] = useState({});
  const key = ids.join(',');
  useEffect(() => {
    if (!c.user || !ids.length) return undefined;
    let live = true;
    c.user.profiles(ids).then(ps => { if (live) setNames(Object.fromEntries(Object.entries(ps || {}).map(([id, p]) => [id, (p && p.name) || '']))); }, () => {});
    return () => { live = false; };
  }, [key, !!c.user]);
  return names;
}

function TopSearch({ onGo }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const r = q.trim() ? search(q, 5) : null;
  const go = () => { if (q.trim()) { onGo(q); setOpen(false); } };
  return <div className="tsearch">
    <Icon n="search" size={18} />
    <input className="inp" value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 160)}
      onKeyDown={e => { if (e.key === 'Enter') go(); if (e.key === 'Escape') setOpen(false); }} placeholder="Search the playbook: “What happens if they cancel?”" aria-label="Search the playbook" />
    {open && r && <div className="tsugg" role="listbox">
      {r.res.length ? r.res.map(x => <button type="button" key={x.e.i} onMouseDown={e => e.preventDefault()} onClick={go}><span className="tp">{x.e.type}</span><b>{x.e.title}</b><small>{x.e.body.length > 120 ? x.e.body.slice(0, 118) + '…' : x.e.body}</small></button>) : <div className="small muted pad">Nothing matches yet. Press Enter to search anyway.</div>}
      <button type="button" className="all" onMouseDown={e => e.preventDefault()} onClick={go}>See all answers →</button>
    </div>}
  </div>;
}

function NoQuote({ leads, S, onNew, onOpen }) {
  const open = leads.filter(l => !['won', 'lost'].includes(l.status)).slice(0, 6);
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Live call</div><h1>Start a quote</h1></div></div>
    <Empty icon="phone" title="Ready when the phone rings" action={<Btn kind="primary" icon="phone" onClick={onNew}>Start new quote</Btn>}>Live Call walks you from the opening script to the FLYRA handoff, with the price updating as you measure.</Empty>
    {open.length > 0 && <section className="card"><header className="card-h"><h3>Pick up where you left off</h3></header><div className="list">{open.map(l => { const q = normQuote(l), c = calc(q, S); return <button type="button" key={l.id} className="li" onClick={() => onOpen(l.id)}><span><b>{q.customer.name || 'Unnamed lead'}</b><small>{q.customer.address || 'No address'} · {fmtDateTime(q.updatedAt)}</small></span><span className="li-r"><b className="tnum">{c.total ? money(c.total) : '—'}</b></span></button>; })}</div></section>}
  </div>;
}

function App() {
  const c = useCaps();
  useEffect(() => { initCaps(); }, []);
  const { leads, state } = useLeads();
  const [S, setSraw] = useSettings();
  const [route, setRoute] = useState(routeFromHash);
  const [leadFilter, setLeadFilter] = useState(null);
  const [activeId, setActiveId] = useState(() => LS.get('active', null));
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null), saveT = useRef(null), sT = useRef(null);
  const [saveState, setSaveState] = useState('saved');
  const [kbQ, setKbQ] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [localName, setLocalName] = useState(() => LS.get('repName', ''));
  const me = Object.assign({}, c.me, { name: c.me.name || localName });

  const nav = (k, extra) => {
    setRoute(k); if (k === 'leads') setLeadFilter(extra || null);
    if (location.hash.slice(1) !== k) history.replaceState(null, '', '#' + k);
    setNavOpen(false); window.scrollTo(0, 0);
  };
  useEffect(() => { const f = () => setRoute(routeFromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => { const h = document.querySelector('.top'); const f = () => h && document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px'); f(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);

  // The quote being worked on
  useEffect(() => {
    if (!activeId) { draftRef.current = null; setDraft(null); return; }
    if (draftRef.current && draftRef.current.id === activeId) return;
    const l = leads.find(x => x.id === activeId);
    if (l) { const q = normQuote(clone(l)); draftRef.current = q; setDraft(q); }
  }, [activeId, leads]);
  const flushNow = () => { if (saveT.current) { clearTimeout(saveT.current); saveT.current = null; if (draftRef.current) saveLead(draftRef.current); setSaveState('saved'); } };
  const set = fn => {
    const prev = draftRef.current; if (!prev) return;
    const d = clone(prev); fn(d); d.updatedAt = new Date().toISOString();
    draftRef.current = d; setDraft(d); setSaveState('saving');
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => { saveT.current = null; saveLead(draftRef.current); setSaveState('saved'); }, 600);
  };
  useEffect(() => {
    const f = () => { if (document.visibilityState === 'hidden') flushNow(); };
    window.addEventListener('pagehide', flushNow); document.addEventListener('visibilitychange', f);
    return () => { window.removeEventListener('pagehide', flushNow); document.removeEventListener('visibilitychange', f); };
  }, []);
  const startNew = () => { flushNow(); const q = newQuote(c.me); saveLead(q); draftRef.current = q; setDraft(q); setActiveId(q.id); LS.set('active', q.id); nav('quote'); };
  const openLead = id => { flushNow(); const l = leads.find(x => x.id === id); if (!l) return; const q = normQuote(clone(l)); draftRef.current = q; setDraft(q); setActiveId(id); LS.set('active', id); nav('quote'); };
  const updateLead = (id, fn) => {
    if (id === activeId && draftRef.current) { set(fn); return; }
    const l = leads.find(x => x.id === id); if (!l) return;
    const d = normQuote(clone(l)); fn(d); d.updatedAt = new Date().toISOString(); saveLead(d);
  };
  const removeLead = async id => {
    const l = leads.find(x => x.id === id);
    await deleteLead(id);
    images.del('photo:' + id);
    ((l && l.mockup && l.mockup.images) || []).forEach(im => images.del('mock:' + id + ':' + im.id));
    if (id === activeId) { setActiveId(null); LS.set('active', null); draftRef.current = null; setDraft(null); }
    toast('Lead deleted');
  };
  const importBackup = async file => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()); const arr = Array.isArray(data) ? data : data && data.leads;
      if (!Array.isArray(arr)) throw new Error('bad');
      let n = 0; arr.forEach(l => { if (l && l.id && l.customer) { saveLead(normQuote(l)); n++; } });
      toast(`Restored ${n} lead${n === 1 ? '' : 's'}`);
    } catch (e) { toast('That file isn’t a Sales Studio backup.', 'bad'); }
  };
  const setS = n => { markSettingsEdited(); setSraw(n); clearTimeout(sT.current); sT.current = setTimeout(() => saveSettings(n), 500); };

  const ids = useMemo(() => [...new Set(leads.map(l => l.createdBy).filter(Boolean).concat(c.me.id ? [c.me.id] : []))], [leads, c.me.id]);
  const names = useNames(ids);
  const approvalsNeeded = [S.rates.roof, S.rates.mini, S.rates.stake, ...WREATH_SIZES.map(s => S.wreaths[s]), S.garland, S.deposit].filter(P => num(P.value) && !P.approved).length;
  const due = leads.filter(l => l.next && l.next.date && l.next.date <= todayISO() && !['won', 'lost'].includes(l.status)).length;
  const repFirst = firstName(me.name);
  const rep = t => (repFirst ? String(t).replace(/\bEmily\b/g, repFirst) : String(t));
  const storage = c.ready.db ? (c.db ? (c.readOnly ? 'local' : state) : 'local') : 'loading';

  let page;
  if (route === 'dashboard') page = <Dashboard leads={leads} S={S} me={me} names={names} onNew={startNew} onOpen={openLead} go={nav} approvalsNeeded={approvalsNeeded} />;
  else if (route === 'quote') page = draft ? <LiveCall q={draft} set={set} S={S} me={me} saveState={saveState} onExit={() => { flushNow(); nav('leads'); toast('Quote saved'); }} /> : <NoQuote leads={leads} S={S} onNew={startNew} onOpen={openLead} />;
  else if (route === 'leads') page = <Leads key={leadFilter || 'all'} leads={leads} S={S} names={names} onOpen={openLead} onNew={startNew} onUpdate={updateLead} onDelete={removeLead} onImport={importBackup} storage={storage} initialFilter={leadFilter} />;
  else if (route === 'measuring') page = <MeasurePage q={draft} set={set} S={S} onNew={startNew} />;
  else if (route === 'kb') page = <KBPage initial={kbQ} rep={rep} />;
  else if (route === 'templates') page = <Templates leads={leads} activeId={activeId} S={S} me={me} />;
  else page = <SettingsPage S={S} setS={setS} me={me} names={names} />;

  return <div className={'app ' + (navOpen ? 'nav-open' : '')}>
    <aside className="side" aria-label="Main navigation">
      <button type="button" className="brand" onClick={() => nav('dashboard')}><span className="b1">EDGE SHINES</span><span className="b2">Holiday Lighting Sales Studio</span></button>
      <nav className="navlist">{ROUTES.map(r => <button type="button" key={r.k} className="navi" aria-current={route === r.k ? 'page' : undefined} onClick={() => (r.k === 'quote' && !draft ? startNew() : nav(r.k))} title={r.label}>
        <Icon n={r.icon} size={19} /><span className="nl">{r.k === 'quote' && draft ? 'Live Call' : r.label}</span>
        {r.k === 'leads' && due > 0 && <span className="nb">{due}</span>}
        {r.k === 'pricing' && approvalsNeeded > 0 && (me.isOwner || me.canEdit || !c.db) && <span className="nb warn">{approvalsNeeded}</span>}
      </button>)}</nav>
      <div className="side-foot">
        <div className={'sync ' + (storage === 'shared' ? 'ok' : '')}><Icon n={storage === 'shared' ? 'cloud' : 'device'} size={15} /><span>{storage === 'shared' ? 'Shared with your team' : storage === 'loading' ? 'Connecting…' : 'Saved on this device'}</span></div>
        {c.me.name ? <div className="who"><span className="av">{repFirst.charAt(0)}</span><span>{me.name}</span></div>
          : <label className="who-in"><span>Your name (for scripts)</span><Input value={localName} onChange={v => { setLocalName(v); LS.set('repName', v); }} placeholder="First name" /></label>}
      </div>
    </aside>
    <div className="scrim" onClick={() => setNavOpen(false)} />
    <div className="body">
      <header className="top">
        <Btn kind="subtle" icon="menu" className="menu-btn" aria-label="Open menu" onClick={() => setNavOpen(true)} />
        <TopSearch onGo={q => { setKbQ(q); nav('kb'); }} />
        <Btn kind="primary" icon="plus" className="new-btn" onClick={startNew}>Start new quote</Btn>
      </header>
      <main className="main">{page}</main>
    </div>
    <Toasts />
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
