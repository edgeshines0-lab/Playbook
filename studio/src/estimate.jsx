// Customer estimate, PDF output, FLYRA handoff and text templates.
import { Btn, CopyBtn, Note, toast, Icon } from './ui.jsx';
import { caps, saveFile, loadScript } from './storage.js';
import { calc, scopeText, YEARS, LEVELS, rowFt, garlandPiecesFor, AREAS, RISKS } from './pricing.js';
import { WB, FL } from './data.js';
import { money, fmtDate, todayISO, firstName, joinList, num, int } from './util.js';
const { useRef, useState } = React;

export const estNo = q => 'EST-' + (q.createdAt || '').slice(2, 10).replace(/-/g, '') + '-' + q.id.slice(-4).toUpperCase();
const colorText = q => [q.color, q.colorNote].filter(Boolean).join(' · ');

export function EstimateDoc({ q, S }) {
  const c = calc(q, S), firm = c.level === 'verified';
  const co = S.company;
  const promos = (S.promotions || []).filter(p => p.approved && String(p.text || '').trim());
  return <div className="paper" id="estimate-paper">
    <header className="p-head">
      <div><div className="p-brand">EDGE SHINES</div><div className="p-sub">{co.name}</div><div className="p-co">{co.address}<br />{co.phone}</div></div>
      <div className="p-meta"><div className="p-title">Christmas Lighting Estimate</div><div>{estNo(q)}</div><div>{fmtDate(todayISO())}</div></div>
    </header>
    {!firm && <div className="p-prelim">PRELIMINARY ESTIMATE · Final price is confirmed after measurements and site conditions are verified.</div>}
    <div className="p-grid">
      <div><div className="p-l">Prepared for</div><div className="p-v">{q.customer.name || '—'}</div><div className="p-s">{[q.customer.phone, q.customer.email].filter(Boolean).join(' · ')}</div></div>
      <div><div className="p-l">Property</div><div className="p-v">{q.customer.address || '—'}</div></div>
      <div><div className="p-l">Design</div><div className="p-v">{colorText(q) ? 'Fixed color: ' + colorText(q) : 'Color to be confirmed'}</div><div className="p-s">Commercial-grade C9 LED lights, custom-fit to your home</div></div>
      <div><div className="p-l">Agreement</div><div className="p-v">3-year seasonal service</div><div className="p-s">Three consecutive holiday seasons</div></div>
    </div>
    <table className="p-table"><thead><tr><th>Lighting</th><th className="r">Quantity</th><th className="r">Unit price</th><th className="r">Amount</th></tr></thead>
      <tbody>
        {c.lines.map((l, i) => <tr key={i}><td>{l.label}</td><td className="r">{l.qty} {l.unit}</td><td className="r">{money(l.rate)}</td><td className="r">{money(l.amount)}</td></tr>)}
        {c.discountLines.map((l, i) => <tr key={'d' + i}><td>{l.label}</td><td /><td /><td className="r">{money(l.amount)}</td></tr>)}
        {c.minimumAdj > 0 && <tr><td>Minimum job charge adjustment</td><td /><td /><td className="r">{money(c.minimumAdj)}</td></tr>}
        {!c.lines.length && <tr><td colSpan={4} className="p-s">No priced lighting yet.</td></tr>}
      </tbody></table>
    {c.missing.length > 0 && <div className="p-s p-pad">To be priced separately: {c.missing.join('; ')}.</div>}
    <div className="p-totals">
      <div><span>Subtotal</span><b>{money(c.preTax)}</b></div>
      {c.taxOn ? <div><span>{S.tax.name || 'Sales tax'} ({c.taxRate}%)</span><b>{money(c.tax)}</b></div> : null}
      <div className="p-big"><span>Seasonal price{c.taxOn ? '' : ' (before tax)'}</span><b>{money(c.total)}</b></div>
      <div><span>Deposit to reserve installation ({c.depPct}%)</span><b>{money(c.deposit)}</b></div>
      <div><span>Balance due when installation is complete</span><b>{money(c.balance)}</b></div>
      <div className="p-s"><span>3 seasons at this seasonal price</span><b>{money(c.agreementTotal)}</b></div>
    </div>
    <div className="p-cols">
      <div><div className="p-l">Your seasonal price includes</div><ul>{(S.inclusions || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
      <div><div className="p-l">Good to know</div><ul>
        <li>Lights are fixed-color seasonal C9 LEDs, not app-controlled color-changing lights.</li>
        <li>Lights and materials are provided and remain the property of Edge Shines Home Services.</li>
        {!c.taxOn && <li>Prices are shown before any applicable tax.</li>}
        <li>Final scope, price and terms are set by your signed agreement.</li>
        {promos.map(p => <li key={p.id}>{p.text}</li>)}
      </ul></div>
    </div>
    {S.agreement.approved && <div className="p-terms"><div className="p-l">Agreement terms</div><p>{S.agreement.value}</p></div>}
    {S.guarantees.approved && <div className="p-terms"><div className="p-l">Our guarantees</div><p>{S.guarantees.value}</p></div>}
    <footer className="p-foot">Thank you for considering Edge Shines. Questions? Call {co.phone}.</footer>
  </div>;
}

export function estimateText(q, S) {
  const c = calc(q, S), L = [];
  L.push(`EDGE SHINES · Christmas Lighting Estimate ${estNo(q)} (${fmtDate(todayISO())})`);
  if (c.level !== 'verified') L.push('PRELIMINARY: final price is confirmed after measurements and site conditions are verified.');
  L.push(`For: ${q.customer.name || '—'} · ${q.customer.address || '—'}`);
  if (colorText(q)) L.push(`Fixed color: ${colorText(q)}`);
  L.push('3-year seasonal service agreement (three consecutive holiday seasons)', '');
  c.lines.forEach(l => L.push(`${l.label}: ${l.qty} ${l.unit} × ${money(l.rate)} = ${money(l.amount)}`));
  c.discountLines.forEach(l => L.push(`${l.label}: ${money(l.amount)}`));
  if (c.minimumAdj) L.push(`Minimum job charge adjustment: ${money(c.minimumAdj)}`);
  if (c.taxOn) L.push(`${S.tax.name || 'Sales tax'} (${c.taxRate}%): ${money(c.tax)}`);
  L.push('', `Seasonal price${c.taxOn ? '' : ' (before tax)'}: ${money(c.total)}`, `Deposit to reserve installation (${c.depPct}%): ${money(c.deposit)}`, `Balance at completed installation: ${money(c.balance)}`, `3 seasons at this price: ${money(c.agreementTotal)}`);
  if ((S.inclusions || []).length) L.push('', 'Includes: ' + S.inclusions.join(', ') + '.');
  return L.join('\n');
}

export async function downloadPdf(q) {
  const el = document.getElementById('estimate-paper');
  if (!el) { toast('Open the estimate preview first.', 'bad'); return; }
  if (!caps.downloads) { toast('Downloads aren’t available here. Use Copy estimate instead.', 'bad'); return; }
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const canvas = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const pdf = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), m = 28;
    const w = pw - m * 2, pageH = (ph - m * 2) * canvas.width / w;
    for (let y = 0, page = 0; y < canvas.height; y += pageH, page++) {
      const h = Math.min(pageH, canvas.height - y);
      const slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = h;
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, w, h * w / canvas.width);
    }
    const name = `Edge Shines estimate - ${(q.customer.name || 'customer').replace(/[^\w .-]+/g, '')}.pdf`;
    await saveFile(name, pdf.output('blob'));
    toast('Estimate saved');
    return true;
  } catch (e) {
    if (e && e.code === 'declined') return false;
    toast((e && e.message) || 'Could not create the PDF. Use Copy estimate instead.', 'bad');
    return false;
  }
}

/* ---------- FLYRA handoff ---------- */
export function flyraLines(q, S) {
  const c = calc(q, S), L = [];
  if (c.counts.roofFt) L.push(['Holiday Lights', `${c.counts.roofFt} linear ft`, S.rates.roof.value]);
  if (c.counts.bushStrands + c.counts.treeStrands) L.push(['Mini Lights', `${c.counts.bushStrands + c.counts.treeStrands}`, S.rates.mini.value]);
  if (c.counts.stakeFt) L.push(['Ground Stake Lighting', `${c.counts.stakeFt} linear ft`, S.rates.stake.value]);
  const wr = {}; q.wreaths.filter(w => w.include !== false && w.lit !== false).forEach(w => { wr[w.size] = (wr[w.size] || 0) + int(w.qty); });
  Object.entries(wr).forEach(([s, n]) => { if (n) L.push([`${s} inch Lit Wreath`.replace('60 inch', '60 Inch'), String(n), (S.wreaths[s] || {}).value]); });
  if (c.counts.garlandPieces) L.push(['Lit Garland', String(c.counts.garlandPieces), S.garland.value]);
  return L;
}
export function handoffText(q, S, repName) {
  const c = calc(q, S), cu = q.customer, L = [];
  const roof = q.roof.filter(r => r.include !== false).map(r => `${r.label || 'Section'} (${(AREAS.find(a => a.k === r.area) || {}).label || 'Roofline'}): ${rowFt(q, r)} ft${r.verified ? ', verified' : ', not verified'}`);
  const other = [];
  q.bushes.filter(b => b.include !== false && int(b.count)).forEach(b => other.push(`Bushes${b.label ? ' · ' + b.label : ''}: ${int(b.count)} × ${num(b.per)} strands`));
  q.trees.filter(b => b.include !== false && int(b.count)).forEach(b => other.push(`Trees${b.label ? ' · ' + b.label : ''}: ${int(b.count)} × ${num(b.per)} strands`));
  q.stakes.filter(s => s.include !== false && rowFt(q, s)).forEach(s => other.push(`Ground stakes${s.label ? ' · ' + s.label : ''}: ${rowFt(q, s)} ft`));
  q.wreaths.filter(w => w.include !== false && int(w.qty)).forEach(w => other.push(`Wreath ${w.size}-inch ${w.lit === false ? 'unlit' : 'lit'} × ${int(w.qty)}${w.bow ? ', bow' : ''}${w.note ? ' · ' + w.note : ''}`));
  q.garland.filter(g => g.include !== false && garlandPiecesFor(q, g, S)).forEach(g => other.push(`Garland${g.label ? ' · ' + g.label : ''}: ${garlandPiecesFor(q, g, S)} piece(s)${rowFt(q, g) ? ` (${rowFt(q, g)} ft measured)` : ''}`));
  const risks = RISKS.filter(r => (q.risks || {})[r.k]).map(r => r.label);
  const objs = (q.objections || []).map(r => (WB.obj.items.find(o => o.row === r) || {}).says).filter(Boolean);
  const outcome = { accepted: 'Customer accepted', revision: 'Needs a revision', considering: 'Considering', followup: 'Follow-up required', lost: 'Not interested' }[q.outcome] || 'Not recorded';
  L.push(`EDGE SHINES · HOLIDAY LIGHTING QUOTE · ${fmtDate(todayISO())}${repName ? ' · Rep: ' + repName : ''}`);
  L.push(`Customer: ${cu.name || '—'} | Phone: ${cu.phone || '—'} | Email: ${cu.email || '—'}`);
  L.push(`Address: ${cu.address || '—'}`);
  L.push(`Lead source: ${cu.source || '—'} | Decision-maker: ${cu.decisionMaker || '—'} | Preferred install: ${cu.installDate ? fmtDate(cu.installDate) : '—'}`);
  L.push(`Budget: ${num(q.budget) ? money(num(q.budget)) : '—'}`);
  L.push(`Requested design: ${q.areas.length ? joinList(q.areas) : '—'}`);
  L.push(`Colors: ${colorText(q) || '—'}`);
  L.push('Measured roofline sections:'); (roof.length ? roof : ['—']).forEach(x => L.push('  ' + x));
  L.push('Other lighting:'); (other.length ? other : ['—']).forEach(x => L.push('  ' + x));
  L.push(`Agreement: 3-year (FLYRA plan “${FL.plan.name}”)`);
  L.push(`Seasonal quoted price: ${money(c.total)}${c.taxOn ? '' : ' before tax'} | Deposit ${c.depPct}%: ${money(c.deposit)} | 3 seasons: ${money(c.agreementTotal)}`);
  L.push(`Quote confidence: ${LEVELS[c.level].label}${c.level !== 'verified' ? ' — ' + [...c.reasons.review, ...c.reasons.prelim].join('; ') : ''}`);
  if (risks.length) L.push(`Access risks: ${risks.join(', ')}`);
  L.push(`Mockup: ${{ none: 'Not started', shared: 'Concept shared', approved: 'Customer approved', revision: 'Revision requested' }[q.mockup.status] || 'Not started'}`);
  L.push(`Objections: ${objs.length ? objs.join('; ') : 'None logged'}`);
  L.push(`Closing outcome: ${outcome}${q.outcome === 'lost' && q.lostReason ? ' — ' + q.lostReason : ''}`);
  L.push(`Next action: ${q.next.note || '—'} | ${q.next.method || ''} ${q.next.date ? 'on ' + fmtDate(q.next.date) : '(no date set)'} | Owner: ${q.next.owner || repName || '—'}`);
  const fl = flyraLines(q, S);
  if (fl.length) { L.push('FLYRA estimate lines:'); fl.forEach(([n, qty, p]) => L.push(`  ${n} × ${qty} @ ${money(num(p))}`)); }
  if (q.notes) L.push('Notes: ' + q.notes);
  return L.join('\n');
}

/* ---------- Text templates filled from the quote ---------- */
export function fillTemplate(text, q, S, repFirst) {
  const c = calc(q, S);
  const map = {
    NAME: firstName(q.customer.name),
    SCOPE: scopeText(q, S),
    PRICE: c.total ? money(c.total) : '',
    BUDGET: num(q.budget) ? money(num(q.budget)) : '',
    'OTHER PERSON': q.customer.decisionMaker && !/^(customer|self|me)$/i.test(q.customer.decisionMaker) ? q.customer.decisionMaker : '',
    'DAY/TIME': q.next.date ? fmtDate(q.next.date) : ''
  };
  let t = text.replace(/\[([^\]]+)\]/g, (all, k) => map[k] || all);
  if (repFirst) t = t.replace(/\bEmily\b/g, repFirst);
  return t;
}
// Which workbook text fits each closing outcome (08 TEXT TEMPLATES rows).
export const OUTCOME_TEXT = { accepted: 14, revision: 11, considering: 15, followup: 15, lost: null };
