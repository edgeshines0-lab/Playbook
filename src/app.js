/* Edge Shines Sales Assistant. All business content comes from DATA, extracted verbatim from the playbook workbook. */
(function () {
  'use strict';
  const D = DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => { const c = Math.round(n * 100); return '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }); };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('es-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('es-' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const unq = s => String(s).replace(/^\s*[“"]/, '').replace(/[”"]\s*$/, '');
  const joinList = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const num = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; };
  const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';

  /* ---------- Rep name: typed by the rep, or the viewer's first name from their Claude account ---------- */
  let repName = store.get('rep', ''), autoName = '';
  const who = () => repName || autoName;
  const rep = t => { const n = who(); return n ? String(t).replace(/\bEmily\b/g, n) : String(t); };
  function syncRep() {
    $$('[data-rep]').forEach(i => { if (document.activeElement !== i) i.value = repName; i.placeholder = autoName ? autoName + ' (your account)' : 'Emily (default)'; });
  }

  /* ---------- Source helpers ---------- */
  const SH = { sop: D.sop.sheet, script: D.script.sheet, fast: D.fast.sheet, facts: D.facts.sheet, obj: D.obj.sheet, mock: D.mock.sheet, flyra: D.flyra.sheet, texts: D.texts.sheet, measure: D.measure.sheet, price: D.price.sheet };
  const src = (k, row, section) => esc(SH[k]) + (section ? ' › ' + esc(section) : '') + (row ? ' · Row ' + row : '');
  const by = (arr, row) => arr.find(x => x.row === row);
  const sop = r => by(D.sop.steps, r), scr = r => by(D.script.lines, r), rule = r => by(D.sop.rules, r);
  const obj = r => by(D.obj.items, r), txt = r => by(D.texts.items, r), meas = r => by(D.measure.steps, r);
  const fr = r => by(D.fast.routine, r), mk = r => by(D.mock.steps, r), fl = r => by(D.flyra.steps, r);
  const fact = t => D.facts.items.find(x => x.topic === t);
  const rateFor = term => D.price.rates.find(r => r.term === term);
  const safetySrc = i => src('price', i < 3 ? 29 : 30, 'Quote safety rules');

  /* ---------- Copy registry ---------- */
  let reg = new Map(), regN = 0;
  const copyKey = fn => { const k = 'c' + (++regN); reg.set(k, fn); return k; };
  const copyBtn = (textOrFn, label, cls) => {
    const fn = typeof textOrFn === 'function' ? textOrFn : () => rep(textOrFn);
    return `<button type="button" class="btn sm ${cls || ''}" data-copy="${copyKey(fn)}">${ICON_COPY}<span>${esc(label || 'Copy')}</span></button>`;
  };
  function doCopy(btn) {
    const fn = reg.get(btn.dataset.copy); if (!fn) return;
    const text = fn(); if (text == null) return;
    const done = ok => {
      if (!ok) { toast('Copy was blocked. Select the text and press Ctrl+C.'); return; }
      const span = btn.querySelector('span'), old = span ? span.textContent : '';
      btn.classList.add('copied'); if (span) span.textContent = 'Copied';
      setTimeout(() => { btn.classList.remove('copied'); if (span) span.textContent = old; }, 1400);
      toast(/\[[^\]]+\]|\$_{2,}|___/.test(text) ? 'Copied. Fill in the blanks before sending.' : 'Copied to clipboard');
    };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); done(ok);
      } catch (e) { done(false); }
    };
    try { navigator.clipboard.writeText(text).then(() => done(true), fallback); } catch (e) { fallback(); }
  }
  let toastT;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }

  /* ---------- Shared render pieces ---------- */
  const sayBlock = (label, text, srcHtml, opt) => {
    opt = opt || {};
    return `<div class="say ${opt.big ? 'big' : ''}" ${opt.id ? `id="${opt.id}"` : ''}>
      <div class="lbl"><b>${esc(label)}</b>${copyBtn(text)}</div>
      <q>${esc(rep(text))}</q>
      ${(opt.after || srcHtml) ? `<div class="meta">${opt.after ? `<span class="small muted">${opt.after}</span>` : '<span></span>'}<span class="src">${srcHtml || ''}</span></div>` : ''}
    </div>`;
  };
  const doRow = (n, title, text, srcHtml, extra, id) => `<div class="do" ${id ? `id="${id}"` : ''}><span class="n">${esc(n)}</span><div class="t"><b>${esc(title)}</b> — ${esc(rep(text))}${extra ? `<div class="small muted">${extra}</div>` : ''}<div class="src">${srcHtml}</div></div></div>`;
  const ruleRow = (text, srcHtml, ok, icon, id) => `<div class="rule ${ok ? 'okrule' : ''}" ${id ? `id="${id}"` : ''}><span class="ic">${esc(icon || (ok ? '✓' : '!'))}</span><div><div>${esc(text)}</div><div class="src">${srcHtml}</div></div></div>`;
  const factRow = f => f ? `<div class="fact" id="fact-${f.row}"><b>${esc(f.topic)}</b><span>${esc(f.say)}</span><span class="small muted">Check: ${esc(f.check)}</span><span class="src">${src('facts', f.row)}</span></div>` : '';

  /* ---------- Fill-in templates ([NAME], [COLOR OR COLOR PATTERN] ...) ---------- */
  const fillVals = store.get('fills', {});
  const phRe = /\[([^\]]+)\]/g;
  const placeholders = t => { const s = []; let m; phRe.lastIndex = 0; while ((m = phRe.exec(t))) if (!s.includes(m[1])) s.push(m[1]); return s; };
  const fillGet = (scope, k) => String(fillVals[scope + '|' + k] || (k === 'NAME' ? fillVals['g|NAME'] : '') || '').trim();
  const fillText = (t, scope) => t.replace(phRe, (all, k) => fillGet(scope, k) || all);
  const unent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const fillHtml = (t, scope) => esc(rep(t)).replace(/\[([^\]]+)\]/g, (all, k) => { const v = fillGet(scope, unent(k)); return v ? `<span class="filled">${esc(v)}</span>` : `<span class="ph">${all}</span>`; });
  function repaintTemplates() {
    $$('[data-tpl]').forEach(el => { const [kind, row] = el.dataset.tpl.split(':'); el.innerHTML = kind === 'mock' ? fillHtml(by(D.mock.prompts, +row).text, 'p' + row) : fillHtml(txt(+row).text, 't' + row); });
  }
  function setFill(key, val) {
    fillVals[key] = val; store.set('fills', fillVals);
    $$('[data-fill]').forEach(i => { if (i.dataset.fill === key && i.value !== val) i.value = val; });
    repaintTemplates();
  }

  /* ======================================================================
     CALL FLOW: the 12 steps reps follow, assembled from the SOP, script and other tabs.
     Order of the agreement explanation follows 01 SALES SOP (step 09) and 02 CALL SCRIPT (line 11): with pricing.
     ====================================================================== */
  const S = (label, o, k, field, section) => ({ label, text: o[field], src: src(k, o.row, section), id: k + '-' + o.row });
  const Sx = (label, text, k, row, section) => ({ label, text, src: src(k, row, section), id: k + '-' + row });
  const DO = (n, o, k, tf, xf, section, extra) => ({ n, title: o[tf], text: o[xf], src: src(k, o.row, section), extra, id: k + '-' + o.row });
  const MDO = r => ({ n: mk(r).step.split(/\s+/)[0], title: mk(r).step.replace(/^\d+\s*/, ''), text: mk(r).do, src: src('mock', r, 'Photo → prompt → quality check → send'), extra: 'Rule: ' + esc(mk(r).rule), id: 'mock-' + r });
  const MS = r => DO(meas(r).n, meas(r), 'measure', 'area', 'measure', 'Phone estimating SOP', 'Rule: ' + esc(meas(r).rule));
  const FT = (n, r) => DO(n, fr(r), 'fast', 'action', 'how', '8-minute routine', 'When to stop: ' + esc(fr(r).stop));
  const res = o => 'Result: ' + esc(o.result);
  const askNext = (x, o) => Object.assign(x, { after: 'Ask next: ' + esc(o.next) });
  const R = (o, ok, withExpect) => ({ text: o.case + ': ' + o.how + (withExpect ? ' (' + o.expect + ')' : ''), src: src('sop', o.row, 'Fast decision rules'), ok, id: 'rule-' + o.row });
  const SF = 'The Sales Flow';
  const FLOW = [
    { t: 'Answering the lead', goal: 'Review the lead in FLYRA before you dial, then open the call.',
      say: [S('Opening', scr(6), 'script', 'say'), S('No answer? Text this (new inquiry / missed call)', txt(6), 'texts', 'text')],
      doo: [DO('01', sop(6), 'sop', 'stage', 'do', SF, res(sop(6))), DO('F01', fl(6), 'flyra', 'action', 'detail', 'When a lead needs a quote')],
      rules: [{ text: D.flyra.pipeline.rbefore + '. Path: ' + D.flyra.pipeline.before + '.', src: src('flyra', 25, 'Pipeline · before contact') }] },
    { t: 'Introducing Edge Shines', goal: 'Introduce yourself and the company, and get permission for 5–10 minutes.',
      say: [S('Introduce + permission', sop(7), 'sop', 'do', SF), askNext(S('If they are busy', obj(30), 'obj', 'answer'), obj(30))],
      doo: [{ n: '→', title: 'Listen', text: scr(6).action + '. Record: ' + sop(7).result + '.', src: src('script', 6) + ' / ' + src('sop', 7) }],
      rules: [] },
    { t: 'Explaining the done-for-you service', goal: 'Explain exactly what the customer gets: company lights, installation, maintenance, takedown and storage.',
      say: [S('Done-for-you service', scr(7), 'script', 'say'), S('Materials policy', scr(9), 'script', 'say')],
      doo: [DO('03', sop(8), 'sop', 'stage', 'do', SF)],
      facts: ['Seasonal vs permanent', 'Custom fit', 'In-season upkeep', 'Takedown', 'Storage', 'Client supplies lights?'],
      rules: [R(rule(25))] },
    { t: 'The average $1,000 seasonal price', goal: 'Set price expectations early and check budget fit.',
      say: [S('Lights + price early', scr(8), 'script', 'say'), askNext(S('If they ask “Is $1,000 the price for my house?”', obj(14), 'obj', 'answer'), obj(14)), S('Budget text (if needed)', txt(8), 'texts', 'text')],
      doo: [{ n: '→', title: 'Record', text: sop(8).result, src: src('sop', 8, SF) }],
      facts: ['Typical home price'], rules: [] },
    { t: 'Qualifying the customer', goal: 'Confirm the decision-maker, full address and scope, and how confident a quote can be.',
      say: [S('Decision-maker', scr(10), 'script', 'say'), S('Property and scope', scr(11), 'script', 'say'), askNext(S('If someone else decides', obj(27), 'obj', 'answer'), obj(27))],
      doo: [DO('04', sop(9), 'sop', 'stage', 'do', SF, res(sop(9))), DO('05', sop(10), 'sop', 'stage', 'do', SF, res(sop(10))), DO('07', sop(12), 'sop', 'stage', 'do', SF, res(sop(12)))],
      rules: [] },
    { t: 'Discussing design options', goal: 'Agree on color, the areas to light and timing before you measure.',
      say: [S('Color + timing', scr(12), 'script', 'say'), S('Design consultation', scr(13), 'script', 'say')]
        .concat(D.price.scoping.map(q => Sx('Scoping question ' + q.n, unq(q.q), 'price', q.row, 'Fast scoping questions'))),
      doo: [],
      facts: ['Colors', 'Can colors change?', 'Spacing', 'Bushes and trees', 'Ground lighting', 'Wreaths / garland'],
      rules: [R(rule(23), true)] },
    { t: 'Measuring the property remotely', goal: 'Measure only the areas the customer wants, live on the call.',
      say: [S('Measure while on call', scr(14), 'script', 'say'), Sx('What to say about measuring', unq(D.measure.script), 'measure', 21, 'What to say to the customer')],
      doo: [DO('06', sop(11), 'sop', 'stage', 'do', SF, res(sop(11))), FT('T3', 8)].concat([4, 5, 6, 7, 8, 9, 10, 11].map(MS)),
      rules: [{ text: D.price.safety[2], src: safetySrc(2) }, { text: D.price.safety[3], src: safetySrc(3) }],
      link: { label: 'Open the estimator', view: 'estimate' } },
    { t: 'Providing pricing', goal: 'Price by agreement term, explain the term, then say whether the number is firm or preliminary.',
      say: [S('Present preliminary price', scr(15), 'script', 'say'), S('Explain 3-year model', scr(16), 'script', 'say'), Sx('If you can’t verify the roof on the call', unq(D.fast.cantVerify), 'fast', 32)],
      doo: [DO('08', sop(13), 'sop', 'stage', 'do', SF, res(sop(13))), DO('09', sop(14), 'sop', 'stage', 'do', SF, res(sop(14))), FT('T6', 11), FT('T7', 12), MS(12)],
      rules: [R(rule(21), true, true), R(rule(22), false, true)],
      live: true, checklist: true, link: { label: 'Open the estimator', view: 'estimate' } },
    { t: 'Creating AI design mockups', goal: 'Show a design concept made from the customer’s real property photo.',
      say: [S('Explain the concept', mk(10), 'mock', 'do', 'Photo → prompt → quality check → send'), S('Mockup reveal', scr(18), 'script', 'say')],
      doo: [DO('10', sop(15), 'sop', 'stage', 'do', SF, res(sop(15)))].concat([6, 7, 8, 9].map(MDO)),
      rules: [{ text: D.mock.final, src: src('mock', 18) }],
      link: { label: 'Open the 3 AI prompts', view: 'mockups' } },
    { t: 'Handling objections', goal: 'Find the real concern before you answer it.',
      say: [S('If price is too high', scr(17), 'script', 'say'), S('If not ready', scr(21), 'script', 'say')],
      doo: [Object.assign(DO('11', sop(16), 'sop', 'stage', 'do', SF), { id: null })],
      rules: [R(rule(24), false, true)],
      objs: [11, 15, 16, 12, 27, 28], link: { label: 'Open all 28 objections', view: 'objections' } },
    { t: 'Closing the sale', goal: 'Ask directly for the sale, then set an exact next step.',
      say: [S('Close the sale', scr(19), 'script', 'say'), S('When accepted', scr(20), 'script', 'say'), S('End call', scr(22), 'script', 'say')],
      doo: [DO('11', sop(16), 'sop', 'stage', 'do', SF, res(sop(16))), MS(13)],
      rules: [R(rule(26), true, true)], never: true },
    { t: 'Following the FLYRA quoting procedure', goal: 'Convert, quote, and leave every lead with an owner and a dated next action.',
      say: [S('Quote sent (text)', txt(10), 'texts', 'text'), S('Ready to proceed (text)', txt(14), 'texts', 'text')],
      doo: [DO('12', sop(17), 'sop', 'stage', 'do', SF, res(sop(17))), FT('T8', 13)],
      rules: [{ text: D.flyra.pipeline.rduring + '.', src: src('flyra', 25, 'Pipeline · during sales') }, { text: D.flyra.pipeline.rafter + '.', src: src('flyra', 25, 'Pipeline · after decision') }],
      sixFacts: true, wf: true, link: { label: 'Open the FLYRA SOP', view: 'flyra' } }
  ];
  const flowHome = {};
  FLOW.forEach((s, i) => s.say.concat(s.doo, s.rules).forEach(x => { if (x.id && !(x.id in flowHome)) flowHome[x.id] = i; }));

  /* ---------- FLYRA workflow stages (row numbers in 07 FLYRA SOP) ---------- */
  const WF = [['Open Lead', [6, 7, 8]], ['Convert to Customer', [9]], ['Subscription', [10, 11]], ['Prepare Quote', [12]], ['Send Quote', [13]], ['Record Next Action', [14, 15]], ['After acceptance', [16, 17]]];
  const NOTE_KEYS = D.flyra.notes;

  /* ---------- Objection categories and the service facts behind each answer (row numbers in 05 OBJECTIONS) ---------- */
  const OBJ_CATS = [
    ['Pricing', [14, 15, 16, 29, 35, 38]],
    ['Agreements', [11, 13, 36]],
    ['Cancellation', [12, 37]],
    ['Installation', [20, 25, 26, 31, 32, 33, 24]],
    ['Materials', [17, 18, 19, 21, 22, 23]],
    ['Scheduling', [34, 30]],
    ['Decision & stalls', [27, 28]]
  ];
  const objCat = {}; OBJ_CATS.forEach(([c, rows]) => rows.forEach(r => { objCat[r] = c; }));
  const OBJ_FACTS = { 11: ['Agreement term', 'Reason for multi-year'], 12: ['Early cancellation'], 13: ['Agreement term', 'Reason for multi-year'], 14: ['Typical home price'], 15: ['Typical home price'], 16: ['Competitor comparison'], 17: ['Product type'], 18: ['Can colors change?', 'Seasonal vs permanent'], 19: ['Colors'], 20: ['Custom fit', 'Spacing'], 21: ['Client supplies lights?'], 22: ['Who owns the lights?'], 23: ['Storage'], 24: ['In-season upkeep'], 25: ['Roofline coverage'], 26: ['Bushes and trees'], 31: ['Mockup accuracy'], 32: ['Seasonal vs permanent'], 33: ['Roof safety'], 35: ['Takedown', 'Storage'], 37: ['Early cancellation'], 38: ['Deposit'] };

  /* ======================================================================
     REVIEW FLAGS: things the workbook leaves missing, unclear or unconfirmed
     ====================================================================== */
  const FLAGS = [
    ['Needs confirmation', 'Rate card is reference pricing only', 'Both rate tables say the rates are previous reference prices that the owner must confirm for the current season. 03 FAST QUOTES also says “This is NOT an automatic price calculator.” The estimator uses these reference rates and labels every total as an estimate until confirmed.', '03 FAST QUOTES · Rows 2, 15, 20; 10 PRICE CARD · Rows 1–2'],
    ['Missing rate', 'Wreath pricing', 'Only a historical $225 reference for a 36-in wreath, marked “CURRENT RATE UNCONFIRMED.” No rates for 24, 48 or 60-in wreaths or for bows. The estimator leaves wreaths out of the total until a manager-approved rate is entered.', '10 PRICE CARD · Row 14'],
    ['Missing rate', 'Garland pricing', '“NO APPROVED RATE ON FILE — manager sets price.” Garland stays out of totals until a manager-approved rate is entered.', '10 PRICE CARD · Row 15'],
    ['Missing rate', 'Labor / access surcharges', 'Difficult peaks, high trees, special mounting and outlets can carry an “only company-approved surcharge,” but no amounts are listed.', '10 PRICE CARD · Row 16'],
    ['Missing policy', 'Sales tax', 'Examples are “before tax,” but no tax rate or rule appears anywhere in the workbook.', '10 PRICE CARD · Row 19; 03 FAST QUOTES · Row 28'],
    ['Missing policy', 'Minimums, discounts and promotions', 'Referenced as things to verify (“minimums, add-ons, discounts… promotional exceptions”), but none are defined.', '03 FAST QUOTES · Row 20; 09 MEASURE SOP · Row 18'],
    ['Missing policy', 'Preliminary price range', 'The can’t-verify script asks for a range ($___–$___), but the workbook gives no method for setting the low and high numbers.', '03 FAST QUOTES · Row 32'],
    ['Unclear wording', 'Deposit', '03 FAST QUOTES says the deposit is “usually 50%”; 04 SERVICE FACTS and 05 OBJECTIONS say the standard program “uses a 50% deposit,” with the balance “generally due upon completed installation.” Confirm whether 50% is fixed.', '03 FAST QUOTES · Row 28; 04 SERVICE FACTS · Row 24; 05 OBJECTIONS · Row 38'],
    ['Unclear wording', 'Early cancellation fee', 'The fee is 40% of that year’s seasonal bill. 04 SERVICE FACTS phrases it as “Your typical policy uses…”, which reads like a draft note. Promotional exceptions are mentioned but not listed.', '04 SERVICE FACTS · Row 27; 05 OBJECTIONS · Rows 12, 37'],
    ['Missing policy', 'Agreement wording', 'Reps are told to use “the exact estimate and agreement language approved by Edge Shines” and to offer “the specific cancellation section” for review, but the agreement text itself is not in the workbook.', '02 CALL SCRIPT · Row 2; 05 OBJECTIONS · Row 12'],
    ['Missing policy', 'One-year or one-time option', 'Reps are told to “review whether a shorter option or one-time custom quote is currently approved.” There is no policy or rate for it.', '05 OBJECTIONS · Row 13'],
    ['Needs confirmation', 'Availability of 2- and 4-year terms', '04 SERVICE FACTS says 2- and 4-year options “may be available at approved pricing,” while the rate card lists rates for both.', '04 SERVICE FACTS · Row 25; 10 PRICE CARD · Rows 4–6'],
    ['Needs confirmation', 'Mini-light strands', '$50 per strand for every term. Strand length is not stated. ~5 strands per bush and ~10 per tree are “working starting points,” not rules.', '09 MEASURE SOP · Rows 6–7; 10 PRICE CARD · Rows 4–6'],
    ['Missing policy', 'Sloped rake length', 'Satellite lengths “may miss sloped rake length,” but no adjustment method or factor is given.', '09 MEASURE SOP · Row 5'],
    ['Needs confirmation', 'Available colors', 'Only “not black or gray” is documented. There is no list of stocked C9 colors or patterns.', '04 SERVICE FACTS · Row 8; 05 OBJECTIONS · Row 19'],
    ['Needs confirmation', 'Measuring tool', 'The company’s chosen tool is not named. Examples given: Measured Bid, LightQuoter, or Google Earth tracing.', '03 FAST QUOTES · Row 8'],
    ['Needs confirmation', 'FLYRA stage names', 'The playbook says to use “the appropriate current FLYRA status” and to match pipeline language to your account. Exact stage names are not fixed.', '07 FLYRA SOP · Rows 14, 22'],
    ['Unclear wording', 'Scripts are written for “Emily”', 'Call scripts and texts use the name Emily. The assistant swaps in each rep’s own name: the one they type, or their first name from their Claude account.', '01 SALES SOP · Row 7; 02 CALL SCRIPT; 08 TEXT TEMPLATES'],
    ['Missing policy', 'Install and takedown calendar', 'Takedown happens “after the holiday period” on a “seasonal calendar,” but no dates or booking windows are given.', '04 SERVICE FACTS · Row 19']
  ];

  /* ======================================================================
     ESTIMATOR MODEL
     ====================================================================== */
  const EST_BASE = () => ({ term: '3-year', roof: [], bush: [], tree: [], stake: [], wreath: [], garland: [], labor: [], flags: {}, checks: {}, mchecks: {}, verify: {}, lo: '', hi: '', example: false });
  const EST_DEFAULT = () => Object.assign(EST_BASE(), { roof: [{ label: 'Front roofline', ft: 120 }], bush: [{ label: 'Front bushes', count: 3, per: 5 }], stake: [{ label: 'Front walk', ft: 60 }], example: true });
  const EST_EMPTY = () => Object.assign(EST_BASE(), { roof: [{ label: 'Front roofline', ft: '' }] });
  function estNorm(s) {
    if (!s || typeof s !== 'object') return EST_DEFAULT();
    const o = Object.assign(EST_BASE(), s);
    ['roof', 'bush', 'tree', 'stake', 'wreath', 'garland', 'labor'].forEach(k => { o[k] = Array.isArray(o[k]) ? o[k].filter(x => x && typeof x === 'object') : []; });
    ['flags', 'checks', 'mchecks', 'verify'].forEach(k => { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
    if (!rateFor(o.term)) o.term = '3-year';
    return o;
  }
  let est = estNorm(store.get('est', null));
  const FLAGS_EST = [
    ['steep', 'Steep, hidden or sloped roof sections (rake length unclear)', src('measure', 5)],
    ['metal', 'Metal, aluminum or fragile roof (attachment review)', src('facts', 30)],
    ['high', 'High roof, tall peaks or second-story access', src('measure', 11)],
    ['tree', 'Large, tall or dense trees (crew review)', src('measure', 7)],
    ['power', 'Power access or outlets uncertain', src('facts', 23)],
    ['image', 'Imagery unclear or roof not fully visible', src('fast', 29)]
  ];
  const VERIFY = [['meas', 'Measurements verified'], ['access', 'Access verified'], ['mat', 'Materials verified']];
  function estCalc(e, term) {
    const r = rateFor(term || e.term), lines = [], missing = [];
    const roofFt = e.roof.reduce((s, x) => s + num(x.ft), 0);
    if (roofFt) lines.push([`Roofline C9: ${roofFt} ft × $${r.roof}`, roofFt * r.roof]);
    const bs = e.bush.reduce((s, x) => s + num(x.count) * num(x.per), 0);
    if (bs) lines.push([`Bushes · minis: ${bs} strands × $${r.mini}`, bs * r.mini]);
    const ts = e.tree.reduce((s, x) => s + num(x.count) * num(x.per), 0);
    if (ts) lines.push([`Trees · minis: ${ts} strands × $${r.mini}`, ts * r.mini]);
    const sf = e.stake.reduce((s, x) => s + num(x.ft), 0);
    if (sf) lines.push([`Ground stakes: ${sf} ft × $${r.stake}`, sf * r.stake]);
    e.wreath.forEach(x => { const q = num(x.qty); if (!q) return; if (num(x.rate)) lines.push([`Wreath ${x.size}-in × ${q} @ ${money(num(x.rate))} (manager rate)`, q * num(x.rate)]); else missing.push(`Wreath ${x.size}-in × ${q}`); });
    e.garland.forEach(x => { const q = num(x.qty); if (!q) return; const u = x.unit === 'section' ? 'section' : 'ft'; const nm = `Garland ${x.label || ''} ${q} ${u}`.replace(/\s+/g, ' '); if (num(x.rate)) lines.push([`${nm} @ ${money(num(x.rate))}/${u} (manager rate)`, q * num(x.rate)]); else missing.push(nm); });
    e.labor.forEach(x => { if (num(x.amt)) lines.push([`Approved surcharge: ${x.label || 'labor / access'}`, num(x.amt)]); else if ((x.label || '').trim()) missing.push(`Surcharge: ${x.label}`); });
    const total = lines.reduce((s, l) => s + l[1], 0);
    return { r, lines, missing, total, roofFt, bs, ts, sf };
  }
  function estStatus(c) {
    const reasons = [];
    const nv = VERIFY.filter(v => !est.verify[v[0]]).map(v => v[1].replace(' verified', '').toLowerCase());
    if (nv.length) reasons.push('Not verified yet: ' + joinList(nv));
    FLAGS_EST.forEach(([k, l]) => { if (est.flags[k]) reasons.push('Escalate: ' + l); });
    if (c.missing.length) reasons.push('Rate needed: ' + c.missing.join(', '));
    const unchecked = D.fast.checkpoint.filter(x => !est.checks[x.row]).length;
    if (unchecked) reasons.push(`${unchecked} of ${D.fast.checkpoint.length} quote checkpoints not ticked`);
    if (!c.total) reasons.push('Nothing priced yet');
    return { firm: !reasons.length, reasons };
  }
  // 02 CALL SCRIPT line 10, with the total filled in and its "[If measurement is verified: ...]" note spoken.
  const firmSay = total => scr(15).say.replace(/\$_{2,}/, money(total)).replace(/\s*\[If measurement is verified:\s*[‘']([^’']+)[’']\]/, ' $1');
  function prelimSay() {
    let lo = num(est.lo), hi = num(est.hi);
    if (lo && hi && lo > hi) { const t = lo; lo = hi; hi = t; }
    const base = unq(D.fast.cantVerify);
    return lo && hi ? base.replace(/\$_{2,}\s*[–-]\s*\$_{2,}/, money(lo) + '–' + money(hi)) : base;
  }
  function scopeText() {
    const c = estCalc(est), parts = [], cnt = (k, f) => est[k].reduce((s, x) => s + num(x[f]), 0);
    if (c.roofFt) parts.push(`${c.roofFt} ft of roofline`);
    const b = cnt('bush', 'count'); if (b) parts.push(`${b} bush${b === 1 ? '' : 'es'}`);
    const t = cnt('tree', 'count'); if (t) parts.push(`${t} tree${t === 1 ? '' : 's'}`);
    if (c.sf) parts.push(`${c.sf} ft of ground stakes`);
    const w = cnt('wreath', 'qty'); if (w) parts.push(`${w} wreath${w === 1 ? '' : 's'}`);
    if (est.garland.some(x => num(x.qty))) parts.push('garland');
    return joinList(parts);
  }
  const EST_FILL = { SCOPE: scopeText, PRICE: () => { const c = estCalc(est); return c.total ? money(c.total) : ''; } };

  /* ======================================================================
     SEARCH: every row of every tab, matched on meaning-bearing words
     ====================================================================== */
  const STOP = new Set('a an the and or of to in on for with at by from is are was be been being it its this that these those i me my mine we our us you your yours they them their he she his her what whats which who whom how why when where if do does did doesnt dont didnt isnt arent wont cant not no can could would should will shall may might just about any some so than then there here as into customer customers client clients homeowner says say said tell want wants wanted need needs get got have has had am im ok okay please also very really s t let lets ask asks asking go goes going ones thing things like theyre youre now give gave giving'.split(' '));
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
    [/\b(?:go(?:es)?|went|burn(?:ed|t|s)?)\s+out\b/g, ' broken ']
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
  const SYN_GROUPS = {
    price: 'price prices pricing priced cost costs expensive pricey cheap cheaper cheapest afford affordable much rate rates dollar dollars money budget total',
    agreement: 'agreement agreements contract contracts term terms commitment commit multiyear multi',
    cancel: 'cancel cancels canceled cancelled canceling cancelling cancellation terminate quit',
    spouse: 'spouse wife husband partner family',
    decision: 'decision decisionmaker decide approve approval',
    think: 'think thinking consider considering unsure maybe',
    color: 'color colors colour colours colored multicolor multicolour rgb red green blue white warm purple orange pink gold yellow',
    own: 'own owns owned ownership',
    store: 'store stores stored storage',
    remove: 'remove removal removed takedown',
    install: 'install installs installed installation installing hang hanging hung',
    roof: 'roof roofs roofline rooflines gutter gutters eave eaves',
    peak: 'peak peaks gable gables',
    bush: 'bush bushes shrub shrubs hedge hedges landscaping',
    tree: 'tree trees',
    stake: 'stake stakes walkway walkways driveway driveways pathway path sidewalk',
    bulb: 'bulb bulbs',
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
    light: 'light lights lighting',
    mini: 'mini minis strand strands',
    include: 'include includes included including inclusion inclusions',
    home: 'home homes house houses property properties',
    app: 'app apps smart wifi bluetooth',
    discount: 'discount discounts deal deals promo promos promotion promotions promotional coupon coupons',
    pay: 'pay pays paying paid payment payments balance',
    power: 'outlet outlets power electrical electricity plug plugs extension cord cords circuit circuits wiring',
    safe: 'safe safety unsafe dangerous',
    photo: 'photo photos pic pics',
    accept: 'yes accept accepts accepted agree agreed proceed',
    missed: 'missed miss'
  };
  const CANON = {};
  Object.entries(SYN_GROUPS).forEach(([c, ws]) => ws.split(' ').forEach(w => { CANON[stem(w)] = c; }));
  const norm = s => { let t = String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/(\d),(\d{3})/g, '$1$2').replace(/'/g, ''); PHRASES.forEach(([re, to]) => { t = t.replace(re, to); }); return t; };
  const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean).map(w => NUMW[w] || w).filter(w => !STOP.has(w)).map(w => { const st = stem(w); return CANON[st] || st; });

  const IDX = [];
  const add = e => { e.i = IDX.length; IDX.push(e); };
  const OBJ_KW = { 11: 'contract commitment long multi year', 12: 'fee break early', 13: 'single season once', 15: 'afford budget lower', 16: 'competitor quote', 21: 'my own lights supply', 27: 'wife husband partner decision', 28: 'later decide', 29: 'email quote number', 30: 'busy later callback', 34: 'soon asap quickly date', 35: 'takedown', 38: 'down payment upfront' };
  D.sop.steps.forEach(s => add({ type: 'SOP step', title: `Step ${s.n}: ${s.stage}`, main: s.do, fields: [['Result', s.result]], src: src('sop', s.row, 'The Sales Flow · 12 steps'), go: { view: 'flow', id: 'sop-' + s.row } }));
  D.sop.rules.forEach(s => add({ type: 'Decision rule', title: s.case, main: s.how, fields: [['Customer expectation', s.expect]], src: src('sop', s.row, 'Fast decision rules'), go: { view: 'flow', id: 'rule-' + s.row } }));
  add({ type: 'SOP', title: 'Every call ends with 6 FLYRA facts', main: D.sop.facts.join(' • '), src: src('sop', 29), go: { view: 'flyra', id: 'sixfacts' }, kw: 'notes record log call end' });
  D.script.lines.forEach(s => add({ type: 'Script', title: s.when, main: s.say, fields: [['Action / listen for', s.action]], src: src('script', s.row, 'Open • Qualify • Design • Close'), go: { view: 'flow', id: 'script-' + s.row } }));
  add({ type: 'Rule', title: 'Never promise these without checking', main: D.script.never.join(' • '), src: src('script', 25), go: { view: 'flow', step: 10, id: 'never' }, kw: 'guarantee promise' });
  D.fast.routine.forEach(s => add({ type: 'Quoting routine', title: `${s.n}. ${s.action}`, main: s.how, fields: [['When to stop', s.stop]], src: src('fast', s.row, 'The 8-minute remote quoting routine'), go: { view: 'playbook', id: 'pb-fast-' + s.row } }));
  add({ type: 'Pricing', title: 'Pricing reference by agreement term', main: D.fast.rates.map(r => `${r.term}: Roofline C9 ${r.roof}; Mini light strand ${r.mini}; Ground stakes ${r.stake}`).join(' • '), fields: [['Note', D.fast.rateNote]], src: src('fast', 17, 'Pricing reference · owner must confirm current season'), go: { view: 'playbook', id: 'pb-fast-17' }, kw: 'per foot linear rate card roofline mini stake 2 3 4 year' });
  D.fast.checkpoint.forEach(s => add({ type: 'Quote checkpoint', title: s.verify, main: s.why, fields: [['Seller action', s.action]], src: src('fast', s.row, 'Quote checkpoint · before saying a final total'), go: { view: 'estimate', id: 'ckl-' + s.row } }));
  add({ type: 'Script', title: 'What to say if you can’t verify the roof on the call', main: unq(D.fast.cantVerify), src: src('fast', 32), go: { view: 'flow', id: 'fast-32' }, kw: 'range unsure uncertain preliminary unclear' });
  D.facts.items.forEach(s => add({ type: 'Service fact', title: s.topic, main: s.say, fields: [['Check / limitation', s.check]], src: src('facts', s.row, 'Lights, colors, installation'), go: { view: 'facts', id: 'fact-' + s.row } }));
  D.obj.items.forEach(s => add({ kw: OBJ_KW[s.row], type: 'Objection', title: s.says, main: s.answer, fields: [['Ask next', s.next], ['Category', objCat[s.row]]], next: s.next, src: src('obj', s.row, 'Full objection library'), go: { view: 'objections', obj: s.row }, boost: 1.15 }));
  D.mock.steps.forEach(s => add({ type: 'Mockup SOP', title: s.step, main: s.do, fields: [['Quality rule', s.rule]], src: src('mock', s.row, 'Photo → prompt → quality check → send'), go: { view: 'mockups', id: 'mock-' + s.row } }));
  D.mock.prompts.forEach(s => add({ type: 'AI prompt', title: s.label.replace(/\n/g, ' — '), main: s.text, fields: [['Use it for', s.use.replace(/\n/g, ' · ')]], src: src('mock', s.row, '3 copy-and-paste image prompts'), go: { view: 'mockups', id: 'prompt-' + s.row }, kw: 'design picture image mockup prompt' }));
  add({ type: 'Mockup SOP', title: 'Final check before sending a mockup', main: D.mock.final, src: src('mock', 18), go: { view: 'mockups', id: 'mockfinal' } });
  D.flyra.steps.forEach(s => add({ type: 'FLYRA', title: `${s.n} ${s.action}`, main: s.detail, fields: [['Result', s.result]], src: src('flyra', s.row, 'When a lead needs a quote'), go: { view: 'flyra', id: 'flyra-' + s.row }, kw: 'flyra crm' }));
  add({ type: 'FLYRA', title: 'Minimum required FLYRA notes', main: D.flyra.notes.join(' | '), src: src('flyra', 20), go: { view: 'flyra', id: 'fnotes' }, kw: 'notes record log' });
  add({ type: 'FLYRA', title: 'FLYRA pipeline language', main: `Before contact: ${D.flyra.pipeline.before} (${D.flyra.pipeline.rbefore}) • During sales: ${D.flyra.pipeline.during} (${D.flyra.pipeline.rduring}) • After decision: ${D.flyra.pipeline.after} (${D.flyra.pipeline.rafter})`, src: src('flyra', 24, 'Simple FLYRA pipeline language'), go: { view: 'flyra', id: 'pipeline' }, kw: 'stage status won lost' });
  D.texts.items.forEach(s => add({ type: 'Text template', title: s.situation, main: s.text, fields: [['When / record', s.when]], src: src('texts', s.row, 'Messages for the sales rep'), go: { view: 'texts', id: 'text-' + s.row }, kw: 'text sms message' }));
  add({ type: 'Text template', title: 'Message standards', main: D.texts.standards.join(' • '), src: src('texts', 19), go: { view: 'texts', id: 'textstd' } });
  D.measure.steps.forEach(s => add({ type: 'Measuring', title: `${s.n} ${s.area}`, main: s.measure, fields: [['Quick rule / escalate', s.rule]], src: src('measure', s.row, 'Phone estimating SOP'), go: { view: 'flow', id: 'measure-' + s.row } }));
  add({ type: 'Measuring', title: 'Photo / measurement checklist', main: D.measure.checklist.join(' • '), src: src('measure', 16), go: { view: 'playbook', id: 'pb-measure-16' } });
  add({ type: 'Script', title: 'What to say about measuring', main: unq(D.measure.script), src: src('measure', 21), go: { view: 'flow', id: 'measure-21' } });
  add({ type: 'Pricing', title: 'Lighting rate card (per agreement)', main: D.price.rates.map(r => `${r.term}: Roofline C9 $${r.roof}/ft • Mini lights $${r.mini}/strand • Ground stakes $${r.stake}/ft`).join('  |  '), fields: [['Status', D.price.sub]], src: src('price', 3, 'Lighting rate card'), go: { view: 'estimate', id: 'rates' }, kw: 'per foot linear rate card price roofline mini stake 2 3 4 year', boost: 1.1 });
  D.price.components.forEach(s => add({ type: 'Pricing', title: s.comp, main: s.how, fields: [['Measure', s.qty], ['Example / check', s.example]], src: src('price', s.row, 'Measure & price each component'), go: { view: 'playbook', id: 'pb-price-' + s.row } }));
  add({ type: 'Pricing', title: 'Example: ' + D.price.example.label, main: `${D.price.example.scope} = ${D.price.example.calc} = ${D.price.example.total}`, src: src('price', 19, 'Shorthand calculation · example only'), go: { view: 'playbook', id: 'pb-price-19' } });
  D.price.scoping.forEach(s => add({ type: 'Script', title: 'Scoping question ' + s.n, main: unq(s.q), src: src('price', s.row, 'Fast scoping questions'), go: { view: 'flow', id: 'price-' + s.row } }));
  add({ type: 'Rule', title: 'Quote safety rules', main: D.price.safety.join(' • '), src: src('price', 29, 'Quote safety rules'), go: { view: 'playbook', id: 'pb-price-29' } });
  FLAGS.forEach((f, i) => add({ type: 'Review flag', title: f[1], main: f[2], fields: [['Status', f[0] + ' — not settled in the playbook']], src: 'Items to review (assistant note) · ' + esc(f[3]), go: { view: 'review', id: 'flag-' + i }, noRep: true, noCopy: true, boost: 0.9 }));
  IDX.forEach(e => {
    e.tt = tokens(e.title); e.tk = tokens(e.kw || ''); e.tb = tokens([e.main].concat((e.fields || []).map(f => f[1])).join(' '));
    e.all = new Set(e.tt.concat(e.tk, e.tb));
    e.normTitle = norm(e.title).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
    e.cls = { Objection: 't-objection', Script: 't-script', 'Review flag': 't-flag' }[e.type] || '';
  });
  const DF = {}; IDX.forEach(e => e.all.forEach(t => { DF[t] = (DF[t] || 0) + 1; }));
  const N = IDX.length;

  function search(q) {
    const qt = Array.from(new Set(tokens(q)));
    if (!qt.length) return { qt, res: [] };
    const nq = norm(q).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const out = [];
    IDX.forEach(e => {
      let score = 0, matched = 0;
      qt.forEach((t, i) => {
        const idf = Math.log(1 + N / (DF[t] || 0.5));
        let w = 0;
        if (e.tt.includes(t)) w = 3; else if (e.tk.includes(t)) w = 2.2; else if (e.tb.includes(t)) w = 1;
        else if (t.length >= 3 && i === qt.length - 1) { // partial last word while typing
          if (e.tt.some(x => x.startsWith(t))) w = 1.6; else if (e.tb.some(x => x.startsWith(t))) w = 0.6;
        }
        if (w) { matched++; score += w * idf; }
      });
      if (!matched) return;
      const cov = matched / qt.length;
      score *= (0.25 + 0.75 * cov * cov);
      if (nq.length > 3 && e.normTitle.includes(nq)) score *= 1.6;
      score *= (e.boost || 1);
      out.push({ e, score, cov });
    });
    out.sort((a, b) => b.score - a.score);
    const top = out.length ? out[0].score : 0;
    return { qt, res: out.filter(r => r.score >= top * 0.18).slice(0, 14) };
  }
  const hl = (text, qset, noRep) => esc(noRep ? String(text) : rep(text)).replace(/[A-Za-z0-9$’']+/g, (w, off, str) => {
    if (str[off - 1] === '&' || str[off - 1] === '#') return w;
    const t = norm(w).replace(/[^a-z0-9]/g, ''); if (!t || STOP.has(t)) return w;
    const st = stem(NUMW[t] || t); const c = CANON[st] || st;
    return qset.has(c) ? `<mark>${w}</mark>` : w;
  });

  const SUGGEST = [
    'What if the customer doesn’t want a 3-year agreement?',
    'What if they cancel in the second year?',
    'Is $1,000 the price for my house?',
    'How much is the roofline per foot?',
    'Customer wants us to hang their own lights',
    'Can the lights change colors?',
    'I need to ask my spouse',
    'Other companies are cheaper',
    'How much is the deposit?',
    'My roof is metal',
    'What do I say if I can’t verify the roof?',
    'How do I convert a lead in FLYRA?',
    'How many strands for a bush?',
    'Who owns the lights?'
  ];
  function addRecent(q) {
    q = String(q || '').trim(); if (q.length < 3) return;
    const l = store.get('recent', []).filter(x => x.toLowerCase() !== q.toLowerCase());
    store.set('recent', [q].concat(l).slice(0, 6));
  }

  /* ======================================================================
     ASK CLAUDE: Claude only chooses entries; the page shows the playbook's own wording
     ====================================================================== */
  let sampleFn = null, ai = { q: '', status: 'idle' }, aiCtl = null, corpus = null;
  const AI_OFF = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  const AI_ERR = {
    rate_limited: 'Claude is busy for your account right now. Try again in a minute.',
    session_expired: 'Your Claude session expired. Sign in again, then retry.',
    refused: 'Claude couldn’t match this one. Try rephrasing it.',
    empty_completion: 'Claude couldn’t match this one. Try rephrasing it.',
    invalid_json: 'Claude’s answer couldn’t be read. Try again.',
    prompt_too_large: 'The playbook is too large to send. Use the keyword results instead.'
  };
  const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const aiCorpus = () => corpus || (corpus = IDX.map(e => `[${e.i}] (${e.type}) ${clip(e.title, 120)} :: ${clip(e.main, 420)}${e.next ? ' | Ask next: ' + clip(e.next, 160) : ''}`).join('\n'));
  const aiPrompt = q => [
    'You help phone sales reps at Edge Shines, a Christmas lighting company, find answers in the company sales playbook while they are on a call with a customer.',
    '',
    'The rep typed: ' + JSON.stringify(q),
    '',
    'Below is every playbook entry, one per line, written as [id] (type) title :: text.',
    'Choose the entries that directly answer what the rep typed: what to say to the customer, what to do, or the fact or rule that applies.',
    '- If the rep is quoting or describing something a customer said, prefer the matching Objection entry, then a Script entry.',
    '- "Review flag" entries describe things the playbook does not settle. Choose one when the question is about that gap.',
    '- Return at most 4 ids, best first. Do not choose an entry only because it shares a word with the question.',
    '- If no entry answers it, return an empty list.',
    'Reply with only JSON in exactly this shape: {"ids": [12, 40]}',
    '',
    'ENTRIES:',
    aiCorpus()
  ].join('\n');
  async function askClaude() {
    const q = query.trim(); if (!q || !sampleFn) return;
    if (aiCtl) aiCtl.abort();
    const ctl = aiCtl = new AbortController();
    ai = { q, status: 'loading' }; paintAi();
    try {
      const out = await sampleFn.json(aiPrompt(q), { modelTier: 'quick', signal: ctl.signal });
      const raw = Array.isArray(out) ? out : (out && Array.isArray(out.ids) ? out.ids : []);
      const ids = Array.from(new Set(raw.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < IDX.length))).slice(0, 4);
      ai = { q, status: 'done', ids };
    } catch (e) {
      const code = e && e.code;
      if (code === 'cancelled') return;
      if (AI_OFF.includes(code)) { sampleFn = null; ai = { q, status: 'off' }; }
      else ai = { q, status: 'error', msg: AI_ERR[code] || 'Couldn’t reach Claude. Try again.' };
    }
    if (aiCtl === ctl) aiCtl = null;
    if (query.trim() === q) paintAi();
  }
  function aiHtml(qset) {
    if (!sampleFn) return '';
    const q = query.trim();
    if (ai.q !== q || ai.status === 'idle') return `<div class="aiask"><div><b>Not the answer you need?</b> <span class="muted">Claude can read the whole playbook and point to the right entries.</span></div><button class="btn primary" data-ask>Ask Claude to find it</button><span class="small muted">Claude only picks entries. Everything shown is the playbook’s own wording. Uses your Claude account.</span></div>`;
    if (ai.status === 'loading') return `<div class="aiask" aria-live="polite"><div><b>Claude is reading the playbook…</b></div><button class="btn" data-askstop>Stop</button></div>`;
    if (ai.status === 'error') return `<div class="aiask"><div><b>${esc(ai.msg)}</b></div><button class="btn" data-ask>Try again</button></div>`;
    if (ai.status === 'done' && !ai.ids.length) return `<div class="notice"><span class="ic">!</span><div><b>Claude found nothing in the playbook that answers this.</b> Don’t guess. Check with a manager.</div></div>`;
    if (ai.status === 'done') return `<div class="stack"><div class="secl">Claude’s picks from the playbook · wording is verbatim</div>${ai.ids.map(i => resCard(IDX[i], { ai: true, qset })).join('')}</div>`;
    return '';
  }
  function paintAi() { const b = $('#aibox'); if (b) b.innerHTML = aiHtml(new Set(tokens(query))); }

  /* ======================================================================
     STATE + ROUTING
     ====================================================================== */
  const VIEWS = ['home', 'flow', 'objections', 'estimate', 'mockups', 'flyra', 'texts', 'facts', 'playbook', 'review'];
  let view = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  let flowStep = Math.max(0, Math.min(FLOW.length - 1, parseInt(store.get('step', 0), 10) || 0));
  let flowDone = (store.get('done', []) || []).filter(n => Number.isInteger(n));
  let objSel = 11, objCatSel = 'All', objFilter = '';
  let flyraChk = store.get('flyraChk', []), flyraPhase = null, flyraNotes = store.get('flyraNotes', {});
  let factFilter = '', query = '';

  function go(v, opt) {
    opt = opt || {};
    if (query) { query = ''; $('#q').value = ''; syncClear(); }
    view = v;
    if (opt.step != null) flowStep = opt.step;
    if (opt.id && v === 'flow' && opt.id in flowHome) flowStep = flowHome[opt.id];
    if (v === 'flow') store.set('step', flowStep);
    if (opt.obj) { objSel = opt.obj; objCatSel = 'All'; objFilter = ''; }
    if (opt.phase != null) flyraPhase = opt.phase;
    if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
    render();
    window.scrollTo(0, 0);
    if (opt.id) requestAnimationFrame(() => flashEl(opt.id));
  }
  function flashEl(id) {
    const el = document.getElementById(id); if (!el) return;
    let d = el.closest('details');
    while (d) { d.open = true; d = d.parentElement ? d.parentElement.closest('details') : null; }
    el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1700);
  }
  window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== view) go(v); });

  function render() {
    reg = new Map();
    $$('.nav').forEach(b => b.setAttribute('aria-current', !query && b.dataset.view === view ? 'page' : 'false'));
    $('#main').innerHTML = query ? vSearch() : ({ home: vHome, flow: vFlow, objections: vObj, estimate: vEst, mockups: vMock, flyra: vFlyra, texts: vTexts, facts: vFacts, playbook: vPlaybook, review: vReview }[view])();
    if (!query && view === 'estimate') estRecalc();
    syncPrefs();
  }

  /* ---------- Preferences (name in scripts, text size) ---------- */
  const prefsHtml = id => `<div class="prefs stack"><div class="fills"><label>Your name in scripts<input id="${id}" data-rep autocomplete="off" placeholder="Emily (default)"></label></div>
    <div class="stack" style="gap:6px"><span class="secl">Text size</span><div class="termseg sm" role="group" aria-label="Text size"><button type="button" data-size="std">Standard</button><button type="button" data-size="lg">Large</button></div></div></div>`;
  function syncPrefs() { const s = store.get('size', 'std'); $$('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.size === s))); syncRep(); }
  const setHH = () => {
    qIn.placeholder = window.innerWidth < 560 ? 'Search the playbook' : 'Ask anything: “customer doesn’t want a 3-year agreement”';
    const h = $('.top'); if (h) document.documentElement.style.setProperty('--hh', h.offsetHeight + 'px');
  };
  function setSize(s) { store.set('size', s); document.documentElement.style.fontSize = s === 'lg' ? '112.5%' : ''; syncPrefs(); setHH(); }

  /* ---------- Home ---------- */
  function vHome() {
    const r2 = rateFor('2-year'), r3 = rateFor('3-year'), r4 = rateFor('4-year');
    const tile = (l, v, d, s, pill) => `<div class="tile"><span class="l">${esc(l)}</span><span class="v">${v}</span><span class="d">${d}</span><span class="row">${pill || ''}<span class="src">${s}</span></span></div>`;
    const confirm = '<span class="pill warn">Confirm</span>';
    const inProgress = flowStep > 0 || flowDone.length;
    return `<div class="vhead"><div><div class="eyebrow">Christmas light sales</div><h1>Quick start</h1><p>Search anything above, or start a call and follow the 12 steps. Every answer shows where it came from in the playbook.</p></div></div>
    <div class="quick">
      <button class="qbtn lead" data-go="flow" ${inProgress ? '' : 'data-step="0"'}><b>${inProgress ? 'Continue the call' : 'Start a call'}</b><span>${inProgress ? `Step ${flowStep + 1}: ${esc(FLOW[flowStep].t)}` : '12-step call flow with scripts'}</span></button>
      <button class="qbtn" data-go="objections"><b>Objections</b><span>28 answers with follow-up questions</span></button>
      <button class="qbtn" data-go="estimate"><b>Estimator</b><span>Roofline, bushes, trees, stakes, greenery</span></button>
      <button class="qbtn" data-go="mockups"><b>AI mockup prompts</b><span>The 3 approved prompts</span></button>
      <button class="qbtn" data-go="flyra"><b>FLYRA quoting</b><span>Lead → Customer → Subscription → Quote</span></button>
    </div>
    <section class="panel phone-only"><h3>Your settings</h3>${prefsHtml('rep3')}</section>
    <section class="panel"><h3>Common questions</h3><div class="row">${SUGGEST.map(s => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div></section>
    <section class="stack"><div class="secl">Key numbers</div><div class="tiles">
      ${tile('Typical home', '~$1,000', 'per season. A general expectation, not a quote', src('facts', 29), '')}
      ${tile('Roofline C9', `$${r2.roof} · $${r3.roof} · $${r4.roof}`, 'per linear ft on 2 · 3 · 4-year terms', src('price', 4), confirm)}
      ${tile('Mini lights', `$${r3.mini}`, 'per strand, all terms', src('price', 4), confirm)}
      ${tile('Ground stakes', `$${r2.stake} · $${r3.stake} · $${r4.stake}`, 'per linear ft on 2 · 3 · 4-year terms', src('price', 4), confirm)}
      ${tile('Deposit', '50%', 'standard; balance generally due on completed install', src('facts', 24), confirm)}
      ${tile('Early cancellation', '40%', 'of that year’s seasonal bill; signed terms control', src('facts', 27), confirm)}
      ${tile('Bulb spacing', '~15 in', 'typical roofline unless the design says otherwise', src('facts', 12), '')}
      ${tile('Starting points', '5 · 10', 'strands per typical bush · moderate tree', src('measure', 6), '')}
    </div></section>
    <div class="grid2">
      <section class="panel"><h3>Never promise these without checking</h3>${D.script.never.map(n => ruleRow(n, src('script', 25))).join('')}</section>
      <section class="panel"><h3>Every call ends with 6 FLYRA facts</h3>${D.sop.facts.map((f, i) => `<div class="do"><span class="n">${i + 1}</span><div class="t">${esc(f)}</div></div>`).join('')}<span class="src">${src('sop', 29)}</span></section>
    </div>`;
  }

  /* ---------- Search results ---------- */
  function resCard(e, o) {
    o = o || {};
    const qset = o.qset || new Set(), T = x => hl(x, qset, e.noRep);
    const fields = (e.fields || []).filter(f => f[1]);
    return `<article class="res ${o.best ? 'best' : ''} ${o.ai ? 'aipick' : ''}">
      <div class="hd">${o.best ? '<span class="pill ok">Best answer</span>' : ''}${o.ai ? '<span class="pill info">Claude’s pick</span>' : ''}<span class="tp ${e.cls}">${esc(e.type)}</span><h3>${T(e.title)}</h3></div>
      <div class="main">${T(e.main)}</div>
      ${fields.length ? `<div class="fld">${fields.map(f => `<span>${esc(f[0])}</span><span>${T(f[1])}</span>`).join('')}</div>` : ''}
      <div class="ft"><span class="src">Source: ${e.src}</span><span class="row">
        ${e.noCopy ? '' : copyBtn(e.main, e.type === 'Objection' ? 'Copy response' : 'Copy')}
        ${e.next ? copyBtn(() => rep(e.main + ' ' + e.next), 'Copy response + question') : ''}
        <button class="btn sm" data-goto="${e.i}">Open in section →</button></span></div>
    </article>`;
  }
  function vSearch() {
    const r = search(query), qset = new Set(r.qt);
    const chips = `<section class="panel"><h3>Common questions</h3><div class="row">${SUGGEST.map(s => `<button class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div></section>`;
    if (!r.qt.length) return `<div class="vhead"><div><div class="eyebrow">Search</div><h1>Keep typing…</h1><p>Add a word or two about what the customer said or what you need.</p></div><button class="btn" data-clear>Clear search</button></div>${chips}`;
    if (!r.res.length) return `<div class="vhead"><div><div class="eyebrow">Search</div><h1>No match for “${esc(query)}”</h1><p>The playbook doesn’t cover this in those words, so don’t guess an answer. Try different words, or check with a manager.</p></div><button class="btn" data-clear>Clear search</button></div>
      <div id="aibox">${aiHtml(qset)}</div>${chips}`;
    const weak = r.qt.length > 1 && r.res[0].cov < 0.6;
    const cards = r.res.map((x, i) => resCard(x.e, { best: i === 0 && !weak, qset }));
    return `<div class="vhead"><div><div class="eyebrow">Search · ${r.res.length} match${r.res.length > 1 ? 'es' : ''} across the playbook</div><h1>“${esc(query)}”</h1></div><button class="btn" data-clear>Clear search</button></div>
      ${weak ? `<div class="notice"><span class="ic">!</span><div><b>Partial match.</b> Some words in your question aren’t in the playbook, so these results may not answer it exactly. Read the source before you use one, and check with a manager if it doesn’t fit.</div></div><div id="aibox">${aiHtml(qset)}</div>` : ''}
      <div class="stack">${cards[0]}${weak ? '' : `<div id="aibox">${aiHtml(qset)}</div>`}${cards.slice(1).join('')}</div>`;
  }

  /* ---------- Call flow ---------- */
  function liveEstHtml() {
    const c = estCalc(est), st = estStatus(c);
    if (!c.total) return `<section class="panel"><h3>Current estimate</h3><p class="muted">Nothing priced yet.</p><div class="row"><button class="btn primary" data-go="estimate">Open the estimator →</button></div></section>`;
    return `<section class="panel"><h3>Current estimate <span class="small muted">from the estimator${est.example ? ' · example data' : ''}</span></h3>
      <div class="row" style="justify-content:space-between"><span class="bignum">${money(c.total)}</span>${st.firm ? '<span class="pill ok">Ready for firm quote</span>' : '<span class="pill bad">Preliminary</span>'}</div>
      <span class="small muted">${esc(est.term)} agreement · deposit ${money(c.total * 0.5)} (standard 50%) · before tax</span>
      <div class="row">${copyBtn(() => st.firm ? firmSay(c.total) : prelimSay(), st.firm ? 'Copy price script' : 'Copy preliminary script')}<button class="btn sm" data-go="estimate">Open estimator →</button></div></section>`;
  }
  function vFlow() {
    const s = FLOW[flowStep];
    const list = FLOW.map((x, i) => `<button class="stp ${flowDone.includes(i) ? 'done' : ''}" data-step="${i}" aria-current="${i === flowStep ? 'step' : 'false'}"><span class="num">${flowDone.includes(i) ? '✓' : i + 1}</span><span class="ttl">${esc(x.t)}</span></button>`).join('');
    const sayHtml = s.say.map(x => sayBlock(x.label, x.text, x.src, { id: x.id, after: x.after, big: s.say.length < 3 })).join('');
    const doHtml = s.doo.map(x => doRow(x.n, x.title, x.text, x.src, x.extra, x.id)).join('');
    const facts = (s.facts || []).map(t => factRow(fact(t))).join('');
    const rules = s.rules.map(r => ruleRow(r.text, r.src, r.ok, null, r.id)).join('');
    const objs = (s.objs || []).map(r => `<button class="ocard" data-objgo="${r}"><span>“${esc(obj(r).says)}”</span><small>${esc(objCat[r])} →</small></button>`).join('');
    const wf = s.wf ? `<section class="panel"><h3>FLYRA quoting workflow</h3><div class="wf">${WF.map(([n], i) => (i ? '<span class="arrow" aria-hidden="true">→</span>' : '') + `<button class="wfb" data-flyraphase="${i}">${esc(n)}</button>`).join('')}</div><span class="small muted">Tap a stage to open its steps.</span></section>` : '';
    const never = s.never ? `<section class="panel" id="never"><h3>Never promise these without checking</h3>${D.script.never.map(n => ruleRow(n, src('script', 25))).join('')}</section>` : '';
    const six = s.sixFacts ? `<section class="panel" id="sixfacts"><h3>Every call ends with 6 FLYRA facts</h3>${D.sop.facts.map((f, i) => `<div class="do"><span class="n">${i + 1}</span><div class="t">${esc(f)}</div></div>`).join('')}<span class="src">${src('sop', 29)}</span></section>` : '';
    const chk = s.checklist ? `<section class="panel"><h3>Quote checkpoint before saying a final total</h3>${D.fast.checkpoint.map(c => `<div class="do"><span class="n">□</span><div class="t"><b>${esc(c.verify)}</b> — ${esc(c.why)}<div class="small muted">${esc(c.action)}</div><div class="src">${src('fast', c.row)}</div></div></div>`).join('')}</section>` : '';
    return `<div class="vhead"><div><div class="eyebrow">Sales SOP · call flow</div><h1>Follow these 12 steps on every call</h1><p>${esc(D.sop.sub)}</p></div>
      <button class="btn" data-flowreset>Reset progress</button></div>
      <div class="flow"><nav class="steps" aria-label="Call steps">${list}</nav>
      <div class="stepbody">
        <div class="stephead"><div><div class="eyebrow">Step ${flowStep + 1} of 12</div><h2>${esc(s.t)}</h2><p class="muted">${esc(s.goal)}</p></div>
          <div class="row">${flowStep > 0 ? '<button class="btn" data-stepnav="-1">← Back</button>' : ''}${flowStep < 11 ? '<button class="btn primary" data-stepnav="1">Done, next step →</button>' : '<button class="btn primary" data-stepnav="1">Mark call complete ✓</button>'}</div></div>
        <div class="cols">
          <div class="stack"><div class="secl">Say</div>${sayHtml}${objs ? `<div class="secl">Most common objections</div><div class="olist">${objs}</div>` : ''}</div>
          <div class="stack">
            ${s.live ? liveEstHtml() : ''}
            ${doHtml ? `<section class="panel"><h3>Do</h3><div>${doHtml}</div></section>` : ''}
            ${facts ? `<section class="panel"><h3>Facts to have ready</h3><div>${facts}</div></section>` : ''}
            ${rules ? `<section class="panel"><h3>Watch for</h3>${rules}</section>` : ''}
            ${wf}
            ${s.link ? `<div class="row"><button class="btn primary" data-go="${s.link.view}">${esc(s.link.label)} →</button></div>` : ''}
          </div>
        </div>
        ${chk}${never}${six}
      </div></div>`;
  }

  /* ---------- Objections ---------- */
  function vObj() {
    const f = objFilter.trim();
    let items = D.obj.items.filter(o => objCatSel === 'All' || objCat[o.row] === objCatSel);
    if (f) { const ft = new Set(tokens(f)); items = items.filter(o => tokens(o.says + ' ' + o.answer + ' ' + o.next + ' ' + objCat[o.row] + ' ' + (OBJ_KW[o.row] || '')).some(t => ft.has(t)) || norm(o.says).includes(norm(f))); }
    const o = obj(objSel);
    const cats = ['All'].concat(OBJ_CATS.map(c => c[0]));
    const card = (x, showCat) => `<button class="ocard" data-obj="${x.row}" aria-pressed="${x.row === objSel}"><span>“${esc(x.says)}”</span>${showCat ? `<small>${esc(objCat[x.row])}</small>` : ''}</button>`;
    const listHtml = objCatSel === 'All' && !f
      ? OBJ_CATS.map(([c, rows]) => `<div class="ogrp">${esc(c)}</div>` + rows.map(r => card(obj(r), false)).join('')).join('')
      : (items.length ? items.map(x => card(x, true)).join('') : '<div class="empty">No objections match. Try the main search above.</div>');
    const rel = (OBJ_FACTS[o.row] || []).map(fact).filter(Boolean);
    const showPolicy = ['Agreements', 'Cancellation', 'Pricing'].includes(objCat[o.row]);
    return `<div class="vhead"><div><div class="eyebrow">Quick objection handling</div><h1>What is the customer saying?</h1><p>Pick what the customer said to see the answer and the question to ask next. Adjust terms to the customer’s signed agreement.</p></div></div>
      <div class="row">${cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === objCatSel}">${esc(c)} (${c === 'All' ? D.obj.items.length : OBJ_CATS.find(x => x[0] === c)[1].length})</button>`).join('')}</div>
      <div class="objs">
        <div class="stack"><input class="filter" id="objf" type="search" placeholder="Filter objections, e.g. contract, color, roof" value="${esc(objFilter)}" aria-label="Filter objections">
          <div class="olist">${listHtml}</div></div>
        <div class="odetail"><section class="panel" id="objd">
          <div class="row"><span class="pill info">${esc(objCat[o.row])}</span><span class="src">${src('obj', o.row, 'Full objection library')}</span></div>
          <div><div class="secl">Customer says</div><div class="cust">“${esc(o.says)}”</div></div>
          ${sayBlock('Say this', o.answer, '', { big: true })}
          ${sayBlock('Then ask', o.next, '')}
          <div class="row">${copyBtn(() => rep(o.answer + ' ' + o.next), 'Copy response + question', 'primary')}</div>
          ${showPolicy ? ruleRow(D.obj.policy.replace(/^POLICY NOTE\s*•\s*/, 'Policy note: '), src('obj', 7)) : ''}
          ${rel.length ? `<div><div class="secl">Facts behind this answer</div>${rel.map(factRow).join('')}</div>` : ''}
        </section></div>
      </div>`;
  }

  /* ---------- Estimator ---------- */
  const ln = (kind, i, cells, delKind) => `<div class="ln ${kind}">${cells}<button type="button" class="x" data-del="${delKind || kind}.${i}" aria-label="Remove line">×</button></div>`;
  const inp = (path, val, ph, type) => `<input id="e-${path.replace(/\./g, '-')}" data-est="${path}" ${type === 'n' ? 'type="number" inputmode="decimal" min="0" step="any"' : 'type="text"'} value="${esc(val == null ? '' : val)}" placeholder="${esc(ph || '')}" aria-label="${esc(ph || path)}">`;
  function vEst() {
    const r = rateFor(est.term), comp = row => by(D.price.components, row);
    const tool = (title, rateTxt, srcHtml, hdr, rows, addBtn, note, subId) => `<section class="tool"><div class="th"><h3>${title}</h3><span class="rate">${rateTxt}</span></div>
      ${hdr}<div class="lines">${rows || '<span class="small muted">No lines yet.</span>'}</div>
      <div class="row">${addBtn}</div>${note ? `<div class="small muted">${note}</div>` : ''}
      <div class="sub" id="${subId}"></div><span class="src">${srcHtml}</span></section>`;
    const add = (kind, label) => `<button type="button" class="btn sm" data-addln="${kind}">+ ${label}</button>`;
    const quick = (kind, labels) => labels.map(l => `<button type="button" class="btn sm" data-addln="${kind}" data-label="${esc(l)}">+ ${esc(l)}</button>`).join('');
    const H = (kind, cols) => `<div class="ln ${kind} hd" aria-hidden="true">${cols.map(c => `<span>${c}</span>`).join('')}<span></span></div>`;
    const roofRows = est.roof.map((x, i) => ln('roof', i, inp(`roof.${i}.label`, x.label, 'Section (gutter, peak, garage…)') + inp(`roof.${i}.ft`, x.ft, 'Feet', 'n'))).join('');
    const bushRows = est.bush.map((x, i) => ln('bush', i, inp(`bush.${i}.label`, x.label, 'Bush or group') + inp(`bush.${i}.count`, x.count, 'Count', 'n') + inp(`bush.${i}.per`, x.per, 'Strands each', 'n'))).join('');
    const treeRows = est.tree.map((x, i) => ln('bush', i, inp(`tree.${i}.label`, x.label, 'Tree') + inp(`tree.${i}.count`, x.count, 'Count', 'n') + inp(`tree.${i}.per`, x.per, 'Strands each', 'n'), 'tree')).join('');
    const stakeRows = est.stake.map((x, i) => ln('stake', i, inp(`stake.${i}.label`, x.label, 'Border run') + inp(`stake.${i}.ft`, x.ft, 'Feet', 'n'))).join('');
    const wreathRows = est.wreath.map((x, i) => ln('wreath', i, `<select id="e-wreath-${i}-size" data-est="wreath.${i}.size" aria-label="Wreath size">${[24, 36, 48, 60].map(s => `<option value="${s}" ${+x.size === s ? 'selected' : ''}>${s} in</option>`).join('')}</select>` + inp(`wreath.${i}.qty`, x.qty, 'Qty', 'n') + inp(`wreath.${i}.rate`, x.rate, 'Manager-approved $ each', 'n'))).join('');
    const garRows = est.garland.map((x, i) => ln('garland', i, inp(`garland.${i}.label`, x.label, 'Location') + inp(`garland.${i}.qty`, x.qty, 'Qty', 'n') + `<select id="e-garland-${i}-unit" data-est="garland.${i}.unit" aria-label="Unit"><option value="ft" ${x.unit !== 'section' ? 'selected' : ''}>ft</option><option value="section" ${x.unit === 'section' ? 'selected' : ''}>sections</option></select>` + inp(`garland.${i}.rate`, x.rate, '$ rate', 'n'))).join('');
    const laborRows = est.labor.map((x, i) => ln('labor', i, inp(`labor.${i}.label`, x.label, 'Approved surcharge reason') + inp(`labor.${i}.amt`, x.amt, '$ amount', 'n'))).join('');
    return `<div class="vhead"><div><div class="eyebrow">Measuring &amp; pricing</div><h1>Estimate while the customer is on the phone</h1>
      <p>Enter verified measurements. Rates come from the playbook rate card and are <b>reference prices the owner must confirm</b> for the current season.</p></div>
      <div class="row"><button type="button" class="btn" data-estex>Load reference example</button><button type="button" class="btn" data-estclear>Clear for new customer</button></div></div>
      ${est.example ? `<div class="rule"><span class="ic">i</span><div>Example loaded: the ${esc(D.price.example.label)} from the price card (${esc(D.price.example.scope)} = ${esc(D.price.example.total)}). Clear it before quoting a real customer.<div class="src">${src('price', 19)}</div></div></div>` : ''}
      <div class="row" id="rates"><span class="secl">Agreement length</span><div class="termseg" role="group" aria-label="Agreement length">${D.price.rates.map(x => `<button type="button" data-term="${esc(x.term)}" aria-pressed="${x.term === est.term}">${esc(x.term)}</button>`).join('')}</div>
        <span class="pill warn">Reference rates · owner must confirm</span><span class="src">${src('price', r.row, 'Lighting rate card')}</span></div>
      ${ruleRow(D.fast.rateNote, src('fast', 20, 'Pricing reference'))}
      <div class="est"><div class="stack">
        <div class="tools">
          ${tool('Rooflines &amp; roof peaks', `$${r.roof} / linear ft`, src('price', 10) + ' · ' + src('measure', 5), H('roof', ['Section', 'Feet']), roofRows, add('roof', 'Section') + quick('roof', ['Front peak / gable', 'Garage edge', 'Dormer']), esc(meas(5).rule) + ' Add each segment once only.', 'sub-roof')}
          ${tool('Bushes', `$${r.mini} / mini strand`, src('price', 11) + ' · ' + src('measure', 6), H('bush', ['Bush / group', 'Count', 'Strands each']), bushRows, add('bush', 'Bush group'), esc(meas(6).rule), 'sub-bush')}
          ${tool('Trees', `$${r.mini} / mini strand`, src('price', 12) + ' · ' + src('measure', 7), H('bush', ['Tree', 'Count', 'Strands each']), treeRows, add('tree', 'Tree'), esc(meas(7).rule), 'sub-tree')}
          ${tool('Ground stakes', `$${r.stake} / linear ft`, src('price', 13) + ' · ' + src('measure', 8), H('stake', ['Border run', 'Feet']), stakeRows, quick('stake', ['Front walk', 'Left driveway edge', 'Right driveway edge', 'Flowerbed border']), esc(meas(8).rule), 'sub-stake')}
          ${tool('Wreaths', '<span class="need">No approved rate</span>', src('price', 14) + ' · ' + src('measure', 9), H('wreath', ['Size', 'Qty', 'Approved $ each']), wreathRows, add('wreath', 'Wreath'), `${esc(comp(14).example)}. ${esc(meas(9).rule)} Leave the rate blank unless a manager gave you one; blank lines stay out of the total.`, 'sub-wreath')}
          ${tool('Garland &amp; greenery', '<span class="need">No approved rate</span>', src('price', 15) + ' · ' + src('measure', 10), H('garland', ['Location', 'Qty', 'Unit', '$ rate']), garRows, add('garland', 'Garland run'), `${esc(comp(15).example)}. ${esc(meas(10).rule)}`, 'sub-garland')}
          ${tool('Other labor / access', '<span class="need">Approved surcharge only</span>', src('price', 16), H('labor', ['Reason', 'Amount']), laborRows, add('labor', 'Surcharge'), esc(comp(16).how) + '. ' + esc(comp(16).example) + '.', 'sub-labor')}
        </div>
        <section class="panel"><h3>Escalation flags <span class="small muted">Any checked flag keeps the quote preliminary.</span></h3>
          ${FLAGS_EST.map(([k, l, s]) => `<label class="chk"><input type="checkbox" id="fl-${k}" data-flag="${k}" ${est.flags[k] ? 'checked' : ''}><span>${esc(l)} <span class="src">${s}</span></span></label>`).join('')}</section>
        <section class="panel"><h3>Quote checkpoint · before saying a final total</h3>
          ${D.fast.checkpoint.map(c => `<label class="chk" id="ckl-${c.row}"><input type="checkbox" id="ck-${c.row}" data-check="${c.row}" ${est.checks[c.row] ? 'checked' : ''}><span><b>${esc(c.verify)}</b> — ${esc(c.why)} <span class="small muted">${esc(c.action)}</span> <span class="src">${src('fast', c.row)}</span></span></label>`).join('')}
          <details><summary>Photo / measurement checklist (${D.measure.checklist.length} items)</summary>
          ${D.measure.checklist.map((c, i) => `<label class="chk"><input type="checkbox" id="mc-${i}" data-mcheck="${i}" ${est.mchecks[i] ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}<span class="src">${src('measure', 16)}</span></details>
        </section>
        <section class="panel"><details><summary>How each component is priced (rate card)</summary><div class="tbl"><table><thead><tr><th>Component</th><th>Measurement / quantity</th><th>How to price</th><th>Example / check</th></tr></thead><tbody>
          ${D.price.components.map(c => `<tr><td><b>${esc(c.comp)}</b></td><td>${esc(c.qty)}</td><td>${esc(c.how)}</td><td>${esc(c.example)}</td></tr>`).join('')}</tbody></table></div>
          <div class="stack" style="margin-top:10px">${D.price.safety.map((t, i) => ruleRow(t, safetySrc(i))).join('')}</div></details></section>
      </div>
      <aside class="summary" aria-label="Estimate summary">
        <div id="estsum" class="stack"></div>
        <section class="panel"><h3>Verified on this call</h3>
          ${VERIFY.map(([k, l]) => `<label class="chk"><input type="checkbox" id="vf-${k}" data-verify="${k}" ${est.verify[k] ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}
          <span class="small muted">${esc(meas(12).rule)}</span><span class="src">${src('measure', 12)}</span></section>
        <section class="panel" id="estrange"><h3>Preliminary range</h3>
          <div class="fills"><label>Low $<input id="e-lo" data-estv="lo" type="number" inputmode="decimal" min="0" step="any" value="${esc(est.lo)}"></label><label>High $<input id="e-hi" data-estv="hi" type="number" inputmode="decimal" min="0" step="any" value="${esc(est.hi)}"></label></div>
          <span class="small muted">Fills the blanks in the script below. The playbook gives no formula for the range, so set it with your manager’s guidance.</span></section>
        <div id="estsay"></div>
        <div id="estcmp" class="stack"></div>
      </aside></div>`;
  }
  function estRecalc() {
    store.set('est', est);
    const sumEl = $('#estsum'); if (!sumEl) return;
    const c = estCalc(est), st = estStatus(c);
    const sub = (k, n, unit, rate) => `<span>${n} ${unit}</span><b>${money(n * rate)}</b>`;
    const subMan = k => {
      let p = 0, m = 0;
      est[k].forEach(x => { const q = k === 'labor' ? 1 : num(x.qty), rt = k === 'labor' ? num(x.amt) : num(x.rate); if (k === 'labor' ? (rt || (x.label || '').trim()) : q) { if (rt) p += q * rt; else m++; } });
      return (m ? `<span class="need">${m} line${m > 1 ? 's need' : ' needs'} a rate. Not in total.</span>` : '<span></span>') + `<b>${money(p)}</b>`;
    };
    const subs = { roof: sub('roof', c.roofFt, 'ft', c.r.roof), bush: sub('bush', c.bs, 'strands', c.r.mini), tree: sub('tree', c.ts, 'strands', c.r.mini), stake: sub('stake', c.sf, 'ft', c.r.stake), wreath: subMan('wreath'), garland: subMan('garland'), labor: subMan('labor') };
    Object.entries(subs).forEach(([k, h]) => { const el = $('#sub-' + k); if (el) el.innerHTML = h; });
    const dep = c.total * 0.5;
    sumEl.innerHTML = `<div class="tot"><span class="lbl">Estimated seasonal total · ${esc(est.term)}</span><span class="big">${money(c.total)}</span>
        <span class="small note">Before tax and approved changes. Tax rules are not in the playbook.</span>
        <div class="dep"><span>Deposit (standard 50%)</span><b>${money(dep)}</b><span>Balance, generally due on completed install</span><b>${money(c.total - dep)}</b></div></div>
      <section class="panel">${st.firm ? '<span class="pill ok">Ready for firm quote</span>' : '<span class="pill bad">Preliminary. Don’t call this a firm price</span>'}
        ${st.firm ? '<span class="small muted">Verified on this call, all checkpoints ticked, no escalation flags, and every line has a rate.</span>' : `<ul class="small" style="margin:0;padding-left:18px">${st.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`}
        <div class="items">${c.lines.map(l => `<span>${esc(l[0])}</span><span class="r">${money(l[1])}</span>`).join('') || '<span class="muted">No priced lines</span><span></span>'}</div>
        ${c.missing.length ? `<div class="need">Not in total (rate needed): ${esc(c.missing.join(', '))}</div>` : ''}
        <span class="src">Deposit: ${src('facts', 24)}</span></section>`;
    $('#estrange').hidden = st.firm;
    $('#estsay').innerHTML = st.firm ? sayBlock('Say this', firmSay(c.total), src('script', 15)) : sayBlock('Say this (preliminary)', prelimSay(), src('fast', 32));
    const cmp = D.price.rates.map(x => { const cc = estCalc(est, x.term); return `<tr class="${x.term === est.term ? 'on' : ''}"><td>${esc(x.term)}</td><td>${money(cc.total)}</td><td>${money(cc.total * 0.5)}</td></tr>`; }).join('');
    const recap = () => {
      const L = [`Edge Shines Christmas lighting estimate (${est.term} agreement)`];
      est.roof.filter(x => num(x.ft)).forEach(x => L.push(`  Roofline: ${x.label || 'section'} ${num(x.ft)} ft`));
      est.bush.filter(x => num(x.count)).forEach(x => L.push(`  Bushes: ${x.label || 'bushes'} ${num(x.count)} × ${num(x.per)} strands`));
      est.tree.filter(x => num(x.count)).forEach(x => L.push(`  Trees: ${x.label || 'trees'} ${num(x.count)} × ${num(x.per)} strands`));
      est.stake.filter(x => num(x.ft)).forEach(x => L.push(`  Ground stakes: ${x.label || 'run'} ${num(x.ft)} ft`));
      L.push('Pricing:'); c.lines.forEach(l => L.push(`  ${l[0]} = ${money(l[1])}`));
      if (c.missing.length) L.push('Not priced (rate needed): ' + c.missing.join('; '));
      L.push(`Seasonal total: ${money(c.total)} before tax/approved changes`);
      L.push(`Deposit (standard 50%, confirm agreement): ${money(dep)}`);
      L.push(`Status: ${st.firm ? 'Firm. Measurements, access and materials verified' : 'PRELIMINARY. ' + st.reasons.join('; ')}`);
      if (!st.firm && num(est.lo) && num(est.hi)) L.push(`Preliminary range given: ${money(Math.min(num(est.lo), num(est.hi)))}–${money(Math.max(num(est.lo), num(est.hi)))}`);
      L.push('Rates: reference rate card, owner confirmation required.');
      return L.join('\n');
    };
    $('#estcmp').innerHTML = `<section class="panel"><h3>Same scope, other terms</h3><table class="cmp"><thead><tr><th>Term</th><th>Seasonal</th><th>Deposit</th></tr></thead><tbody>${cmp}</tbody></table>
        <span class="small muted">Use when the customer asks what the approved agreement lengths look like. Confirm the 2- and 4-year options are available.</span></section>
      <div class="row">${copyBtn(recap, 'Copy quote recap for FLYRA', 'primary')}<button type="button" class="btn sm" data-go="flyra">FLYRA quoting →</button></div>`;
  }

  /* ---------- AI Mockups ---------- */
  function vMock() {
    const COLOR_CHIPS = ['classic warm white', 'multicolor pattern']; // wording from 02 CALL SCRIPT line 07
    const pcard = p => {
      const lab = p.label.split('\n'), use = p.use.split('\n'), sc = 'p' + p.row;
      const fields = placeholders(p.text).map((k, j) => {
        const key = sc + '|' + k, long = k.length > 40, v = fillVals[key] || '';
        return `<div class="fone"><label>${long ? 'Describe the exact changes' : 'Fill in ' + esc(k.toLowerCase())}
          ${long ? `<textarea id="f-${p.row}-${j}" data-fill="${esc(key)}" placeholder="${esc(k)}">${esc(v)}</textarea>` : `<input id="f-${p.row}-${j}" data-fill="${esc(key)}" placeholder="e.g. classic warm white" value="${esc(v)}">`}</label>
          ${!long && /COLOR/.test(k) ? `<div class="row">${COLOR_CHIPS.map(c => `<button type="button" class="chip sm" data-fillset="${esc(key)}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}</div>`;
      }).join('');
      return `<section class="panel" id="prompt-${p.row}"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">${esc(lab[0])}</div><h3>${esc(lab[1] || '')}</h3></div>
        <div class="row"><span class="pill info">${esc(use.join(' · '))}</span>${copyBtn(() => fillText(p.text, sc), 'Copy prompt', 'primary')}</div></div>
        <div class="fills">${fields}</div>
        <div class="prompt" data-tpl="mock:${p.row}">${fillHtml(p.text, sc)}</div>
        <span class="src">${src('mock', p.row, '3 copy-and-paste image prompts')}</span></section>`;
    };
    return `<div class="vhead"><div><div class="eyebrow">AI Christmas light mockups</div><h1>Three approved prompts</h1><p>${esc(D.mock.sub.replace(/ from the appropriate cell/i, ''))}</p></div></div>
      <section class="panel"><h3>Photo → prompt → quality check → send</h3><div>${D.mock.steps.map(s => `<div class="do" id="mock-${s.row}"><span class="n">${esc(s.step.split(/\s+/)[0])}</span><div class="t"><b>${esc(s.step.replace(/^\d+\s*/, ''))}</b> — ${esc(rep(s.do))}<div class="small muted">Rule: ${esc(s.rule)}</div><div class="src">${src('mock', s.row)}</div></div></div>`).join('')}</div></section>
      ${D.mock.prompts.map(pcard).join('')}
      ${ruleRow(D.mock.final, src('mock', 18), false, null, 'mockfinal')}`;
  }

  /* ---------- FLYRA ---------- */
  function fillFlyraFromEst() {
    const c = estCalc(est), st = estStatus(c);
    if (!c.total) { toast('The estimator has nothing priced yet.'); return; }
    const foot = [c.roofFt && `roofline ${c.roofFt} ft`, c.sf && `ground stakes ${c.sf} ft`, c.bs && `bushes ${c.bs} mini strands`, c.ts && `trees ${c.ts} mini strands`].filter(Boolean).join('; ');
    const kFoot = NOTE_KEYS.find(k => /footage/i.test(k)), kPrice = NOTE_KEYS.find(k => /price/i.test(k)), kAreas = NOTE_KEYS.find(k => /design areas/i.test(k));
    if (kFoot && foot) flyraNotes[kFoot] = foot.charAt(0).toUpperCase() + foot.slice(1) + (est.verify.meas ? ' (verified)' : ' (estimated, not yet verified)');
    if (kPrice) flyraNotes[kPrice] = `${money(c.total)} per season, ${est.term} (${st.firm ? 'firm quote' : 'preliminary estimate'})` + (c.missing.length ? '; not priced: ' + c.missing.join(', ') : '') + '; reference rate card, owner confirmation required';
    if (kAreas && !String(flyraNotes[kAreas] || '').trim()) { const s = scopeText(); if (s) flyraNotes[kAreas] = 'Color: ___; areas: ' + s; }
    store.set('flyraNotes', flyraNotes);
    const y = window.scrollY; render(); window.scrollTo(0, y);
    toast('Filled from the estimator. Review before saving in FLYRA.');
  }
  function vFlyra() {
    const P = D.flyra.pipeline;
    const wf = WF.map(([n, rows], i) => { const done = rows.every(r => flyraChk.includes(r)); return (i ? '<span class="arrow" aria-hidden="true">→</span>' : '') + `<button type="button" class="wfb ${done ? 'done' : ''}" data-phase="${i}" aria-pressed="${flyraPhase === i}">${done ? '✓ ' : ''}${esc(n)}<span class="c">${rows.length > 1 ? fl(rows[0]).n + '–' + fl(rows[rows.length - 1]).n : fl(rows[0]).n}</span></button>`; }).join('');
    const inPhase = r => flyraPhase == null || WF[flyraPhase][1].includes(r);
    const steps = D.flyra.steps.map(s => `<label class="fstep ${inPhase(s.row) ? '' : 'dim'}" id="flyra-${s.row}"><input type="checkbox" data-fchk="${s.row}" ${flyraChk.includes(s.row) ? 'checked' : ''}><span class="n">${esc(s.n)}</span><span><b>${esc(s.action)}</b><br>${esc(s.detail)}<br><span class="r">Result: ${esc(s.result)}</span> <span class="src">${src('flyra', s.row)}</span></span></label>`).join('');
    const noteBuilder = () => NOTE_KEYS.map(k => `${k}: ${String(flyraNotes[k] || '').trim() || '—'}`).join('\n');
    return `<div class="vhead"><div><div class="eyebrow">FLYRA CRM</div><h1>Lead → Customer → Subscription → Quote</h1><p>${esc(D.flyra.sub)} Do this after qualifying a customer who needs a quote.</p></div>
      <button type="button" class="btn" data-freset>Start new customer</button></div>
      <section class="panel"><h3>Required quoting workflow</h3><div class="wf">${wf}</div><span class="small muted">Tap a stage to focus its steps. Tick steps as you finish them.</span></section>
      <div class="cols">
        <section class="panel"><h3>When a lead needs a quote · follow these steps</h3><div>${steps}</div></section>
        <div class="stack">
          <section class="panel" id="fnotes"><h3>Minimum required FLYRA notes</h3><div class="notes">${NOTE_KEYS.map((k, i) => `<div class="fills"><label>${esc(k)}<textarea id="fn-${i}" data-fnote="${esc(k)}" rows="2">${esc(flyraNotes[k] || '')}</textarea></label></div>`).join('')}</div>
            <div class="row">${copyBtn(noteBuilder, 'Copy notes for FLYRA', 'primary')}<button type="button" class="btn sm" data-fnfill>Fill footage &amp; price from estimator</button></div><span class="src">${src('flyra', 20)}</span></section>
          <section class="panel" id="pipeline"><h3>Pipeline language</h3><div class="tbl"><table style="min-width:0"><thead><tr><th>Stage</th><th>Path</th><th>Rule</th></tr></thead><tbody>
            <tr><td><b>Before contact</b></td><td>${esc(P.before)}</td><td>${esc(P.rbefore)}</td></tr>
            <tr><td><b>During sales</b></td><td>${esc(P.during)}</td><td>${esc(P.rduring)}</td></tr>
            <tr><td><b>After decision</b></td><td>${esc(P.after)}</td><td>${esc(P.rafter)}</td></tr></tbody></table></div><span class="src">${src('flyra', 24, 'Match to your account')}</span></section>
          <section class="panel" id="sixfacts"><h3>Every call ends with 6 FLYRA facts</h3>${D.sop.facts.map((f, i) => `<div class="do"><span class="n">${i + 1}</span><div class="t">${esc(f)}</div></div>`).join('')}<span class="src">${src('sop', 29)}</span></section>
        </div></div>`;
  }

  /* ---------- Texts ---------- */
  function vTexts() {
    return `<div class="vhead"><div><div class="eyebrow">Customer text templates</div><h1>Copy, personalize, send through FLYRA</h1><p>${esc(D.texts.sub)}</p></div>
      <div class="fills" style="min-width:240px"><label>Customer first name<input id="g-name" data-fill="g|NAME" value="${esc(fillVals['g|NAME'] || '')}" placeholder="Fills [NAME] in every text"></label></div></div>
      <div class="grid2">${D.texts.items.map(t => {
        const phs = placeholders(t.text).filter(k => k !== 'NAME'), sc = 't' + t.row;
        return `<section class="panel" id="text-${t.row}"><h3>${esc(t.situation)}</h3>
          ${phs.length ? `<div class="fills">${phs.map((k, j) => `<div class="fone"><label>${esc(k.toLowerCase())}<input id="tf-${t.row}-${j}" data-fill="${esc(sc + '|' + k)}" value="${esc(fillVals[sc + '|' + k] || '')}"></label>${EST_FILL[k] ? `<div><button type="button" class="lnk" data-fillest="${esc(sc + '|' + k)}">Use the estimator’s ${k === 'PRICE' ? 'total' : 'scope'}</button></div>` : ''}</div>`).join('')}</div>` : ''}
          <div class="prompt" data-tpl="text:${t.row}">${fillHtml(t.text, sc)}</div>
          <div class="row" style="justify-content:space-between"><span class="small muted">${esc(t.when)}</span>${copyBtn(() => fillText(rep(t.text), sc), 'Copy text', 'primary')}</div>
          <span class="src">${src('texts', t.row)}</span></section>`;
      }).join('')}</div>
      <section class="panel" id="textstd"><h3>Message standards</h3>${D.texts.standards.map(s => ruleRow(s, src('texts', 19), true)).join('')}</section>`;
  }

  /* ---------- Service facts ---------- */
  function vFacts() {
    const f = factFilter.trim(), ft = new Set(tokens(f));
    const items = D.facts.items.filter(x => !f || tokens(x.topic + ' ' + x.say + ' ' + x.check).some(t => ft.has(t)) || norm(x.topic + ' ' + x.say).includes(norm(f)));
    return `<div class="vhead"><div><div class="eyebrow">Service &amp; product knowledge</div><h1>Quick answers about what customers buy</h1><p>${esc(D.facts.sub)}</p></div>
      <input class="filter" id="factf" type="search" placeholder="Filter, e.g. timer, storage, colors" value="${esc(factFilter)}" aria-label="Filter service facts" style="max-width:340px"></div>
      <div class="grid2">${items.map(x => `<section class="panel" id="fact-${x.row}"><div class="row" style="justify-content:space-between"><h3>${esc(x.topic)}</h3>${copyBtn(x.say)}</div><p>${esc(x.say)}</p>${ruleRow('Check: ' + x.check, src('facts', x.row))}</section>`).join('') || '<div class="empty">No facts match.</div>'}</div>`;
  }

  /* ---------- Full playbook: every tab, expandable ---------- */
  function vPlaybook() {
    const open = store.get('pbOpen', {});
    const sec = (id, tab, sub, body) => `<details class="pbsec" id="${id}" ${open[id] ? 'open' : ''}><summary><span class="tab">${esc(tab)}</span><span class="small muted">${sub}</span></summary><div class="pbbody">${body}</div></details>`;
    const tbl = (heads, rows) => `<div class="tbl"><table><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    const tr = (id, cells) => `<tr${id ? ` id="${id}"` : ''}>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    const link = (text, v, label) => `<div class="row" style="justify-content:space-between"><span>${text}</span><button type="button" class="btn primary" data-go="${v}">${esc(label)} →</button></div>`;
    const P = D.price;
    return `<div class="vhead"><div><div class="eyebrow">Reference</div><h1>The full playbook, tab by tab</h1><p>Every row of every worksheet. Expand a tab to read it in full. The workbook’s 00 SEARCH tab is replaced by the search bar at the top of this page.</p></div>
      <div class="row"><button type="button" class="btn" data-pball="1">Expand all</button><button type="button" class="btn" data-pball="0">Collapse all</button></div></div>
      <div class="stack">
      ${sec('pb-01', D.sop.sheet, '12-step sales flow, fast decision rules, 6 FLYRA facts', `<p class="muted">${esc(D.sop.sub)}</p>
        <h4>The sales flow · 12 steps</h4>${tbl(['#', 'Stage', 'What the rep must do', 'FLYRA / result'], D.sop.steps.map(s => tr('pb-sop-' + s.row, [esc(s.n), `<b>${esc(s.stage)}</b>`, esc(rep(s.do)), esc(s.result)])))}
        <h4>Fast decision rules · do this instead of calling back to measure</h4>${tbl(['', 'Case', 'How to handle', 'Customer expectation'], D.sop.rules.map(s => tr('pb-sop-' + s.row, [esc(s.icon), `<b>${esc(s.case)}</b>`, esc(s.how), esc(s.expect)])))}
        <h4>Every call ends with 6 FLYRA facts</h4><ol class="olist2">${D.sop.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ol><span class="src">${src('sop', 29)}</span>`)}
      ${sec('pb-02', D.script.sheet, `${D.script.lines.length} script lines from first hello to closing`, `<p class="muted">${esc(D.script.sub)}</p>
        ${D.script.lines.map(l => sayBlock(l.n + ' · ' + l.when, l.say, src('script', l.row), { id: 'pb-script-' + l.row, after: 'Action / listen for: ' + esc(l.action) })).join('')}
        <h4>Never promise these without checking</h4>${D.script.never.map(n => ruleRow(n, src('script', 25))).join('')}`)}
      ${sec('pb-03', D.fast.sheet, '8-minute quoting routine, pricing reference, quote checkpoint', `<p class="muted">${esc(D.fast.sub)}</p>
        <h4>The 8-minute remote quoting routine</h4>${tbl(['#', 'Action', 'How to do it', 'When to stop'], D.fast.routine.map(s => tr('pb-fast-' + s.row, [esc(s.n), `<b>${esc(s.action)}</b>`, esc(s.how), esc(s.stop)])))}
        <h4 id="pb-fast-17">Pricing reference · owner must confirm current season</h4>${tbl(['Term', 'Roofline C9', 'Mini light strand', 'Ground stakes'], D.fast.rates.map(s => tr('', [`<b>${esc(s.term)}</b>`, esc(s.roof), esc(s.mini), esc(s.stake)])))}
        <div id="pb-fast-20">${ruleRow(D.fast.rateNote, src('fast', 20))}</div>
        <h4>Quote checkpoint · before saying a final total</h4>${tbl(['Verify', 'Why it matters', 'Seller action'], D.fast.checkpoint.map(s => tr('pb-fast-' + s.row, [`<b>${esc(s.verify)}</b>`, esc(s.why), esc(s.action)])))}
        <h4>What to say if you can’t verify the roof on the call</h4>${sayBlock('Say this', unq(D.fast.cantVerify), src('fast', 32), { id: 'pb-fast-32' })}`)}
      ${sec('pb-04', D.facts.sheet, 'Lights, colors, installation, deposit and agreement facts', link(`${D.facts.items.length} quick answers, each with its check or limitation.`, 'facts', 'Open service facts'))}
      ${sec('pb-05', D.obj.sheet, 'Customer objections and recommended answers', link(`${D.obj.items.length} objections with recommended answers and follow-up questions.`, 'objections', 'Open objections'))}
      ${sec('pb-06', D.mock.sheet, 'Photo → prompt → quality check → send, and the 3 prompts', link('The 5-step mockup routine and the three approved prompts, with fill-in fields.', 'mockups', 'Open AI mockup prompts'))}
      ${sec('pb-07', D.flyra.sheet, 'Lead → Customer → Subscription', link(`${D.flyra.steps.length} FLYRA steps, the minimum notes and the pipeline language.`, 'flyra', 'Open FLYRA quoting'))}
      ${sec('pb-08', D.texts.sheet, 'Copy-ready customer texts', link(`${D.texts.items.length} ready-to-send texts and the message standards.`, 'texts', 'Open text templates'))}
      ${sec('pb-09', D.measure.sheet, 'Measure every area during the first call', `<p class="muted">${esc(D.measure.sub)}</p>
        ${tbl(['#', 'Area', 'What to measure', 'Quick rule / escalate when'], D.measure.steps.map(s => tr('pb-measure-' + s.row, [esc(s.n), `<b>${esc(s.area)}</b>`, esc(rep(s.measure)), esc(s.rule)])))}
        <h4 id="pb-measure-16">Photo / measurement checklist</h4><ul class="olist2">${D.measure.checklist.map(c => `<li>${esc(c)}</li>`).join('')}</ul><span class="src">${src('measure', 16)}</span>
        <h4>What to say to the customer</h4>${sayBlock('Script', unq(D.measure.script), src('measure', 21), { id: 'pb-measure-21' })}`)}
      ${sec('pb-10', P.sheet, 'Rate card, component pricing, example job, scoping questions, safety rules', `<p class="muted">${esc(P.sub)}</p>
        <h4 id="pb-price-3">Lighting rate card</h4>${tbl(['Agreement', 'Roofline C9 / ft', 'Mini lights / strand', 'Ground stakes / ft'], P.rates.map(s => tr('', [`<b>${esc(s.term)}</b>`, '$' + esc(s.roof), '$' + esc(s.mini), '$' + esc(s.stake)])))}
        <h4>Measure &amp; price each component</h4>${tbl(['Component', 'Measurement / quantity', 'How to price', 'Rep example / check'], P.components.map(c => tr('pb-price-' + c.row, [`<b>${esc(c.comp)}</b>`, esc(c.qty), esc(c.how), esc(c.example)])))}
        <h4 id="pb-price-19">Shorthand calculation · example only</h4>${tbl(['Job', 'Scope', 'Calculation', 'Total'], [tr('', [esc(P.example.label), esc(P.example.scope), esc(P.example.calc), `<b>${esc(P.example.total)}</b>`])])}
        <h4>Fast scoping questions</h4><ol class="olist2">${P.scoping.map(q => `<li id="pb-price-${q.row}">${esc(unq(q.q))}</li>`).join('')}</ol>
        <h4 id="pb-price-29">Quote safety rules</h4>${P.safety.map((t, i) => ruleRow(t, safetySrc(i))).join('')}`)}
      </div>`;
  }

  /* ---------- Review flags ---------- */
  function vReview() {
    const cls = { 'Missing rate': 'bad', 'Missing policy': 'bad', 'Needs confirmation': 'warn', 'Unclear wording': 'info' };
    return `<div class="vhead"><div><div class="eyebrow">For management</div><h1>Items to review in the playbook</h1><p>Gaps and inconsistencies found in the workbook. The assistant does not fill them in. Reps should check with a manager when one comes up. Search finds these too.</p></div></div>
      <div class="stack">${FLAGS.map((f, i) => `<section class="panel" id="flag-${i}"><div class="row"><span class="pill ${cls[f[0]]}">${esc(f[0])}</span><h3>${esc(f[1])}</h3></div><p>${esc(f[2])}</p><span class="src">Source: ${esc(f[3])}</span></section>`).join('')}</div>`;
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  const sugg = $('#sugg'), qIn = $('#q');
  let suggSup = false, qT, rT;
  function suggHtml() {
    const rec = store.get('recent', []);
    return `${rec.length ? `<div class="sg"><div class="secl">Recent <button type="button" class="lnk" data-recentclear>Clear</button></div>${rec.map(r => `<button type="button" class="srow" data-q="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
      <div class="sg"><div class="secl">Common questions</div><div class="row">${SUGGEST.map(s => `<button type="button" class="chip sm" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
  }
  function showSugg(on) { if (on) sugg.innerHTML = suggHtml(); sugg.hidden = !on; }
  qIn.addEventListener('focus', () => { if (!query.trim() && !suggSup) showSugg(true); });
  qIn.addEventListener('pointerdown', () => { suggSup = false; if (!query.trim()) showSugg(true); });
  qIn.addEventListener('blur', () => setTimeout(() => { if (!sugg.contains(document.activeElement) && document.activeElement !== qIn) showSugg(false); }, 150));
  sugg.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  sugg.addEventListener('focusout', () => setTimeout(() => { if (!sugg.contains(document.activeElement) && document.activeElement !== qIn) showSugg(false); }, 150));
  function setQuery(v) { query = v; qIn.value = v; syncClear(); showSugg(false); render(); window.scrollTo(0, 0); if (v) qIn.focus(); }
  function syncClear() { $('#qclear').hidden = !query; $('#qkbd').hidden = !!query; }
  $('#qform').addEventListener('submit', e => { e.preventDefault(); clearTimeout(qT); if (query.trim()) { addRecent(query); render(); showSugg(false); qIn.blur(); } });

  document.addEventListener('click', e => {
    const t = e.target.closest('button,[data-go],[data-q]'); if (!t) return;
    const d = t.dataset;
    if (d.copy) { if (query && t.closest('.res')) addRecent(query); doCopy(t); return; }
    if (d.view) { go(d.view); return; }
    if (d.go) { go(d.go, d.step != null ? { step: +d.step } : {}); return; }
    if (d.q) { setQuery(d.q); return; }
    if ('clear' in d) { setQuery(''); qIn.focus(); return; }
    if (d.goto != null) { const en = IDX[+d.goto]; if (en) { if (query) addRecent(query); go(en.go.view, en.go); } return; }
    if ('ask' in d) { askClaude(); return; }
    if ('askstop' in d) { if (aiCtl) aiCtl.abort(); aiCtl = null; ai = { q: '', status: 'idle' }; paintAi(); return; }
    if ('recentclear' in d) { store.set('recent', []); showSugg(true); return; }
    if (d.size) { setSize(d.size); return; }
    if (d.flyraphase != null) { go('flyra', { phase: +d.flyraphase }); return; }
    if (d.step != null && t.classList.contains('stp')) { flowStep = +d.step; store.set('step', flowStep); render(); return; }
    if (d.stepnav) {
      const dir = +d.stepnav;
      if (dir > 0 && !flowDone.includes(flowStep)) flowDone.push(flowStep);
      if (dir > 0 && flowStep === 11) toast('Call complete. Make sure the 6 FLYRA facts are recorded.');
      flowStep = Math.max(0, Math.min(11, flowStep + dir));
      store.set('step', flowStep); store.set('done', flowDone); render(); window.scrollTo(0, 0); return;
    }
    if ('flowreset' in d) { flowStep = 0; flowDone = []; store.set('step', 0); store.set('done', []); render(); return; }
    if (d.objgo) { go('objections', { obj: +d.objgo }); return; }
    if (d.obj) { objSel = +d.obj; render(); if (window.innerWidth <= 980) $('#objd').scrollIntoView({ block: 'start' }); return; }
    if (d.cat) { objCatSel = d.cat; const first = D.obj.items.find(o => d.cat === 'All' || objCat[o.row] === d.cat); if (first && d.cat !== 'All') objSel = first.row; render(); return; }
    if (d.term) { est.term = d.term; render(); return; }
    if (d.addln) {
      const k = d.addln, L = d.label || '';
      const blank = { roof: { label: L, ft: '' }, bush: { label: L, count: '', per: 5 }, tree: { label: L, count: '', per: 10 }, stake: { label: L, ft: '' }, wreath: { size: 36, qty: '', rate: '' }, garland: { label: L, qty: '', unit: 'ft', rate: '' }, labor: { label: L, amt: '' } }[k];
      est[k].push(blank); est.example = false; render();
      requestAnimationFrame(() => { const ins = $$(`[data-est^="${k}.${est[k].length - 1}."]`); const el = ins.find(x => x.tagName === 'INPUT' && !x.value) || ins[0]; if (el) el.focus(); });
      return;
    }
    if (d.del) { const [k, i] = d.del.split('.'); est[k].splice(+i, 1); render(); return; }
    if ('estex' in d) { est = EST_DEFAULT(); render(); toast('Reference example loaded'); return; }
    if ('estclear' in d) { est = EST_EMPTY(); render(); toast('Cleared. Ready for a new customer.'); return; }
    if (d.phase != null) { flyraPhase = flyraPhase === +d.phase ? null : +d.phase; render(); return; }
    if ('freset' in d) { flyraChk = []; flyraNotes = {}; flyraPhase = null; store.set('flyraChk', []); store.set('flyraNotes', {}); render(); toast('FLYRA checklist and notes cleared'); return; }
    if ('fnfill' in d) { fillFlyraFromEst(); return; }
    if (d.fillset) { setFill(d.fillset, d.val || ''); return; }
    if (d.fillest) { const k = d.fillest.slice(d.fillest.indexOf('|') + 1), v = EST_FILL[k] ? EST_FILL[k]() : ''; if (!v) toast('The estimator has nothing priced yet.'); else { setFill(d.fillest, v); toast('Filled from the estimator'); } return; }
    if (d.pball != null) { const o = {}; $$('details.pbsec').forEach(x => { x.open = d.pball === '1'; o[x.id] = x.open; }); store.set('pbOpen', o); return; }
  });

  document.addEventListener('input', e => {
    const t = e.target, d = t.dataset;
    if (t === qIn) {
      query = t.value; syncClear(); suggSup = false;
      showSugg(!query.trim() && document.activeElement === t);
      if (aiCtl && ai.q !== query.trim()) { aiCtl.abort(); aiCtl = null; ai = { q: '', status: 'idle' }; }
      clearTimeout(qT); qT = setTimeout(() => render(), 70); return;
    }
    if ('rep' in d) { repName = t.value.trim(); store.set('rep', repName); $$('[data-rep]').forEach(i => { if (i !== t) i.value = t.value; }); clearTimeout(rT); rT = setTimeout(rerenderKeepFocus, 250); return; }
    if (d.est) { const [k, i, f] = d.est.split('.'); if (est[k] && est[k][+i]) { est[k][+i][f] = t.value; est.example = false; estRecalc(); } return; }
    if (d.estv) { est[d.estv] = t.value; estRecalc(); return; }
    if (d.fill) { setFill(d.fill, t.value); return; }
    if (d.fnote) { flyraNotes[d.fnote] = t.value; store.set('flyraNotes', flyraNotes); return; }
    if (t.id === 'objf') { objFilter = t.value; rerenderKeepFocus(); return; }
    if (t.id === 'factf') { factFilter = t.value; rerenderKeepFocus(); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target, d = t.dataset;
    if (d.flag) { est.flags[d.flag] = t.checked; estRecalc(); return; }
    if (d.check) { est.checks[d.check] = t.checked; estRecalc(); return; }
    if (d.verify) { est.verify[d.verify] = t.checked; estRecalc(); return; }
    if (d.mcheck != null) { est.mchecks[d.mcheck] = t.checked; store.set('est', est); return; }
    if (d.est && t.tagName === 'SELECT') { const [k, i, f] = d.est.split('.'); if (est[k] && est[k][+i]) { est[k][+i][f] = t.value; estRecalc(); } return; }
    if (d.fchk) { const r = +d.fchk; flyraChk = t.checked ? flyraChk.concat(r) : flyraChk.filter(x => x !== r); store.set('flyraChk', flyraChk); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  });
  document.addEventListener('toggle', e => { const x = e.target; if (x && x.classList && x.classList.contains('pbsec')) { const o = store.get('pbOpen', {}); o[x.id] = x.open; store.set('pbOpen', o); } }, true);
  document.addEventListener('keydown', e => {
    const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); qIn.focus(); qIn.select(); return; }
    if (a === qIn) {
      if (e.key === 'Escape') { if (!sugg.hidden) { showSugg(false); suggSup = true; } else if (query) setQuery(''); return; }
      if (e.key === 'ArrowDown') { const first = !sugg.hidden ? sugg.querySelector('button') : $('#main .res button, #main .aiask button'); if (first) { e.preventDefault(); first.focus(); } }
      return;
    }
    if (e.key === 'Escape' && sugg.contains(a)) { showSugg(false); suggSup = true; qIn.focus(); }
  });
  function rerenderKeepFocus() {
    const a = document.activeElement, id = a && a.id, s = a && a.selectionStart, y = window.scrollY;
    render(); window.scrollTo(0, y);
    if (id) { const el = document.getElementById(id); if (el) { el.focus(); try { if (s != null) el.setSelectionRange(s, s); } catch (x) { /* not a text field */ } } }
  }

  /* ---------- Boot ---------- */
  setSize(store.get('size', 'std'));
  syncClear();
  render();
  setHH();
  window.addEventListener('resize', setHH);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHH);

  // Optional runtime capabilities. The page works fully without them.
  const cl = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
  if (cl) {
    cl.use('sample').then(s => { if (s) { sampleFn = s; if (query) paintAi(); } }, () => {});
    cl.use('user').then(u => u ? u.me() : null).then(me => {
      const first = String((me && me.name) || '').trim().split(/\s+/)[0] || '';
      if (first) { autoName = first; syncRep(); if (!repName) rerenderKeepFocus(); }
    }, () => {});
  }
})();
