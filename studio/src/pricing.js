// Quote engine: every price on screen comes from here.
import { num, int, round2, money, clone, joinList, pitchFactor, plural } from './util.js';
import { WB, FL } from './data.js';

export const YEARS = 3; // Owner instruction (Nov 15, 2026): Edge Shines only offers 3-year agreements.
export const WREATH_SIZES = [24, 36, 48, 60];

export const AREAS = [
  { k: 'front', label: 'Front roofline' },
  { k: 'peak', label: 'Front peak / gable' },
  { k: 'garage', label: 'Garage' },
  { k: 'side', label: 'Side roofline' },
  { k: 'back', label: 'Back roofline' },
  { k: 'other', label: 'Other (porch, dormer…)' }
];
export const SOURCES = [
  { k: 'aerial', label: 'Aerial tool / Google Earth' },
  { k: 'photo', label: 'Traced on scaled screenshot' },
  { k: 'site', label: 'Measured on site' },
  { k: 'estimate', label: 'Rough estimate' }
];
// Conditions that send a quote to Manager Review (spec + 09 MEASURE SOP row 11 + 04 SERVICE FACTS row 30).
export const RISKS = [
  { k: 'metal', label: 'Metal or aluminum roof' },
  { k: 'height', label: 'Difficult height (2+ stories or tall peaks)' },
  { k: 'steep', label: 'Steep pitch' },
  { k: 'hidden', label: 'Hidden or unseen sections' },
  { k: 'mounting', label: 'Unusual mounting method needed' },
  { k: 'power', label: 'Inadequate electrical access' }
];
// 03 FAST QUOTES · Quote checkpoint (rows 24–29)
export const CHECKS = WB.fast.checkpoint.map(c => ({ k: 'r' + c.row, row: c.row, label: c.verify, why: c.why, action: c.action }));

const flyraPrice = key => (FL.services.find(s => s.key === key) || {}).price;
const wbRate = (term, key) => (WB.price.rates.find(r => r.term === term) || {})[key];

export const RATE_PRESETS = [
  { k: 'workbook', label: 'Workbook reference (3-year)', src: '10 PRICE CARD · Row 5', roof: wbRate('3-year', 'roof'), mini: wbRate('3-year', 'mini'), stake: wbRate('3-year', 'stake') },
  { k: 'flyra', label: 'FLYRA price book', src: `FLYRA services · retrieved ${FL.retrieved}`, roof: flyraPrice('roof'), mini: flyraPrice('mini'), stake: flyraPrice('stake') },
  { k: 'plan', label: 'FLYRA 3-year plan template', src: `FLYRA “${FL.plan.name}” · retrieved ${FL.retrieved}`, roof: FL.plan.lines[0].price, mini: FL.plan.lines[1].price, stake: FL.plan.lines[2].price }
];

const P = (value, src, extra) => Object.assign({ value, approved: false, src }, extra || {});
export function defaultSettings() {
  const wb = RATE_PRESETS[0];
  const terms = FL.plan.terms;
  const includes = (terms.split('\n\n').find(p => p.startsWith('WHAT YOUR SEASONAL PRICE INCLUDES')) || '').replace(/^[^:]+:\s*/, '');
  return {
    v: 2,
    preset: 'workbook',
    rates: { roof: P(wb.roof, wb.src), mini: P(wb.mini, wb.src), stake: P(wb.stake, wb.src) },
    wreaths: Object.fromEntries(WREATH_SIZES.map(s => [s, P(flyraPrice('w' + s), `FLYRA “${(FL.services.find(x => x.key === 'w' + s) || {}).name}” · retrieved ${FL.retrieved}`)])),
    bow: P(null, 'Not in FLYRA or the workbook (the 60-inch wreath already includes a red bow)'),
    garland: P(flyraPrice('garland'), `FLYRA “Lit Garland” (per piece) · retrieved ${FL.retrieved}`, { pieceFt: '' }),
    deposit: P(50, 'FLYRA 3-year agreement: “A 50% payment is required to reserve installation each season.”'),
    tax: P(FL.plan.taxes[0].rate, `FLYRA 3-year plan applies “${FL.plan.taxes[0].name}”`, { enabled: false }),
    cardFee: P(FL.plan.taxes[1].rate, `FLYRA 3-year plan applies “${FL.plan.taxes[1].name}”`, { enabled: false }),
    minimum: P(null, 'Not defined in the workbook', { enabled: false }),
    discounts: [],
    surcharges: [],
    season: String(new Date().getFullYear()),
    promotions: [],
    inclusions: includes ? includes.replace(/^Seasonal pricing includes\s+/i, '').replace(/\.$/, '').split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)) : [],
    agreement: P(terms, `FLYRA “${FL.plan.name}” terms`),
    guarantees: P(FL.plan.guarantees, `FLYRA “${FL.plan.name}” guarantees`),
    costs: { roof: '', mini: '', stake: '', wreath: '', garland: '', perJob: '' },
    company: Object.assign({}, FL.company)
  };
}
// Merge stored settings over defaults so new fields always exist.
export function normSettings(s) {
  const d = defaultSettings();
  if (!s || typeof s !== 'object') return d;
  const o = Object.assign({}, d, s);
  o.rates = Object.assign({}, d.rates, s.rates || {});
  o.wreaths = Object.assign({}, d.wreaths, s.wreaths || {});
  ['bow', 'garland', 'deposit', 'tax', 'cardFee', 'minimum', 'agreement', 'guarantees'].forEach(k => { o[k] = Object.assign({}, d[k], s[k] || {}); });
  o.costs = Object.assign({}, d.costs, s.costs || {});
  o.company = Object.assign({}, d.company, s.company || {});
  ['discounts', 'surcharges', 'promotions', 'inclusions'].forEach(k => { if (!Array.isArray(o[k])) o[k] = d[k]; });
  return o;
}

export function newQuote(me) {
  const now = new Date().toISOString();
  return {
    id: 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: now, updatedAt: now, createdBy: (me && me.id) || null,
    status: 'new', stage: 0,
    customer: { name: '', phone: '', email: '', address: '', source: '', decisionMaker: '', installDate: '' },
    budget: '', interests: [], areas: [], color: '', colorNote: '',
    roof: [], bushes: [], trees: [], stakes: [], wreaths: [], garland: [],
    surcharges: [], discounts: [], risks: {}, checks: {},
    photo: { lines: [], calib: null },
    mockup: { status: 'none', color: '', scope: '', notes: '', revisions: '', images: [] },
    objections: [], outcome: '', lostReason: '',
    next: { date: '', owner: '', method: 'Call', note: '' },
    notes: '', versions: [], flow: {}
  };
}

// Fill any fields an older or partial record is missing, so every screen can rely on them.
export function normQuote(l) {
  const d = newQuote();
  const o = Object.assign({}, d, l || {});
  o.customer = Object.assign({}, d.customer, (l || {}).customer || {});
  o.mockup = Object.assign({}, d.mockup, (l || {}).mockup || {});
  o.next = Object.assign({}, d.next, (l || {}).next || {});
  o.photo = Object.assign({ lines: [], calib: null }, (l || {}).photo || {});
  if (!Array.isArray(o.photo.lines)) o.photo.lines = [];
  ['interests', 'areas', 'roof', 'bushes', 'trees', 'stakes', 'wreaths', 'garland', 'surcharges', 'discounts', 'objections', 'versions'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  ['risks', 'checks', 'flow'].forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; });
  return o;
}

/* ---------- Measurement from a scaled screenshot ---------- */
export function lineLenPx(line) {
  let L = 0; const p = line.pts || [];
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return L;
}
export function ftPerPx(photo) {
  const c = photo && photo.calib; if (!c || !c.a || !c.b || !num(c.ft)) return 0;
  const px = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
  return px > 0 ? num(c.ft) / px : 0;
}
export function lineFt(photo, line) {
  const k = ftPerPx(photo); if (!k || !line) return 0;
  return round2(lineLenPx(line) * k * (line.kind === 'peak' ? pitchFactor(line.pitch) : 1));
}
// Feet for a roof / stake / garland row: from its traced line when linked, else typed.
export function rowFt(q, row) {
  if (row.lineId) { const ln = (q.photo && q.photo.lines || []).find(l => l.id === row.lineId); return ln ? lineFt(q.photo, ln) : 0; }
  return num(row.ft);
}
const on = r => r && r.include !== false;

/* ---------- The calculation ---------- */
export function calc(q, S) {
  const R = S.rates, lines = [], missing = [], unapproved = new Set(), notes = [];
  const add = (group, label, qty, unit, P, rate) => {
    const amount = round2(qty * rate);
    lines.push({ group, label, qty: round2(qty), unit, rate, amount, approved: !!P.approved });
    if (!P.approved) unapproved.add(group);
    return amount;
  };
  const G = { roof: 0, bush: 0, tree: 0, stake: 0, wreath: 0, garland: 0, labor: 0 };
  const roofRows = q.roof.filter(on), roofFt = round2(roofRows.reduce((s, r) => s + rowFt(q, r), 0));
  if (roofFt) G.roof = add('roof', 'Roofline C9 LED lighting', roofFt, 'ft', R.roof, num(R.roof.value));
  const bushes = q.bushes.filter(on), bushCount = bushes.reduce((s, b) => s + int(b.count), 0), bushStrands = bushes.reduce((s, b) => s + int(b.count) * num(b.per), 0);
  if (bushStrands) G.bush = add('bush', `Mini lights on ${plural(bushCount, 'bush', 'bushes')}`, bushStrands, 'strands', R.mini, num(R.mini.value));
  const trees = q.trees.filter(on), treeCount = trees.reduce((s, b) => s + int(b.count), 0), treeStrands = trees.reduce((s, b) => s + int(b.count) * num(b.per), 0);
  if (treeStrands) G.tree = add('tree', `Mini lights on ${plural(treeCount, 'tree')}`, treeStrands, 'strands', R.mini, num(R.mini.value));
  const stakeRows = q.stakes.filter(on), stakeFt = round2(stakeRows.reduce((s, r) => s + rowFt(q, r), 0));
  if (stakeFt) G.stake = add('stake', 'Ground stake C9 lighting', stakeFt, 'ft', R.stake, num(R.stake.value));
  let wreathCount = 0;
  q.wreaths.filter(on).forEach(w => {
    const n = int(w.qty); if (!n) return; wreathCount += n;
    const P = S.wreaths[w.size] || {};
    if (w.lit === false) { missing.push(`${n} × ${w.size}-inch unlit wreath (no unlit price set)`); return; }
    if (!num(P.value)) { missing.push(`${n} × ${w.size}-inch wreath (price not set)`); return; }
    G.wreath += add('wreath', `${w.size}-inch lit wreath${w.size === 60 ? ' (with red bow)' : ''}`, n, 'each', P, num(P.value));
    if (w.bow && w.size !== 60) {
      if (num(S.bow.value)) G.wreath += add('wreath', `Bow for ${w.size}-inch wreath`, n, 'each', S.bow, num(S.bow.value));
      else missing.push(`${n} bow${n > 1 ? 's' : ''} for ${w.size}-inch wreath (no bow price set)`);
    }
  });
  let garlandPieces = 0;
  q.garland.filter(on).forEach(g => {
    const pcs = garlandPiecesFor(q, g, S); if (!pcs) return; garlandPieces += pcs;
    if (!num(S.garland.value)) { missing.push(`${pcs} garland piece${pcs > 1 ? 's' : ''} (price not set)`); return; }
    G.garland += add('garland', `Lit garland${g.label ? ' · ' + g.label : ''}`, pcs, pcs === 1 ? 'piece' : 'pieces', S.garland, num(S.garland.value));
  });
  (q.surcharges || []).forEach(id => {
    const s = S.surcharges.find(x => x.id === id);
    if (!s) return;
    if (!s.approved) { missing.push(`${s.name || 'Surcharge'} (not approved by owner)`); return; }
    G.labor += add('labor', s.name || 'Approved access charge', 1, 'each', s, num(s.amount));
  });
  const subtotal = round2(Object.values(G).reduce((a, b) => a + b, 0));
  let discount = 0; const discountLines = [];
  (q.discounts || []).forEach(id => {
    const d = S.discounts.find(x => x.id === id);
    if (!d || !d.approved) return;
    const amt = round2(d.kind === 'pct' ? subtotal * num(d.value) / 100 : Math.min(num(d.value), subtotal - discount));
    if (amt > 0) { discount += amt; discountLines.push({ label: d.name || 'Discount', amount: -amt }); }
  });
  let afterDiscount = round2(subtotal - discount), minimumAdj = 0;
  if (S.minimum.enabled && S.minimum.approved && num(S.minimum.value) && afterDiscount > 0 && afterDiscount < num(S.minimum.value)) minimumAdj = round2(num(S.minimum.value) - afterDiscount);
  const preTax = round2(afterDiscount + minimumAdj);
  const taxOn = !!(S.tax.enabled && S.tax.approved && num(S.tax.value));
  const tax = taxOn ? round2(preTax * num(S.tax.value) / 100) : 0;
  const total = round2(preTax + tax);
  const depPct = num(S.deposit.value) || 0;
  const deposit = round2(total * depPct / 100);
  const cardFeeOn = !!(S.cardFee.enabled && S.cardFee.approved && num(S.cardFee.value));
  const cardFee = cardFeeOn ? round2(total * num(S.cardFee.value) / 100) : 0;
  if (S.tax.enabled && !S.tax.approved) notes.push('Sales tax is switched on but not approved, so it is not added.');
  if (!depPct) notes.push('No deposit percentage is set.');

  // Confidence: Verified / Preliminary / Manager review
  const reasons = { review: [], prelim: [] };
  RISKS.forEach(r => { if (q.risks && q.risks[r.k]) reasons.review.push(r.label); });
  q.wreaths.filter(on).forEach(w => { if (w.lit === false && int(w.qty)) reasons.review.push('Unlit wreath requested (no price on file)'); });
  const unverified = roofRows.filter(r => !r.verified).length + stakeRows.filter(r => !r.verified).length;
  if (unverified) reasons.prelim.push(`${plural(unverified, 'measurement')} not verified`);
  const peakNoPitch = roofRows.filter(r => r.lineId && ((q.photo.lines || []).find(l => l.id === r.lineId) || {}).kind === 'peak' && !num(((q.photo.lines || []).find(l => l.id === r.lineId) || {}).pitch)).length;
  if (peakNoPitch) reasons.prelim.push(`${plural(peakNoPitch, 'traced peak')} without a roof pitch (top-down view misses slope)`);
  const needScale = [...roofRows, ...stakeRows].filter(r => r.lineId && !ftPerPx(q.photo)).length;
  if (needScale) reasons.prelim.push(`${plural(needScale, 'traced line')} waiting for a scale`);
  if (unapproved.size) reasons.prelim.push('Prices not approved by the owner: ' + joinList([...unapproved].map(g => GROUP_LABEL[g])));
  if (missing.length) reasons.prelim.push('Not priced: ' + missing.join('; '));
  const unchecked = CHECKS.filter(c => !(q.checks || {})[c.k]).length;
  if (unchecked) reasons.prelim.push(`${unchecked} of ${CHECKS.length} quote checkpoints not ticked`);
  if (!total) reasons.prelim.push('Nothing priced yet');
  const level = reasons.review.length ? 'review' : reasons.prelim.length ? 'preliminary' : 'verified';

  return {
    lines, discountLines, missing, unapproved: [...unapproved], notes, groups: G,
    counts: { roofFt, bushCount, bushStrands, treeCount, treeStrands, stakeFt, wreathCount, garlandPieces },
    subtotal, discount: round2(discount), minimumAdj, preTax, taxOn, taxRate: num(S.tax.value), tax, total,
    depPct, deposit, balance: round2(total - deposit), cardFeeOn, cardFeeRate: num(S.cardFee.value), cardFee,
    years: YEARS, agreementTotal: round2(total * YEARS),
    level, reasons
  };
}
export const GROUP_LABEL = { roof: 'roofline', bush: 'bushes', tree: 'trees', stake: 'ground stakes', wreath: 'wreaths', garland: 'garland', labor: 'surcharges' };
export const LEVELS = {
  verified: { label: 'Verified', tone: 'ok', help: 'Footage and conditions are checked and every price is approved.' },
  preliminary: { label: 'Preliminary', tone: 'warn', help: 'Footage, conditions or prices still need confirmation.' },
  review: { label: 'Manager review', tone: 'bad', help: 'Unsafe or unusual conditions need approval before quoting.' }
};
export function garlandPiecesFor(q, g, S) {
  const pcs = int(g.pieces); if (pcs) return pcs;
  const ft = rowFt(q, g), per = num(S.garland.pieceFt);
  return ft && per ? Math.ceil(ft / per) : 0;
}

/* ---------- Budget optimizer: only removes areas; never touches prices or required charges ---------- */
export function budgetPlan(q, S) {
  const budget = num(q.budget); const base = calc(q, S);
  if (!budget || !base.total) return { budget, base, options: [], fits: !!budget && base.total <= budget, gap: budget - base.total };
  if (base.total <= budget) return { budget, base, options: [], fits: true, gap: round2(budget - base.total) };
  const opts = [];
  const tryOpt = (key, title, mutate) => {
    const q2 = clone(q); const removed = mutate(q2);
    if (!removed || !removed.length) return;
    const c = calc(q2, S);
    if (c.total >= base.total) return;
    opts.push({ key, title, q: q2, total: c.total, save: round2(base.total - c.total), removed, fits: c.total <= budget });
  };
  const exclude = (arr, label) => arr.filter(on).map(r => { r.include = false; return label(r); }).filter(Boolean);
  const greenery = q2 => [
    ...exclude(q2.wreaths.filter(w => int(w.qty)), w => `${w.qty} × ${w.size}-inch wreath`),
    ...exclude(q2.garland.filter(g => garlandPiecesFor(q2, g, S)), g => `Garland${g.label ? ' · ' + g.label : ''}`)
  ];
  tryOpt('greenery', 'Remove optional greenery', greenery);
  tryOpt('bushes', 'Fewer bushes', q2 => {
    const groups = q2.bushes.filter(b => on(b) && int(b.count));
    const before = groups.reduce((s, b) => s + int(b.count), 0); if (!before) return null;
    let guard = 200;
    while (calc(q2, S).total > budget && guard--) {
      const g = groups.filter(b => int(b.count) > 0).sort((a, b) => int(b.count) * num(b.per) - int(a.count) * num(a.per))[0];
      if (!g) break; g.count = String(int(g.count) - 1);
    }
    const after = groups.reduce((s, b) => s + int(b.count), 0);
    return after < before ? [`Bushes: ${before} → ${after}`] : null;
  });
  tryOpt('trees', 'Remove tree lighting', q2 => exclude(q2.trees.filter(t => int(t.count)), t => `${t.count} tree${int(t.count) > 1 ? 's' : ''}${t.label ? ' · ' + t.label : ''}`));
  tryOpt('stakes', 'Remove ground stakes', q2 => exclude(q2.stakes.filter(s => rowFt(q2, s)), s => `${s.label || 'Ground stakes'} (${rowFt(q2, s)} ft)`));
  const keepRoof = keep => q2 => [
    ...exclude(q2.roof.filter(r => !keep.includes(r.area || 'front')), r => `${r.label || 'Roof section'} (${rowFt(q2, r)} ft)`),
    ...exclude(q2.bushes.filter(b => int(b.count)), b => `${b.count} bush${int(b.count) > 1 ? 'es' : ''}`),
    ...exclude(q2.trees.filter(t => int(t.count)), t => `${t.count} tree${int(t.count) > 1 ? 's' : ''}`),
    ...exclude(q2.stakes.filter(s => rowFt(q2, s)), s => `${s.label || 'Ground stakes'}`),
    ...greenery(q2)
  ];
  if (q.roof.some(r => on(r) && r.area === 'garage')) tryOpt('frontGarage', 'Front roofline + garage only', keepRoof(['front', 'peak', 'garage']));
  tryOpt('front', 'Front roofline only', keepRoof(['front', 'peak']));
  const seen = new Set();
  opts.forEach(o => { if (o.key === 'bushes' && / → 0$/.test(o.removed[0])) o.title = 'Remove bush lighting'; });
  const uniq = opts.filter(o => { const k = o.total + '|' + o.removed.join(); if (seen.has(k)) return false; seen.add(k); return true; });
  uniq.sort((a, b) => (b.fits - a.fits) || (a.fits ? b.total - a.total : a.total - b.total));
  return { budget, base, options: uniq, fits: false, gap: round2(base.total - budget) };
}

/* ---------- Plain-language scope, used in texts, estimate and handoff ---------- */
export function scopeText(q, S) {
  const c = calc(q, S), p = [];
  if (c.counts.roofFt) p.push(`${c.counts.roofFt} ft of roofline`);
  if (c.counts.bushCount) p.push(plural(c.counts.bushCount, 'bush', 'bushes'));
  if (c.counts.treeCount) p.push(plural(c.counts.treeCount, 'tree'));
  if (c.counts.stakeFt) p.push(`${c.counts.stakeFt} ft of ground stakes`);
  if (c.counts.wreathCount) p.push(plural(c.counts.wreathCount, 'wreath'));
  if (c.counts.garlandPieces) p.push('lit garland');
  return joinList(p);
}
export { money };
