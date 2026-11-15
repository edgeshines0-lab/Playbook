// Knowledge base: every row of the workbook, the FLYRA agreement and price book, owner updates and review flags,
// searchable by plain-language questions.
import { WB, FL } from './data.js';
import { unq } from './util.js';

const T = WB.texts.items.find(t => t.row === 13);
export const AGREEMENT_NEXT = { text: (T.text.match(/I'm happy to go over[^.]*\./) || [''])[0], src: '08 TEXT TEMPLATES · Row 13' };
export const OWNER_3YR = 'Owner update (Nov 15, 2026): Edge Shines only offers 3-year agreements.';

// FLYRA 3-year agreement, split into its headed clauses (the controlling signed-agreement language).
export const CLAUSES = FL.plan.terms.split('\n\n').map(p => { const m = p.match(/^([A-Z &/]+):\s*([\s\S]*)$/); return m ? { head: m[1], text: m[2] } : null; }).filter(Boolean);
export const GUARANTEES = FL.plan.guarantees.split('\n\n').map(p => { const m = p.match(/^([A-Z &/-]+):\s*([\s\S]*)$/); return m ? { head: m[1], text: m[2] } : null; }).filter(Boolean);
const clause = h => CLAUSES.find(c => c.head.startsWith(h));
const AGR = `FLYRA “${FL.plan.name}”`;
export const agreementWarn = h => { const c = clause(h); return c ? { title: 'Signed agreement says', text: c.text, src: `${AGR} · ${c.head}` } : null; };

/* ---------- Objections: categories, policy warnings, 3-year-only edits ---------- */
export const OBJ_CATS = [
  ['Price', [14, 15, 16, 29, 35, 38]],
  ['Agreement', [11, 13]],
  ['Cancellation', [12, 37]],
  ['Installation & safety', [20, 24, 25, 26, 31, 32, 33]],
  ['Colors & lights', [17, 18, 19]],
  ['Timing', [30, 34]],
  ['Ownership & storage', [22, 23]],
  ['Customer-supplied lights', [21]],
  ['Design changes', [36]],
  ['Decision & stalls', [27, 28]]
];
const catOf = {}; OBJ_CATS.forEach(([c, rows]) => rows.forEach(r => { catOf[r] = c; }));
const OBJ_WARN = {
  11: [{ title: 'Owner update', text: 'Only 3-year agreements are offered. Don’t offer other agreement lengths.', src: 'Owner instruction · Nov 15, 2026' }],
  13: [{ title: 'Owner update', text: 'Only 3-year agreements are offered. The workbook answer also offered to check shorter or one-time options; that sentence is removed below.', src: 'Owner instruction · Nov 15, 2026' }],
  12: [agreementWarn('CANCELLATION / EARLY'), { title: 'Wording', text: 'The agreement says Edge Shines does not charge a cancellation fee: the customer covers material costs, calculated as 40% of that year’s contracted price. Describe it that way rather than as a “fee”.', src: 'Workbook vs. FLYRA agreement' }],
  37: [agreementWarn('CANCELLATION / EARLY'), agreementWarn('CANCELLATION PERIOD')],
  38: [agreementWarn('PAYMENT')],
  22: [agreementWarn('OWNERSHIP')],
  36: [agreementWarn('COLOR & DESIGN')],
  34: [agreementWarn('SCHEDULING')],
  35: [agreementWarn('WHAT YOUR SEASONAL')],
  33: [{ title: 'Estimator', text: 'Tick “Metal or aluminum roof” in Measurements. The quote moves to Manager review until a manager approves the mounting method.', src: '04 SERVICE FACTS · Row 30' }],
  24: [{ title: 'Agreement guarantee', text: (GUARANTEES.find(g => g.head.startsWith('LIGHT REPLACEMENT')) || {}).text, src: `${AGR} · guarantees` }]
};
export const OBJECTIONS = WB.obj.items.map(o => {
  const x = { row: o.row, says: o.says, answer: o.answer, next: o.next, cat: catOf[o.row], warn: (OBJ_WARN[o.row] || []).filter(Boolean), src: `${WB.obj.sheet} · Row ${o.row}` };
  if (o.row === 11 || o.row === 13) { x.nextOrig = o.next; x.next = AGREEMENT_NEXT.text; x.nextSrc = AGREEMENT_NEXT.src; }
  if (o.row === 13) { x.answerOrig = o.answer; x.answer = o.answer.replace(/\s*I can review whether[^.]*\./, ''); x.edited = 'Removed the offer to check shorter or one-time options (3-year only).'; }
  return x;
});

/* ---------- Review flags: gaps and conflicts for the owner ---------- */
const fp = k => (FL.services.find(s => s.key === k) || {}).price;
export const FLAGS = [
  ['Conflict', 'Base rates differ between the workbook and FLYRA', `Workbook (3-year): roofline $8/ft, mini lights $50/strand, ground stakes $7/ft. FLYRA price book: Holiday Lights $${fp('roof')}/ft, Mini Lights $${fp('mini')} each, Ground Stake Lighting $${fp('stake')}/ft. FLYRA 3-year plan template: $${FL.plan.lines[0].price}, $${FL.plan.lines[1].price}, $${FL.plan.lines[2].price}. Pick one set in Pricing & Settings and approve it.`, '10 PRICE CARD · Rows 4–6; FLYRA services and 3-year plan'],
  ['Conflict', 'Ground stake price differs inside FLYRA', `The FLYRA price book says $${fp('stake')}/ft; the 3-year plan template says $${FL.plan.lines[2].price}/ft.`, 'FLYRA services; FLYRA 3-year plan'],
  ['Conflict', 'Cancellation is described two ways', 'The workbook calls it a 40% early-cancellation “fee”. The FLYRA agreement says Edge Shines does not charge a cancellation fee; the customer covers material costs equal to 40% of that year’s contracted price. The signed agreement controls.', '04 SERVICE FACTS · Row 27; 05 OBJECTIONS · Row 12; FLYRA agreement'],
  ['Superseded', 'Workbook mentions 2- and 4-year agreements', 'The owner confirmed only 3-year agreements are offered. The 2- and 4-year rates, the “different approved agreement lengths” follow-up (objection 11) and the shorter-option offer (objection 13) are no longer used.', '03 FAST QUOTES · Rows 17–19; 04 SERVICE FACTS · Row 25; 05 OBJECTIONS · Rows 11, 13'],
  ['Needs confirmation', 'Garland is priced per piece', `FLYRA prices Lit Garland at $${fp('garland')} each, but the length of one piece isn’t stated. The workbook measures garland in feet. Set the piece length in Pricing & Settings so measured feet convert to pieces.`, 'FLYRA services; 09 MEASURE SOP · Row 10'],
  ['Missing price', 'Bows and unlit wreaths', 'FLYRA has prices for lit wreaths only. The 60-inch wreath includes a red bow; there is no separate bow price and no unlit-wreath price.', 'FLYRA services; 09 MEASURE SOP · Row 9'],
  ['Needs confirmation', 'Sales tax and card fee', `The FLYRA 3-year plan applies ${FL.plan.taxes.map(t => `${t.name} ${t.rate}%`).join(' and ')} to holiday lighting lines. The workbook has no tax rule. Both stay off in quotes until the owner turns them on.`, 'FLYRA 3-year plan; 10 PRICE CARD · Row 19'],
  ['Needs confirmation', 'Automatic renewal', 'The FLYRA agreement renews for additional three-year terms unless the customer cancels at least 30 days before the term ends. The workbook scripts never mention renewal.', 'FLYRA agreement · AUTOMATIC RENEWAL'],
  ['Missing policy', 'Labor / access surcharges', 'Difficult peaks, high trees, special mounting and outlets can carry an “only company-approved surcharge”, but no amounts are listed. Add approved surcharges in Pricing & Settings.', '10 PRICE CARD · Row 16'],
  ['Missing policy', 'Minimums, discounts and promotions', 'Referenced as things to verify, but none are defined. Add them in Pricing & Settings if adopted.', '03 FAST QUOTES · Row 20'],
  ['Missing policy', 'Preliminary price range', 'The can’t-verify script asks for a range ($___–$___), but no method for setting the low and high numbers is given.', '03 FAST QUOTES · Row 32'],
  ['Needs confirmation', 'Mini-light strands', 'Strand length is not stated. About 5 strands per bush and 10 per tree are “working starting points”, not rules.', '09 MEASURE SOP · Rows 6–7'],
  ['Needs confirmation', 'Available colors', 'Only “not black or gray” is documented. There is no list of stocked C9 colors or patterns.', '04 SERVICE FACTS · Row 8'],
  ['Needs confirmation', 'Measuring tool', 'The company’s chosen aerial tool is not named (Measured Bid, LightQuoter or Google Earth). The Studio supports Google Earth / Maps screenshots traced to scale.', '03 FAST QUOTES · Row 8'],
  ['Typo in FLYRA', '24-inch wreath description', 'The FLYRA description says “battery overrated connections”. It is not shown to customers in the Studio.', 'FLYRA “24 inch Lit Wreath”'],
  ['Unclear wording', 'Scripts are written for “Emily”', 'The Studio swaps in each rep’s own first name.', '02 CALL SCRIPT; 08 TEXT TEMPLATES'],
  ['Missing policy', 'Install and takedown calendar', 'Takedown happens “after the holiday period” on a “seasonal calendar”, but no dates or booking windows are given.', '04 SERVICE FACTS · Row 19']
].map(([tag, title, text, src], i) => ({ id: 'flag' + i, tag, title, text, src }));

/* ---------- Search engine ---------- */
const STOP = new Set('a an the and or of to in on for with at by from is are was be been being it its this that these those i me my mine we our us you your yours they them their he she his her what whats which who whom how why when where if do does did doesnt dont didnt isnt arent wont cant not no can could would should will shall may might just about any some so than then there here as into customer customers client clients homeowner says say said tell want wants wanted need needs get got have has had am im ok okay please also very really s t let lets ask asks asking go goes going ones thing things like theyre youre now give gave giving happen happens happened guys after before'.split(' '));
const NUMW = { one: '1', two: '2', three: '3', four: '4', thousand: '1000', '1k': '1000', yr: 'year', yrs: 'year' };
const PHRASES = [
  [/\btak(?:e|es|ing)\s+(?:them\s+|it\s+|the\s+lights\s+|lights\s+|everything\s+)?down\b/g, ' takedown '],
  [/\bput(?:ting|s)?\s+(?:them\s+|it\s+|the\s+lights\s+|lights\s+)?up\b/g, ' install '],
  [/\bcall(?:ing|s)?\s+(?:them\s+|me\s+|you\s+|him\s+|her\s+)?back\b/g, ' callback '],
  [/\b(?:no|didnt|did not|doesnt|does not|not|wont|will not)\s+(?:answer(?:ing|ed)?|pick(?:ing|ed|s)?\s+up)\b/g, ' missed '],
  [/\bvoice\s*mails?\b/g, ' missed '],
  [/\byear[\s-]+round\b|\ball\s+year\b/g, ' permanent '],
  [/\b(\d)\s*-?\s*(?:yrs?|years?)\b/g, ' $1 year '],
  [/\bmulti[\s-]+year\b/g, ' multiyear '],
  [/\bdown\s*payments?\b/g, ' deposit '],
  [/\bhow\s+much\b/g, ' price '],
  [/\b(?:go(?:es)?|went|burn(?:ed|t|s)?)\s+out\b/g, ' broken '],
  [/\bsay(?:s)?\s+yes\b|\bwant(?:s)?\s+to\s+(?:move\s+forward|proceed)\b/g, ' accept ']
];
const stem = w => {
  if (/^\d/.test(w)) return w;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ied')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(sh|ch|x|ss)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
};
const SYN = {
  price: 'price prices pricing priced cost costs expensive pricey cheap cheaper cheapest afford affordable much rate rates dollar dollars money budget total charge charges',
  agreement: 'agreement agreements contract contracts term terms commitment commit multiyear multi',
  cancel: 'cancel cancels canceled cancelled canceling cancelling cancellation terminate termination quit',
  spouse: 'spouse wife husband partner family',
  decision: 'decision decisionmaker decide approve approval',
  think: 'think thinking consider considering unsure maybe',
  color: 'color colors colour colours colored multicolor multicolour rgb red green blue white warm purple orange pink gold yellow',
  own: 'own owns owned ownership',
  store: 'store stores stored storage',
  remove: 'remove removal removed takedown',
  install: 'install installs installed installation installing hang hanging hung',
  roof: 'roof roofs roofline rooflines gutter gutters eave eaves',
  peak: 'peak peaks gable gables rake rakes',
  bush: 'bush bushes shrub shrubs hedge hedges landscaping',
  tree: 'tree trees',
  stake: 'stake stakes walkway walkways driveway driveways pathway path sidewalk',
  repair: 'broken burnt burned burn outage fix repair maintenance maintain upkeep',
  mockup: 'mockup mockups rendering render picture pictures image images visual concept',
  prompt: 'prompt prompts ai',
  measure: 'measure measures measuring measurement measurements footage feet foot ft aerial satellite trace tracing length',
  schedule: 'schedule scheduling date dates week soon timing booking book booked reserve',
  competitor: 'competitor competitors companies company competition neighbor neighbors neighbour neighbours',
  text: 'text texts texting sms message messages',
  busy: 'busy',
  deposit: 'deposit deposits downpayment upfront',
  permanent: 'permanent permanently yearround',
  flyra: 'flyra crm',
  convert: 'convert converting conversion',
  lead: 'lead leads inquiry inquiries',
  quote: 'quote quotes quoting quoted estimate estimates estimating',
  metal: 'metal aluminum tin steel',
  light: 'light lights lighting bulb bulbs',
  mini: 'mini minis strand strands',
  include: 'include includes included including inclusion inclusions',
  home: 'home homes house houses property properties',
  app: 'app apps smart wifi bluetooth',
  discount: 'discount discounts deal deals promo promos promotion promotions promotional coupon coupons',
  pay: 'pay pays paying paid payment payments balance',
  power: 'outlet outlets power electrical electricity plug plugs extension cord cords circuit circuits wiring gfci',
  safe: 'safe safety unsafe dangerous',
  photo: 'photo photos pic pics',
  accept: 'yes accept accepts accepted agree agreed proceed',
  missed: 'missed miss',
  renew: 'renew renews renewal renewed automatic auto',
  wreath: 'wreath wreaths',
  garland: 'garland greenery'
};
const CANON = {}; Object.entries(SYN).forEach(([c, ws]) => ws.split(' ').forEach(w => { CANON[stem(w)] = c; }));
export const norm = s => { let t = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/(\d),(\d{3})/g, '$1$2').replace(/'/g, ''); PHRASES.forEach(([re, to]) => { t = t.replace(re, to); }); return t; };
export const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean).map(w => NUMW[w] || w).filter(w => !STOP.has(w)).map(w => { const st = stem(w); return CANON[st] || st; });
export const canonOf = w => { const t = norm(w).replace(/[^a-z0-9]/g, ''); if (!t || STOP.has(t)) return null; const st = stem(NUMW[t] || t); return CANON[st] || st; };

/* ---------- Build the index ---------- */
export const KB = [];
const add = e => { e.i = KB.length; KB.push(e); };
const S = (sheet, row, section) => `${sheet}${section ? ' › ' + section : ''}${row ? ' · Row ' + row : ''}`;
const OBJ_KW = { 17: 'bulb type c9 led kind', 11: 'contract commitment long multi year', 12: 'fee break early', 13: 'single season once', 15: 'afford budget lower', 16: 'competitor quote', 21: 'my own lights supply', 27: 'wife husband partner decision', 28: 'later decide', 29: 'email quote number', 30: 'busy later callback', 34: 'soon asap quickly date', 35: 'takedown', 38: 'down payment upfront' };

add({ type: 'Owner update', title: 'Only 3-year agreements', body: 'Edge Shines only offers 3-year agreements. Workbook references to 2- and 4-year agreements are no longer used.', src: 'Owner instruction · Nov 15, 2026', kw: 'agreement term length 2 4 year option one year', boost: 1.2 });
add({ type: 'Owner update', title: 'Wreath and garland prices come from FLYRA', body: `Lit wreaths: ${[24, 36, 48, 60].map(s => `${s}-inch $${fp('w' + s)}`).join(', ')}. Lit garland: $${fp('garland')} each. The 60-inch wreath includes a red bow.`, src: `Owner instruction · FLYRA price book retrieved ${FL.retrieved}`, kw: 'wreath garland greenery price cost', boost: 1.15 });
WB.sop.steps.forEach(s => add({ type: 'SOP step', title: `Step ${s.n}: ${s.stage}`, body: s.do, fields: [['Result', s.result]], src: S(WB.sop.sheet, s.row, 'The Sales Flow') }));
WB.sop.rules.forEach(s => add({ type: 'Decision rule', title: s.case, body: s.how, fields: [['Customer expectation', s.expect]], src: S(WB.sop.sheet, s.row, 'Fast decision rules') }));
add({ type: 'SOP', title: 'Every call ends with 6 FLYRA facts', body: WB.sop.facts.join(' • '), src: S(WB.sop.sheet, 29), kw: 'notes record log call end' });
WB.script.lines.forEach(s => add({ type: 'Script', title: s.when, body: s.say, fields: [['Action / listen for', s.action]], src: S(WB.script.sheet, s.row), copy: true }));
add({ type: 'Rule', title: 'Never promise these without checking', body: WB.script.never.join(' • '), src: S(WB.script.sheet, 25), kw: 'guarantee promise' });
WB.fast.routine.forEach(s => add({ type: 'Quoting routine', title: `${s.n}. ${s.action}`, body: s.how, fields: [['When to stop', s.stop]], src: S(WB.fast.sheet, s.row, '8-minute remote quoting routine') }));
add({ type: 'Pricing', title: 'Workbook pricing reference', body: WB.fast.rates.map(r => `${r.term}: Roofline C9 ${r.roof}; Mini light strand ${r.mini}; Ground stakes ${r.stake}`).join(' • '), fields: [['Note', WB.fast.rateNote], ['Owner update', OWNER_3YR]], src: S(WB.fast.sheet, 17), kw: 'per foot linear rate card roofline mini stake 3 year' });
WB.fast.checkpoint.forEach(s => add({ type: 'Quote checkpoint', title: s.verify, body: s.why, fields: [['Seller action', s.action]], src: S(WB.fast.sheet, s.row, 'Quote checkpoint') }));
add({ type: 'Script', title: 'What to say if you can’t verify the roof on the call', body: unq(WB.fast.cantVerify), src: S(WB.fast.sheet, 32), kw: 'range unsure uncertain preliminary unclear', copy: true });
WB.facts.items.forEach(s => add({ type: 'Service fact', title: s.topic, body: s.say, fields: [['Check / limitation', s.check]].concat(s.row === 25 ? [['Owner update', OWNER_3YR]] : s.row === 27 ? [['Signed agreement', clause('CANCELLATION / EARLY').text]] : []), src: S(WB.facts.sheet, s.row), copy: true }));
OBJECTIONS.forEach(o => add({ type: 'Objection', title: o.says, body: o.answer, fields: [['Ask next', o.next], ['Category', o.cat]], next: o.next, warn: o.warn, src: o.src, kw: OBJ_KW[o.row], copy: true, boost: 1.15, obj: o.row }));
WB.mock.steps.forEach(s => add({ type: 'Mockup SOP', title: s.step, body: s.do, fields: [['Quality rule', s.rule]], src: S(WB.mock.sheet, s.row) }));
WB.mock.prompts.forEach(s => add({ type: 'AI prompt', title: s.label.replace(/\n/g, ' — '), body: s.text, fields: [['Use it for', s.use.replace(/\n/g, ' · ')]], src: S(WB.mock.sheet, s.row), kw: 'design picture image mockup prompt', copy: true }));
add({ type: 'Mockup SOP', title: 'Final check before sending a mockup', body: WB.mock.final, src: S(WB.mock.sheet, 18) });
WB.flyra.steps.forEach(s => add({ type: 'FLYRA', title: `${s.n} ${s.action}`, body: s.detail, fields: [['Result', s.result]], src: S(WB.flyra.sheet, s.row), kw: 'flyra crm' }));
add({ type: 'FLYRA', title: 'Minimum required FLYRA notes', body: WB.flyra.notes.join(' | '), src: S(WB.flyra.sheet, 20), kw: 'notes record log' });
add({ type: 'FLYRA', title: 'FLYRA pipeline language', body: `Before contact: ${WB.flyra.pipeline.before} (${WB.flyra.pipeline.rbefore}) • During sales: ${WB.flyra.pipeline.during} (${WB.flyra.pipeline.rduring}) • After decision: ${WB.flyra.pipeline.after} (${WB.flyra.pipeline.rafter})`, src: S(WB.flyra.sheet, 24), kw: 'stage status won lost' });
WB.texts.items.forEach(s => add({ type: 'Text template', title: s.situation, body: s.text, fields: [['When / record', s.when]], src: S(WB.texts.sheet, s.row), kw: 'text sms message', copy: true }));
add({ type: 'Text template', title: 'Message standards', body: WB.texts.standards.join(' • '), src: S(WB.texts.sheet, 19) });
WB.measure.steps.forEach(s => add({ type: 'Measuring', title: `${s.n} ${s.area}`, body: s.measure, fields: [['Quick rule / escalate', s.rule]], src: S(WB.measure.sheet, s.row) }));
add({ type: 'Measuring', title: 'Photo / measurement checklist', body: WB.measure.checklist.join(' • '), src: S(WB.measure.sheet, 16) });
add({ type: 'Script', title: 'What to say about measuring', body: unq(WB.measure.script), src: S(WB.measure.sheet, 21), copy: true });
add({ type: 'Measuring', title: 'Measuring peaks from a satellite screenshot', body: 'A top-down satellite view shows the horizontal length of a sloped rake edge, so a traced peak reads short. In the Studio’s measuring tool, set the roof pitch on each traced peak to add the slope. If the pitch is unknown, the quote stays Preliminary until the peak is checked.', src: `Studio measuring tool; ${S(WB.measure.sheet, 5)}`, kw: 'peak gable rake pitch slope satellite' });
WB.price.components.forEach(s => add({ type: 'Pricing', title: s.comp, body: s.how, fields: [['Measure', s.qty], ['Example / check', s.example]], src: S(WB.price.sheet, s.row) }));
add({ type: 'Pricing', title: 'Example: ' + WB.price.example.label, body: `${WB.price.example.scope} = ${WB.price.example.calc} = ${WB.price.example.total}`, src: S(WB.price.sheet, 19) });
WB.price.scoping.forEach(s => add({ type: 'Script', title: 'Scoping question ' + s.n, body: unq(s.q), src: S(WB.price.sheet, s.row, 'Fast scoping questions'), copy: true }));
add({ type: 'Rule', title: 'Quote safety rules', body: WB.price.safety.join(' • '), src: S(WB.price.sheet, 29) });
FL.services.forEach(s => add({ type: 'FLYRA price book', title: s.name, body: `$${s.price} ${s.unit === 'each' ? 'each' : 'per ' + s.unit}. ${s.key === 'w24' ? '' : s.description}`, src: `FLYRA services · retrieved ${FL.retrieved}`, kw: 'price cost' }));
CLAUSES.forEach(c => add({ type: 'Agreement', title: c.head.charAt(0) + c.head.slice(1).toLowerCase(), body: c.text, src: `${AGR} terms`, kw: 'agreement contract terms signed', boost: 1.05 }));
GUARANTEES.forEach(c => add({ type: 'Agreement', title: c.head.charAt(0) + c.head.slice(1).toLowerCase(), body: c.text, src: `${AGR} guarantees`, kw: 'guarantee' }));
FLAGS.forEach(f => add({ type: 'Not settled', title: f.title, body: f.text, fields: [['Status', f.tag]], src: 'Items to review · ' + f.src, boost: 0.9, flag: true }));

KB.forEach(e => {
  e.tt = tokens(e.title); e.tk = tokens(e.kw || ''); e.tb = tokens([e.body].concat((e.fields || []).map(f => f[1])).join(' '));
  e.all = new Set(e.tt.concat(e.tk, e.tb));
  e.nt = norm(e.title).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
});
const DF = {}; KB.forEach(e => e.all.forEach(t => { DF[t] = (DF[t] || 0) + 1; }));
const N = KB.length;

export function search(q, limit) {
  const qt = Array.from(new Set(tokens(q)));
  if (!qt.length) return { qt, res: [], weak: false };
  const nq = norm(q).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const out = [];
  KB.forEach(e => {
    let score = 0, matched = 0;
    qt.forEach((t, i) => {
      const idf = Math.log(1 + N / (DF[t] || 0.5));
      let w = 0;
      if (e.tt.includes(t)) w = 3; else if (e.tk.includes(t)) w = 2.2; else if (e.tb.includes(t)) w = 1;
      else if (t.length >= 3 && i === qt.length - 1) { if (e.tt.some(x => x.startsWith(t))) w = 1.6; else if (e.tb.some(x => x.startsWith(t))) w = 0.6; }
      if (w) { matched++; score += w * idf; }
    });
    if (!matched) return;
    const cov = matched / qt.length;
    score *= (0.25 + 0.75 * cov * cov);
    if (nq.length > 3 && e.nt.includes(nq)) score *= 1.6;
    score *= (e.boost || 1);
    out.push({ e, score, cov });
  });
  out.sort((a, b) => b.score - a.score);
  const top = out.length ? out[0].score : 0;
  const res = out.filter(r => r.score >= top * 0.18).slice(0, limit || 12);
  return { qt, res, weak: qt.length > 1 && res.length > 0 && res[0].cov < 0.6 };
}
export const SUGGEST = [
  'What happens if they cancel?',
  'What kind of bulbs do we install?',
  'Can customers change colors?',
  'How do I measure roof peaks?',
  'What if the customer has a metal roof?',
  'How do I price bushes?',
  'What do I do after they accept?',
  'I don’t want a 3-year agreement'
];

// Ask Claude: Claude only picks entries; the page shows their own wording.
let corpus = null;
const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const aiPrompt = q => [
  'You help phone sales reps at Edge Shines, a Christmas lighting company, find answers in the company sales playbook while they are on a call with a customer.',
  '', 'The rep typed: ' + JSON.stringify(q), '',
  'Below is every playbook entry, one per line, written as [id] (type) title :: text.',
  'Choose the entries that directly answer what the rep typed: what to say, what to do, or the fact, price or agreement clause that applies.',
  '- If the rep describes something a customer said, prefer the matching Objection entry, then a Script entry.',
  '- "Agreement" entries are the signed agreement and control over workbook wording.',
  '- "Not settled" entries describe things the playbook does not settle. Choose one when the question is about that gap.',
  '- Return at most 4 ids, best first. Do not choose an entry only because it shares a word with the question.',
  '- If no entry answers it, return an empty list.',
  'Reply with only JSON in exactly this shape: {"ids": [12, 40]}', '', 'ENTRIES:',
  corpus || (corpus = KB.map(e => `[${e.i}] (${e.type}) ${clip(e.title, 120)} :: ${clip(e.body, 420)}${e.next ? ' | Ask next: ' + clip(e.next, 160) : ''}`).join('\n'))
].join('\n');
