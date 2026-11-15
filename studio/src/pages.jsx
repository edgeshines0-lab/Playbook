// Dashboard, Leads, Measuring, Knowledge Base, Templates, Pricing & Settings.
import { Icon, Btn, Card, Field, Input, NumIn, Select, Toggle, Check, Chip, Badge, Seg, Note, Say, Collapse, CopyBtn, Empty, toast, useDebounced } from './ui.jsx';
import { calc, normQuote, LEVELS, RATE_PRESETS, WREATH_SIZES, YEARS, scopeText, defaultSettings } from './pricing.js';
import { WB, FL } from './data.js';
import { KB, search, SUGGEST, FLAGS, aiPrompt, canonOf, OBJECTIONS, CLAUSES } from './kb.js';
import { caps, LS, saveFile, canEditSettings } from './storage.js';
import { STATUSES, MockupStudio, QuoteSections, PriceTable } from './live.jsx';
import { MeasureTool, MapLinks } from './measure.jsx';
import { ObjectionPanel } from './objections.jsx';
import { fillTemplate } from './estimate.jsx';
import { money, num, fmtDate, fmtDateTime, todayISO, firstName, uid, clone, plural } from './util.js';
const { useState, useEffect, useMemo } = React;

const statusLabel = k => (STATUSES.find(s => s.k === k) || {}).label || k;
const isDue = l => l.next && l.next.date && l.next.date <= todayISO() && !['won', 'lost'].includes(l.status);
export function LevelBadge({ level }) { const lv = LEVELS[level]; return <Badge tone={lv.tone} icon={level === 'verified' ? 'shield' : 'alert'}>{lv.label}</Badge>; }

/* ---------- Dashboard ---------- */
export function Dashboard({ leads, S, me, names, onNew, onOpen, go, approvalsNeeded }) {
  const [rep, setRep] = useState('all');
  const [range, setRange] = useState('all');
  const [welcome, setWelcome] = useState(() => !LS.get('welcomed', false));
  const since = range === '7' ? Date.now() - 7 * 864e5 : range === '30' ? Date.now() - 30 * 864e5 : range === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() : 0;
  const reps = useMemo(() => [...new Set(leads.map(l => l.createdBy || ''))], [leads]);
  const rows = useMemo(() => leads.filter(l => (rep === 'all' || (l.createdBy || '') === rep) && (!since || Date.parse(l.createdAt || 0) >= since)).map(l => { const q = normQuote(l); return { l: q, c: calc(q, S) }; }), [leads, rep, range, S]);
  const quotes = rows.filter(r => r.c.total > 0);
  const won = rows.filter(r => r.l.status === 'won');
  const accepted = rows.filter(r => r.l.outcome === 'accepted' || r.l.status === 'won');
  const quoted = quotes.reduce((s, r) => s + r.c.total, 0), wonRev = won.reduce((s, r) => s + r.c.total, 0);
  const due = rows.filter(r => isDue(r.l));
  const M = (label, value, sub) => <div className="metric"><span className="m-l">{label}</span><span className="m-v tnum">{value}</span>{sub && <span className="m-s">{sub}</span>}</div>;
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Holiday lighting sales</div><h1>Dashboard</h1></div></div>
    {welcome && <Card className="welcome" title="Welcome to the Sales Studio" action={<Btn size="sm" kind="subtle" icon="x" onClick={() => { LS.set('welcomed', true); setWelcome(false); }}>Dismiss</Btn>}>
      <ol className="steps3">
        <li><b>Owner: approve prices.</b> Open Pricing &amp; Settings, check the rates and the wreath and garland prices from FLYRA, and approve them. Until then every quote is marked Preliminary.</li>
        <li><b>When the phone rings, press Start new quote.</b> Live Call walks you through 8 steps with the approved script.</li>
        <li><b>Measure while you talk.</b> Paste a Google Maps screenshot, set the scale, trace the roof. The price updates as you go.</li>
        <li><b>Finish with the FLYRA handoff.</b> Copy the notes, send the estimate and set the next action.</li>
      </ol>
    </Card>}
    {approvalsNeeded > 0 && <Note tone="warn" title={`${plural(approvalsNeeded, 'price')} not yet approved.`}>{me.isOwner || me.canEdit || !caps.db ? <>Quotes stay Preliminary until you approve them. <button type="button" className="lnk" onClick={() => go('pricing')}>Review prices →</button></> : 'Quotes stay Preliminary until the owner approves pricing.'}</Note>}
    <div className="row between">
      <div className="row">
        <Select className="inp w-auto" value={rep} onChange={setRep} options={[{ k: 'all', label: 'All reps' }, ...reps.map(id => ({ k: id, label: id ? (names[id] || 'A rep') : 'This device' }))]} aria-label="Rep" />
        <Seg value={range} onChange={setRange} options={[{ k: 'all', label: 'All time' }, { k: 'year', label: 'This year' }, { k: '30', label: '30 days' }, { k: '7', label: '7 days' }]} />
      </div>
      <span className="small muted">From your saved quotes only.</span>
    </div>
    <div className="metrics">
      {M('Total leads', rows.length)}
      {M('Quotes created', quotes.length)}
      {M('Quotes accepted', accepted.length)}
      {M('Quoted seasonal revenue', money(quoted))}
      {M('Won seasonal revenue', money(wonRev), won.length ? `${YEARS}-season value ${money(wonRev * YEARS)}` : null)}
      {M('Conversion rate', quotes.length ? Math.round(won.length / quotes.length * 100) + '%' : '—', 'Won ÷ quotes created')}
      {M('Average quote', quotes.length ? money(quoted / quotes.length) : '—')}
      {M('Follow-ups due', due.length)}
    </div>
    <div className="grid2">
      <Card title="Follow-ups due" action={<Btn size="sm" onClick={() => go('leads', 'due')}>All leads</Btn>}>
        {due.length ? <div className="list">{due.slice(0, 6).map(({ l }) => <button type="button" key={l.id} className="li" onClick={() => onOpen(l.id)}><span><b>{l.customer.name || 'Unnamed lead'}</b><small>{l.next.note || 'Follow up'} · {l.next.method}</small></span><Badge tone="bad">{fmtDate(l.next.date)}</Badge></button>)}</div> : <Empty icon="check" title="Nothing due">Follow-ups appear here on their date.</Empty>}
      </Card>
      <Card title="Recent quotes" action={<Btn size="sm" onClick={() => go('leads')}>All leads</Btn>}>
        {rows.length ? <div className="list">{rows.slice(0, 6).map(({ l, c }) => <button type="button" key={l.id} className="li" onClick={() => onOpen(l.id)}><span><b>{l.customer.name || 'Unnamed lead'}</b><small>{statusLabel(l.status)} · {fmtDateTime(l.updatedAt)}</small></span><span className="li-r"><b className="tnum">{c.total ? money(c.total) : '—'}</b>{c.total > 0 && <LevelBadge level={c.level} />}</span></button>)}</div> : <Empty icon="phone" title="No quotes yet" action={<Btn kind="primary" icon="phone" onClick={onNew}>Start new quote</Btn>}>Your first quote will show up here.</Empty>}
      </Card>
    </div>
  </div>;
}

/* ---------- Leads ---------- */
const FILTERS = [{ k: 'all', label: 'All' }, ...STATUSES, { k: 'due', label: 'Follow-up due' }];
export function Leads({ leads, S, names, onOpen, onNew, onUpdate, onDelete, onImport, storage, initialFilter }) {
  const [f, setF] = useState(initialFilter || 'all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const rows = useMemo(() => leads.map(l => { const n = normQuote(l); return { l: n, c: calc(n, S), dev: l._device }; }), [leads, S]);
  const count = k => rows.filter(r => (k === 'all' ? true : k === 'due' ? isDue(r.l) : r.l.status === k)).length;
  const ql = q.trim().toLowerCase();
  const shown = rows.filter(r => (f === 'all' || (f === 'due' ? isDue(r.l) : r.l.status === f)) && (!ql || [r.l.customer.name, r.l.customer.address, r.l.customer.phone, r.l.customer.email].join(' ').toLowerCase().includes(ql)));
  const csv = () => {
    const H = ['Customer', 'Phone', 'Email', 'Address', 'Lead source', 'Status', 'Seasonal price', 'Confidence', '3-season value', 'Next action date', 'Next action', 'Owner', 'Created', 'Updated'];
    const E = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const lines = [H.map(E).join(',')].concat(rows.map(({ l, c }) => [l.customer.name, l.customer.phone, l.customer.email, l.customer.address, l.customer.source, statusLabel(l.status), c.total, LEVELS[c.level].label, c.agreementTotal, l.next.date, l.next.note, l.next.owner, l.createdAt, l.updatedAt].map(E).join(',')));
    return lines.join('\n');
  };
  const out = async (name, data) => { try { await saveFile(name, data); toast('Saved'); } catch (e) { if (!e || e.code !== 'declined') toast('Downloads aren’t available here.', 'bad'); } };
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Pipeline</div><h1>Leads</h1></div>
      <div className="row">
        {caps.downloads && <><Btn size="sm" icon="download" onClick={() => out(`Edge Shines leads ${todayISO()}.csv`, csv())}>Export CSV</Btn><Btn size="sm" icon="save" onClick={() => out(`Edge Shines backup ${todayISO()}.json`, JSON.stringify({ app: 'edge-shines-sales-studio', exportedAt: new Date().toISOString(), leads: leads.map(l => { const x = clone(l); delete x._device; return x; }) }, null, 1))}>Backup</Btn></>}
        <label className="btn ghost sm"><Icon n="upload" size={16} /><span>Restore backup</span><input type="file" accept=".json,application/json" hidden onChange={e => { onImport(e.target.files[0]); e.target.value = ''; }} /></label>
        <Btn kind="primary" icon="phone" onClick={onNew}>Start new quote</Btn>
      </div></div>
    <StorageNote storage={storage} />
    <div className="chips">{FILTERS.map(x => <Chip key={x.k} on={f === x.k} onClick={() => setF(x.k)}>{x.label} <span className="cnt">{count(x.k)}</span></Chip>)}</div>
    <div className="searchbox"><Icon n="search" size={17} /><input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, address, phone or email" aria-label="Search leads" /></div>
    {shown.length ? <div className="tbl-wrap card flat"><table className="tbl leads">
      <thead><tr><th>Customer</th><th>Status</th><th className="r">Seasonal</th><th>Next action</th><th>Rep</th><th>Updated</th><th /></tr></thead>
      <tbody>{shown.map(({ l, c, dev }) => <tr key={l.id}>
        <td><button type="button" className="lnk-row" onClick={() => onOpen(l.id)}><b>{l.customer.name || 'Unnamed lead'}</b><small>{l.customer.address || l.customer.phone || '—'}</small></button>{dev && <span className="small muted"> · this device</span>}</td>
        <td><Select value={l.status} onChange={v => onUpdate(l.id, d => { d.status = v; })} options={STATUSES} aria-label="Status" /></td>
        <td className="r"><b className="tnum">{c.total ? money(c.total) : '—'}</b>{c.total > 0 && <div><LevelBadge level={c.level} /></div>}</td>
        <td>{l.next.date ? <span className={isDue(l) ? 'due' : ''}>{fmtDate(l.next.date)}</span> : <span className="muted small">No date</span>}<small className="block muted">{l.next.note}</small></td>
        <td className="small">{l.createdBy ? (names[l.createdBy] || 'A rep') : 'This device'}</td>
        <td className="small muted">{fmtDateTime(l.updatedAt)}</td>
        <td className="r nowrap">{confirm === l.id ? <><Btn size="sm" kind="danger" onClick={() => { onDelete(l.id); setConfirm(null); }}>Delete</Btn><Btn size="sm" kind="subtle" onClick={() => setConfirm(null)}>Keep</Btn></> : <><Btn size="sm" onClick={() => onOpen(l.id)}>Open</Btn><Btn size="sm" kind="subtle" icon="trash" aria-label="Delete lead" onClick={() => setConfirm(l.id)} /></>}</td>
      </tr>)}</tbody></table></div>
      : <Empty icon="users" title={leads.length ? 'No leads match' : 'No leads yet'} action={!leads.length && <Btn kind="primary" icon="phone" onClick={onNew}>Start new quote</Btn>}>{leads.length ? 'Try another filter or search.' : 'Every quote you start is saved here automatically.'}</Empty>}
  </div>;
}
export function StorageNote({ storage }) {
  if (caps.writeError) return <Note tone="warn">{caps.writeError}</Note>;
  if (storage === 'shared') return <Note tone="info" icon="cloud" title="Shared:">Quotes save to this Studio’s shared storage, so everyone with access sees the same leads. Photos stay on the device that added them.</Note>;
  if (storage === 'slow') return <Note tone="warn">Shared storage isn’t answering yet. Your changes are kept on this device in the meantime.</Note>;
  if (storage === 'error') return <Note tone="warn">Shared storage stopped responding. Your changes are kept on this device. Reload later.</Note>;
  if (storage === 'local') return <Note tone="warn" icon="device" title="This device only:">Quotes are saved in this browser and aren’t shared with other reps. Use Backup regularly.</Note>;
  return null;
}

/* ---------- Measuring ---------- */
export function MeasurePage({ q, set, S, onNew }) {
  if (!q) return <div className="page"><div className="page-h"><div><div className="eyebrow">Measuring</div><h1>Measure a property</h1></div></div><Empty icon="ruler" title="Start a quote to measure" action={<Btn kind="primary" icon="phone" onClick={onNew}>Start new quote</Btn>}>Measurements are saved on the quote, so start or open one first.</Empty></div>;
  const c = calc(q, S);
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Measuring · {q.customer.name || 'New quote'}</div><h1>{q.customer.address || 'No address yet'}</h1></div>
      <div className="totchip"><span>Seasonal price</span><b className="tnum">{money(c.total)}</b><LevelBadge level={c.level} /></div></div>
    <Card title="Open the property" tight><MapLinks address={q.customer.address} /></Card>
    {!q.customer.address && <Field label="Property address"><Input value={q.customer.address} onChange={v => set(d => { d.customer.address = v; })} placeholder="Street, city and ZIP" /></Field>}
    <Card title="Measure on a satellite screenshot" sub="Paste or upload a Google Maps / Google Earth screenshot, set the scale from its scale bar, then trace each edge."><MeasureTool q={q} set={set} /></Card>
    <Collapse title="How to measure accurately" open={!q.photo.lines.length}>
      <ol className="steps3">
        <li>Open Google Maps, switch to <b>Satellite</b>, and zoom in until the house fills the screen. Click the scale bar (bottom right) so it shows feet.</li>
        <li>Take a screenshot (Windows <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>, Mac <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>4</kbd>) and paste it here.</li>
        <li>Choose <b>Set scale</b> and click both ends of the scale bar, then type its length.</li>
        <li>Pick Roofline, Peak, Garage, Ground stakes or Garland and click along each edge. Double-click to finish. Each line goes straight into the quote.</li>
        <li>Set the roof pitch on peaks: a top-down view shows only their horizontal length. Check the street view or Bing bird’s eye before marking anything verified.</li>
      </ol>
      <p className="small muted">{(WB.measure.steps.find(s => s.row === 5) || {}).rule} · 09 MEASURE SOP · Row 5</p>
    </Collapse>
    <QuoteSections q={q} set={set} S={S} c={c} />
  </div>;
}

/* ---------- Knowledge base ---------- */
const hl = (text, qset) => {
  if (!qset || !qset.size) return text;
  return String(text).split(/([A-Za-z0-9$’']+)/).map((w, i) => (i % 2 && qset.has(canonOf(w)) ? <mark key={i}>{w}</mark> : w));
};
function KBCard({ e, qset, best, open: o, rep }) {
  const [open, setOpen] = useState(!!o);
  const r = t => (rep ? rep(t) : t);
  return <article className={'kb ' + (best ? 'best' : '')}>
    <button type="button" className="kb-h" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="row">{best && <Badge tone="ok">Best answer</Badge>}<span className={'tp ' + (e.type === 'Objection' ? 'obj' : e.type === 'Agreement' ? 'agr' : e.flag ? 'flag' : e.type === 'Owner update' ? 'own' : '')}>{e.type}</span></span>
      <b>{hl(e.title, qset)}</b>
      <Icon n={open ? 'down' : 'right'} size={16} />
    </button>
    <p className={'kb-b ' + (open ? '' : 'clamp')}>{hl(r(e.body), qset)}</p>
    {open && <>
      {(e.warn || []).map((w, i) => <Note key={i} tone="warn" title={w.title + ':'} src={w.src}>{w.text}</Note>)}
      {(e.fields || []).filter(f => f[1]).map((f, i) => <div key={i} className="kb-f"><span>{f[0]}</span><p>{hl(f[1], qset)}</p></div>)}
    </>}
    <div className="kb-foot"><span className="src">{e.src}</span><span className="row">{!e.flag && <CopyBtn get={() => r(e.body)} />}{e.next && <CopyBtn label="Copy + question" get={() => r(e.body) + ' ' + e.next} />}</span></div>
  </article>;
}
export function KBPage({ initial, rep }) {
  const [q, setQ] = useState(initial || '');
  const [ai, setAi] = useState({ q: '', status: 'idle', ids: [] });
  const [browse, setBrowse] = useState(null);
  useEffect(() => { if (initial != null) setQ(initial); }, [initial]);
  const r = search(q, 12), qset = new Set(r.qt);
  const ask = async () => {
    const query = q.trim(); if (!query || !caps.sample) return;
    setAi({ q: query, status: 'loading', ids: [] });
    try {
      const out = await caps.sample.json(aiPrompt(query), { modelTier: 'quick' });
      const raw = Array.isArray(out) ? out : (out && Array.isArray(out.ids) ? out.ids : []);
      setAi({ q: query, status: 'done', ids: [...new Set(raw.map(Number).filter(n => Number.isInteger(n) && KB[n]))].slice(0, 4) });
    } catch (e) {
      const code = e && e.code;
      setAi({ q: query, status: ['not_granted', 'sampling_disabled', 'capability_disabled', 'capability_removed', 'not_declared'].includes(code) ? 'off' : 'error', ids: [], msg: code === 'rate_limited' ? 'Claude is busy for your account. Try again in a minute.' : 'Couldn’t reach Claude. Try again.' });
    }
  };
  const types = [...new Set(KB.map(e => e.type))];
  const aiBox = caps.sample && ai.status !== 'off' && q.trim() ? (ai.q === q.trim() && ai.status === 'done'
    ? (ai.ids.length ? <div className="stack"><div className="eyebrow">Claude’s picks · the wording is the playbook’s own</div>{ai.ids.map(i => <KBCard key={'ai' + i} e={KB[i]} qset={qset} open rep={rep} />)}</div> : <Note tone="warn" title="Claude found nothing in the playbook that answers this.">Don’t guess. Check with a manager.</Note>)
    : <div className="aiask"><div><b>Not the answer you need?</b> <span className="muted">Claude can read the whole playbook and point to the right entries. It never writes new policy.</span></div>{ai.status === 'loading' && ai.q === q.trim() ? <Btn disabled>Reading the playbook…</Btn> : <Btn kind="primary" icon="sparkle" onClick={ask}>Ask Claude to find it</Btn>}{ai.status === 'error' && ai.q === q.trim() && <span className="small bad-t">{ai.msg}</span>}</div>) : null;
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Knowledge base</div><h1>Ask anything about the playbook</h1></div></div>
    <div className="searchbox big"><Icon n="search" size={20} /><input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. What happens if they cancel?" aria-label="Search the knowledge base" autoFocus /></div>
    <div className="chips">{SUGGEST.map(s => <Chip key={s} on={q === s} onClick={() => setQ(s)}>{s}</Chip>)}</div>
    {q.trim() ? <div className="stack">
      {!r.qt.length && <p className="muted">Keep typing…</p>}
      {r.qt.length > 0 && !r.res.length && <Note tone="warn" title={`Nothing in the playbook matches “${q}”.`}>Don’t guess an answer. Try other words or check with a manager.</Note>}
      {r.weak && <Note tone="warn" title="Partial match.">Some of your words aren’t in the playbook, so these may not answer it exactly.</Note>}
      {r.res.length > 0 && <KBCard key={'best' + r.res[0].e.i + q} e={r.res[0].e} qset={qset} best={!r.weak} open rep={rep} />}
      {aiBox}
      {r.res.slice(1).map(x => <KBCard key={x.e.i + q} e={x.e} qset={qset} rep={rep} />)}
    </div> : <div className="stack">
      <div className="eyebrow">Browse</div>
      <div className="chips">{types.map(t => <Chip key={t} on={browse === t} onClick={() => setBrowse(browse === t ? null : t)}>{t} <span className="cnt">{KB.filter(e => e.type === t).length}</span></Chip>)}</div>
      {browse === 'Objection' ? <Card><ObjectionPanel rep={rep} /></Card> : browse && KB.filter(e => e.type === browse).map(e => <KBCard key={e.i} e={e} rep={rep} />)}
      {!browse && <p className="muted small">Search covers all 11 workbook tabs, the FLYRA agreement and price book, owner updates and open questions. The workbook’s search sheet is replaced by this live search.</p>}
    </div>}
  </div>;
}

/* ---------- Templates ---------- */
export function Templates({ leads, activeId, S, me }) {
  const [tab, setTab] = useState('texts');
  const [sel, setSel] = useState(activeId || (leads[0] && leads[0].id) || '');
  const q0 = leads.find(l => l.id === sel); const q = q0 ? normQuote(q0) : normQuote(null);
  const [m, setM] = useState(null);
  useEffect(() => { setM(clone(q.mockup)); }, [sel]);
  const fake = Object.assign({}, q, { mockup: m || q.mockup });
  const setFake = fn => { const d = clone(fake); fn(d); setM(d.mockup); };
  const repFirst = firstName(me.name);
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Templates</div><h1>Messages and mockup prompts</h1></div>
      <Field label="Fill from quote"><Select value={sel} onChange={setSel} options={[{ k: '', label: 'No quote (show blanks)' }, ...leads.map(l => ({ k: l.id, label: (l.customer && l.customer.name) || 'Unnamed lead' }))]} /></Field></div>
    <Seg value={tab} onChange={setTab} options={[{ k: 'texts', label: 'Text messages' }, { k: 'mock', label: 'AI mockup prompts' }]} />
    {tab === 'texts' ? <>
      <p className="muted">{WB.texts.sub}</p>
      <div className="grid2">{WB.texts.items.map(t => <Say key={t.row} label={t.situation} text={fillTemplate(t.text, q, S, repFirst)} after={t.when} src={`08 TEXT TEMPLATES · Row ${t.row}`} />)}</div>
      <Card title="Message standards">{WB.texts.standards.map((s, i) => <div className="factline" key={i}><Icon n="check" size={16} className="okc" /><span>{s}</span></div>)}</Card>
    </> : <Card title="Three approved prompts" sub={WB.mock.sub.replace(/ from the appropriate cell/i, '')}><MockupStudio q={fake} set={setFake} /></Card>}
  </div>;
}

/* ---------- Pricing & Settings (owner) ---------- */
function Appr({ P, onChange, editable, names }) {
  return <span className="appr">{P.approved ? <Badge tone="ok" icon="check">Approved{P.at ? ' ' + fmtDate(P.at) : ''}{P.by && names[P.by] ? ' by ' + names[P.by] : ''}</Badge> : <Badge tone="warn" icon="alert">Not approved</Badge>}
    {editable && <Btn size="sm" kind={P.approved ? 'subtle' : 'primary'} onClick={() => onChange(!P.approved)}>{P.approved ? 'Withdraw' : 'Approve'}</Btn>}</span>;
}
export function SettingsPage({ S, setS, me, names, onExportAll, onImport }) {
  const editable = canEditSettings();
  const upd = fn => { if (!editable) return; const n = clone(S); fn(n); setS(n); };
  const stamp = (P, v) => { P.approved = v; P.by = me.id || null; P.at = new Date().toISOString(); };
  const priceRow = (label, P, path, unit, hint) => <div className="setrow">
    <div><b>{label}</b><small className="muted">{hint || P.src}</small></div>
    <NumIn prefix="$" suffix={unit} value={P.value == null ? '' : String(P.value)} onChange={v => upd(n => { const o = path(n); o.value = v === '' ? null : v; o.approved = false; })} disabled={!editable} className="w140" aria-label={label} />
    <Appr P={P} editable={editable} names={names} onChange={v => upd(n => stamp(path(n), v))} />
  </div>;
  const pending = [S.rates.roof, S.rates.mini, S.rates.stake, ...WREATH_SIZES.map(s => S.wreaths[s]), S.garland, S.deposit].filter(P => num(P.value) && !P.approved).length;
  const approveAll = () => upd(n => { [n.rates.roof, n.rates.mini, n.rates.stake, ...WREATH_SIZES.map(s => n.wreaths[s]), n.garland, n.deposit].forEach(P => { if (num(P.value) && !P.approved) stamp(P, true); }); });
  const list = (key, blank, render) => <div className="stack-s">{(S[key] || []).map((x, i) => <div key={x.id} className="setrow">{render(x, (fn) => upd(n => fn(n[key][i])))}<Appr P={x} editable={editable} names={names} onChange={v => upd(n => stamp(n[key][i], v))} />{editable && <Btn size="sm" kind="subtle" icon="trash" aria-label="Remove" onClick={() => upd(n => { n[key].splice(i, 1); })} />}</div>)}{editable && <Btn size="sm" icon="plus" onClick={() => upd(n => { n[key].push(Object.assign({ id: uid(key[0]), approved: false }, blank)); })}>Add</Btn>}</div>;
  return <div className="page">
    <div className="page-h"><div><div className="eyebrow">Owner</div><h1>Pricing &amp; Settings</h1></div>
      {editable && pending > 0 && <Btn kind="primary" icon="check" onClick={approveAll}>Approve all {pending} reviewed prices</Btn>}</div>
    {!editable && <Note tone="info" icon="lock" title="View only.">Only the owner and editors can change pricing. Reps see what’s approved.</Note>}
    {editable && caps.db && <Note tone="info" icon="cloud">Changes apply to every rep immediately.</Note>}
    <Card title="3-year rates" sub="Only 3-year agreements are offered. Pick a starting point, check the numbers, then approve.">
      <div className="presets">{RATE_PRESETS.map(p => <button type="button" key={p.k} disabled={!editable} className={'preset ' + (S.preset === p.k ? 'on' : '')} onClick={() => upd(n => { n.preset = p.k; ['roof', 'mini', 'stake'].forEach(k => { n.rates[k] = { value: p[k], approved: false, src: p.src }; }); })}>
        <b>{p.label}</b><span className="tnum">${p.roof}/ft · ${p.mini}/strand · ${p.stake}/ft</span><small>{p.src}</small></button>)}</div>
      <Note tone="warn" title="These don’t match.">The workbook and your FLYRA price book list different base rates. The Studio starts with the workbook numbers. Choose the set you actually charge.</Note>
      {priceRow('Roofline C9', S.rates.roof, n => n.rates.roof, '/ ft')}
      {priceRow('Mini lights', S.rates.mini, n => n.rates.mini, '/ strand')}
      {priceRow('Ground stakes', S.rates.stake, n => n.rates.stake, '/ ft')}
    </Card>
    <Card title="Wreaths & garland" sub={`From your FLYRA price book (retrieved ${FL.retrieved}).`}>
      {WREATH_SIZES.map(s => priceRow(`${s}-inch lit wreath`, S.wreaths[s], n => n.wreaths[s], 'each'))}
      {priceRow('Bow (for 24, 36 and 48-inch)', S.bow, n => n.bow, 'each', 'No bow price in FLYRA. The 60-inch wreath includes a red bow.')}
      {priceRow('Lit garland', S.garland, n => n.garland, '/ piece')}
      <div className="setrow"><div><b>Garland piece length</b><small className="muted">Not stated in FLYRA. When set, measured feet convert to pieces.</small></div><NumIn suffix="ft" value={S.garland.pieceFt || ''} onChange={v => upd(n => { n.garland.pieceFt = v; })} disabled={!editable} className="w140" aria-label="Garland piece length" /><span /></div>
    </Card>
    <div className="grid2">
      <Card title="Deposit">
        <div className="setrow"><div><b>Deposit to reserve</b><small className="muted">{S.deposit.src}</small></div><NumIn suffix="%" value={String(S.deposit.value ?? '')} onChange={v => upd(n => { n.deposit.value = v; n.deposit.approved = false; })} disabled={!editable} className="w110" aria-label="Deposit percent" /><Appr P={S.deposit} editable={editable} names={names} onChange={v => upd(n => stamp(n.deposit, v))} /></div>
      </Card>
      <Card title="Tax & card fee" sub="Off until you turn them on. The Studio never assumes a tax rate.">
        <div className="setrow"><div><Toggle on={S.tax.enabled} disabled={!editable} onChange={v => upd(n => { n.tax.enabled = v; })} label="Sales tax" /><small className="muted">{S.tax.src}</small></div><NumIn suffix="%" value={String(S.tax.value ?? '')} onChange={v => upd(n => { n.tax.value = v; n.tax.approved = false; })} disabled={!editable} className="w110" aria-label="Tax rate" /><Appr P={S.tax} editable={editable} names={names} onChange={v => upd(n => stamp(n.tax, v))} /></div>
        <div className="setrow"><div><Toggle on={S.cardFee.enabled} disabled={!editable} onChange={v => upd(n => { n.cardFee.enabled = v; })} label="Card fee note" /><small className="muted">{S.cardFee.src}. Shown as a separate line, not added to the price.</small></div><NumIn suffix="%" value={String(S.cardFee.value ?? '')} onChange={v => upd(n => { n.cardFee.value = v; n.cardFee.approved = false; })} disabled={!editable} className="w110" aria-label="Card fee" /><Appr P={S.cardFee} editable={editable} names={names} onChange={v => upd(n => stamp(n.cardFee, v))} /></div>
      </Card>
    </div>
    <div className="grid2">
      <Card title="Approved discounts" sub="Reps can only apply discounts listed and approved here.">
        {list('discounts', { name: '', kind: 'pct', value: '' }, (x, u) => <><Input value={x.name} onChange={v => u(o => { o.name = v; o.approved = false; })} placeholder="Name" disabled={!editable} aria-label="Discount name" /><Select value={x.kind} onChange={v => u(o => { o.kind = v; o.approved = false; })} options={[{ k: 'pct', label: '%' }, { k: 'amt', label: '$' }]} disabled={!editable} /><NumIn value={x.value} onChange={v => u(o => { o.value = v; o.approved = false; })} className="w90" disabled={!editable} aria-label="Value" /></>)}
      </Card>
      <Card title="Access & labor surcharges" sub="For difficult peaks, high trees, special mounting or outlets.">
        {list('surcharges', { name: '', amount: '' }, (x, u) => <><Input value={x.name} onChange={v => u(o => { o.name = v; o.approved = false; })} placeholder="Name" disabled={!editable} aria-label="Surcharge name" /><NumIn prefix="$" value={x.amount} onChange={v => u(o => { o.amount = v; o.approved = false; })} className="w110" disabled={!editable} aria-label="Amount" /></>)}
      </Card>
    </div>
    <div className="grid2">
      <Card title="Minimum job charge" sub="Only if you adopt one.">
        <div className="setrow"><div><Toggle on={S.minimum.enabled} disabled={!editable} onChange={v => upd(n => { n.minimum.enabled = v; })} label="Use a minimum" /></div><NumIn prefix="$" value={S.minimum.value == null ? '' : String(S.minimum.value)} onChange={v => upd(n => { n.minimum.value = v; n.minimum.approved = false; })} disabled={!editable} className="w110" aria-label="Minimum" /><Appr P={S.minimum} editable={editable} names={names} onChange={v => upd(n => stamp(n.minimum, v))} /></div>
      </Card>
      <Card title="Season & promotions" sub="Approved promotions print on the estimate.">
        <Field label="Active season"><Input value={S.season} onChange={v => upd(n => { n.season = v; })} disabled={!editable} /></Field>
        {list('promotions', { text: '' }, (x, u) => <Input value={x.text} onChange={v => u(o => { o.text = v; o.approved = false; })} placeholder="Promotion wording" disabled={!editable} aria-label="Promotion" />)}
      </Card>
    </div>
    <Card title="Service inclusions" sub="Printed on every estimate. Starts from the FLYRA agreement’s “What your seasonal price includes”.">
      <textarea className="inp ta" value={(S.inclusions || []).join('\n')} onChange={e => upd(n => { n.inclusions = e.target.value.split('\n'); })} onBlur={() => upd(n => { n.inclusions = n.inclusions.map(s => s.trim()).filter(Boolean); })} disabled={!editable} aria-label="Inclusions, one per line" />
    </Card>
    <Card title="Agreement language" sub="From your FLYRA 3-year plan. Prints on estimates only when approved. The signed agreement always controls.">
      <div className="setrow"><div><b>Agreement terms</b><small className="muted">{S.agreement.src}</small></div><span /><Appr P={S.agreement} editable={editable} names={names} onChange={v => upd(n => stamp(n.agreement, v))} /></div>
      <textarea className="inp ta tall" value={S.agreement.value || ''} onChange={e => upd(n => { n.agreement.value = e.target.value; n.agreement.approved = false; })} disabled={!editable} aria-label="Agreement terms" />
      <div className="setrow"><div><b>Guarantees</b><small className="muted">{S.guarantees.src}</small></div><span /><Appr P={S.guarantees} editable={editable} names={names} onChange={v => upd(n => stamp(n.guarantees, v))} /></div>
      <textarea className="inp ta" value={S.guarantees.value || ''} onChange={e => upd(n => { n.guarantees.value = e.target.value; n.guarantees.approved = false; })} disabled={!editable} aria-label="Guarantees" />
    </Card>
    {(me.isOwner || me.canEdit || !caps.db) && <Card title="Internal costs (owner only)" sub="Your own cost assumptions for the margin panel. Never shown to customers. Leave blank if unknown.">
      <div className="form-grid four">{[['roof', 'Roofline cost / ft'], ['mini', 'Mini light cost / strand'], ['stake', 'Ground stake cost / ft'], ['wreath', 'Wreath cost / each'], ['garland', 'Garland cost / piece'], ['perJob', 'Fixed cost / job']].map(([k, l]) => <Field key={k} label={l}><NumIn prefix="$" value={S.costs[k]} onChange={v => upd(n => { n.costs[k] = v; })} disabled={!editable} /></Field>)}</div>
    </Card>}
    <Card title="Company details on estimates"><div className="form-grid">{[['name', 'Company name'], ['phone', 'Phone'], ['address', 'Address']].map(([k, l]) => <Field key={k} label={l} className={k === 'address' ? 'span2' : ''}><Input value={S.company[k]} onChange={v => upd(n => { n.company[k] = v; })} disabled={!editable} /></Field>)}</div><span className="src">{FL.company.source}</span></Card>
    <Card title="Items to review" sub="Gaps and conflicts found in the workbook and FLYRA. The Studio doesn’t fill these in.">
      {FLAGS.map(f => <div key={f.id} className="flag"><Badge tone={/Conflict|Missing/.test(f.tag) ? 'bad' : f.tag === 'Superseded' ? 'info' : 'warn'}>{f.tag}</Badge><div><b>{f.title}</b><p className="small">{f.text}</p><span className="src">{f.src}</span></div></div>)}
    </Card>
    <Card title="Data">
      <div className="row">{editable && <Btn size="sm" kind="subtle" icon="undo" onClick={() => upd(n => { Object.assign(n, defaultSettings()); })}>Reset pricing to defaults</Btn>}<span className="small muted">Back up quotes from the Leads page.</span></div>
    </Card>
  </div>;
}
