// Persistence. Shared artifact database (db capability) when available; this device (localStorage + IndexedDB) otherwise.
import { normSettings } from './pricing.js';
import { clone } from './util.js';

const R = () => window.React;
const subs = new Set();
export const caps = {
  db: null, user: null, sample: null, downloads: null,
  me: { id: null, name: '', isOwner: false, canEdit: false, canWrite: null },
  ready: { db: false, user: false }, readOnly: false, settingsReadOnly: false, writeError: ''
};
export const emit = () => subs.forEach(f => f());
export function useCaps() {
  const [, set] = R().useState(0);
  R().useEffect(() => { const f = () => set(x => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return caps;
}
export function initCaps() {
  const cl = window.claude && typeof window.claude.use === 'function' ? window.claude : null;
  if (!cl) { caps.ready.db = caps.ready.user = true; emit(); return; }
  cl.use('db').then(db => { caps.db = db || null; caps.ready.db = true; emit(); }, () => { caps.ready.db = true; emit(); });
  cl.use('user').then(async u => {
    caps.user = u || null;
    if (u) {
      try {
        const me = await u.me();
        caps.me = { id: me.id || null, name: me.name || '', isOwner: !!me.isOwner, canEdit: !!me.canEdit, canWrite: null };
        caps.me.canWrite = await u.can('data.write');
      } catch (e) { /* identity unavailable */ }
    }
    caps.ready.user = true; emit();
  }, () => { caps.ready.user = true; emit(); });
  cl.use('sample').then(s => { caps.sample = s || null; emit(); }, () => {});
  cl.use('downloads').then(d => { caps.downloads = d || null; emit(); }, () => {});
}
export const sharedMode = () => !!caps.db && !caps.readOnly;
export const canEditSettings = () => !caps.db || caps.me.isOwner || caps.me.canEdit || (!caps.user && !caps.settingsReadOnly);

/* ---------- Device storage ---------- */
export const LS = {
  get(k, d) { try { const v = localStorage.getItem('ess-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ess-' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const localSubs = new Set();
const localEmit = () => localSubs.forEach(f => f());
function saveLocal(lead) { const all = LS.get('leads', {}); all[lead.id] = lead; LS.set('leads', all); localEmit(); }
function deleteLocal(id) { const all = LS.get('leads', {}); if (all[id]) { delete all[id]; LS.set('leads', all); localEmit(); } }

/* ---------- Leads ---------- */
export function useLeads() {
  const c = useCaps();
  const React = R();
  const [shared, setShared] = React.useState(null);
  const [local, setLocal] = React.useState(() => LS.get('leads', {}));
  const [state, setState] = React.useState('loading');
  React.useEffect(() => { const f = () => setLocal(LS.get('leads', {})); localSubs.add(f); return () => { localSubs.delete(f); }; }, []);
  React.useEffect(() => {
    if (!c.ready.db) return undefined;
    if (!c.db) { setState('local'); return undefined; }
    let live = true;
    const t = setTimeout(() => { if (live) setState(s => (s === 'loading' ? 'slow' : s)); }, 10000);
    const unsub = c.db.collection('leads').onSnapshot(snap => {
      if (!snap.metadata.fromCache) clearTimeout(t);
      setShared(snap.docs.map(d => Object.assign({}, d.data(), { id: d.id })));
      setState('shared');
    }, () => { clearTimeout(t); setState('error'); });
    return () => { live = false; clearTimeout(t); unsub(); };
  }, [c.ready.db, !!c.db]);
  const leads = React.useMemo(() => {
    const map = new Map();
    (shared || []).forEach(l => map.set(l.id, l));
    Object.values(local).forEach(l => {
      const s = map.get(l.id);
      if (!s || (l.updatedAt || '') > (s.updatedAt || '')) map.set(l.id, Object.assign({}, l, { _device: !s || caps.readOnly }));
    });
    return [...map.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [shared, local]);
  return { leads, state };
}

const queue = new Map();
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function saveLead(lead) {
  const data = clone(lead); delete data._device;
  saveLocal(data); // device copy: protects unfinished quotes and covers offline use
  if (!caps.db || caps.readOnly) return;
  const st = queue.get(data.id) || { busy: false, next: null };
  st.next = data; queue.set(data.id, st);
  if (st.busy) return;
  st.busy = true;
  (async () => {
    let tries = 0;
    while (st.next) {
      const d = st.next; st.next = null;
      try { await caps.db.collection('leads').doc(d.id).set(d); tries = 0; }
      catch (e) {
        const code = e && e.code;
        if (code === 'invalid_argument' || code === 'not_granted' || code === 'revoked') { caps.readOnly = true; caps.writeError = 'You can view shared quotes but not save to them. Your quotes are saved on this device. Ask the owner for Contributor access.'; emit(); break; }
        if (code === 'quota_exceeded') { caps.writeError = 'The shared quote storage is full. Export a backup and delete old quotes.'; emit(); break; }
        if (++tries < 3) { await sleep(600 + Math.random() * 900); st.next = st.next || d; }
      }
    }
    st.busy = false;
  })();
}
export async function deleteLead(id) {
  deleteLocal(id);
  if (caps.db && !caps.readOnly) { try { await caps.db.collection('leads').doc(id).delete(); } catch (e) { /* surfaced by the listener */ } }
}

/* ---------- Settings (owner) ---------- */
let lastSettingsEdit = 0;
export const markSettingsEdited = () => { lastSettingsEdit = Date.now(); };
export function useSettings() {
  const c = useCaps();
  const React = R();
  const [s, setS] = React.useState(() => normSettings(LS.get('settings', null)));
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!c.ready.db) return undefined;
    if (!c.db) { setLoaded(true); return undefined; }
    const unsub = c.db.doc('config/settings').onSnapshot(snap => {
      if (Date.now() - lastSettingsEdit < 2500) { if (!snap.metadata.fromCache) setLoaded(true); return; } // don't overwrite what the owner is typing
      setS(normSettings(snap.exists ? snap.data() : null));
      if (snap.exists) LS.set('settings', snap.data());
      if (!snap.metadata.fromCache) setLoaded(true);
    }, () => setLoaded(true));
    return () => unsub();
  }, [c.ready.db, !!c.db]);
  return [s, setS, loaded];
}
let settingsBusy = false, settingsNext = null;
export function saveSettings(s) {
  const data = clone(s);
  if (!caps.db) { LS.set('settings', data); return; }
  settingsNext = data;
  if (settingsBusy) return;
  settingsBusy = true;
  (async () => {
    while (settingsNext) {
      const d = settingsNext; settingsNext = null;
      try { await caps.db.doc('config/settings').set(d); }
      catch (e) { if (e && e.code === 'invalid_argument') { caps.settingsReadOnly = true; emit(); break; } }
    }
    settingsBusy = false;
  })();
}

/* ---------- Images (this device only) ---------- */
let idbP = null;
// Some browsers (and file:// pages) never answer IndexedDB; never let the app wait on it.
const within = (p, ms, fallback) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), ms))]).catch(() => fallback);
const idbOpen = () => idbP || (idbP = new Promise((res, rej) => {
  try { const r = indexedDB.open('es-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('images'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); }
  catch (e) { rej(e); }
}));
const mem = new Map();
export const images = {
  async get(k) {
    if (mem.has(k)) return mem.get(k);
    return within((async () => { const db = await idbOpen(); return await new Promise((res, rej) => { const t = db.transaction('images').objectStore('images').get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => rej(t.error); }); })(), 2000, null);
  },
  async put(k, blob) {
    mem.set(k, blob);
    await within((async () => { const db = await idbOpen(); await new Promise((res, rej) => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').put(blob, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); })(), 2000, null);
  },
  async del(k) {
    mem.delete(k);
    await within((async () => { const db = await idbOpen(); await new Promise(res => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').delete(k); tx.oncomplete = res; tx.onerror = res; }); })(), 2000, null);
  }
};
// Downscale an image file to a JPEG blob no larger than maxPx on its long side.
export function shrinkImage(file, maxPx) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      cv.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not an image this browser can open.')); };
    img.src = url;
  });
}

/* ---------- Files out ---------- */
export async function saveFile(filename, data) {
  if (!caps.downloads) throw { code: 'unavailable' };
  return caps.downloads.save({ filename, data });
}
export async function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
}
