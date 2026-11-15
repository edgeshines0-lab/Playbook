// Small shared helpers.
export const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
export const int = v => Math.max(0, Math.floor(num(v)));
export const round2 = n => Math.round(n * 100) / 100;
export const money = n => {
  const c = Math.round((Number(n) || 0) * 100);
  return (c < 0 ? '−$' : '$') + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
};
export const uid = (p = 'q') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const fmtDate = iso => { if (!iso) return ''; const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
export const fmtDateTime = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
export const clone = o => JSON.parse(JSON.stringify(o));
export const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
export const joinList = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
export const unq = s => String(s || '').replace(/^\s*[“"]/, '').replace(/[”"]\s*$/, '');
export const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
// Keep only digits and one decimal point: blocks negative and junk input in number fields.
export const cleanNum = v => { let s = String(v ?? '').replace(/[^0-9.]/g, ''); const i = s.indexOf('.'); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ''); return s; };
// Roof pitch (rise per 12 in of run) to true-length factor for a rake edge traced in plan view.
export const pitchFactor = p => { const r = num(p); return r ? Math.sqrt(1 + (r / 12) ** 2) : 1; };
