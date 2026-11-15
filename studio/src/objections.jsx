// Objection assistant: searchable, with policy warnings from the signed agreement and owner updates.
import { Icon, Btn, Chip, CopyBtn, Note, Say } from './ui.jsx';
import { OBJECTIONS, OBJ_CATS, tokens, norm } from './kb.js';
const { useState } = React;

export function ObjectionPanel({ rep, onLog, logged, startRow }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState(startRow || null);
  const r = t => (rep ? rep(t) : t);
  const o = sel ? OBJECTIONS.find(x => x.row === sel) : null;
  if (o) return <div className="obj-detail">
    <Btn size="sm" kind="subtle" icon="left" onClick={() => setSel(null)}>All objections</Btn>
    <div><span className="badge neutral">{o.cat}</span></div>
    <div><div className="eyebrow">Customer says</div><div className="obj-says">“{o.says}”</div></div>
    {o.warn.map((w, i) => <Note key={i} tone={w.title === 'Owner update' ? 'info' : 'warn'} title={w.title + ':'} src={w.src}>{w.text}</Note>)}
    <Say label="Say this" text={r(o.answer)} big src={o.src} after={o.edited} />
    <Say label="Then ask" text={o.next} src={o.nextSrc} after={o.nextOrig ? `Replaces the workbook question “${o.nextOrig}” (3-year only).` : null} />
    <div className="row">
      <CopyBtn kind="primary" size="" label="Copy answer + question" get={() => r(o.answer) + ' ' + o.next} />
      {onLog && <Btn icon={logged && logged.includes(o.row) ? 'check' : 'flag'} onClick={() => onLog(o.row)} disabled={logged && logged.includes(o.row)}>{logged && logged.includes(o.row) ? 'Logged on quote' : 'Log on this quote'}</Btn>}
    </div>
  </div>;
  const qt = new Set(tokens(q));
  const score = x => { if (!q.trim()) return 1; const ts = tokens(x.says), tb = tokens(`${x.answer} ${x.next} ${x.cat}`); let s = 0; qt.forEach(t => { if (ts.includes(t)) s += 3; else if (tb.includes(t)) s += 1; }); return s + (norm(x.says).includes(norm(q)) ? 5 : 0); };
  const list = OBJECTIONS.filter(x => (cat === 'All' || x.cat === cat)).map(x => [x, score(x)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([x]) => x);
  return <div className="obj-list">
    <div className="searchbox"><Icon n="search" size={17} /><input className="inp" value={q} onChange={e => setQ(e.target.value)} placeholder="What did the customer say?" aria-label="Search objections" autoFocus /></div>
    <div className="chips">{['All', ...OBJ_CATS.map(c => c[0])].map(c => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
    <div className="stack-s">
      {list.map(x => <button type="button" key={x.row} className="obj-item" onClick={() => setSel(x.row)}>
        <span>“{x.says}”</span><small>{x.cat}{x.warn.length ? ' · policy note' : ''}</small>
      </button>)}
      {!list.length && <p className="muted small">No objection matches. Try the Knowledge Base search.</p>}
    </div>
  </div>;
}
