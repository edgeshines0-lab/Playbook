// LIVE CALL MODE: one screen from hello to FLYRA handoff.
import { Icon, Btn, Card, Field, Input, NumIn, Select, Toggle, Check, Chip, Badge, Seg, Note, Say, Collapse, CopyBtn, Drawer, Modal, toast } from './ui.jsx';
import { calc, budgetPlan, AREAS, SOURCES, RISKS, CHECKS, LEVELS, WREATH_SIZES, rowFt, garlandPiecesFor, scopeText, YEARS } from './pricing.js';
import { WB, FL } from './data.js';
import { MeasureTool, MapLinks } from './measure.jsx';
import { ObjectionPanel } from './objections.jsx';
import { EstimateDoc, estimateText, downloadPdf, handoffText, fillTemplate, OUTCOME_TEXT, flyraLines } from './estimate.jsx';
import { images, shrinkImage, caps } from './storage.js';
import { money, num, int, firstName, fmtDate, fmtDateTime, todayISO, uid, unq, plural, round2 } from './util.js';
const { useState, useEffect } = React;

export const STAGES = ['Introduction', 'Service & budget', 'Property & design', 'Measurements', 'Price', 'Design & mockup', 'Close', 'FLYRA handoff'];
const SHORT = ['Intro', 'Service', 'Design', 'Measure', 'Price', 'Mockup', 'Close', 'Handoff'];
export const STATUSES = [
  { k: 'new', label: 'New lead' }, { k: 'attempted', label: 'Contact attempted' }, { k: 'qualified', label: 'Qualified' },
  { k: 'design', label: 'Measuring / design' }, { k: 'sent', label: 'Estimate sent' }, { k: 'negotiating', label: 'Negotiating' },
  { k: 'won', label: 'Won' }, { k: 'lost', label: 'Lost' }
];
const ORDER = ['new', 'attempted', 'qualified', 'design', 'sent', 'negotiating'];
export const bump = (d, to) => { if (d.status === 'won' || d.status === 'lost') return; if (ORDER.indexOf(to) > ORDER.indexOf(d.status)) d.status = to; };
export function snapshot(d, S, note) {
  const c = calc(d, S);
  d.versions = [{ at: new Date().toISOString(), note, total: c.total, level: c.level, scope: scopeText(d, S), lines: c.lines.map(l => [l.label, l.qty, l.unit, l.rate, l.amount]) }, ...(d.versions || [])].slice(0, 12);
}

const sc = r => WB.script.lines.find(x => x.row === r);
const sop = r => WB.sop.steps.find(x => x.row === r);
const fact = t => WB.facts.items.find(x => x.topic === t);
const txt = r => WB.texts.items.find(x => x.row === r);
const obj = r => WB.obj.items.find(x => x.row === r);
const S_ = (sheet, row) => `${sheet} · Row ${row}`;
const SCRIPT = '02 CALL SCRIPT', SOP = '01 SALES SOP';

function stageDone(q, c) {
  const cu = q.customer;
  return [
    !!(cu.name && (cu.phone || cu.email) && cu.address),
    !!num(q.budget) || q.interests.length > 0,
    q.areas.length > 0 && !!q.color,
    c.total > 0,
    !!q.flow.priced,
    q.mockup.status !== 'none',
    !!q.outcome,
    !!q.flow.handoff
  ];
}

export function LiveCall({ q, set, S, me, saveState, onExit }) {
  const [objOpen, setObjOpen] = useState(false);
  const [estOpen, setEstOpen] = useState(false);
  const [lpOpen, setLpOpen] = useState(false);
  const c = calc(q, S);
  const stage = Math.min(STAGES.length - 1, q.stage || 0);
  const repFirst = firstName(me.name);
  const rep = t => (repFirst ? String(t).replace(/\bEmily\b/g, repFirst) : String(t));
  const goStage = i => { set(d => { d.stage = i; if (i >= 3) bump(d, d.customer.name ? 'qualified' : d.status); }); window.scrollTo(0, 0); };
  const done = stageDone(q, c);
  const Body = [StageIntro, StageService, StageDesign, StageMeasure, StagePrice, StageMockup, StageClose, StageHandoff][stage];
  const props = { q, set, S, c, rep, repFirst, me, goStage, openEstimate: () => setEstOpen(true), openObjections: () => setObjOpen(true) };
  return <div className="live">
    <div className="live-head">
      <div className="lh-l">
        <div className="eyebrow">Live call · Step {stage + 1} of {STAGES.length}</div>
        <h1>{q.customer.name || 'New quote'}</h1>
        <div className="muted small row">{q.customer.address ? <><Icon n="pin" size={14} /><span>{q.customer.address}</span></> : <span>No address yet</span>}<span className={'save ' + saveState}>{saveState === 'saving' ? 'Saving…' : 'Saved'}</span></div>
      </div>
      <div className="row">
        <Select className="inp w-auto" value={q.status} onChange={v => set(d => { d.status = v; })} options={STATUSES} aria-label="Lead status" />
        <Btn icon="chat" onClick={() => setObjOpen(true)}>Objections</Btn>
        <Btn icon="file" onClick={() => setEstOpen(true)}>Estimate</Btn>
      </div>
    </div>
    <ol className="stepper" aria-label="Call steps">{STAGES.map((s, i) => <li key={s}><button type="button" aria-current={i === stage ? 'step' : undefined} className={done[i] ? 'done' : ''} onClick={() => goStage(i)}><span className="n">{done[i] && i !== stage ? <Icon n="check" size={13} /> : i + 1}</span><span className="t" title={s}>{SHORT[i]}</span></button></li>)}</ol>
    <div className="live-grid">
      <div className="live-main">
        <Body {...props} />
        <div className="stage-nav">
          {stage > 0 ? <Btn icon="left" onClick={() => goStage(stage - 1)}>Back</Btn> : <span />}
          {stage < STAGES.length - 1 ? <Btn kind="primary" iconRight="right" onClick={() => goStage(stage + 1)}>Next: {STAGES[stage + 1]}</Btn> : <Btn kind="primary" icon="check" onClick={onExit}>Finish call</Btn>}
        </div>
      </div>
      <LivePanel q={q} c={c} S={S} goStage={goStage} open={lpOpen} setOpen={setLpOpen} openEstimate={() => setEstOpen(true)} />
    </div>
    <Drawer open={objOpen} onClose={() => setObjOpen(false)} title="Objection assistant">
      <ObjectionPanel rep={rep} logged={q.objections} onLog={row => { set(d => { if (!d.objections.includes(row)) d.objections.push(row); }); toast('Logged on this quote'); }} />
    </Drawer>
    <EstimateModal open={estOpen} onClose={() => setEstOpen(false)} q={q} S={S} set={set} />
  </div>;
}

/* ---------- Live estimate panel ---------- */
function LivePanel({ q, c, S, goStage, open, setOpen, openEstimate }) {
  const lv = LEVELS[c.level], budget = num(q.budget), over = budget && c.total > budget;
  const G = c.groups;
  const rows = [['Roofline', G.roof, `${c.counts.roofFt} ft`], ['Bushes', G.bush, `${c.counts.bushStrands} strands`], ['Trees', G.tree, `${c.counts.treeStrands} strands`], ['Ground stakes', G.stake, `${c.counts.stakeFt} ft`], ['Wreaths', G.wreath, `${c.counts.wreathCount}`], ['Garland', G.garland, `${c.counts.garlandPieces} pcs`], ['Surcharges', G.labor, '']].filter(r => r[1]);
  const why = [...c.reasons.review, ...c.reasons.prelim];
  return <aside className={'lp ' + (open ? 'open' : '')} aria-label="Live estimate">
    <button type="button" className="lp-bar" onClick={() => setOpen(!open)} aria-expanded={open}><span>Seasonal price</span><b className="tnum">{money(c.total)}</b><Badge tone={lv.tone}>{lv.label}</Badge><Icon n={open ? 'down' : 'right'} size={16} /></button>
    <div className="lp-body">
      <div className="lp-label">Seasonal price · {YEARS}-year agreement</div>
      <div className="lp-total tnum">{money(c.total)}</div>
      <div className="row"><Badge tone={lv.tone} icon={c.level === 'verified' ? 'shield' : 'alert'}>{lv.label}</Badge>{!c.taxOn && <span className="muted small">before tax</span>}</div>
      <dl className="lp-dl tnum">
        <dt>Deposit ({c.depPct}%)</dt><dd>{money(c.deposit)}</dd>
        <dt>Balance at install</dt><dd>{money(c.balance)}</dd>
        {c.taxOn && <><dt>Tax ({c.taxRate}%)</dt><dd>{money(c.tax)}</dd></>}
        <dt>{YEARS} seasons, nominal</dt><dd>{money(c.agreementTotal)}</dd>
      </dl>
      {budget > 0 && <div className={'lp-budget ' + (over ? 'over' : 'ok')}><span>Budget {money(budget)}</span><b>{over ? `Over by ${money(c.total - budget)}` : `Within by ${money(budget - c.total)}`}</b>{over && <button type="button" className="lnk" onClick={() => goStage(4)}>See options →</button>}</div>}
      {rows.length > 0 && <div className="lp-lines">{rows.map(r => <div key={r[0]}><span>{r[0]} <small>{r[2]}</small></span><b className="tnum">{money(r[1])}</b></div>)}{c.discount > 0 && <div><span>Discounts</span><b className="tnum">−{money(c.discount)}</b></div>}</div>}
      {why.length > 0 && <div className="lp-why"><div className="eyebrow">{c.level === 'review' ? 'Needs a manager' : 'Before it’s firm'}</div><ul>{why.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
      <Btn kind="primary" icon="file" onClick={openEstimate} className="block">Customer estimate</Btn>
    </div>
  </aside>;
}

function EstimateModal({ open, onClose, q, S, set }) {
  return <Modal open={open} onClose={onClose} title="Customer estimate" wide actions={<>
    <CopyBtn get={() => estimateText(q, S)} label="Copy as text" />
    {caps.downloads && <Btn kind="primary" icon="download" onClick={async () => { const ok = await downloadPdf(q); if (ok) set(d => snapshot(d, S, 'Estimate PDF created')); }}>Download PDF</Btn>}
  </>}>
    <EstimateDoc q={q} S={S} />
  </Modal>;
}

/* ---------- 1 · Introduction ---------- */
function StageIntro({ q, set, S, rep, repFirst }) {
  const cu = q.customer, upd = (k, v) => set(d => { d.customer[k] = v; });
  const busy = obj(30);
  const attempted = q.status === 'attempted';
  return <div className="stage">
    <Note tone="info" title="Before you dial:" src={S_(SOP, 6)}>{sop(6).do}</Note>
    <div className="grid2">
      <Say label="Opening" text={rep(sc(6).say)} src={S_(SCRIPT, 6)} after={sc(6).action} big />
      <div className="stack">
        <Say label="Decision-maker" text={sc(10).say} src={S_(SCRIPT, 10)} />
        <Say label="If they’re busy" text={busy.answer} after={'Then ask: ' + busy.next} src={S_('05 OBJECTIONS', 30)} />
      </div>
    </div>
    <Card title="Customer" sub="Everything saves automatically. You can come back to this quote any time.">
      <div className="form-grid">
        <Field label="Customer name"><Input value={cu.name} onChange={v => upd('name', v)} placeholder="First and last name" /></Field>
        <Field label="Phone"><Input type="tel" value={cu.phone} onChange={v => upd('phone', v)} placeholder="(555) 555-5555" /></Field>
        <Field label="Email"><Input type="email" value={cu.email} onChange={v => upd('email', v)} placeholder="name@example.com" /></Field>
        <Field label="Full property address" hint="Street, city and ZIP" className="span2"><Input value={cu.address} onChange={v => upd('address', v)} placeholder="123 Main St, New Windsor, NY 12553" /></Field>
        <Field label="Lead source"><Input value={cu.source} onChange={v => upd('source', v)} list="lead-sources" placeholder="Choose or type" /><datalist id="lead-sources">{FL.leadSources.map(s => <option key={s} value={s} />)}</datalist></Field>
        <Field label="Decision-maker"><Input value={cu.decisionMaker} onChange={v => upd('decisionMaker', v)} placeholder="e.g. Customer and spouse" /></Field>
        <Field label="Preferred installation date"><Input type="date" value={cu.installDate} onChange={v => upd('installDate', v)} /></Field>
      </div>
    </Card>
    <div className="row">
      <Btn icon="phone" onClick={() => { set(d => { bump(d, 'attempted'); d.notes = `${d.notes ? d.notes + '\n' : ''}Call attempt, no answer · ${fmtDateTime(new Date().toISOString())}`; }); toast('Attempt logged'); }}>No answer: log attempt</Btn>
      <span className="muted small">{WB.flyra.pipeline.rbefore}.</span>
    </div>
    {attempted && <Say label="Missed-call text" text={fillTemplate(txt(6).text, q, S, repFirst)} src={S_('08 TEXT TEMPLATES', 6)} after={txt(6).when} />}
  </div>;
}

/* ---------- 2 · Service & budget ---------- */
const INTERESTS = ['Roofline', 'Peaks & garage', 'Bushes & trees', 'Driveway & walkway', 'Wreaths & garland', 'Full property'];
const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
function StageService({ q, set }) {
  const facts = ['Seasonal vs permanent', 'Product type', 'Can colors change?', 'In-season upkeep', 'Takedown', 'Storage', 'Client supplies lights?'].map(fact).filter(Boolean);
  return <div className="stage">
    <div className="grid2">
      <Say label="Done-for-you service" text={sc(7).say} src={S_(SCRIPT, 7)} after={sc(7).action} big />
      <Say label="Lights + price early" text={sc(8).say} src={S_(SCRIPT, 8)} after={sc(8).action} big />
    </div>
    <div className="inclusions">{['Commercial-grade C9 LED lights', 'Custom-cut to fit', 'Professional installation', 'In-season maintenance', 'Removal', 'Storage'].map(x => <span key={x}><Icon n="check" size={15} />{x}</span>)}</div>
    <div className="grid2">
      <Card title="Customer’s seasonal budget" sub="The average home is around $1,000 per season, depending on the design.">
        <div className="chips">{[750, 1000, 1500, 2000, 3000].map(v => <Chip key={v} on={num(q.budget) === v} onClick={() => set(d => { d.budget = String(v); bump(d, 'qualified'); })}>{v === 1000 ? 'Around $1,000' : money(v)}</Chip>)}</div>
        <Field label="Or type their budget"><NumIn prefix="$" suffix="/ season" value={q.budget} onChange={v => set(d => { d.budget = v; if (num(v)) bump(d, 'qualified'); })} placeholder="1200" /></Field>
      </Card>
      <Card title="Agreement">
        <div className="row"><Badge tone="ok" icon="check">3-year agreement</Badge><span className="small">Three consecutive holiday seasons.</span></div>
        <p className="small muted">It’s the only agreement Edge Shines offers, so there’s nothing to choose. Explain it with the 3-year script in the Price step.</p>
        <span className="src">Owner instruction · Nov 15, 2026</span>
      </Card>
    </div>
    <Card title="What are they interested in?">
      <div className="chips">{INTERESTS.map(x => <Chip key={x} on={q.interests.includes(x)} onClick={() => set(d => { d.interests = toggleIn(d.interests, x); })}>{x}</Chip>)}</div>
    </Card>
    <Say label="Materials policy" text={sc(9).say} src={S_(SCRIPT, 9)} after={sc(9).action} />
    <Collapse title="Facts to have ready">{facts.map(f => <div className="fact" key={f.row}><b>{f.topic}</b><span>{f.say}</span><span className="muted small">Check: {f.check}</span></div>)}</Collapse>
  </div>;
}

/* ---------- 3 · Property & design ---------- */
const AREA_OPTS = ['Front roofline only', 'Full accessible roofline', 'Garage and roof peaks', 'Bushes and trees', 'Driveway and walkway lighting', 'Wreaths and garland', 'Full-property decorating'];
const COLORS = ['Classic warm white', 'Multicolor pattern', 'Other fixed color'];
function StageDesign({ q, set }) {
  return <div className="stage">
    <Say label="Property and scope" text={sc(11).say} src={S_(SCRIPT, 11)} after={sc(11).action} big />
    <Card title="Areas to light">
      <div className="chips">{AREA_OPTS.map(x => <Chip key={x} on={q.areas.includes(x)} onClick={() => set(d => {
        let a = toggleIn(d.areas, x);
        if (x === 'Front roofline only' && a.includes(x)) a = a.filter(y => y === x || !/roofline|Full-property|Garage/.test(y));
        if (x !== 'Front roofline only' && a.includes(x) && /roofline|Full-property|Garage/.test(x)) a = a.filter(y => y !== 'Front roofline only');
        d.areas = a;
      })}>{x}</Chip>)}</div>
    </Card>
    <Card title="Fixed color or pattern">
      <div className="chips">{COLORS.map(x => <Chip key={x} on={q.color === x} onClick={() => set(d => { d.color = d.color === x ? '' : x; })}>{x}</Chip>)}</div>
      {q.color === 'Other fixed color' || q.colorNote ? <Field label="Color or pattern details"><Input value={q.colorNote} onChange={v => set(d => { d.colorNote = v; })} placeholder="e.g. red and white alternating" /></Field> : null}
      <Note tone="info" title="Fixed color:" src="04 SERVICE FACTS · Rows 7–9">{fact('Can colors change?').say} {fact('Colors').say} {fact('Colors').check}.</Note>
    </Card>
    <div className="grid2">
      <Say label="Color + timing" text={sc(12).say} src={S_(SCRIPT, 12)} />
      <Say label="Design consultation" text={sc(13).say} src={S_(SCRIPT, 13)} />
    </div>
    <Collapse title="Fast scoping questions" open>{WB.price.scoping.map(s => <Say key={s.row} label={'Question ' + s.n} text={unq(s.q)} src={S_('10 PRICE CARD', s.row)} />)}</Collapse>
  </div>;
}

/* ---------- 4 · Measurements: the quote engine ---------- */
function StageMeasure({ q, set, S, c }) {
  const [big, setBig] = useState(false);
  return <div className="stage">
    <div className="grid2">
      <Say label="Measure while on call" text={sc(14).say} src={S_(SCRIPT, 14)} after={sc(14).action} />
      <Card title="Open the property" tight><MapLinks address={q.customer.address} /><p className="small muted">Google Maps: right-click → Measure distance also works. Type the feet below.</p></Card>
    </div>
    <Card title="Measure on a satellite screenshot" sub="Paste or upload, set the scale from the map’s scale bar, then trace each edge." action={<Btn size="sm" icon="external" onClick={() => setBig(true)}>Open large</Btn>}>
      {!big && <MeasureTool q={q} set={set} />}
    </Card>
    <Modal open={big} onClose={() => setBig(false)} title="Measure on a satellite screenshot" wide><MeasureTool q={q} set={set} /></Modal>
    <QuoteSections q={q} set={set} S={S} c={c} />
  </div>;
}

export function QuoteSections({ q, set, S, c }) {
  return <>
    <RoofCard q={q} set={set} S={S} c={c} />
    <div className="grid2">
      <PlantCard q={q} set={set} S={S} c={c} kind="bushes" title="Bushes" per={5} />
      <PlantCard q={q} set={set} S={S} c={c} kind="trees" title="Trees" per={10} />
    </div>
    <StakeCard q={q} set={set} S={S} c={c} />
    <GreeneryCard q={q} set={set} S={S} c={c} />
    <ExtrasCard q={q} set={set} S={S} />
    <ConditionsCard q={q} set={set} c={c} />
  </>;
}
const rateTag = (P, unit) => <span className={'rate ' + (P.approved ? '' : 'unappr')}>{num(P.value) ? `${money(num(P.value))} / ${unit}` : 'No price set'}{!P.approved && ' · not approved'}</span>;
function RoofCard({ q, set, S, c }) {
  const addRow = (label, area) => set(d => { d.roof.push({ id: uid('r'), label, area, ft: '', include: true, source: 'aerial', verified: false }); bump(d, 'design'); });
  const upd = (id, fn) => set(d => { const r = d.roof.find(x => x.id === id); if (r) fn(r, d); });
  const labels = q.roof.filter(r => r.include !== false).map(r => (r.label || '').trim().toLowerCase()).filter(Boolean);
  const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
  return <Card title="Rooflines & roof peaks" sub={`${c.counts.roofFt} ft included · ${money(c.groups.roof)}`} action={rateTag(S.rates.roof, 'ft')}>
    <div className="chips">{[['Front gutter', 'front'], ['Left peak', 'peak'], ['Right peak', 'peak'], ['Garage', 'garage'], ['Porch', 'other'], ['Side roofline', 'side']].map(([l, a]) => <Chip key={l} icon="plus" onClick={() => addRow(l, a)}>{l}</Chip>)}</div>
    {q.roof.length ? <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>Use</th><th>Section</th><th>Area</th><th className="r">Feet</th><th>Measured with</th><th>Verified</th><th /></tr></thead>
      <tbody>{q.roof.map(r => <tr key={r.id} className={r.include === false ? 'off' : ''}>
        <td><Check on={r.include !== false} onChange={v => upd(r.id, x => { x.include = v; })} /></td>
        <td><Input value={r.label} onChange={v => upd(r.id, x => { x.label = v; })} aria-label="Section name" /></td>
        <td><Select value={r.area || 'front'} onChange={v => upd(r.id, x => { x.area = v; })} options={AREAS} aria-label="Area" /></td>
        <td className="r">{r.lineId ? <span className="traced tnum" title="From the traced screenshot"><Icon n="ruler" size={14} />{rowFt(q, r) || 'no scale'}</span> : <NumIn value={r.ft} onChange={v => upd(r.id, (x, d) => { x.ft = v; bump(d, 'design'); })} suffix="ft" className="w90" aria-label="Feet" />}</td>
        <td>{r.lineId ? <span className="small muted">Scaled screenshot</span> : <Select value={r.source || 'aerial'} onChange={v => upd(r.id, x => { x.source = v; })} options={SOURCES.filter(s => s.k !== 'photo')} aria-label="Measured with" />}</td>
        <td><Toggle on={!!r.verified} onChange={v => upd(r.id, x => { x.verified = v; })} label={r.verified ? 'Verified' : 'Approx.'} /></td>
        <td className="r"><Btn size="sm" kind="subtle" icon="trash" aria-label="Remove section" onClick={() => set(d => { d.roof = d.roof.filter(x => x.id !== r.id); if (r.lineId) d.photo.lines = d.photo.lines.filter(l => l.id !== r.lineId); })} /></td>
      </tr>)}</tbody></table></div> : <p className="muted small">Add each roof edge once: gutters, peaks, garage edges. Trace them on a screenshot above or type the feet from Google Earth.</p>}
    {dup.length > 0 && <Note tone="warn">Two sections share the name “{dup[0]}”. Make sure the same edge isn’t counted twice.</Note>}
    <p className="small muted">{(WB.measure.steps.find(s => s.row === 5) || {}).rule} Mark a section verified only when the footage and access are checked.</p>
  </Card>;
}
function PlantCard({ q, set, S, c, kind, title, per }) {
  const rows = q[kind];
  const addRow = () => set(d => { d[kind].push({ id: uid(kind[0]), label: '', count: '1', per: String(per), include: true }); bump(d, 'design'); });
  const upd = (id, fn) => set(d => { const r = d[kind].find(x => x.id === id); if (r) fn(r); });
  const sub = kind === 'bushes' ? c.groups.bush : c.groups.tree, strands = kind === 'bushes' ? c.counts.bushStrands : c.counts.treeStrands;
  const step = (id, k, dlt) => upd(id, x => { x[k] = String(Math.max(0, int(x[k]) + dlt)); });
  return <Card title={title} sub={`${strands} strands · ${money(sub)}`} action={rateTag(S.rates.mini, 'strand')}>
    {rows.map(r => <div key={r.id} className={'plant ' + (r.include === false ? 'off' : '')}>
      <Check on={r.include !== false} onChange={v => upd(r.id, x => { x.include = v; })} />
      <Input value={r.label} onChange={v => upd(r.id, x => { x.label = v; })} placeholder={kind === 'bushes' ? 'Where (e.g. front beds)' : 'Which tree'} aria-label="Description" />
      <div className="stepper-in"><span className="flabel">{kind === 'bushes' ? 'Bushes' : 'Trees'}</span><Btn size="sm" kind="subtle" icon="minus" aria-label="Fewer" onClick={() => step(r.id, 'count', -1)} /><NumIn value={r.count} onChange={v => upd(r.id, x => { x.count = v; })} className="w56" aria-label="Count" /><Btn size="sm" kind="subtle" icon="plus" aria-label="More" onClick={() => step(r.id, 'count', 1)} /></div>
      <div className="stepper-in"><span className="flabel">Strands each</span><Btn size="sm" kind="subtle" icon="minus" aria-label="Fewer strands" onClick={() => step(r.id, 'per', -1)} /><NumIn value={r.per} onChange={v => upd(r.id, x => { x.per = v; })} className="w56" aria-label="Strands each" /><Btn size="sm" kind="subtle" icon="plus" aria-label="More strands" onClick={() => step(r.id, 'per', 1)} /></div>
      <Btn size="sm" kind="subtle" icon="trash" aria-label="Remove" onClick={() => set(d => { d[kind] = d[kind].filter(x => x.id !== r.id); })} />
    </div>)}
    <Btn size="sm" icon="plus" onClick={addRow}>{rows.length ? `Add another ${kind === 'bushes' ? 'bush group' : 'tree'}` : `Add ${kind}`}</Btn>
    <p className="small muted">{kind === 'bushes' ? (WB.measure.steps.find(s => s.row === 6) || {}).rule : (WB.measure.steps.find(s => s.row === 7) || {}).rule}</p>
  </Card>;
}
const STAKE_STD = ['Left driveway', 'Right driveway', 'Front walkway'];
function StakeCard({ q, set, S, c }) {
  const findStd = l => q.stakes.find(s => s.label === l && !s.lineId);
  const setStd = (l, v) => set(d => { let s = d.stakes.find(x => x.label === l && !x.lineId); if (!s) { s = { id: uid('s'), label: l, ft: '', include: true, source: 'aerial', verified: false }; d.stakes.push(s); } s.ft = v; bump(d, 'design'); });
  const extra = q.stakes.filter(s => !(STAKE_STD.includes(s.label) && !s.lineId));
  const upd = (id, fn) => set(d => { const r = d.stakes.find(x => x.id === id); if (r) fn(r); });
  return <Card title="Ground stakes" sub={`${c.counts.stakeFt} ft · ${money(c.groups.stake)}`} action={rateTag(S.rates.stake, 'ft')}>
    <div className="form-grid four">
      {STAKE_STD.map(l => { const s = findStd(l); return <Field key={l} label={l}><NumIn value={s ? s.ft : ''} onChange={v => setStd(l, v)} suffix="ft" aria-label={l} /></Field>; })}
      <Field label="Verified"><Toggle on={q.stakes.length > 0 && q.stakes.every(s => s.verified)} onChange={v => set(d => d.stakes.forEach(s => { s.verified = v; }))} label={q.stakes.length && q.stakes.every(s => s.verified) ? 'All verified' : 'Approx.'} /></Field>
    </div>
    {extra.map(s => <div key={s.id} className="plant">
      <Check on={s.include !== false} onChange={v => upd(s.id, x => { x.include = v; })} />
      <Input value={s.label} onChange={v => upd(s.id, x => { x.label = v; })} placeholder="Border (e.g. flowerbed)" aria-label="Border name" />
      {s.lineId ? <span className="traced tnum"><Icon n="ruler" size={14} />{rowFt(q, s) || 'no scale'} ft</span> : <NumIn value={s.ft} onChange={v => upd(s.id, x => { x.ft = v; })} suffix="ft" className="w90" aria-label="Feet" />}
      <Toggle on={!!s.verified} onChange={v => upd(s.id, x => { x.verified = v; })} label={s.verified ? 'Verified' : 'Approx.'} />
      <Btn size="sm" kind="subtle" icon="trash" aria-label="Remove" onClick={() => set(d => { d.stakes = d.stakes.filter(x => x.id !== s.id); if (s.lineId) d.photo.lines = d.photo.lines.filter(l => l.id !== s.lineId); })} />
    </div>)}
    <Btn size="sm" icon="plus" onClick={() => set(d => { d.stakes.push({ id: uid('s'), label: '', ft: '', include: true, source: 'aerial', verified: false }); })}>Add a border</Btn>
    <p className="small muted">{(WB.measure.steps.find(s => s.row === 8) || {}).rule}</p>
  </Card>;
}
function GreeneryCard({ q, set, S, c }) {
  const updW = (id, fn) => set(d => { const r = d.wreaths.find(x => x.id === id); if (r) fn(r); });
  const updG = (id, fn) => set(d => { const r = d.garland.find(x => x.id === id); if (r) fn(r); });
  const sizeOpts = WREATH_SIZES.map(s => ({ k: String(s), label: `${s}-inch · ${num((S.wreaths[s] || {}).value) ? money(num(S.wreaths[s].value)) : 'no price'}` }));
  return <Card title="Wreaths & garland" sub={`${money(c.groups.wreath + c.groups.garland)} · prices from your FLYRA price book`}>
    <div className="eyebrow">Wreaths</div>
    {q.wreaths.map(w => <div key={w.id} className={'plant ' + (w.include === false ? 'off' : '')}>
      <Check on={w.include !== false} onChange={v => updW(w.id, x => { x.include = v; })} />
      <Select value={String(w.size)} onChange={v => updW(w.id, x => { x.size = +v; })} options={sizeOpts} aria-label="Wreath size" />
      <div className="stepper-in"><span className="flabel">Qty</span><Btn size="sm" kind="subtle" icon="minus" aria-label="Fewer" onClick={() => updW(w.id, x => { x.qty = String(Math.max(0, int(x.qty) - 1)); })} /><NumIn value={w.qty} onChange={v => updW(w.id, x => { x.qty = v; })} className="w56" aria-label="Quantity" /><Btn size="sm" kind="subtle" icon="plus" aria-label="More" onClick={() => updW(w.id, x => { x.qty = String(int(x.qty) + 1); })} /></div>
      <Toggle on={w.lit !== false} onChange={v => updW(w.id, x => { x.lit = v; })} label={w.lit !== false ? 'Lit' : 'Unlit'} />
      {+w.size === 60 ? <span className="small muted">Bow included</span> : <Check on={!!w.bow} onChange={v => updW(w.id, x => { x.bow = v; })}>Bow</Check>}
      <Input value={w.note} onChange={v => updW(w.id, x => { x.note = v; })} placeholder="Placement (e.g. over garage)" aria-label="Placement note" />
      <Btn size="sm" kind="subtle" icon="trash" aria-label="Remove" onClick={() => set(d => { d.wreaths = d.wreaths.filter(x => x.id !== w.id); })} />
    </div>)}
    <Btn size="sm" icon="plus" onClick={() => set(d => { d.wreaths.push({ id: uid('w'), size: 36, qty: '1', lit: true, bow: false, note: '', include: true }); })}>Add wreath</Btn>
    <div className="eyebrow mt">Garland · {num(S.garland.value) ? `${money(num(S.garland.value))} per piece` : 'no price set'}{num(S.garland.pieceFt) ? ` (${num(S.garland.pieceFt)} ft per piece)` : ''}</div>
    {q.garland.map(g => { const ft = rowFt(q, g), auto = !int(g.pieces) && garlandPiecesFor(q, g, S); return <div key={g.id} className={'plant ' + (g.include === false ? 'off' : '')}>
      <Check on={g.include !== false} onChange={v => updG(g.id, x => { x.include = v; })} />
      <Input value={g.label} onChange={v => updG(g.id, x => { x.label = v; })} placeholder="Where (railing, porch, door)" aria-label="Garland location" />
      {g.lineId ? <span className="traced tnum"><Icon n="ruler" size={14} />{ft || 'no scale'} ft</span> : <NumIn value={g.ft} onChange={v => updG(g.id, x => { x.ft = v; })} suffix="ft" className="w90" aria-label="Measured feet" />}
      <div className="stepper-in"><span className="flabel">Pieces</span><NumIn value={g.pieces} onChange={v => updG(g.id, x => { x.pieces = v; })} className="w56" placeholder={auto ? String(auto) : ''} aria-label="Pieces" /></div>
      <Input value={g.note} onChange={v => updG(g.id, x => { x.note = v; })} placeholder="Lit/unlit, fullness" aria-label="Garland note" />
      <Btn size="sm" kind="subtle" icon="trash" aria-label="Remove" onClick={() => set(d => { d.garland = d.garland.filter(x => x.id !== g.id); if (g.lineId) d.photo.lines = d.photo.lines.filter(l => l.id !== g.lineId); })} />
    </div>; })}
    <Btn size="sm" icon="plus" onClick={() => set(d => { d.garland.push({ id: uid('g'), label: '', ft: '', pieces: '', note: '', include: true }); })}>Add garland</Btn>
    {!num(S.garland.pieceFt) && q.garland.length > 0 && <p className="small muted">FLYRA prices garland per piece and doesn’t say how long a piece is. Enter the number of pieces.</p>}
    {c.missing.length > 0 && <Note tone="warn" title="Not priced:">{c.missing.join('; ')}.</Note>}
  </Card>;
}
function ExtrasCard({ q, set, S }) {
  const sur = S.surcharges || [], dis = S.discounts || [];
  if (!sur.length && !dis.length) return null;
  const tog = (k, id) => set(d => { d[k] = (d[k] || []).includes(id) ? d[k].filter(x => x !== id) : [...(d[k] || []), id]; });
  return <Card title="Approved extras" sub="Only owner-approved surcharges and discounts can be added.">
    {sur.length > 0 && <div className="stack-s"><div className="eyebrow">Access / labor surcharges</div>{sur.map(s => <Check key={s.id} on={(q.surcharges || []).includes(s.id)} disabled={!s.approved} onChange={() => tog('surcharges', s.id)}>{s.name || 'Surcharge'} · {money(num(s.amount))}{!s.approved && ' (awaiting owner approval)'}</Check>)}</div>}
    {dis.length > 0 && <div className="stack-s"><div className="eyebrow">Discounts</div>{dis.map(s => <Check key={s.id} on={(q.discounts || []).includes(s.id)} disabled={!s.approved} onChange={() => tog('discounts', s.id)}>{s.name || 'Discount'} · {s.kind === 'pct' ? num(s.value) + '%' : money(num(s.value))}{!s.approved && ' (awaiting owner approval)'}</Check>)}</div>}
  </Card>;
}
function ConditionsCard({ q, set, c }) {
  return <div className="grid2">
    <Card title="Access & risk" sub="Any of these sends the quote to Manager review.">
      {RISKS.map(r => <Check key={r.k} on={!!(q.risks || {})[r.k]} onChange={v => set(d => { d.risks = Object.assign({}, d.risks, { [r.k]: v }); })}>{r.label}</Check>)}
      <span className="src">09 MEASURE SOP · Row 11; 04 SERVICE FACTS · Row 30</span>
    </Card>
    <Card title="Quote checkpoint" sub="Tick each one before saying a final total.">
      {CHECKS.map(k => <Check key={k.k} on={!!(q.checks || {})[k.k]} onChange={v => set(d => { d.checks = Object.assign({}, d.checks, { [k.k]: v }); })}><b>{k.label}</b> <span className="muted small">{k.action}</span></Check>)}
      <span className="src">03 FAST QUOTES · Rows 24–29</span>
    </Card>
  </div>;
}

/* ---------- 5 · Price ---------- */
export const firmSay = total => sc(15).say.replace(/\$_{2,}/, money(total)).replace(/\s*\[If measurement is verified:\s*[‘']([^’']+)[’']\]/, ' $1');
const prelimSay = total => sc(15).say.replace(/\$_{2,}/, money(total)).replace(/\s*\[If measurement is verified:[^\]]*\]/, '');
function StagePrice({ q, set, S, c, me }) {
  useEffect(() => { if (c.total && !q.flow.priced) set(d => { d.flow = Object.assign({}, d.flow, { priced: true }); }); }, [c.total > 0]);
  const [lo, setLo] = useState(''), [hi, setHi] = useState('');
  const plan = budgetPlan(q, S);
  const lv = LEVELS[c.level];
  const range = num(lo) && num(hi) ? unq(WB.fast.cantVerify).replace(/\$_{2,}\s*[–-]\s*\$_{2,}/, `${money(Math.min(num(lo), num(hi)))}–${money(Math.max(num(lo), num(hi)))}`) : unq(WB.fast.cantVerify);
  return <div className="stage">
    <div className="price-hero">
      <div><div className="eyebrow">Seasonal price · 3-year agreement</div><div className="ph-total tnum">{money(c.total)}</div><div className="row"><Badge tone={lv.tone} icon={c.level === 'verified' ? 'shield' : 'alert'}>{lv.label}</Badge><span className="small muted">{lv.help}</span></div></div>
      <dl className="ph-dl tnum"><dt>Deposit to reserve ({c.depPct}%)</dt><dd>{money(c.deposit)}</dd><dt>Balance when installed</dt><dd>{money(c.balance)}</dd><dt>3 seasons at this price</dt><dd>{money(c.agreementTotal)}</dd></dl>
    </div>
    <Card title="Price breakdown" sub="What the customer sees on the estimate.">
      <PriceTable c={c} S={S} />
    </Card>
    {c.level === 'verified'
      ? <Say label="Say this" text={firmSay(c.total)} src={S_(SCRIPT, 15)} big />
      : <div className="grid2">
        <Say label="Say this (preliminary)" text={prelimSay(c.total)} src={S_(SCRIPT, 15)} after={sc(15).action} big />
        <Say label="If you can’t verify a roof section" text={range} src={S_('03 FAST QUOTES', 32)} extra={<div className="row"><NumIn prefix="$" value={lo} onChange={setLo} placeholder="Low" className="w110" aria-label="Range low" /><NumIn prefix="$" value={hi} onChange={setHi} placeholder="High" className="w110" aria-label="Range high" /><span className="small muted">No formula in the playbook: set it with your manager.</span></div>} />
      </div>}
    <Say label="Explain the 3-year model" text={sc(16).say} src={S_(SCRIPT, 16)} after={sc(16).action} />
    <BudgetCard plan={plan} q={q} set={set} S={S} />
    <Say label="If the price is too high" text={sc(17).say} src={S_(SCRIPT, 17)} after={sc(17).action} />
    {(me.isOwner || me.canEdit || !caps.db) && <MarginCard c={c} S={S} />}
  </div>;
}
export function PriceTable({ c, S }) {
  return <div className="tbl-wrap"><table className="tbl price">
    <thead><tr><th>Lighting</th><th className="r">Quantity</th><th className="r">Unit price</th><th className="r">Amount</th></tr></thead>
    <tbody>
      {c.lines.map((l, i) => <tr key={i}><td>{l.label}{!l.approved && <span className="unappr-tag">not approved</span>}</td><td className="r tnum">{l.qty} {l.unit}</td><td className="r tnum">{money(l.rate)}</td><td className="r tnum">{money(l.amount)}</td></tr>)}
      {c.discountLines.map((l, i) => <tr key={'d' + i}><td>{l.label}</td><td /><td /><td className="r tnum">{money(l.amount)}</td></tr>)}
      {c.minimumAdj > 0 && <tr><td>Minimum job charge</td><td /><td /><td className="r tnum">{money(c.minimumAdj)}</td></tr>}
      {!c.lines.length && <tr><td colSpan={4} className="muted">Nothing priced yet. Add measurements in step 4.</td></tr>}
    </tbody>
    <tfoot>
      <tr><td colSpan={3}>Subtotal before tax</td><td className="r tnum">{money(c.preTax)}</td></tr>
      {c.taxOn ? <tr><td colSpan={3}>{S.tax.name || 'Sales tax'} ({c.taxRate}%)</td><td className="r tnum">{money(c.tax)}</td></tr> : <tr><td colSpan={3} className="muted">Tax: not configured, so none is added</td><td /></tr>}
      <tr className="big"><td colSpan={3}>Seasonal price</td><td className="r tnum">{money(c.total)}</td></tr>
      {c.cardFeeOn && <tr><td colSpan={3} className="muted">Card processing fee if paying by card ({c.cardFeeRate}%)</td><td className="r tnum">{money(c.cardFee)}</td></tr>}
    </tfoot></table></div>;
}
function BudgetCard({ plan, q, set, S }) {
  const apply = o => { set(d => { snapshot(d, S, 'Before budget change: ' + o.title); ['roof', 'bushes', 'trees', 'stakes', 'wreaths', 'garland'].forEach(k => { d[k] = o.q[k]; }); }); toast('Design updated. The earlier version is saved.'); };
  if (!plan.budget) return <Card title="Budget check"><p className="muted small">Add the customer’s budget in step 2 to compare it with this design.</p></Card>;
  return <Card title="Budget check" sub={`Customer budget ${money(plan.budget)} per season`}>
    {plan.fits ? <Note tone="ok" title="Within budget">by {money(plan.gap)}.</Note> : <Note tone="warn" title={`Over budget by ${money(plan.gap)}.`}>Here are ways to bring it closer. Each one only removes lighting areas; prices and required charges don’t change.</Note>}
    {!plan.fits && <div className="opts">{plan.options.map(o => <div key={o.key} className={'opt ' + (o.fits ? 'fits' : '')}>
      <div className="opt-h"><b>{o.title}</b>{o.fits ? <Badge tone="ok" icon="check">Fits budget</Badge> : <Badge tone="warn">Still over</Badge>}</div>
      <div className="opt-n tnum"><span>{money(o.total)}</span><small>saves {money(o.save)}</small></div>
      <div className="small muted">Removes: {o.removed.join('; ')}</div>
      <Btn size="sm" kind={o.fits ? 'primary' : 'ghost'} onClick={() => apply(o)}>Use this version</Btn>
    </div>)}{!plan.options.length && <p className="muted small">There are no optional areas to remove.</p>}</div>}
    <p className="small muted">Only the 3-year agreement is offered, so there are no other terms to compare. Discounts appear only when the owner has approved them.</p>
  </Card>;
}
function MarginCard({ c, S }) {
  const k = S.costs || {};
  const any = ['roof', 'mini', 'stake', 'wreath', 'garland', 'perJob'].some(x => num(k[x]));
  return <Collapse title="Internal margin (never shown to customers)">
    {!any ? <p className="muted small">Enter your own cost assumptions in Pricing &amp; Settings to see an estimated margin. Nothing is assumed.</p> : (() => {
      const cost = round2(c.counts.roofFt * num(k.roof) + (c.counts.bushStrands + c.counts.treeStrands) * num(k.mini) + c.counts.stakeFt * num(k.stake) + c.counts.wreathCount * num(k.wreath) + c.counts.garlandPieces * num(k.garland) + num(k.perJob));
      const m = round2(c.preTax - cost);
      return <dl className="lp-dl tnum"><dt>Estimated cost (owner inputs)</dt><dd>{money(cost)}</dd><dt>Margin before tax</dt><dd>{money(m)}</dd><dt>Margin %</dt><dd>{c.preTax ? Math.round(m / c.preTax * 100) + '%' : '—'}</dd></dl>;
    })()}
  </Collapse>;
}

/* ---------- 6 · Design & mockup ---------- */
export function buildPrompt(p, m) {
  let t = p.text.replace('[COLOR OR COLOR PATTERN]', (m.color || '').trim() || '[COLOR OR COLOR PATTERN]');
  if (p.row === 16) t = t.replace(/\[DESCRIBE EXACT CHANGES[^\]]*\]/, (m.revisions || '').trim() || '[DESCRIBE EXACT CHANGES]');
  const extra = [];
  if (p.row === 14 && (m.scope || '').trim()) extra.push('Requested lighting scope: ' + m.scope.trim() + '.');
  if ((m.notes || '').trim()) extra.push('Additional notes: ' + m.notes.trim());
  return extra.length ? t + '\n\n' + extra.join('\n') : t;
}
export function MockupStudio({ q, set }) {
  const m = q.mockup;
  const [pick, setPick] = useState(14);
  const p = WB.mock.prompts.find(x => x.row === pick);
  const upd = (k, v) => set(d => { d.mockup[k] = v; });
  const colorDefault = [q.color === 'Other fixed color' ? '' : q.color, q.colorNote].filter(Boolean).join(', ').toLowerCase();
  const view = Object.assign({}, m, { color: m.color || colorDefault, scope: m.scope || q.areas.join(', ').toLowerCase() });
  const lab = r => WB.mock.prompts.find(x => x.row === r).label.split('\n');
  return <div className="stack">
    <Seg value={pick} onChange={setPick} options={WB.mock.prompts.map(x => ({ k: x.row, label: lab(x.row).join(' · ') }))} />
    <div className="form-grid">
      <Field label="Color scheme" hint="Fills [COLOR OR COLOR PATTERN]"><Input value={view.color} onChange={v => upd('color', v)} placeholder="e.g. classic warm white" /></Field>
      {pick === 14 && <Field label="Requested scope" hint="Added after the approved prompt"><Input value={view.scope} onChange={v => upd('scope', v)} placeholder="e.g. roofline, front bushes, two wreaths" /></Field>}
      {pick === 16 && <Field label="Specific revisions" className="span2" hint="Fills [DESCRIBE EXACT CHANGES]"><textarea className="inp ta" value={m.revisions} onChange={e => upd('revisions', e.target.value)} placeholder="e.g. remove lights from left bushes; add one 24-inch warm-white wreath over the center window" /></Field>}
      <Field label="Additional notes" className={pick === 16 ? 'span2' : ''}><Input value={m.notes} onChange={v => upd('notes', v)} placeholder="Optional" /></Field>
    </div>
    <div className="prompt-box"><div className="row between"><span className="eyebrow">{p.use.replace(/\n/g, ' · ')}</span><CopyBtn kind="primary" label="Copy prompt" get={() => buildPrompt(p, view)} /></div><pre>{buildPrompt(p, view)}</pre><span className="src">06 AI MOCKUPS · Row {p.row}</span></div>
  </div>;
}
function ImageSlots({ q, set }) {
  const [urls, setUrls] = useState({});
  const list = q.mockup.images || [];
  useEffect(() => {
    let live = true; const made = [];
    Promise.all(list.map(async im => { const b = await images.get('mock:' + q.id + ':' + im.id); if (b) { const u = URL.createObjectURL(b); made.push(u); return [im.id, u]; } return [im.id, null]; })).then(pairs => { if (live) setUrls(Object.fromEntries(pairs)); });
    return () => { live = false; made.forEach(u => URL.revokeObjectURL(u)); };
  }, [q.id, list.map(i => i.id).join()]);
  const add = async (file, kind) => {
    if (!file) return;
    try { const b = await shrinkImage(file, 1800); const id = uid('i'); await images.put('mock:' + q.id + ':' + id, b); set(d => { d.mockup.images = [...(d.mockup.images || []), { id, kind, name: file.name || kind }]; }); }
    catch (e) { toast(e.message || 'Could not read that image.', 'bad'); }
  };
  const del = async id => { await images.del('mock:' + q.id + ':' + id); set(d => { d.mockup.images = d.mockup.images.filter(x => x.id !== id); }); };
  return <div className="stack">
    <div className="row">
      <label className="btn ghost sm"><Icon n="upload" size={16} /><span>Property photo</span><input type="file" accept="image/*" hidden onChange={e => { add(e.target.files[0], 'Property photo'); e.target.value = ''; }} /></label>
      <label className="btn ghost sm"><Icon n="upload" size={16} /><span>Finished design</span><input type="file" accept="image/*" hidden onChange={e => { add(e.target.files[0], 'Finished design'); e.target.value = ''; }} /></label>
      <span className="small muted">Images stay on this device.</span>
    </div>
    {list.length > 0 && <div className="thumbs">{list.map(im => <figure key={im.id} className="thumb">{urls[im.id] ? <img src={urls[im.id]} alt={im.kind} /> : <div className="thumb-missing small muted">On another device</div>}<figcaption><span>{im.kind}</span><Btn size="sm" kind="subtle" icon="trash" aria-label="Remove image" onClick={() => del(im.id)} /></figcaption></figure>)}</div>}
  </div>;
}
function StageMockup({ q, set }) {
  const st = [{ k: 'none', label: 'Not started' }, { k: 'shared', label: 'Concept shared' }, { k: 'approved', label: 'Customer approved' }, { k: 'revision', label: 'Revision requested' }];
  return <div className="stage">
    <div className="grid2">
      <Say label="Explain the concept" text={(WB.mock.steps.find(s => s.row === 10) || {}).do} src="06 AI MOCKUPS · Row 10" />
      <Say label="Mockup reveal" text={sc(18).say} src={S_(SCRIPT, 18)} after={sc(18).action} />
    </div>
    <Card title="AI mockup prompt" sub="Use the customer’s real property photo and one of the three approved prompts. This app writes the prompt; your image tool makes the picture.">
      <MockupStudio q={q} set={set} />
    </Card>
    <div className="grid2">
      <Card title="Photos for this quote"><ImageSlots q={q} set={set} /></Card>
      <Card title="Mockup status"><Seg value={q.mockup.status} onChange={v => set(d => { d.mockup.status = v; if (v !== 'none') bump(d, 'design'); })} options={st} />
        <Collapse title="Quality check before sending">{WB.mock.steps.filter(s => s.row <= 9).map(s => <div className="fact" key={s.row}><b>{s.step}</b><span>{s.do}</span><span className="muted small">Rule: {s.rule}</span></div>)}</Collapse>
      </Card>
    </div>
    <Note tone="warn" src="06 AI MOCKUPS · Row 18">{WB.mock.final}</Note>
  </div>;
}

/* ---------- 7 · Close ---------- */
const OUTCOMES = [
  { k: 'accepted', label: 'Customer accepted', icon: 'check', status: 'sent', next: 'Send the agreement and deposit request' },
  { k: 'revision', label: 'Needs a revision', icon: 'wand', status: 'design', next: 'Send the revised design and price' },
  { k: 'considering', label: 'Considering', icon: 'clock', status: 'negotiating', next: 'Follow up on their decision' },
  { k: 'followup', label: 'Follow-up required', icon: 'phone', status: 'negotiating', next: 'Call back at the agreed time' },
  { k: 'lost', label: 'Not interested', icon: 'x', status: 'lost', next: '' }
];
function StageClose({ q, set, S, repFirst, me, openObjections }) {
  const oc = OUTCOMES.find(o => o.k === q.outcome);
  const tRow = q.outcome ? OUTCOME_TEXT[q.outcome] : null;
  const setOutcome = o => set(d => {
    d.outcome = o.k;
    if (o.k === 'lost') d.status = 'lost'; else { if (d.status === 'lost') d.status = 'qualified'; bump(d, o.status); }
    if (o.next && !d.next.note) d.next.note = o.next;
    if (!d.next.owner) d.next.owner = me.name || '';
  });
  return <div className="stage">
    <Say label="Close the sale" text={sc(19).say} src={S_(SCRIPT, 19)} after={sc(19).action} big />
    <Card title="How did it go?">
      <div className="outcomes">{OUTCOMES.map(o => <button type="button" key={o.k} className={'outcome ' + (q.outcome === o.k ? 'on ' + o.k : '')} onClick={() => setOutcome(o)}><Icon n={o.icon} size={20} /><span>{o.label}</span></button>)}</div>
      {q.outcome === 'accepted' && <>
        <Say label="When accepted" text={sc(20).say} src={S_(SCRIPT, 20)} after={sc(20).action} />
        <Note tone="info" title="Don’t mark it booked early." src="01 SALES SOP · Row 26; 07 FLYRA SOP · Row 24">{(WB.sop.rules.find(r => r.row === 26) || {}).how} Mark the lead Won once the agreement is signed and the deposit is paid.</Note>
        <div className="row"><Btn kind={q.status === 'won' ? 'ok' : 'ghost'} icon="check" onClick={() => set(d => { d.status = 'won'; snapshot(d, S, 'Marked won'); })}>{q.status === 'won' ? 'Won' : 'Agreement signed and deposit paid: mark Won'}</Btn></div>
      </>}
      {(q.outcome === 'considering' || q.outcome === 'followup' || q.outcome === 'revision') && <Say label="If not ready" text={sc(21).say} src={S_(SCRIPT, 21)} after={sc(21).action} />}
      {q.outcome === 'lost' && <Field label="Reason (for FLYRA)"><Input value={q.lostReason} onChange={v => set(d => { d.lostReason = v; })} placeholder="e.g. price, timing, went with another company" /></Field>}
    </Card>
    <Card title="Next action" sub="Every lead leaves the call with an owner and a dated next step.">
      <div className="form-grid four">
        <Field label="Date"><Input type="date" value={q.next.date} onChange={v => set(d => { d.next.date = v; })} /></Field>
        <Field label="How"><Select value={q.next.method} onChange={v => set(d => { d.next.method = v; })} options={['Call', 'Text', 'Email', 'Visit']} /></Field>
        <Field label="Owner"><Input value={q.next.owner} onChange={v => set(d => { d.next.owner = v; })} placeholder={me.name || 'Name'} /></Field>
        <Field label="What happens next" className="span4"><Input value={q.next.note} onChange={v => set(d => { d.next.note = v; })} placeholder="e.g. Review revised design with both decision-makers" /></Field>
      </div>
      {!q.next.date && q.outcome && q.outcome !== 'lost' && <Note tone="warn">Set a date: {WB.flyra.pipeline.rduring.toLowerCase()}.</Note>}
    </Card>
    <Say label="End the call" text={sc(22).say} src={S_(SCRIPT, 22)} after={sc(22).action} />
    {tRow && <Say label={'Text to send: ' + txt(tRow).situation} text={fillTemplate(txt(tRow).text, q, S, repFirst)} src={S_('08 TEXT TEMPLATES', tRow)} after={txt(tRow).when} />}
    <Card title="Objections raised" action={<Btn size="sm" icon="chat" onClick={openObjections}>Open objections</Btn>}>
      {(q.objections || []).length ? <div className="chips">{q.objections.map(r => <Chip key={r} on onClick={() => set(d => { d.objections = d.objections.filter(x => x !== r); })}>{(obj(r) || {}).says} ×</Chip>)}</div> : <p className="muted small">None logged. Use “Log on this quote” in the objection assistant.</p>}
    </Card>
  </div>;
}

/* ---------- 8 · FLYRA handoff ---------- */
const FSTEPS = [
  { t: 'Open the original lead', rows: [6], tip: 'Search by name or phone. Don’t create a duplicate.' },
  { t: 'Confirm customer details', rows: [7] },
  { t: 'Document the scope', rows: [8], tip: 'Paste the handoff notes.' },
  { t: 'Convert to Customer', rows: [9] },
  { t: 'Choose Subscription', rows: [10, 11], tip: `Pick the plan “${FL.plan.name}”.` },
  { t: 'Create and send the estimate', rows: [12, 13], lines: true },
  { t: 'Set the next action', rows: [14, 15] }
];
function StageHandoff({ q, set, S, c, me, openEstimate }) {
  const repName = me.name || '';
  const text = handoffText(q, S, repName);
  const fl = flyraLines(q, S);
  const fs = q.flow.fsteps || {};
  const facts = WB.sop.facts;
  const factDone = [!!q.outcome || q.status !== 'new', !!q.customer.address, !!(q.color || q.areas.length), !!(num(q.budget) || c.total), !!c.total, !!(q.next.date && (q.next.owner || repName))];
  return <div className="stage">
    <Card title="FLYRA handoff" sub="Paste this into the FLYRA lead notes." action={<CopyBtn kind="primary" size="" label="Copy handoff" get={() => { set(d => { d.flow = Object.assign({}, d.flow, { handoff: true }); }); return text; }} />}>
      <pre className="handoff">{text}</pre>
    </Card>
    <div className="grid2">
      <Card title="Do this in FLYRA" sub={WB.flyra.sub}>
        {FSTEPS.map((s, i) => <div key={i} className="fstep">
          <Check on={!!fs[i]} onChange={v => set(d => { d.flow = Object.assign({}, d.flow, { fsteps: Object.assign({}, fs, { [i]: v }) }); })}><b>{i + 1}. {s.t}</b></Check>
          <div className="small muted">{s.rows.map(r => (WB.flyra.steps.find(x => x.row === r) || {}).detail).join(' ')}{s.tip ? ' ' + s.tip : ''}</div>
          {s.lines && fl.length > 0 && <table className="tbl mini"><tbody>{fl.map(([n, qty, p]) => <tr key={n}><td>{n}</td><td className="r tnum">{qty}</td><td className="r tnum">{money(num(p))}</td></tr>)}</tbody></table>}
        </div>)}
        <span className="src">07 FLYRA SOP · Rows 6–17</span>
      </Card>
      <div className="stack">
        <Card title="Customer estimate" sub={c.level === 'verified' ? 'Ready to send.' : 'Will be marked PRELIMINARY.'}>
          <div className="row"><Btn kind="primary" icon="file" onClick={openEstimate}>Preview estimate</Btn><CopyBtn label="Copy as text" get={() => estimateText(q, S)} /></div>
          <div className="row"><Btn icon="send" onClick={() => set(d => { bump(d, 'sent'); snapshot(d, S, 'Estimate sent'); })} disabled={q.status === 'sent' || q.status === 'won'}>{q.status === 'sent' ? 'Marked as sent' : 'Mark estimate as sent'}</Btn></div>
        </Card>
        <Say label="Quote-sent text" text={fillTemplate(txt(10).text, q, S, firstName(repName))} src={S_('08 TEXT TEMPLATES', 10)} after={txt(10).when} />
        <Card title="Every call ends with 6 FLYRA facts">{facts.map((f, i) => <div key={i} className="factline"><Icon n={factDone[i] ? 'check' : 'alert'} size={16} className={factDone[i] ? 'okc' : 'warnc'} /><span>{f}</span></div>)}<span className="src">01 SALES SOP · Row 29</span></Card>
      </div>
    </div>
    <Card title="Notes"><textarea className="inp ta" value={q.notes} onChange={e => set(d => { d.notes = e.target.value; })} placeholder="Anything the next person should know" /></Card>
    <Card title="Quote versions" action={<Btn size="sm" icon="save" onClick={() => { set(d => snapshot(d, S, 'Saved by rep')); toast('Version saved'); }}>Save version</Btn>}>
      {(q.versions || []).length ? <div className="tbl-wrap"><table className="tbl"><thead><tr><th>When</th><th>Note</th><th>Scope</th><th className="r">Seasonal</th></tr></thead><tbody>{q.versions.map((v, i) => <tr key={i}><td className="small">{fmtDateTime(v.at)}</td><td className="small">{v.note}</td><td className="small">{v.scope}</td><td className="r tnum">{money(v.total)}</td></tr>)}</tbody></table></div> : <p className="muted small">Versions are saved when you change the design for the budget, download an estimate or mark it sent.</p>}
    </Card>
  </div>;
}
