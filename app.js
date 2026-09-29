(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const COLORS = ['#F2B84B', '#5ED3C3', '#FF8A7A', '#B79CFF', '#7CC4FF', '#9BE36A'];
  const CFG = window.GB_CONFIG || {};
  const APP_NAME = CFG.appName || 'Gym Buddy';
  const ADMINS = (CFG.admins || []).map((s) => String(s).toLowerCase());
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  // ---------- dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
  const todayISO = () => iso(new Date());
  const dayKey = (s) => DAYS[(parseD(s).getDay() + 6) % 7];
  const monday = (s) => addDays(s, -((parseD(s).getDay() + 6) % 7));
  const weekIdx = (s) => Math.round((parseD(monday(s)) - parseD('2024-01-01')) / (7 * 864e5));
  const fmtDay = (s, o) => parseD(s).toLocaleDateString('en-IN', o || { weekday: 'short', day: 'numeric', month: 'short' });
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);

  // ---------- seeded shuffle ----------
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function perm(arr, key) { const r = rng(hash(key)); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };

  // ---------- state ----------
  const S = {
    phase: 'boot', user: null, uid: null, isAdmin: false,
    users: {}, logs: {}, notes: {},
    src: { me: {}, circle: {}, clients: {}, all: {}, trainer: {} },
    act: null, curCircle: '', circleName: '', curTrainer: null, refreshed: false,
    tab: LS.get('gb.tab', 'today'), date: todayISO(), planOff: 0, recTab: 'report',
    sheet: null, editDay: null, onb: null, finish: null, det: {},
    sound: LS.get('gb.sound', true), dirty: false,
  };
  let ver = 0;
  const markChanged = () => { ver++; };
  const lid = (pid, date) => `${pid}_${date}`;
  const P = (pid) => S.users[pid];
  const me = () => S.users[S.uid];
  const coaching = () => S.act && S.act !== S.uid;
  const isTrainer = () => !!(me() && me().role === 'trainer');
  const unit = () => (me() && me().unit) || 'kg';
  const toDisp = (kg) => (kg == null || kg === '' ? '' : unit() === 'lb' ? Math.round(kg * 2.20462 * 2) / 2 : Math.round(kg * 100) / 100);
  const fromDisp = (v) => (v === '' || v == null || isNaN(v) ? null : unit() === 'lb' ? Math.round((v / 2.20462) * 100) / 100 : +v);
  const circleIds = () => { const c = me() && me().circle; return c ? Object.keys(S.users).filter((u) => S.users[u].circle === c) : [S.uid]; };

  // ---------- plan engine ----------
  function rank(g) { const G = GROUPS[g]; if (G.kind === 'yoga') return 10 + GROUP_ORDER.indexOf(g); return G.major ? 0 : 1; }
  const sortGroups = (gs) => gs.filter((g) => GROUPS[g]).map((g, i) => [g, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  function daySpec(prof, date) { return (prof && prof.schedule && prof.schedule[dayKey(date)]) || { groups: [], cardio: 0 }; }
  const profSets = (prof, g) => Math.min(6, Math.max(1, +(((prof && prof.sets) || {})[g]) || 3));
  const profCount = (prof, g) => { const z = GROUPS[g].zones.length; return Math.min(z + 2, Math.max(1, +(((prof && prof.counts) || {})[g]) || z)); };
  function groupSlots(g, cnt) {
    const zs = GROUPS[g].zones, out = [];
    zs.slice(0, Math.min(cnt, zs.length)).forEach((z, i) => out.push({ slot: g + '_' + z.k, z, rep: 1, main: i === 0 && GROUPS[g].kind === 'strength' }));
    for (let j = 0; j < cnt - zs.length; j++) {
      const z = zs.length > 1 ? zs[1 + (j % (zs.length - 1))] : zs[0];
      const rep = 2 + Math.floor(j / Math.max(1, zs.length - 1));
      out.push({ slot: g + '_' + z.k + '_' + rep, z, rep, main: false });
    }
    return out;
  }
  function computePlan(prof, date, spec, custom) {
    spec = spec || daySpec(prof, date);
    const groups = sortGroups(spec.groups || []);
    const wk = weekIdx(date), dk = dayKey(date), di = DAYS.indexOf(dk);
    const picks = {}, sets = {}, counts = {};
    groups.forEach((g) => {
      const daysWith = custom ? [dk] : DAYS.filter((d) => (((prof.schedule || {})[d] || {}).groups || []).includes(g));
      const per = Math.max(1, daysWith.length), occ = Math.max(0, daysWith.indexOf(dk));
      const seq = wk * per + occ;
      sets[g] = profSets(prof, g); counts[g] = profCount(prof, g);
      const used = new Set();
      groupSlots(g, counts[g]).forEach((x) => {
        const p = perm(x.z.ex, g + '.' + x.z.k);
        let pick = null;
        for (let k = 0; k < p.length; k++) { const c = p[(seq + x.rep - 1 + k) % p.length]; if (!used.has(c)) { pick = c; break; } }
        if (pick) { used.add(pick); picks[x.slot] = pick; }
      });
    });
    const cardio = +spec.cardio || 0;
    const cp = perm(CARDIO, 'cardio');
    return { groups, cardio, picks, sets, counts, cardioId: cardio ? cp[(wk * 7 + di) % cp.length] : null };
  }
  function planFor(pid, date) {
    const log = S.logs[lid(pid, date)];
    if (log && log.plan) return log.plan;
    const prof = S.users[pid];
    return prof ? computePlan(prof, date) : { groups: [], cardio: 0, picks: {}, cardioId: null };
  }
  const setsOf = (plan, g) => Math.max(1, +((plan.sets || {})[g]) || 3);
  const plannedOf = (plan) => slotsOf(plan).reduce((a, x) => a + x.n, 0);
  const tgtOf = (ex) => (ex.tgt ? TGT[ex.tgt] : null);
  const tgtTxt = (ex, n) => { const t = tgtOf(ex); return t ? t.txt.replace(/^[\d–]+ ×/, n + ' ×') : ''; };
  function slotsOf(plan) {
    const out = [];
    (plan.groups || []).forEach((g) => {
      if (!GROUPS[g]) return;
      const cnt = +((plan.counts || {})[g]) || GROUPS[g].zones.length;
      groupSlots(g, cnt).forEach((x) => { if ((plan.picks || {})[x.slot]) out.push({ slot: x.slot, g, z: x.z, rep: x.rep, n: setsOf(plan, g), main: x.main }); });
    });
    return out;
  }
  function exIdFor(pid, date, slot, plan) {
    const log = S.logs[lid(pid, date)];
    if (slot === 'cardio') return (log && log.swaps && log.swaps.cardio) || plan.cardioId;
    return (log && log.swaps && log.swaps[slot]) || plan.picks[slot];
  }
  function planTitle(plan) {
    if (!plan.groups.length) return plan.cardio ? 'Cardio' : 'Rest day';
    const key = plan.groups.slice().sort().join(',');
    const pre = PRESETS.find((p) => p.groups.length && p.groups.slice().sort().join(',') === key);
    return pre ? pre.name : plan.groups.map((g) => GROUPS[g].name).join(' + ');
  }
  const specTitle = (spec) => planTitle({ groups: sortGroups(spec.groups || []), cardio: spec.cardio });
  function restSecs(si) {
    if (!si) return 60;
    const k = GROUPS[si.g].kind;
    if (k === 'yoga') return 20;
    if (k === 'athletic') return 45;
    return si.main ? 120 : 75;
  }
  function estMinutes(plan) {
    let s = 0;
    slotsOf(plan).forEach((x) => { s += (x.n * (45 + restSecs(x)) + 60) / 60; });
    return Math.round(s + (plan.cardio || 0) + (plan.groups.length ? 5 : 0));
  }
  const isTraining = (plan) => plan.groups.length > 0 || plan.cardio > 0;

  // ---------- scoring ----------
  function setVal(m, s) {
    if (!s || !s.d) return null;
    const w = +s.w || 0, r = +s.r || 0;
    if (r <= 0) return null;
    if (m === 'wr') return { v: w > 0 ? w * (1 + r / 30) : r, w, r };
    if (m === 'wt') return { v: (w || 1) * r, w, r };
    return { v: r, w, r };
  }
  function entryBest(ex, entry) {
    let best = null, maxW = 0, maxR = 0, done = 0;
    (entry.sets || []).forEach((s) => {
      const sv = setVal(ex.m, s);
      if (s && s.d) done++;
      if (!sv) return;
      if (!best || sv.v > best.v) best = sv;
      if (sv.w > maxW) maxW = sv.w;
      if (sv.r > maxR) maxR = sv.r;
    });
    return { best, maxW, maxR, done };
  }
  let memo = { v: -1 };
  function stats() {
    if (memo.v === ver) return memo;
    const byLog = {}, best = {}, week = {}, total = {}, hist = {};
    const wkNow = monday(todayISO());
    const logs = Object.values(S.logs).filter((l) => l && l.pid && l.date).sort((a, b) => (a.date < b.date ? -1 : 1));
    logs.forEach((l) => {
      const pid = l.pid;
      best[pid] = best[pid] || {}; hist[pid] = hist[pid] || {};
      const plan = l.plan || planFor(pid, l.date);
      let sets = 0; const prs = [];
      Object.keys(l.ex || {}).forEach((slot) => {
        const en = l.ex[slot]; const ex = EX[en.id]; if (!ex) return;
        const eb = entryBest(ex, en);
        sets += eb.done;
        if (eb.best) {
          const prev = best[pid][ex.id];
          if (prev && eb.best.v > prev.v * 1.001) prs.push(slot);
          if (!prev || eb.best.v > prev.v) best[pid][ex.id] = { v: eb.best.v, w: eb.best.w, r: eb.best.r, date: l.date, maxW: Math.max(eb.maxW, prev ? prev.maxW : 0), maxR: Math.max(eb.maxR, prev ? prev.maxR : 0) };
          else { prev.maxW = Math.max(prev.maxW, eb.maxW); prev.maxR = Math.max(prev.maxR, eb.maxR); }
          (hist[pid][ex.id] = hist[pid][ex.id] || []).push({ date: l.date, v: eb.best.v, w: eb.best.w, r: eb.best.r, sets: en.sets });
        }
      });
      const planned = plannedOf(plan);
      const cardioDone = !!(l.cardio && l.cardio.d);
      let pts = sets * 10 + (cardioDone ? 15 : 0) + prs.length * 20;
      const complete = planned > 0 ? sets >= planned && (!plan.cardio || cardioDone) : plan.cardio ? cardioDone : false;
      if (complete) pts += 25;
      const done = !!l.finished || (planned > 0 ? sets >= planned * 0.5 : cardioDone);
      byLog[lid(pid, l.date)] = { pts, sets, planned, prs, done, complete, cardioDone };
      if (monday(l.date) === wkNow) {
        const w = (week[pid] = week[pid] || { pts: 0, sessions: 0, sets: 0, prs: 0 });
        w.pts += pts; w.sets += sets; w.prs += prs.length; if (done) w.sessions++;
      }
      const t = (total[pid] = total[pid] || { pts: 0, sessions: 0, sets: 0 });
      t.pts += pts; t.sets += sets; if (done) t.sessions++;
    });
    const streak = {};
    Object.keys(S.users).forEach((pid) => {
      const prof = S.users[pid]; let n = 0; let d = todayISO(); let guard = 0;
      const info = (x) => byLog[lid(pid, x)];
      if (!(info(d) && info(d).done)) d = addDays(d, -1);
      while (guard++ < 400) {
        const spec = daySpec(prof, d);
        const training = (spec.groups || []).length || spec.cardio;
        const i = info(d);
        if (i && i.done) n++;
        else if (training) break;
        d = addDays(d, -1);
        if (d < (prof.created || '2024-01-01')) break;
      }
      streak[pid] = n;
    });
    memo = { v: ver, byLog, best, week, total, hist, streak };
    return memo;
  }
  function prevSession(pid, exId, beforeDate) {
    const h = (stats().hist[pid] || {})[exId] || [];
    for (let i = h.length - 1; i >= 0; i--) if (h[i].date < beforeDate) return h[i];
    return null;
  }
  function prevBest(pid, exId, beforeDate) {
    const h = (stats().hist[pid] || {})[exId] || [];
    let b = null; h.forEach((x) => { if (x.date < beforeDate && (!b || x.v > b.v)) b = x; });
    return b;
  }

  // ---------- sync: writes ----------
  const Store = () => window.GBStore;
  const pending = new Map(), inflight = new Set();
  let flushT = null;
  const busy = (path) => pending.has(path) || inflight.has(path);
  function queueWrite(path, data, merge) {
    const prev = pending.get(path);
    const entry = prev && merge ? { data: Object.assign({}, prev.data, data), merge: prev.merge } : { data, merge: !!merge };
    entry.data = clone(entry.data);
    pending.set(path, entry);
    markChanged();
    clearTimeout(flushT); flushT = setTimeout(flush, 0);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', () => flush());
  async function flush() {
    for (const [path, w] of Array.from(pending.entries())) {
      if (inflight.has(path)) continue;
      pending.delete(path); inflight.add(path);
      try { await Store().set(path, w.data, w.merge); }
      catch (e) { writeErr(e, path, w); }
      finally { inflight.delete(path); }
      if (pending.has(path)) setTimeout(flush, 60);
    }
  }
  const retried = {};
  function writeErr(e, path, w) {
    const code = String((e && e.code) || '');
    if (code.includes('permission')) { toast("Not allowed to save that. If this keeps happening, tell the app admin."); console.warn('write denied', path, e); return; }
    if (!retried[path]) { retried[path] = 1; setTimeout(() => { if (!pending.has(path)) pending.set(path, w); flush(); retried[path] = 0; }, 1500 + Math.random() * 1000); }
    else toast('Could not save right now. It will retry on your next change.');
  }
  function saveLog(log) {
    log.updatedAt = Date.now(); log.by = S.uid;
    const data = Object.assign({}, log); delete data.pid;
    queueWrite(`users/${log.pid}/logs/${log.date}`, data, false);
  }
  function saveUser(uid, fields) {
    const u = S.users[uid]; if (u) Object.assign(u, fields);
    queueWrite(`users/${uid}`, Object.assign({}, fields, { updatedAt: Date.now() }), true);
  }
  function saveNotes(uid) { queueWrite(`users/${uid}/meta/notes`, S.notes[uid] || {}, false); }

  function ensureLog(pid, date) {
    const id = lid(pid, date);
    let log = S.logs[id];
    if (!log) { log = { pid, date, week: monday(date), plan: planFor(pid, date), ex: {}, swaps: {}, cardio: { min: 0, d: false }, finished: false }; S.logs[id] = log; }
    if (!log.plan) log.plan = planFor(pid, date);
    log.ex = log.ex || {}; log.swaps = log.swaps || {}; log.cardio = log.cardio || { min: 0, d: false };
    return log;
  }
  function ensureEntry(log, slot) {
    const id = exIdFor(log.pid, log.date, slot, log.plan);
    let en = log.ex[slot];
    const si = slotsOf(log.plan).find((x) => x.slot === slot); const n = si ? si.n : 3;
    if (!en) { en = { id, sets: [], note: '' }; log.ex[slot] = en; }
    while (en.sets.length < n) en.sets.push({ w: null, r: null, d: false });
    if (en.id !== id) en.id = id;
    return en;
  }
  const hasTicks = (l) => Object.values(l.ex || {}).some((e) => (e.sets || []).some((s) => s && s.d)) || !!(l.cardio && l.cardio.d);

  // ---------- sync: reads ----------
  const subs = {};
  const sub = (key, fn) => { if (!subs[key]) subs[key] = fn(); };
  const unsub = (key) => { if (subs[key]) { try { subs[key](); } catch (e) { /* ignore */ } delete subs[key]; } };
  const unsubAll = () => Object.keys(subs).forEach(unsub);
  let deniedShown = false;
  const onErr = (what) => (e) => {
    console.warn('listen failed', what, e);
    if (!deniedShown && String((e && e.code) || '').includes('permission')) { deniedShown = true; toast('Some data could not be loaded (access rules). Tell the app admin if this continues.'); }
  };
  function recompose() {
    const src = S.src;
    const keepMine = S.users[S.uid] && busy(`users/${S.uid}`) ? { [S.uid]: S.users[S.uid] } : {};
    S.users = Object.assign({}, src.all, src.circle, src.clients, src.trainer, src.me, keepMine);
    markChanged();
  }
  function toMap(list) { const m = {}; list.forEach((d) => { m[d.id] = clone(d.data); }); return m; }
  function watchLogs(u) {
    return Store().watchCol(`users/${u}/logs`, [], (list) => applyLogs(u, list), onErr('logs'));
  }
  function applyLogs(u, list) {
    const pre = u + '_';
    const next = {};
    Object.keys(S.logs).forEach((k) => {
      if (!k.startsWith(pre)) { next[k] = S.logs[k]; return; }
      const l = S.logs[k];
      if (busy(`users/${u}/logs/${l.date}`)) next[k] = l;
    });
    list.forEach((d) => {
      const k = lid(u, d.id);
      if (next[k] && busy(`users/${u}/logs/${d.id}`)) return;
      const l = clone(d.data); l.pid = u; l.date = d.id; next[k] = l;
    });
    if (S.src.circle[u] && u !== S.uid) partnerPing(u, list);
    S.logs = next; markChanged();
    if (u === S.uid && !S.refreshed) { S.refreshed = true; refreshStalePlans(); }
    requestRender();
  }
  const lastSeen = {};
  function partnerPing(u, list) {
    const t = todayISO(); const d = list.find((x) => x.id === t);
    let n = 0, last = null;
    if (d) Object.values(d.data.ex || {}).forEach((en) => (en.sets || []).forEach((s) => { if (s && s.d) { n++; last = { en, s }; } }));
    if (u in lastSeen && n > lastSeen[u] && last && S.users[u]) {
      const ex = EX[last.en.id]; const s = last.s;
      toast(`${S.users[u].name} just logged ${ex ? ex.n : 'a set'} · ${ex ? setStr(ex, s, true) : ''}`);
    }
    lastSeen[u] = n;
  }
  function syncLogSubs(prefix, ids) {
    Object.keys(subs).filter((k) => k.startsWith(prefix)).forEach((k) => { if (!ids.includes(k.slice(prefix.length))) unsub(k); });
    ids.forEach((u) => { if (u !== S.uid) sub(prefix + u, () => watchLogs(u)); });
  }
  function onMe(d) {
    const uid = S.uid;
    if (!d) {
      if (busy(`users/${uid}`)) return;
      S.src.me = {}; recompose();
      S.phase = 'onboard'; render(); return;
    }
    if (!busy(`users/${uid}`)) S.src.me = { [uid]: clone(d) };
    recompose();
    if (S.phase !== 'app') { S.phase = 'app'; S.act = uid; }
    const u = S.users[uid];
    // group (family / friends) for competing
    const circle = u.circle || '';
    if (circle !== S.curCircle) {
      unsub('circle'); syncLogSubs('c:', []); S.src.circle = {}; S.curCircle = circle; S.circleName = '';
      if (circle) {
        sub('circle', () => Store().watchCol('users', [['circle', '==', circle]], (list) => { S.src.circle = toMap(list); recompose(); syncLogSubs('c:', Object.keys(S.src.circle)); requestRender(); }, onErr('group')));
        Store().get(`circles/${circle}`).then((c) => { S.circleName = (c && c.name) || ''; requestRender(); }).catch(() => {});
      }
    }
    // trainer: watch clients
    if (u.role === 'trainer') {
      sub('clients', () => Store().watchCol('users', [['trainerId', '==', uid]], (list) => { S.src.clients = toMap(list); recompose(); syncLogSubs('t:', Object.keys(S.src.clients)); requestRender(); }, onErr('clients')));
    } else if (subs.clients) { unsub('clients'); syncLogSubs('t:', []); S.src.clients = {}; recompose(); }
    // my trainer's profile (name)
    const tid = u.trainerId || null;
    if (tid !== S.curTrainer) {
      unsub('trainer'); S.src.trainer = {}; S.curTrainer = tid;
      if (tid) sub('trainer', () => Store().watchDoc(`users/${tid}`, (td) => { S.src.trainer = td ? { [tid]: clone(td) } : {}; recompose(); requestRender(); }, onErr('trainer')));
    }
    if (S.isAdmin) sub('all', () => Store().watchCol('users', [], (list) => { S.src.all = toMap(list); recompose(); syncLogSubs('a:', Object.keys(S.src.all)); requestRender(); }, onErr('admin')));
    requestRender();
  }
  function startSession(user) {
    unsubAll();
    Object.assign(S, { user, uid: user.uid, act: user.uid, isAdmin: ADMINS.includes(String(user.email || '').toLowerCase()), users: {}, logs: {}, notes: {}, src: { me: {}, circle: {}, clients: {}, all: {}, trainer: {} }, curCircle: '', curTrainer: null, refreshed: false, phase: 'loading' });
    render();
    sub('me', () => Store().watchDoc(`users/${user.uid}`, onMe, onErr('profile')));
    sub('mylogs', () => watchLogs(user.uid));
    sub('mynotes', () => Store().watchDoc(`users/${user.uid}/meta/notes`, (d) => { if (!busy(`users/${user.uid}/meta/notes`)) { S.notes[user.uid] = d ? clone(d) : {}; requestRender(); } }, onErr('notes')));
  }
  function boot() {
    render();
    const go = () => {
      const st = Store();
      if (!st.configured) { S.phase = 'unconfigured'; render(); return; }
      st.onAuth((user) => {
        if (!user) { unsubAll(); S.user = null; S.uid = null; S.phase = 'out'; render(); return; }
        if (S.uid === user.uid && S.phase !== 'out') return;
        startSession(user);
      });
    };
    if (window.GBStore) go();
    else {
      window.addEventListener('gbstore', go, { once: true });
      setTimeout(() => { if (!window.GBStore) { S.phase = 'offline'; render(); } }, 12000);
    }
  }

  // ---------- render plumbing ----------
  function requestRender() {
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) { S.dirty = true; return; }
    render();
  }
  document.addEventListener('focusout', () => { setTimeout(() => { if (S.dirty) { const a = document.activeElement; if (!a || (a.tagName !== 'INPUT' && a.tagName !== 'TEXTAREA')) { S.dirty = false; render(); } } }, 50); });

  const ICON = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    compete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4"/></svg>',
    records: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M7 16V11M12 16V6M17 16v-7"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16M7 16V11M12 16V6M17 16v-7"/></svg>',
    me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0M15.5 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14a6 6 0 0 1 3.5 5.5"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6L12 3z"/><path d="M9 12.5l2 2 4-4.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    google: '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
  };
  const avatar = (p, lg) => `<span class="av${lg ? ' lg' : ''}" style="background:${esc((p && p.color) || '#888')}">${esc(((p && p.name) || '?').trim().charAt(0).toUpperCase())}</span>`;
  const thumbCache = {};
  const thumb = (ex) => thumbCache[ex.id] || (thumbCache[ex.id] = FIG.svgStatic(ex, 'B'));
  function tabsFor() {
    if (coaching()) return [['today', 'Session'], ['plan', 'Plan'], ['report', 'Report'], ['clients', 'Clients']];
    let t = isTrainer() ? [['clients', 'Clients'], ['today', 'Today'], ['plan', 'Plan'], ['compete', 'Compete'], ['records', 'Records'], ['me', 'Me']]
      : [['today', 'Today'], ['plan', 'Plan'], ['compete', 'Compete'], ['records', 'Progress'], ['me', 'Me']];
    if (S.isAdmin) { t.splice(t.length - 1, 0, ['admin', 'Admin']); if (t.length > 6) t = t.filter((x) => x[0] !== 'records'); }
    return t;
  }

  function splash(msg) {
    return `<div class="app"><div class="splash"><div class="stack" style="align-items:center"><div style="width:150px">${FIG.svgStatic(EX.db_shoulder_press, 'B')}</div><h2>${esc(APP_NAME)}</h2><p class="muted">${msg}</p></div></div></div>`;
  }
  function render() {
    const root = $('#root');
    if (S.phase === 'boot' || S.phase === 'loading') { root.innerHTML = splash('Loading your plan…'); return; }
    if (S.phase === 'offline') { root.innerHTML = splash('Could not connect. Check your internet and reopen the app.'); return; }
    if (S.phase === 'unconfigured') { root.innerHTML = splash('This app is not connected to its database yet. The admin needs to finish setup.'); return; }
    if (S.phase === 'out') { root.innerHTML = `<div class="app">${viewLanding()}</div>`; renderSheet(); return; }
    if (S.phase === 'onboard') { root.innerHTML = `<div class="app">${viewOnboard()}</div>`; renderSheet(); return; }
    if (!me()) { root.innerHTML = splash('Loading your plan…'); return; }
    if (coaching() && !P(S.act)) S.act = S.uid;
    const tabs = tabsFor();
    if (!tabs.some((t) => t[0] === S.tab)) S.tab = tabs[0][0];
    const tab = S.tab;
    const titles = { today: coaching() ? 'Session' : 'Today', plan: 'Weekly plan', compete: 'Compete', records: 'Progress', report: 'Report', me: 'Me', clients: 'Clients', admin: 'Admin' };
    const body = tab === 'admin' ? viewAdminDash() : tab === 'plan' ? viewPlan() : tab === 'compete' ? viewCompete() : tab === 'records' ? viewRecords() : tab === 'report' ? viewReport(S.act) : tab === 'me' ? viewMe() : tab === 'clients' ? viewClients() : viewToday();
    const banner = coaching() ? `<div class="coachbar glass"><div class="row" style="gap:8px">${avatar(P(S.act))}<div><div class="tiny muted">Coaching</div><b>${esc(P(S.act).name)}</b></div></div><button class="btn sm" data-act="exitCoach">Done</button></div>` : '';
    root.innerHTML = `<div class="app">
      <header class="top"><div class="brand"><small>${esc(APP_NAME)}</small><b>${titles[tab]}</b></div>
        <button class="who" data-act="tab" data-tab="${coaching() ? 'clients' : 'me'}" aria-label="Your profile">${avatar(me())}<span class="live"><i></i>${isTrainer() ? 'Trainer' : 'Live'}</span></button></header>
      ${banner}<main id="main">${body}</main></div>
      <nav class="nav"><div class="in" style="grid-template-columns:repeat(${tabs.length},1fr)">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="${k === 'clients' && coaching() ? 'exitCoach' : 'tab'}" data-tab="${k}" aria-label="${n}">${ICON[k]}<span>${n}</span></button>`).join('')}</div></nav>`;
    renderSheet();
  }

  // ---------- LANDING / ONBOARDING ----------
  function viewLanding() {
    return `<header class="top"><div class="brand"><small>Welcome to</small><b>${esc(APP_NAME)}</b></div></header>
      <section class="glass hero"><div><h1>Your gym plan, form guide and progress in one place</h1><p class="muted" style="margin-top:8px">Workouts planned weeks ahead, every muscle covered, heaviest lift first, form animations for every exercise, and progress reports. Train on your own, with family, or with your personal trainer.</p></div><div style="width:100px">${FIG.svgStatic(EX.bb_squat, 'B')}</div></section>
      <div class="sect"><button class="btn gbtn block" data-act="signIn">${ICON.google}<span>Continue with Google</span></button><p class="small muted" style="text-align:center">Use your Gmail account. We only use your name and email to set up your profile.</p></div>
      <div class="sect"><div class="glass card stack small"><div><b>Members</b> get a plan that rotates weekly, one-tap set logging and records.</div><div><b>Trainees</b> get plans from their trainer in advance and progress reports.</div><div><b>Trainers</b> plan for all clients in minutes and see who needs attention.</div></div></div>`;
  }
  function viewOnboard() {
    const o = S.onb || (S.onb = { name: (S.user && S.user.name) || '', color: COLORS[Math.floor(Math.random() * COLORS.length)], schedule: clone(RECOMMENDED), sets: {}, counts: {}, trainerCode: '', circle: '', wantsTrainer: false });
    let h = `<header class="top"><div class="brand"><small>Welcome</small><b>Set up your profile</b></div></header>`;
    h += `<div class="glass card stack"><label class="fld">Your name<input class="inp" data-in="oname" value="${esc(o.name)}" placeholder="e.g. Mahima" maxlength="24" autocomplete="off"></label><div class="tiny muted">Your colour</div><div class="swatches">${COLORS.map((c) => `<button data-act="ocolor" data-c="${c}" class="${o.color === c ? 'on' : ''}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div><div class="small muted">Signed in as ${esc(S.user && S.user.email)}</div></div>`;
    h += `<div class="sect"><h2>Training with a personal trainer?</h2><div class="glass card stack"><label class="fld">Trainer code (optional)<input class="inp" data-in="otcode" value="${esc(o.trainerCode)}" placeholder="6-letter code from your trainer" maxlength="6" autocomplete="off" autocapitalize="characters"></label><label class="fld">Family or friends group code (optional)<input class="inp" data-in="ocircle" value="${esc(o.circle)}" placeholder="to compete with them" maxlength="6" autocomplete="off" autocapitalize="characters"></label><label class="row small"><input type="checkbox" data-in="owt" ${o.wantsTrainer ? 'checked' : ''}> I'm a trainer (the admin will approve)</label></div></div>`;
    h += `<div class="sect"><div class="sect-h"><h2>Your week</h2></div><p class="small muted">${o.trainerCode ? 'Your trainer can change this later.' : 'The recommended plan. Tap any day to change it.'}</p><div class="glass card">${schedList(o, 'o')}</div></div>`;
    h += `<div class="sect"><button class="btn pri block" data-act="create">Start training</button><button class="btn ghost block" data-act="signOut">Use a different Google account</button><p class="small faint">Check with your doctor before starting a new training plan.</p></div>`;
    return h;
  }

  // ---------- TODAY ----------
  function ring(pct) {
    const r = 40, c = 2 * Math.PI * r;
    return `<div class="ring"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="${r}" stroke="rgba(255,255,255,.09)" stroke-width="8" fill="none"/><circle cx="46" cy="46" r="${r}" stroke="var(--good)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}"/></svg><div class="lbl"><div><b>${Math.round(pct * 100)}%</b><small>done</small></div></div></div>`;
  }
  function lastText(pid, ex, date) {
    const p = prevSession(pid, ex.id, date);
    if (!p) return 'New exercise';
    if (ex.m === 'wr' || ex.m === 'wt') return p.w ? `Last: ${toDisp(p.w)} ${unit()} × ${p.r}${ex.m === 'wt' ? ' s' : ''}` : `Last: ${p.r} reps`;
    return `Last: ${p.r}${ex.m === 't' ? ' s' : ' reps'}`;
  }
  function viewToday() {
    const pid = S.act, date = S.date, t = todayISO();
    const plan = planFor(pid, date), log = S.logs[lid(pid, date)];
    const st = stats(), info = st.byLog[lid(pid, date)] || { pts: 0, sets: 0, prs: [] };
    const sl = slotsOf(plan), planned = plannedOf(plan);
    const label = date === t ? 'Today' : date === addDays(t, -1) ? 'Yesterday' : date === addDays(t, 1) ? 'Tomorrow' : fmtDay(date, { weekday: 'long' });
    let h = `<div class="datebar"><button class="btn sm" data-act="day" data-d="-1" aria-label="Previous day">${ICON.back}</button><div class="mid"><b>${label}</b><div class="small muted">${fmtDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div><button class="btn sm" data-act="day" data-d="1" aria-label="Next day">${ICON.next}</button></div>`;
    if (date !== t) h += `<button class="btn sm ghost block" data-act="goToday" style="margin:-6px 0 8px">Back to today</button>`;
    const prof = P(pid);
    if (!coaching() && prof.trainerId && prof.planNote && date === t) h += `<div class="glass card small" style="margin-bottom:10px"><b>Note from ${esc((P(prof.trainerId) || {}).name || 'your trainer')}:</b> ${esc(prof.planNote)}</div>`;
    if (!isTraining(plan)) {
      const tomorrow = planFor(pid, addDays(date, 1));
      h += `<div class="glass card stack"><h2>Rest day</h2><p class="muted">Recovery is where the strength is built. An easy 20–30 minute walk is a good idea.</p><p class="small">Tomorrow: <b>${esc(planTitle(tomorrow))}</b></p><button class="btn" data-act="override">Train anyway: pick a workout</button></div>`;
      if (!coaching()) h += partnerStrip(date);
      return h;
    }
    const pct = planned ? Math.min(1, info.sets / planned) : info.cardioDone ? 1 : 0;
    h += `<section class="glass hero"><div style="min-width:0"><div class="tiny muted">${esc(plan.groups.map((g) => GROUPS[g].name).join(' · ') || 'Cardio')}${log && log.published ? ' · planned by trainer' : ''}</div><h1>${esc(planTitle(plan))}</h1>
      <div class="small muted" style="margin-top:4px">${sl.length} exercises · ${planned} sets${plan.cardio ? ` · ${plan.cardio} min cardio` : ''} · ~${estMinutes(plan)} min</div>
      <div class="row" style="margin-top:8px;gap:6px"><span class="chip t">${info.pts} pts</span>${info.prs.length ? `<span class="chip" style="color:var(--pr)">★ ${info.prs.length} PR${info.prs.length > 1 ? 's' : ''}</span>` : ''}</div></div>${ring(pct)}</section>`;
    if (plan.groups.some((g) => GROUPS[g].kind === 'strength')) h += `<p class="small muted" style="margin:10px 2px 0">Warm up 5 min, then 1–2 light sets before each main lift.</p>`;
    plan.groups.forEach((g) => {
      const G = GROUPS[g];
      h += `<div class="sect"><div class="sect-h"><h2>${esc(G.name)}</h2><span class="small muted">${sl.filter((x) => x.g === g).length} exercises × ${setsOf(plan, g)} sets</span></div><div class="glass exlist">`;
      sl.filter((x) => x.g === g).forEach((x) => {
        const ex = EX[exIdFor(pid, date, x.slot, plan)]; if (!ex) return;
        const en = log && log.ex && log.ex[x.slot];
        const done = en ? (en.sets || []).filter((s) => s && s.d).length : 0;
        const nSets = en ? Math.max(x.n, (en.sets || []).length) : x.n;
        const pr = info.prs.includes(x.slot);
        h += `<button class="ex" data-act="open" data-slot="${x.slot}"><div class="thumb">${thumb(ex)}</div><div><div class="z ${x.main ? 'main' : ''}">${x.main ? 'Main lift' : esc(x.z.name) + (x.rep > 1 ? ' · extra' : '')}</div><div class="nm">${esc(ex.n)}</div><div class="meta">${tgtTxt(ex, x.n)} · ${esc(lastText(pid, ex, date))}</div></div><div class="stack" style="align-items:flex-end;gap:6px"><div class="dots">${Array.from({ length: nSets }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}</div>${pr ? '<span class="prb">★ PR</span>' : ''}${en && en.pain ? '<span class="prb" style="color:var(--bad)">pain</span>' : ''}</div></button>`;
      });
      h += `</div></div>`;
    });
    if (plan.cardio) {
      const cx = EX[exIdFor(pid, date, 'cardio', plan)];
      const cd = log && log.cardio && log.cardio.d;
      h += `<div class="sect"><div class="sect-h"><h2>Cardio finisher</h2><span class="small muted">${plan.cardio} min</span></div><div class="glass exlist"><button class="ex" data-act="open" data-slot="cardio"><div class="thumb">${thumb(cx)}</div><div><div class="z">Heart & lungs</div><div class="nm">${esc(cx.n)}</div><div class="meta">${plan.cardio} min steady · talk-test pace</div></div><div class="dots"><i class="${cd ? 'on' : ''}"></i></div></button></div></div>`;
    }
    if (!coaching()) h += partnerStrip(date);
    h += `<div class="sect"><button class="btn pri block" data-act="finish">${log && log.finished ? 'Workout finished ✓' : 'Finish workout'}</button><button class="btn ghost block" data-act="override">Change this day's workout</button></div>`;
    return h;
  }
  function partnerStrip(date) {
    const others = circleIds().filter((p) => p !== S.uid);
    if (!others.length) return '';
    const st = stats();
    return `<div class="sect"><div class="sect-h"><h3>Your group today</h3><span class="live"><i></i>Live</span></div><div class="glass card stack">${others.map((p) => {
      const pl = planFor(p, date); const i = st.byLog[lid(p, date)] || { pts: 0, sets: 0 };
      return `<div class="row between"><div class="row">${avatar(P(p))}<div><b>${esc(P(p).name)}</b><div class="small muted">${esc(planTitle(pl))} · ${i.sets}/${plannedOf(pl)} sets</div></div></div><div class="num" style="font-size:22px">${i.pts}<span class="small muted" style="font-family:var(--body);font-weight:400"> pts</span></div></div>`;
    }).join('')}</div></div>`;
  }

  // ---------- SHEET ----------
  let stopAnim = null, sheetKey = null;
  function openSheet(o) { S.sheet = o; renderSheet(true); }
  function closeSheet() { S.sheet = null; if (stopAnim) stopAnim(); stopAnim = null; sheetKey = null; const el = $('#sheet'); el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; document.body.classList.remove('sheet-open'); render(); }
  function sheetCtx() {
    const o = S.sheet; if (!o) return null;
    if (o.exId) return { view: true, ex: EX[o.exId] };
    const pid = S.act, date = o.date, plan = planFor(pid, date);
    const exId = exIdFor(pid, date, o.slot, plan);
    const slotInfo = o.slot === 'cardio' ? null : slotsOf(plan).find((x) => x.slot === o.slot);
    return { view: false, pid, date, plan, slot: o.slot, slotInfo, ex: EX[exId] };
  }
  function renderSheet(fresh) {
    const el = $('#sheet');
    if (!S.sheet) { el.hidden = true; return; }
    const c = sheetCtx(); if (!c || !c.ex) { S.sheet = null; el.hidden = true; return; }
    const key = c.ex.id + '|' + (c.slot || 'view');
    el.hidden = false; document.body.style.overflow = 'hidden'; document.body.classList.add('sheet-open');
    if (fresh || sheetKey !== key || !$('#sheetDyn')) {
      const zoneTxt = c.slotInfo ? GROUPS[c.slotInfo.g].name + ' · ' + (c.slotInfo.main ? 'Main lift, heaviest first' : c.slotInfo.z.name) : c.slot === 'cardio' ? 'Cardio' : zoneOfEx(c.ex.id);
      el.innerHTML = `<div class="in"><div class="sheet-top"><button class="btn sm" data-act="close" aria-label="Close">${ICON.back}</button><div style="min-width:0"><div class="tiny ${c.slotInfo && c.slotInfo.main ? '' : 'muted'}" style="${c.slotInfo && c.slotInfo.main ? 'color:var(--amber)' : ''}">${esc(zoneTxt)}${coaching() && !c.view ? ' · for ' + esc(P(S.act).name) : ''}</div><h2>${esc(c.ex.n)}</h2></div></div>
        <div class="figbox"><div id="figAnim"></div><div class="figcap"><span>Start</span><span>Finish</span></div></div><div id="sheetDyn"></div></div>`;
      if (stopAnim) stopAnim();
      stopAnim = FIG.animate($('#figAnim'), c.ex);
      sheetKey = key;
      if (fresh) el.scrollTop = 0;
    }
    $('#sheetDyn').innerHTML = sheetDyn(c);
  }
  function zoneOfEx(id) {
    for (const g of GROUP_ORDER) for (const z of GROUPS[g].zones) if (z.ex.includes(id)) return GROUPS[g].name + ' · ' + z.name;
    return CARDIO.includes(id) ? 'Cardio' : '';
  }
  const det = (k, title, inner, dflt) => { const o = k in S.det ? S.det[k] : dflt; return `<details class="glass det" data-k="${k}" ${o ? 'open' : ''}><summary>${title}</summary><div class="det-b">${inner}</div></details>`; };
  const cuesHTML = (ex) => det('how', 'How to do it', `<ul class="cues">${ex.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul><div class="tip">${esc(ex.tip)}</div>`, true);
  function recordsHTML(pid, ex) {
    const h = (stats().hist[pid] || {})[ex.id] || [];
    const b = (stats().best[pid] || {})[ex.id];
    const who = pid === S.uid ? 'My records' : `${esc(P(pid).name)}'s records`;
    if (!h.length) return det('recs', who, '<p class="muted small">No sets logged yet. The first session sets the baseline.</p>', false);
    let recs;
    if (ex.m === 'wr') recs = [[`${toDisp(b.maxW)}`, `Heaviest ${unit()}`], [`${b.maxR}`, 'Most reps'], [`${toDisp(Math.round(b.v * 10) / 10)}`, 'Est. 1-rep max']];
    else if (ex.m === 'wt') recs = [[`${toDisp(b.maxW)}`, `Heaviest ${unit()}`], [`${b.maxR}s`, 'Longest'], [`${h.length}`, 'Sessions']];
    else if (ex.m === 't') recs = [[`${b.maxR}s`, 'Longest hold'], [`${h.length}`, 'Sessions'], [`${fmtDay(b.date, { day: 'numeric', month: 'short' })}`, 'Best on']];
    else recs = [[`${b.maxR}`, 'Most reps'], [`${h.length}`, 'Sessions'], [`${fmtDay(b.date, { day: 'numeric', month: 'short' })}`, 'Best on']];
    const pts = h.slice(-12);
    let spark = '';
    if (pts.length > 1) {
      const vs = pts.map((p) => p.v), mn = Math.min(...vs), mx = Math.max(...vs), W = 300, H = 60;
      const xy = pts.map((p, i) => [8 + (i * (W - 16)) / (pts.length - 1), H - 8 - (mx === mn ? 0.5 : (p.v - mn) / (mx - mn)) * (H - 16)]);
      const d = xy.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
      spark = `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none" aria-label="Progress over last ${pts.length} sessions"><path d="${d}L${xy[xy.length - 1][0].toFixed(1)} ${H}L${xy[0][0].toFixed(1)} ${H}Z" fill="rgba(94,211,195,.14)"/><path d="${d}" fill="none" stroke="var(--teal)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg><div class="small muted">Best set each session, last ${pts.length} sessions</div>`;
    }
    const rows = h.slice(-6).reverse().map((x) => `<div><span>${fmtDay(x.date)}</span><span>${(x.sets || []).filter((s) => s && s.d).map((s) => setStr(ex, s)).join(' · ')}</span></div>`).join('');
    return det('recs', `${who} <span class="small muted">· ${h.length} session${h.length > 1 ? 's' : ''}</span>`, `<div class="recs">${recs.map((r) => `<div class="rec"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('')}</div>${spark}<div class="hist">${rows}</div>`, false);
  }
  function setStr(ex, s, long) {
    if (ex.m === 'wr') return s.w ? (long ? `${toDisp(s.w)} ${unit()} × ${s.r}` : `${toDisp(s.w)}×${s.r}`) : `${s.r} reps`;
    if (ex.m === 'wt') return `${s.w ? toDisp(s.w) + unit() + ' ' : ''}${s.r}s`;
    if (ex.m === 't') return `${s.r}s`;
    return `${s.r}`;
  }
  function suggestion(pid, ex, date, n) {
    const t = tgtOf(ex); if (!t) return null;
    const p = prevSession(pid, ex.id, date);
    if (!p) return ex.m === 'wr' ? { txt: `First time: choose a weight you could lift ${t.hi + 2} times. Do ${t.hi}.` } : null;
    const done = (p.sets || []).filter((s) => s && s.d && +s.r > 0);
    if (ex.m === 'wr' && p.w) {
      const allTop = done.length >= Math.min(n || 3, (p.sets || []).length) && done.every((s) => +s.r >= t.hi);
      if (allTop) { const w = p.w + (ex.inc || 2.5); return { txt: `Time to go up to ${toDisp(w)} ${unit()}`, w }; }
      return { txt: `Stay at ${toDisp(p.w)} ${unit()} until every set reaches ${t.hi} reps` };
    }
    if (ex.m === 't' || ex.m === 'wt') return { txt: `Try to beat ${p.r} s` };
    if (ex.m === 'r') return { txt: `Try to beat ${p.r} reps` };
    return null;
  }
  function curDefault(pid, ex, date) {
    const p = prevSession(pid, ex.id, date); const ps = p && p.sets && p.sets.find((x) => x && x.d);
    const t = tgtOf(ex);
    return { w: ps && ps.w ? +ps.w : null, r: ps && ps.r ? +ps.r : t ? t.hi : 10 };
  }
  function dial(field, label, val) {
    return `<div class="dial"><div class="tiny muted">${label}</div><div class="stepper big"><button data-act="cstep" data-f="${field}" data-d="-1" aria-label="Less ${label}">−</button><input type="number" inputmode="decimal" step="any" data-in="c${field}" value="${val === '' || val == null ? '' : esc(val)}" placeholder="0" aria-label="${label}"><button data-act="cstep" data-f="${field}" data-d="1" aria-label="More ${label}">+</button></div></div>`;
  }
  function sheetDyn(c) {
    const ex = c.ex;
    if (c.view) return `${cuesHTML(ex)}${recordsHTML(S.act, ex)}`;
    const pid = c.pid, date = c.date;
    if (c.slot === 'cardio') {
      const log = S.logs[lid(pid, date)];
      const cd = log && log.cardio ? log.cardio : { min: 0, d: false };
      const alts = CARDIO.filter((x) => x !== ex.id);
      return `<div class="glass card logcard"><div class="row between"><span class="tgt num">${c.plan.cardio} min</span><span class="small muted">Talk-test pace</span></div>
        <div class="dials one">${dial('min', 'Minutes done', cd.min || c.plan.cardio)}</div>
        <button class="setbtn wide ${cd.d ? 'on' : 'next'}" data-act="cardioDone"><span>${cd.d ? '✓ Cardio done' : 'Tap when finished'}</span></button></div>
        ${cuesHTML(ex)}
        ${det('swap', 'Use a different machine', `<div class="chips">${alts.map((a) => `<button class="chip" data-act="swapCardio" data-ex="${a}">${esc(EX[a].n)}</button>`).join('')}</div>`, false)}`;
    }
    const log = S.logs[lid(pid, date)];
    const en = log && log.ex && log.ex[c.slot];
    const nPlan = c.slotInfo ? c.slotInfo.n : 3;
    const sets = (en ? en.sets.slice() : []);
    while (sets.length < nPlan) sets.push({ w: null, r: null, d: false });
    const cur = (en && en.cur) || curDefault(pid, ex, date);
    const two = ex.m === 'wr' || ex.m === 'wt';
    const repLbl = ex.m === 't' || ex.m === 'wt' ? 'Seconds' : 'Reps';
    const sug = suggestion(pid, ex, date, nPlan);
    const nextI = sets.findIndex((x) => !x.d);
    const rest = restSecs(c.slotInfo);
    let h = `<div class="glass card logcard"><div class="row between"><span class="tgt num">${tgtTxt(ex, nPlan)}</span><span class="small muted" style="text-align:right">Rest ${rest >= 60 ? (rest / 60) + ' min' : rest + ' s'}<br>${esc(lastText(pid, ex, date))}</span></div>
      ${sug ? `<div class="sugg"><span>${esc(sug.txt)}</span>${sug.w ? `<button class="btn sm" data-act="useSug" data-w="${sug.w}">Use</button>` : ''}</div>` : ''}
      <div class="dials ${two ? '' : 'one'}">${two ? dial('w', 'Weight (' + unit() + ')', cur.w == null ? '' : toDisp(cur.w)) : ''}${dial('r', repLbl, cur.r)}</div>
      <div class="setbtns">${sets.map((x, i) => `<button class="setbtn ${x.d ? 'on' : i === nextI ? 'next' : ''}" data-act="logSet" data-i="${i}" aria-label="${x.d ? 'Undo' : 'Log'} set ${i + 1}"><span>${x.d ? '✓ Set ' + (i + 1) : 'Set ' + (i + 1)}</span><small>${x.d ? esc(setStr(ex, x, true)) : i === nextI ? 'tap when done' : '&nbsp;'}</small></button>`).join('')}</div>
      <div class="row between wrap" style="gap:6px"><button class="chip ${en && en.pain ? 'on bad' : ''}" data-act="pain">${en && en.pain ? '⚠ Pain noted' : 'Felt pain?'}</button><span class="row" style="gap:6px">${sets.length > nPlan ? '<button class="btn sm ghost" data-act="rmSet" aria-label="Remove extra set">−</button>' : ''}<button class="btn sm ghost" data-act="addSet">+ Set</button></span></div></div>`;
    if (!coaching()) {
      const others = circleIds().filter((p) => p !== pid);
      if (others.length) {
        h += `<div class="glass card partners">${others.map((p) => {
          const pl = S.logs[lid(p, date)];
          const pe = pl && pl.ex ? Object.values(pl.ex).find((e) => e.id === ex.id) : null;
          const done = pe ? (pe.sets || []).filter((x) => x && x.d) : [];
          return `<div class="row between">${avatar(P(p))}<span class="small" style="flex:1">${esc(P(p).name)}</span><span class="small ${done.length ? '' : 'muted'}">${done.length ? done.map((x) => setStr(ex, x)).join(' · ') : 'not yet'}</span></div>`;
        }).join('')}</div>`;
      }
    }
    h += cuesHTML(ex);
    const exNote = ((S.notes[pid] || {})[ex.id]) || '';
    h += det('notes', `Notes${exNote || (en && en.note) ? ' <span class="small muted">· saved</span>' : ''}`, `<label class="fld">Setup note (shows every time)<textarea rows="2" data-in="exnote" placeholder="e.g. seat height 4, pin on 3">${esc(exNote)}</textarea></label><label class="fld">Today<textarea rows="2" data-in="note" placeholder="How did it feel?">${esc(en ? en.note : '')}</textarea></label>`, !!exNote);
    h += recordsHTML(pid, ex);
    const zoneEx = c.slotInfo ? c.slotInfo.z.ex.filter((x) => x !== ex.id) : [];
    if (zoneEx.length) h += det('swap', 'Swap exercise', `<p class="small muted">Same area (${esc(c.slotInfo.z.name.toLowerCase())}), so the whole muscle is still covered.</p><div class="lib-x">${zoneEx.map((x) => `<button data-act="swap" data-ex="${x}">${thumb(EX[x])}<span>${esc(EX[x].n)}</span></button>`).join('')}</div>`, false);
    return h;
  }

  // ---------- rest timer / toast ----------
  let timer = null;
  function startTimer(secs) { stopTimer(); timer = { end: Date.now() + secs * 1000, beeped: false }; timer.iv = setInterval(tickTimer, 250); tickTimer(); }
  function stopTimer() { if (timer) clearInterval(timer.iv); timer = null; const el = $('#timer'); el.hidden = true; }
  function tickTimer() {
    const el = $('#timer'); if (!timer) { el.hidden = true; return; }
    const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
    el.hidden = false; el.classList.toggle('done', left === 0);
    el.innerHTML = `<span class="small muted">${left ? 'Rest' : 'Go!'}</span><b>${Math.floor(left / 60)}:${pad(left % 60)}</b><button class="btn sm" data-act="t15">+15 s</button><button class="btn sm" data-act="tStop" aria-label="Stop timer">✕</button>`;
    if (!left && !timer.beeped) {
      timer.beeped = true; beep();
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* no vibration */ }
      setTimeout(() => { if (timer && timer.beeped) stopTimer(); }, 6000);
    }
  }
  let actx = null;
  function beep() {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach((d) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(0.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d + 0.18); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.2); });
    } catch (e) { /* audio unavailable */ }
  }
  let toastT = null;
  function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3800); }

  // ---------- PLAN ----------
  function viewPlan() {
    const pid = S.act, prof = P(pid), base = addDays(monday(todayISO()), S.planOff * 7), t = todayISO();
    const st = stats();
    let h = '';
    if (coaching()) {
      const pub = Object.values(S.logs).filter((l) => l.pid === pid && l.published && l.date >= t).map((l) => l.date).sort();
      h += `<div class="glass card stack"><div class="sect-h"><h2>${esc(prof.name)}'s week</h2><span class="small muted">${pub.length ? 'Published to ' + fmtDay(pub[pub.length - 1], { day: 'numeric', month: 'short' }) : 'Not published yet'}</span></div>${schedList(prof, 'cl')}
        <label class="fld">Note to ${esc(prof.name)} (shows on their Today screen)<textarea rows="2" data-in="clNote" placeholder="e.g. Focus on slow lowering this block">${esc(prof.planNote || '')}</textarea></label>
        <button class="btn pri block" data-act="publish">Publish next 4 weeks</button><p class="small muted">Publishing locks the next 4 weeks of workouts so ${esc(prof.name)} sees them in advance. Tap any day below to swap exercises for that day.</p></div><div style="height:12px"></div>`;
    } else if (prof.trainerId) {
      const tr = P(prof.trainerId);
      h += `<div class="glass card small" style="margin-bottom:10px"><b>Plan by ${esc((tr && tr.name) || 'your trainer')}.</b> ${prof.planNote ? esc(prof.planNote) : 'Your trainer sets and updates your weekly plan.'}</div>`;
    }
    h += `<div class="datebar"><button class="btn sm" data-act="week" data-d="-1" aria-label="Previous week">${ICON.back}</button><div class="mid"><b>${S.planOff === 0 ? 'This week' : S.planOff === 1 ? 'Next week' : S.planOff === -1 ? 'Last week' : 'Week of ' + fmtDay(base, { day: 'numeric', month: 'short' })}</b><div class="small muted">${fmtDay(base, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(base, 6), { day: 'numeric', month: 'short' })} · cycle week ${weekIdx(base) % 12 + 1} of 12</div></div><button class="btn sm" data-act="week" data-d="1" aria-label="Next week">${ICON.next}</button></div><div class="stack">`;
    DAYS.forEach((dk, i) => {
      const date = addDays(base, i), plan = planFor(pid, date), sl = slotsOf(plan), info = st.byLog[lid(pid, date)];
      const names = sl.map((x) => EX[exIdFor(pid, date, x.slot, plan)]).filter(Boolean).map((e) => e.n);
      const log = S.logs[lid(pid, date)];
      let status = '';
      if (!isTraining(plan)) status = '<span class="status rest">Rest</span>';
      else if (info && info.complete) status = '<span class="status done">Done ✓</span>';
      else if (info && info.sets) status = `<span class="status part">${info.sets}/${plannedOf(plan)}</span>`;
      else if (date < t && date >= (prof.created || '')) status = '<span class="status rest">Missed</span>';
      else if (log && log.published) status = '<span class="status pub">Planned</span>';
      h += `<button class="glass day ${date === t ? 'today' : ''}" data-act="gotoDate" data-date="${date}"><div class="dn"><b>${parseD(date).getDate()}</b><span>${dk}</span></div><div style="min-width:0"><h3>${esc(planTitle(plan))}</h3><div class="exn">${names.length ? esc(names.slice(0, 4).join(' · ')) + (names.length > 4 ? ` · +${names.length - 4} more` : '') : plan.cardio ? esc(EX[exIdFor(pid, date, 'cardio', plan)].n) + ` · ${plan.cardio} min` : 'Walk, rest and recover'}</div></div>${status}</button>`;
    });
    h += `</div>`;
    if (!coaching()) h += `<div class="glass card stack" style="margin-top:14px"><h3>How the plan works</h3><p class="small muted">Every muscle group is split into parts (for example back = main lift, lats, mid-back, traps & lower back). Each session takes one exercise from every part, with the heaviest main lift first. Each week a different exercise comes up for each part, so workouts stay fresh.</p>${prof.trainerId ? '' : '<button class="btn sm" data-act="tab" data-tab="me">Edit my weekly schedule</button>'}</div>`;
    return h;
  }

  // ---------- COMPETE ----------
  function viewCompete() {
    const u = me();
    if (!u.circle) {
      return `<div class="glass card stack"><h2>Compete with family or friends</h2><p class="muted small">Create a group and share its code, or join one with a code. Group members see each other's weekly points, streaks and head-to-head results. Nobody else does.</p><button class="btn pri" data-act="makeCircle">Create a group</button><div class="row" style="gap:8px"><input class="inp" data-in="joinCircle" placeholder="Group code" maxlength="6" autocapitalize="characters" style="flex:1"><button class="btn" data-act="joinCircle">Join</button></div></div>`;
    }
    const st = stats(), pids = circleIds();
    const wk = pids.map((p) => ({ p, w: st.week[p] || { pts: 0, sessions: 0, sets: 0, prs: 0 } })).sort((a, b) => b.w.pts - a.w.pts);
    const top = Math.max(1, ...wk.map((x) => x.w.pts));
    let h = `<div class="glass card row between" style="margin-bottom:12px"><div><div class="tiny muted">Group</div><b>${esc(S.circleName || 'My group')}</b><div class="small muted">Code <b class="code">${esc(u.circle)}</b> · share it to invite</div></div><button class="btn sm ghost" data-act="leaveCircle">Leave</button></div>`;
    h += `<div class="sect-h"><h2>This week</h2><span class="live"><i></i>Live scores</span></div><div class="board" style="margin-top:10px">`;
    wk.forEach((x, i) => {
      const Pp = P(x.p);
      h += `<div class="glass card"><div class="pl-row">${avatar(Pp, true)}<div style="min-width:0"><b style="font-size:18px">${esc(Pp.name)}${i === 0 && x.w.pts > 0 ? ' <span class="crown">♛</span>' : ''}${x.p === S.uid ? ' <span class="small muted">(you)</span>' : ''}</b><div class="bar"><i style="width:${Math.round((x.w.pts / top) * 100)}%;background:${esc(Pp.color)}"></i></div></div><div class="pts">${x.w.pts}<small>points</small></div></div>
        <div class="mini"><div><b>${x.w.sessions}</b><span>Sessions</span></div><div><b>${x.w.sets}</b><span>Sets</span></div><div><b>${x.w.prs}</b><span>PRs</span></div><div><b>${st.streak[x.p] || 0}</b><span>Streak</span></div></div></div>`;
    });
    h += `</div>`;
    if (pids.length < 2) h += `<div class="glass card empty" style="margin-top:12px">Share code <b class="code">${esc(u.circle)}</b>. Once others join, their scores appear here live.</div>`;
    const date = todayISO(), plan = planFor(S.uid, date), sl = slotsOf(plan);
    if (sl.length && pids.length > 1) {
      h += `<div class="sect"><div class="sect-h"><h2>Today, head to head</h2></div><p class="small muted">Each move goes to whoever beat their own previous best by the most, so different strength levels compete fairly.</p><div class="glass card h2h">`;
      let waiting = 0;
      sl.forEach((x) => {
        const ex = EX[exIdFor(S.uid, date, x.slot, plan)]; if (!ex) return;
        const rows = pids.map((p) => {
          const l = S.logs[lid(p, date)]; const en = l && l.ex ? Object.values(l.ex).find((e) => e.id === ex.id) : null;
          const eb = en ? entryBest(ex, en) : null; if (!eb || !eb.best) return { p, none: true };
          const pb = prevBest(p, ex.id, date);
          return { p, best: eb.best, imp: pb ? (eb.best.v / pb.v - 1) * 100 : null };
        });
        if (rows.every((r) => r.none)) { waiting++; return; }
        const scored = rows.filter((r) => !r.none && r.imp != null);
        const win = scored.length > 1 ? scored.reduce((a, b) => (b.imp > a.imp ? b : a)) : null;
        h += `<div><b>${esc(ex.n)}</b><div class="vs">${rows.map((r) => `<div class="${win && win.p === r.p ? 'win' : ''}"><div class="row" style="gap:8px">${avatar(P(r.p))}<span>${esc(P(r.p).name)}${win && win.p === r.p ? ' <span class="crown">♛</span>' : ''}</span></div><div style="margin-top:4px">${r.none ? '<span class="muted">Not yet</span>' : `${esc(setStr(ex, r.best, true))} · ${r.imp == null ? '<span class="muted">first time</span>' : `<b style="color:${r.imp >= 0 ? 'var(--good)' : 'var(--bad)'}">${r.imp >= 0 ? '+' : ''}${r.imp.toFixed(1)}%</b>`}`}</div></div>`).join('')}</div></div>`;
      });
      if (waiting) h += `<div class="muted small">${waiting === sl.length ? 'No sets logged yet today.' : `${waiting} more move${waiting > 1 ? 's' : ''} not started yet.`}</div>`;
      h += `</div></div>`;
    }
    h += `<div class="sect"><div class="glass card stack"><h3>How points work</h3><div class="hist"><div><span>Each set done</span><b>+10</b></div><div><span>Cardio finished</span><b>+15</b></div><div><span>Beat your own record on a move</span><b>+20</b></div><div><span>Every set of the day completed</span><b>+25</b></div></div></div></div>`;
    return h;
  }

  // ---------- PROGRESS: report / records / library ----------
  function mainLiftIds() { const s = new Set(); GROUP_ORDER.forEach((g) => { if (GROUPS[g].kind === 'strength') GROUPS[g].zones[0].ex.forEach((x) => s.add(x)); }); return s; }
  function report(pid) {
    const prof = P(pid), t = todayISO(), st = stats();
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const start = addDays(monday(t), -7 * w); let planned = 0, done = 0, sets = 0, vol = 0, pts = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i); if (d > t) break; if (d < (prof.created || '')) continue;
        const plan = planFor(pid, d); const info = st.byLog[lid(pid, d)];
        if (isTraining(plan)) planned++;
        if (info) { if (info.done) done++; sets += info.sets; pts += info.pts; }
        const l = S.logs[lid(pid, d)];
        if (l) Object.values(l.ex || {}).forEach((en) => { const ex = EX[en.id]; if (ex && ex.m === 'wr') (en.sets || []).forEach((s) => { if (s && s.d) vol += (+s.w || 0) * (+s.r || 0); }); });
      }
      weeks.push({ start, planned, done, sets, vol: Math.round(vol), pts });
    }
    const hist = st.hist[pid] || {}, since = addDays(t, -56), mains = mainLiftIds();
    const lifts = Object.keys(hist).map((x) => ({ x, h: hist[x].filter((e) => e.date >= since) })).filter((o) => o.h.length >= 2 && EX[o.x].m === 'wr')
      .map((o) => { const f = o.h[0], l = o.h[o.h.length - 1]; return { ex: EX[o.x], main: mains.has(o.x), first: f, last: l, pct: (l.v / f.v - 1) * 100, n: o.h.length }; })
      .sort((a, b) => (b.main - a.main) || (b.n - a.n)).slice(0, 8);
    let prs = 0; const pain = [];
    Object.values(S.logs).forEach((l) => {
      if (l.pid !== pid || l.date < addDays(t, -28)) return;
      const i = st.byLog[lid(pid, l.date)]; if (i) prs += i.prs.length;
      Object.values(l.ex || {}).forEach((en) => { if (en.pain) pain.push({ date: l.date, ex: EX[en.id], note: en.note }); });
    });
    const planned = weeks.reduce((a, w) => a + w.planned, 0), done = weeks.reduce((a, w) => a + w.done, 0);
    return { weeks, lifts, prs, pain: pain.sort((a, b) => (a.date < b.date ? 1 : -1)), planned, done, att: planned ? Math.round((done / planned) * 100) : 0, sets: weeks.reduce((a, w) => a + w.sets, 0) };
  }
  function viewReport(pid) {
    const r = report(pid), prof = P(pid), st = stats();
    const maxS = Math.max(1, ...r.weeks.map((w) => w.planned));
    let h = `<div class="glass card stack"><div class="sect-h"><h2>${pid === S.uid ? 'My progress' : esc(prof.name) + "'s progress"}</h2><span class="small muted">last 4 weeks</span></div>
      <div class="mini"><div><b>${r.att}%</b><span>Attendance</span></div><div><b>${r.done}/${r.planned}</b><span>Sessions</span></div><div><b>${r.sets}</b><span>Sets</span></div><div><b>${r.prs}</b><span>Records</span></div></div>
      <div class="weeks">${r.weeks.map((w) => `<div class="wk"><div class="wkbar"><i style="height:${Math.round((w.planned / maxS) * 100)}%" class="pl"></i><i style="height:${Math.round((w.done / maxS) * 100)}%" class="dn"></i></div><b>${w.done}/${w.planned}</b><span>${fmtDay(w.start, { day: 'numeric', month: 'short' })}</span></div>`).join('')}</div>
      <div class="small muted">Bars: sessions done (green) out of planned, per week. Streak: ${st.streak[pid] || 0} session${(st.streak[pid] || 0) === 1 ? '' : 's'}.</div></div>`;
    h += `<div class="sect"><h2>Strength change</h2><div class="glass card">${r.lifts.length ? `<div class="hist">${r.lifts.map((l) => `<div><span>${l.main ? '<b>' : ''}${esc(l.ex.n)}${l.main ? '</b>' : ''}<br><span class="small muted">${toDisp(l.first.w)}→${toDisp(l.last.w)} ${unit()} · ${l.n} sessions</span></span><b style="color:${l.pct >= 0 ? 'var(--good)' : 'var(--bad)'}">${l.pct >= 0 ? '+' : ''}${l.pct.toFixed(1)}%</b></div>`).join('')}</div><p class="small muted" style="margin-top:6px">Change in estimated strength (weight and reps combined) from the first to the latest session in the last 8 weeks.</p>` : '<p class="small muted">Shows once an exercise has been logged in at least 2 sessions.</p>'}</div></div>`;
    h += `<div class="sect"><h2>Pain notes</h2><div class="glass card">${r.pain.length ? `<div class="hist">${r.pain.slice(0, 8).map((p) => `<div><span>${esc(p.ex ? p.ex.n : '')}${p.note ? '<br><span class="small muted">' + esc(p.note) + '</span>' : ''}</span><span class="small">${fmtDay(p.date)}</span></div>`).join('')}</div>` : '<p class="small muted">None in the last 4 weeks.</p>'}</div></div>`;
    return h;
  }
  function viewRecords() {
    let h = `<div class="seg"><button class="${S.recTab === 'report' ? 'on' : ''}" data-act="recTab" data-t="report">Report</button><button class="${S.recTab === 'mine' ? 'on' : ''}" data-act="recTab" data-t="mine">Records</button><button class="${S.recTab === 'lib' ? 'on' : ''}" data-act="recTab" data-t="lib">Exercises</button></div><div style="height:12px"></div>`;
    if (S.recTab === 'report') return h + viewReport(S.uid);
    if (S.recTab === 'lib') {
      h += `<p class="small muted" style="margin:0 2px 10px">Tap any exercise to see its form animation and tips.</p><div class="stack">`;
      GROUP_ORDER.forEach((g) => {
        const G = GROUPS[g];
        h += `<div class="glass lib-g"><h2>${esc(G.name)}</h2>${G.zones.map((z, i) => `<div class="lib-z"><div class="tiny ${i === 0 && G.kind === 'strength' ? '' : 'muted'}" style="${i === 0 && G.kind === 'strength' ? 'color:var(--amber)' : ''}">${esc(z.name)} · ${esc(z.covers)}</div><div class="lib-x">${z.ex.map((x) => `<button data-act="view" data-ex="${x}">${thumb(EX[x])}<span>${esc(EX[x].n)}</span></button>`).join('')}</div></div>`).join('')}</div>`;
      });
      h += `<div class="glass lib-g"><h2>Cardio</h2><div class="lib-x">${CARDIO.map((x) => `<button data-act="view" data-ex="${x}">${thumb(EX[x])}<span>${esc(EX[x].n)}</span></button>`).join('')}</div></div></div>`;
      return h;
    }
    const st = stats(), best = st.best[S.uid] || {}, hist = st.hist[S.uid] || {};
    const ids = Object.keys(best);
    if (!ids.length) return h + `<div class="glass card empty">Your personal records appear here after you log your first sets.</div>`;
    const shown = new Set();
    const sections = GROUP_ORDER.map((g) => [GROUPS[g].name, GROUPS[g].zones.flatMap((z) => z.ex).filter((x) => best[x] && !shown.has(x) && (shown.add(x), true))]);
    sections.push(['Other', ids.filter((x) => !shown.has(x))]);
    sections.forEach(([name, list]) => {
      if (!list.length) return;
      h += `<div class="sect"><h2>${esc(name)}</h2><div class="glass exlist">${list.map((x) => { const ex = EX[x], b = best[x]; const val = ex.m === 'wr' ? (b.maxW ? `${toDisp(b.maxW)} ${unit()} top · ${b.maxR} reps max` : `${b.maxR} reps`) : ex.m === 't' ? `${b.maxR} s longest` : ex.m === 'wt' ? `${toDisp(b.maxW)} ${unit()} · ${b.maxR} s` : `${b.maxR} reps max`; return `<button class="ex" data-act="view" data-ex="${x}"><div class="thumb">${thumb(ex)}</div><div><div class="nm">${esc(ex.n)}</div><div class="meta">${esc(val)}</div></div><div class="small muted">${hist[x].length}×</div></button>`; }).join('')}</div></div>`;
    });
    return h;
  }

  // ---------- CLIENTS (trainer) ----------
  function flags(pid) {
    const out = [], t = todayISO(), prof = P(pid), st = stats();
    let checked = 0, missed = 0, d = addDays(t, -1), guard = 0;
    while (checked < 2 && guard++ < 21) {
      if (d < (prof.created || '')) break;
      const p = planFor(pid, d);
      if (isTraining(p)) { checked++; const i = st.byLog[lid(pid, d)]; if (!(i && i.done)) missed++; }
      d = addDays(d, -1);
    }
    if (checked === 2 && missed === 2) out.push(['bad', 'Missed last 2 sessions']);
    if (Object.values(S.logs).some((l) => l.pid === pid && l.date >= addDays(t, -7) && Object.values(l.ex || {}).some((e) => e.pain))) out.push(['bad', 'Pain reported']);
    const hist = st.hist[pid] || {}, mains = mainLiftIds(), cut = addDays(t, -21);
    Object.keys(hist).forEach((x) => {
      if (!mains.has(x)) return;
      const recent = hist[x].filter((e) => e.date >= cut), before = hist[x].filter((e) => e.date < cut);
      if (recent.length >= 3 && before.length && Math.max(...recent.map((e) => e.v)) <= Math.max(...before.map((e) => e.v))) out.push(['warn', 'Stalled: ' + EX[x].n]);
    });
    const pub = Object.values(S.logs).filter((l) => l.pid === pid && l.published && l.date >= t).map((l) => l.date).sort();
    if (!pub.length) out.push(['info', 'No plan published']);
    else { const n = daysBetween(t, pub[pub.length - 1]); if (n < 7) out.push(['warn', `Plan ends in ${n} day${n === 1 ? '' : 's'}`]); }
    return out;
  }
  function attendance(pid, days) {
    const t = todayISO(), prof = P(pid), st = stats(); let planned = 0, done = 0;
    for (let i = 1; i <= days; i++) { const d = addDays(t, -i); if (d < (prof.created || '')) break; if (isTraining(planFor(pid, d))) { planned++; const x = st.byLog[lid(pid, d)]; if (x && x.done) done++; } }
    const x = st.byLog[lid(pid, t)]; if (x && x.done) { planned++; done++; }
    return { planned, done };
  }
  function viewClients() {
    const u = me(), ids = Object.keys(S.src.clients).filter((x) => S.users[x]);
    let h = `<div class="glass card stack"><div class="sect-h"><h2>Invite clients</h2></div>${u.inviteCode ? `<div class="row between"><div><div class="tiny muted">Your trainer code</div><div class="code big">${esc(u.inviteCode)}</div></div><button class="btn sm" data-act="copyCode" data-c="${esc(u.inviteCode)}">Copy</button></div><p class="small muted">Clients sign in with Google and enter this code (Me → My trainer). They then appear below.</p>` : `<p class="small muted">Create a code that your clients enter to link to you.</p><button class="btn pri" data-act="makeInvite">Create my trainer code</button>`}</div>`;
    if (!ids.length) return h + `<div class="glass card empty" style="margin-top:12px">No clients yet.</div>`;
    const rows = ids.map((c) => ({ c, f: flags(c), a: attendance(c, 14) })).sort((a, b) => b.f.filter((x) => x[0] === 'bad').length - a.f.filter((x) => x[0] === 'bad').length || P(a.c).name.localeCompare(P(b.c).name));
    const needs = rows.filter((r) => r.f.some((x) => x[0] !== 'info')).length;
    h += `<div class="sect"><div class="sect-h"><h2>Clients · ${ids.length}</h2><span class="small ${needs ? 'warn' : 'muted'}">${needs ? needs + ' need attention' : 'All on track'}</span></div><div class="stack">`;
    rows.forEach(({ c, f, a }) => {
      const p = P(c), t = todayISO(), plan = planFor(c, t), i = stats().byLog[lid(c, t)];
      h += `<button class="glass client" data-act="coach" data-u="${c}"><div class="row between"><div class="row">${avatar(p, true)}<div><b>${esc(p.name)}</b><div class="small muted">Today: ${esc(planTitle(plan))}${i && i.sets ? ` · ${i.sets}/${plannedOf(plan)} sets` : ''}</div></div></div><div class="pts" style="font-size:22px">${a.planned ? Math.round((a.done / a.planned) * 100) + '%' : '—'}<small>2-wk attend.</small></div></div>${f.length ? `<div class="chips" style="margin-top:8px">${f.map(([k, txt]) => `<span class="flag ${k}">${esc(txt)}</span>`).join('')}</div>` : ''}</button>`;
    });
    h += `</div></div>`;
    return h;
  }

  // ---------- ME / SETTINGS ----------
  function groupTuneRow(obj, g, prefix) {
    const zs = GROUPS[g].zones, cnt = profCount(obj, g), n = profSets(obj, g);
    const note = cnt < zs.length ? `Skips ${zs.slice(cnt).map((z) => z.name.toLowerCase()).join(', ')}` : cnt > zs.length ? `Adds ${cnt - zs.length} extra from ${zs.slice(1).map((z) => z.name.toLowerCase()).slice(0, cnt - zs.length).join(', ')}` : 'Covers the whole muscle';
    const opts = (lo, hi, v, lbl) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${k} ${lbl}${k === 1 ? '' : 's'}</option>`).join('');
    return `<div class="tune"><div class="tune-h"><b>${esc(GROUPS[g].name)}</b><span class="small ${cnt < zs.length ? 'warn' : 'muted'}">${esc(note)}</span></div><div class="tune-sel"><select class="inp sm" data-in="${prefix}Count" data-g="${g}" aria-label="Exercises for ${esc(GROUPS[g].name)}">${opts(1, zs.length + 2, cnt, 'exercise')}</select><select class="inp sm" data-in="${prefix}Sets" data-g="${g}" aria-label="Sets for ${esc(GROUPS[g].name)}">${opts(1, 6, n, 'set')}</select></div></div>`;
  }
  function schedEditor(obj, day, prefix) {
    const spec = (obj.schedule || {})[day] || { groups: [], cardio: 0 };
    const cur = PRESETS.find((p) => p.groups.slice().sort().join(',') === (spec.groups || []).slice().sort().join(',') && (p.groups.length || p.cardio === +spec.cardio || (!p.cardio && !+spec.cardio)));
    const gs = sortGroups(spec.groups || []);
    return `<div class="stack" style="margin-top:10px"><div class="tiny muted">Quick pick</div><div class="chips">${PRESETS.map((p) => `<button class="chip ${cur && cur.id === p.id ? 'on' : ''}" data-act="${prefix}Preset" data-day="${day}" data-p="${p.id}">${esc(p.name)}</button>`).join('')}</div>
      <div class="tiny muted">Or build your own combination</div><div class="chips">${GROUP_ORDER.map((g) => `<button class="chip ${(spec.groups || []).includes(g) ? 'on' : ''}" data-act="${prefix}Group" data-day="${day}" data-g="${g}">${esc(GROUPS[g].name)}</button>`).join('')}</div>
      ${gs.length ? `<div class="tiny muted">Exercises and sets per muscle group</div><div class="tunes">${gs.map((g) => groupTuneRow(obj, g, prefix)).join('')}</div>` : ''}
      <label class="fld">Cardio finisher<select class="inp sm" data-in="${prefix}Cardio" data-day="${day}">${[0, 10, 15, 20, 30, 45].map((m) => `<option value="${m}" ${+spec.cardio === m ? 'selected' : ''}>${m ? m + ' minutes' : 'None'}</option>`).join('')}</select></label>
      <button class="btn sm" data-act="${prefix}DayDone">Done</button></div>`;
  }
  function schedList(obj, prefix, readOnly) {
    const sched = obj.schedule || {};
    return `<div class="sched">${DAYS.map((d) => {
      const spec = sched[d] || { groups: [], cardio: 0 };
      const open = !readOnly && S.editDay === prefix + d;
      const gs = sortGroups(spec.groups || []);
      const n = gs.reduce((a, g) => a + profCount(obj, g), 0);
      const sets = gs.reduce((a, g) => a + profCount(obj, g) * profSets(obj, g), 0);
      const line = `<div><b>${DAY_NAMES[d]}</b><div class="small muted">${esc(specTitle(spec))}${n ? ` · ${n} exercises · ${sets} sets` : ''}${+spec.cardio ? ` · ${spec.cardio} min cardio` : ''}</div></div>`;
      return readOnly ? `<div>${line}</div>` : `<div><button class="row between" style="width:100%;text-align:left" data-act="${prefix}Edit" data-day="${d}">${line}<span class="small" style="color:var(--teal)">${open ? 'Close' : 'Edit'}</span></button>${open ? schedEditor(obj, d, prefix) : ''}</div>`;
    }).join('')}</div>`;
  }
  function viewMe() {
    const p = me();
    const tr = p.trainerId ? P(p.trainerId) : null;
    let h = `<div class="glass card stack"><div class="row">${avatar(p, true)}<div style="min-width:0"><h2>${esc(p.name)}</h2><div class="small muted">${esc(S.user.email)}${isTrainer() ? ' · Trainer' : ''}${S.isAdmin ? ' · Admin' : ''}</div></div></div>
      <label class="fld">Name<input class="inp" data-in="pname" value="${esc(p.name)}" maxlength="24"></label>
      <div class="swatches">${COLORS.map((c) => `<button data-act="color" data-c="${c}" class="${p.color === c ? 'on' : ''}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('')}</div></div>`;
    h += `<div class="sect"><h2>My trainer</h2><div class="glass card stack">${p.trainerId ? `<div class="row between"><div class="row">${avatar(tr)}<b>${esc((tr && tr.name) || 'Linked')}</b></div><button class="btn sm ghost" data-act="leaveTrainer">Unlink</button></div><p class="small muted">Your trainer can see your plan and progress, set your weekly schedule and log sessions with you.</p>` : `<p class="small muted">Training with a personal trainer? Enter the code they give you.</p><div class="row" style="gap:8px"><input class="inp" data-in="joinTrainer" placeholder="Trainer code" maxlength="6" autocapitalize="characters" style="flex:1"><button class="btn" data-act="joinTrainer">Link</button></div>`}</div></div>`;
    h += `<div class="sect"><div class="sect-h"><h2>My week</h2></div>`;
    if (p.trainerId) h += `<p class="small muted">Set by your trainer.</p><div class="glass card">${schedList(p, 'me', true)}</div></div>`;
    else h += `<p class="small muted">Pick what you train each day. Each muscle group includes one exercise for every part of that muscle, heaviest main lift first.</p><div class="glass card">${schedList(p, 'me')}</div><button class="btn sm ghost" data-act="useRec" style="align-self:flex-start">Reset to recommended 5-day plan</button></div>`;
    h += `<div class="sect"><h2>Settings</h2><div class="glass card stack"><div class="row between"><span>Weight units</span><div class="seg" style="width:140px"><button class="${unit() === 'kg' ? 'on' : ''}" data-act="unit" data-u="kg">kg</button><button class="${unit() === 'lb' ? 'on' : ''}" data-act="unit" data-u="lb">lb</button></div></div><div class="row between"><span>Beep when rest is over</span><div class="seg" style="width:140px"><button class="${S.sound ? 'on' : ''}" data-act="sound" data-v="1">On</button><button class="${!S.sound ? 'on' : ''}" data-act="sound" data-v="0">Off</button></div></div>${!isTrainer() ? (p.wantsTrainer ? '<p class="small muted">Trainer access requested. The admin will approve it.</p>' : '<button class="btn sm ghost" data-act="askTrainer" style="align-self:flex-start">I\'m a trainer: request trainer access</button>') : ''}<button class="btn sm" data-act="signOut" style="align-self:flex-start">Sign out</button></div></div>`;
    if (S.isAdmin) h += `<div class="sect"><div class="glass card row between"><div><b>Admin dashboard</b><div class="small muted">Users, activity, trainers and approvals</div></div><button class="btn sm teal" data-act="tab" data-tab="admin">Open</button></div></div>`;
    h += `<div class="sect"><h2>Put it on your home screen</h2><div class="glass card stack small"><p><b>iPhone:</b> open in Safari, tap Share, then <b>Add to Home Screen</b>.</p><p><b>Android:</b> open in Chrome, tap ⋮, then <b>Add to Home screen</b> (or <b>Install app</b>).</p></div></div>`;
    h += `<p class="small faint" style="margin:18px 2px">Check with your doctor before starting a new training plan. Stop any exercise that causes sharp pain, dizziness or chest discomfort.</p>`;
    return h;
  }
  // ---------- ADMIN DASHBOARD ----------
  const relDay = (d) => { if (!d) return 'never'; const n = daysBetween(d, todayISO()); return n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; };
  function barChart(days, vals, color, unitLbl) {
    const W = 336, H = 132, padL = 22, padB = 20, padT = 14, n = days.length;
    const max = Math.max(1, ...vals), bw = (W - padL - 4) / n, g = 2;
    const y = (v) => H - padB - (v / max) * (H - padB - padT);
    let o = `<svg viewBox="0 0 ${W} ${H}" class="achart" role="img" aria-label="${esc(unitLbl)} per day, last ${n} days">`;
    o += `<line x1="${padL}" x2="${W}" y1="${y(max)}" y2="${y(max)}" class="agrid"/><line x1="${padL}" x2="${W}" y1="${H - padB}" y2="${H - padB}" class="abase"/>`;
    o += `<text x="${padL - 4}" y="${y(max) + 4}" class="atick" text-anchor="end">${max}</text><text x="${padL - 4}" y="${H - padB + 4}" class="atick" text-anchor="end">0</text>`;
    const maxI = vals.lastIndexOf(max);
    days.forEach((d, i) => {
      const x = padL + i * bw + g / 2, w = Math.max(2, bw - g), v = vals[i], top = y(v), h = H - padB - top;
      const r = Math.min(4, w / 2, h);
      const path = v > 0 ? `M${x} ${H - padB}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + w - r}Q${x + w} ${top} ${x + w} ${top + r}V${H - padB}Z` : '';
      const tip = `${fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}: ${v} ${unitLbl}`;
      o += `<g data-tip="${esc(tip)}"><rect x="${padL + i * bw}" y="${padT}" width="${bw}" height="${H - padT - padB}" fill="transparent"/>${path ? `<path d="${path}" fill="${color}"/>` : ''}</g>`;
      if ((i === maxI || i === n - 1) && v > 0) o += `<text x="${x + w / 2}" y="${top - 4}" class="aval" text-anchor="middle">${v}</text>`;
      if (i % 2 === (n - 1) % 2) o += `<text x="${x + w / 2}" y="${H - 5}" class="atick" text-anchor="middle">${parseD(d).getDate()}</text>`;
    });
    return o + '</svg>';
  }
  function adminData() {
    const t = todayISO(), st = stats();
    const all = Object.keys(S.src.all).map((u) => [u, S.users[u] || S.src.all[u]]).filter((x) => x[1]);
    const logsBy = {}; Object.values(S.logs).forEach((l) => { (logsBy[l.pid] = logsBy[l.pid] || []).push(l); });
    const active = (u, d) => { const i = st.byLog[lid(u, d)]; return !!(i && (i.sets > 0 || i.cardioDone)); };
    const info = {};
    all.forEach(([u, d]) => {
      let last = '', s7 = 0, sets7 = 0, total = 0, pain = [];
      (logsBy[u] || []).forEach((l) => {
        if (l.date > t) return;
        const i = st.byLog[lid(u, l.date)]; if (!i) return;
        if (i.sets > 0 || i.cardioDone) { if (l.date > last) last = l.date; }
        if (i.done) total++;
        if (l.date >= addDays(t, -6)) { if (i.done) s7++; sets7 += i.sets; Object.values(l.ex || {}).forEach((en) => { if (en.pain) pain.push({ date: l.date, ex: EX[en.id], note: en.note }); }); }
      });
      info[u] = { last, s7, sets7, total, pain, streak: st.streak[u] || 0 };
    });
    const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
    const dau = days.map((d) => all.filter(([u]) => active(u, d)).length);
    const sess = days.map((d) => all.filter(([u]) => { const i = st.byLog[lid(u, d)]; return i && i.done; }).length);
    const exCount = {};
    Object.values(S.logs).forEach((l) => { if (l.date < addDays(t, -29) || l.date > t) return; Object.values(l.ex || {}).forEach((en) => { const n = (en.sets || []).filter((x) => x && x.d).length; if (n && EX[en.id]) exCount[en.id] = (exCount[en.id] || 0) + n; }); });
    return { t, all, info, days, dau, sess, exCount };
  }
  function adminUserRows(D) {
    const q = (S.adminQ || '').toLowerCase();
    const rows = D.all.filter(([, d]) => !q || (d.name || '').toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q))
      .sort((a, b) => (D.info[b[0]].last || '').localeCompare(D.info[a[0]].last || '') || (a[1].name || '').localeCompare(b[1].name || ''));
    if (!rows.length) return '<p class="small muted" style="padding:12px">No users match.</p>';
    return `<div class="atable"><div class="atr ath"><span>User</span><span>Last active</span><span>7-day</span><span>Total</span></div>${rows.map(([u, d]) => {
      const i = D.info[u]; const role = d.role === 'trainer' ? 'Trainer' : d.trainerId ? 'Trainee' : 'Member';
      const tr = d.trainerId && S.users[d.trainerId] ? ' · ' + S.users[d.trainerId].name : '';
      return `<button class="atr" data-act="adminUser" data-u="${u}"><span class="row" style="gap:8px;min-width:0">${avatar(d)}<span style="min-width:0"><b>${esc(d.name || '—')}</b><span class="small muted ellip">${esc(role + tr)} · ${esc(d.email || '')}</span></span></span><span class="small ${i.last === D.t ? 'good' : !i.last || daysBetween(i.last, D.t) > 6 ? 'warn' : ''}">${relDay(i.last)}</span><span class="num">${i.s7}<small> sess</small></span><span class="num">${i.total}</span></button>`;
    }).join('')}</div>`;
  }
  function viewAdminUser(u) {
    const d = S.users[u] || S.src.all[u]; if (!d) { S.adminUser = null; return viewAdminDash(); }
    const D = adminData(), i = D.info[u];
    const tr = d.trainerId && S.users[d.trainerId];
    const recent = Object.values(S.logs).filter((l) => l.pid === u && l.date <= D.t && ((stats().byLog[lid(u, l.date)] || {}).sets > 0)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
    let h = `<button class="btn sm ghost" data-act="adminBack" style="margin-bottom:8px">${ICON.back} All users</button>
      <div class="glass card stack"><div class="row">${avatar(d, true)}<div style="min-width:0"><h2>${esc(d.name)}</h2><div class="small muted">${esc(d.email || '')}</div></div></div>
      <div class="mini"><div><b>${relDay(i.last)}</b><span>Last active</span></div><div><b>${i.s7}</b><span>Sessions 7d</span></div><div><b>${i.total}</b><span>All sessions</span></div><div><b>${i.streak}</b><span>Streak</span></div></div>
      <div class="small muted">${d.role === 'trainer' ? 'Trainer' : d.trainerId ? 'Trainee' : 'Member'}${tr ? ' · trainer: ' + esc(tr.name) : ''}${d.circle ? ' · group ' + esc(d.circle) : ''} · joined ${esc(d.created || '—')}</div></div>`;
    h += `<div class="sect"><h2>Recent sessions</h2><div class="glass card">${recent.length ? `<div class="hist">${recent.map((l) => { const p = l.plan || planFor(u, l.date); const bi = stats().byLog[lid(u, l.date)]; return `<div><span>${fmtDay(l.date)}<br><span class="small muted">${esc(planTitle(p))}</span></span><span class="small">${bi.sets}/${bi.planned} sets · ${bi.pts} pts</span></div>`; }).join('')}</div>` : '<p class="small muted">No sessions logged yet.</p>'}</div></div>`;
    h += `<div class="sect">${viewReport(u)}</div>`;
    return h;
  }
  function viewAdminDash() {
    if (!S.isAdmin) return '<div class="glass card empty">Admins only.</div>';
    if (S.adminUser) return viewAdminUser(S.adminUser);
    const D = adminData(), t = D.t, all = D.all, info = D.info;
    const trainers = all.filter(([, d]) => d.role === 'trainer');
    const trainees = all.filter(([, d]) => d.trainerId);
    const newUsers = all.filter(([, d]) => (d.created || '') >= addDays(t, -6)).length;
    const act7 = all.filter(([u]) => info[u].last && info[u].last >= addDays(t, -6)).length;
    const sess7 = all.reduce((a, [u]) => a + info[u].s7, 0), sets7 = all.reduce((a, [u]) => a + info[u].sets7, 0);
    const groups = new Set(all.map(([, d]) => d.circle).filter(Boolean)).size;
    const reqs = all.filter(([, d]) => d.wantsTrainer && d.role !== 'trainer');
    const pains = all.flatMap(([u, d]) => info[u].pain.map((p) => ({ u, d, p })));
    const idle = all.filter(([u, d]) => (d.created || t) <= addDays(t, -7) && (!info[u].last || info[u].last < addDays(t, -6)));
    const kpi = (v, l, sub) => `<div class="kpi glass"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    let h = `<div class="kpis">${kpi(all.length, 'Users', `+${newUsers} this week`)}${kpi(D.dau[13], 'Active today', `${act7} in 7 days`)}${kpi(sess7, 'Sessions', 'last 7 days')}${kpi(sets7, 'Sets logged', 'last 7 days')}${kpi(trainers.length, 'Trainers', `${trainees.length} trainees`)}${kpi(groups, 'Groups', 'family / friends')}</div>`;
    h += `<div class="sect"><div class="glass card stack"><div class="sect-h"><h3>Active users per day</h3><span class="small muted">last 14 days</span></div>${barChart(D.days, D.dau, '#BF8520', 'active users')}</div>
      <div class="glass card stack"><div class="sect-h"><h3>Workouts completed per day</h3><span class="small muted">last 14 days</span></div>${barChart(D.days, D.sess, '#1FA08E', 'workouts')}</div>
      ${det('adTable', 'Numbers behind the charts', `<div class="hist">${D.days.slice().reverse().map((d, i) => `<div><span>${fmtDay(d)}</span><span class="small">${D.dau[13 - i]} active · ${D.sess[13 - i]} workouts</span></div>`).join('')}</div>`, false)}</div>`;
    const attention = reqs.length + pains.length + idle.length;
    h += `<div class="sect"><div class="sect-h"><h2>Needs attention</h2><span class="small ${attention ? 'warn' : 'muted'}">${attention ? attention + (attention === 1 ? ' item' : ' items') : 'All clear'}</span></div><div class="glass card stack">`;
    if (!attention) h += '<p class="small muted">No trainer requests, pain reports or inactive users.</p>';
    reqs.forEach(([u, d]) => { h += `<div class="row between"><div class="row">${avatar(d)}<div><b>${esc(d.name)}</b><div class="small muted">Wants trainer access · ${esc(d.email || '')}</div></div></div><button class="btn sm teal" data-act="setRole" data-u="${u}" data-r="trainer">Approve</button></div>`; });
    pains.slice(0, 8).forEach(({ u, d, p }) => { const tr = d.trainerId && S.users[d.trainerId]; h += `<button class="row between" style="width:100%;text-align:left" data-act="adminUser" data-u="${u}"><div class="row">${avatar(d)}<div><b>${esc(d.name)}</b> <span class="flag bad">Pain</span><div class="small muted">${esc(p.ex ? p.ex.n : '')} · ${fmtDay(p.date)}${tr ? ' · trainer ' + esc(tr.name) : ''}${p.note ? ' · “' + esc(p.note) + '”' : ''}</div></div></div></button>`; });
    idle.slice(0, 8).forEach(([u, d]) => { h += `<button class="row between" style="width:100%;text-align:left" data-act="adminUser" data-u="${u}"><div class="row">${avatar(d)}<div><b>${esc(d.name)}</b> <span class="flag warn">Inactive</span><div class="small muted">Last active ${relDay(info[u].last)} · joined ${esc(d.created || '')}</div></div></div></button>`; });
    h += `</div></div>`;
    h += `<div class="sect"><h2>Trainers</h2><div class="glass card">${trainers.length ? `<div class="atable"><div class="atr ath t4"><span>Trainer</span><span>Clients</span><span>Active 7d</span><span>Attend. 14d</span></div>${trainers.map(([u, d]) => {
      const cl = all.filter(([, x]) => x.trainerId === u).map(([c]) => c);
      const actC = cl.filter((c) => info[c].last && info[c].last >= addDays(t, -6)).length;
      let pl = 0, dn = 0; cl.forEach((c) => { const a = attendance(c, 14); pl += a.planned; dn += a.done; });
      return `<div class="atr t4"><span class="row" style="gap:8px">${avatar(d)}<span><b>${esc(d.name)}</b><span class="small muted ellip">code ${esc(d.inviteCode || '—')}</span></span></span><span class="num">${cl.length}</span><span class="num">${actC}</span><span class="num">${pl ? Math.round((dn / pl) * 100) + '%' : '—'}</span></div>`;
    }).join('')}</div>` : '<p class="small muted">No trainers yet. Approve requests above, or open a user and make them a trainer.</p>'}</div></div>`;
    const top = Object.entries(D.exCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) {
      const mx = top[0][1];
      h += `<div class="sect"><div class="sect-h"><h2>Most logged exercises</h2><span class="small muted">sets, last 30 days</span></div><div class="glass card stack">${top.map(([id, n]) => `<div class="hbar" data-tip="${esc(EX[id].n)}: ${n} sets"><span class="small">${esc(EX[id].n)}</span><div class="hbar-t"><i style="width:${Math.max(3, Math.round((n / mx) * 100))}%"></i></div><b class="num">${n}</b></div>`).join('')}</div></div>`;
    }
    h += `<div class="sect"><div class="sect-h"><h2>All users</h2><span class="small muted">${all.length}</span></div><input class="inp" data-in="adminQ" placeholder="Search name or email" value="${esc(S.adminQ || '')}" autocomplete="off"><div class="glass card" id="adminUsers" style="padding:4px 6px">${adminUserRows(D)}</div></div>`;
    h += `<p class="small faint" style="margin:14px 2px">Live: updates as people log. Only admins see this tab.</p>`;
    return h;
  }
  function viewAdmin() {
    const all = Object.keys(S.src.all).map((u) => [u, S.users[u] || S.src.all[u]]).filter((x) => x[1]);
    const reqs = all.filter(([, d]) => d.wantsTrainer && d.role !== 'trainer');
    const trainers = all.filter(([, d]) => d.role === 'trainer');
    const clientsOf = (u) => all.filter(([, d]) => d.trainerId === u).length;
    return `<div class="sect"><h2>Admin</h2><div class="glass card stack"><div class="mini"><div><b>${all.length}</b><span>Users</span></div><div><b>${trainers.length}</b><span>Trainers</span></div><div><b>${all.filter(([, d]) => d.trainerId).length}</b><span>Trainees</span></div><div><b>${reqs.length}</b><span>Requests</span></div></div>
      ${reqs.length ? `<div class="tiny muted">Trainer requests</div>${reqs.map(([u, d]) => `<div class="row between"><div class="row">${avatar(d)}<div><b>${esc(d.name)}</b><div class="small muted">${esc(d.email || '')}</div></div></div><button class="btn sm teal" data-act="setRole" data-u="${u}" data-r="trainer">Approve</button></div>`).join('')}` : ''}
      <div class="tiny muted">Trainers</div>${trainers.length ? trainers.map(([u, d]) => `<div class="row between"><div class="row">${avatar(d)}<div><b>${esc(d.name)}</b><div class="small muted">${clientsOf(u)} clients · code ${esc(d.inviteCode || '—')}</div></div></div>${u !== S.uid ? `<button class="btn sm ghost" data-act="setRole" data-u="${u}" data-r="member">Remove</button>` : `<span class="small muted">you</span>`}</div>`).join('') : '<p class="small muted">None yet.</p>'}
      ${!isTrainer() ? `<button class="btn sm" data-act="setRole" data-u="${S.uid}" data-r="trainer" style="align-self:flex-start">Make me a trainer too</button>` : ''}
      <div class="tiny muted">Everyone</div>${all.map(([u, d]) => `<div class="row between small"><span>${esc(d.name)} <span class="muted">${esc(d.email || '')}</span></span><span class="muted">${d.role === 'trainer' ? 'trainer' : d.trainerId ? 'trainee' : 'member'}</span></div>`).join('')}</div></div>`;
  }

  // ---------- ACTIONS ----------
  function schedAct(obj, act, d) {
    const day = d.day;
    if (act === 'DayDone' || !day) { S.editDay = null; return; }
    obj.schedule = obj.schedule || {};
    const sched = obj.schedule;
    const spec = sched[day] || (sched[day] = { groups: [], cardio: 0 });
    if (act === 'Preset') { const p = PRESETS.find((x) => x.id === d.p); sched[day] = { groups: p.groups.slice(), cardio: p.cardio }; }
    if (act === 'Group') { const g = d.g; const gs = spec.groups || []; spec.groups = gs.includes(g) ? gs.filter((x) => x !== g) : gs.concat(g); }
  }
  function invalidateFuturePlans(pid) {
    Object.values(S.logs).forEach((l) => {
      if (l.pid !== pid || l.date < todayISO()) return;
      if (!hasTicks(l) && !l.custom) { l.plan = computePlan(S.users[pid], l.date); l.swaps = {}; l.ex = {}; saveLog(l); }
    });
  }
  function applyTuning(pid, g) {
    invalidateFuturePlans(pid);
    Object.values(S.logs).forEach((l) => {
      if (l.pid !== pid || l.date < todayISO() || !l.plan || !l.plan.groups.includes(g)) return;
      const n = profSets(S.users[pid], g);
      if ((l.plan.sets || {})[g] !== n) { l.plan.sets = Object.assign({}, l.plan.sets || {}, { [g]: n }); saveLog(l); }
    });
  }
  function refreshStalePlans() {
    const live = new Set(); GROUP_ORDER.forEach((g) => GROUPS[g].zones.forEach((z) => z.ex.forEach((x) => live.add(x)))); CARDIO.forEach((x) => live.add(x));
    Object.values(S.logs).forEach((l) => {
      if (l.pid !== S.uid || l.date < todayISO() || !l.plan || l.custom || !S.users[S.uid]) return;
      const stale = Object.values(l.plan.picks || {}).some((x) => !live.has(x)) || (l.plan.cardioId && !live.has(l.plan.cardioId));
      if (!hasTicks(l) && stale) { l.plan = computePlan(S.users[S.uid], l.date); l.swaps = {}; l.ex = {}; saveLog(l); }
    });
  }
  function profileFieldsSave(pid) {
    const p = S.users[pid];
    saveUser(pid, { schedule: p.schedule || {}, sets: p.sets || {}, counts: p.counts || {} });
  }
  const inputVal = (k) => { const el = $(`[data-in="${k}"]`); return el ? el.value.trim().toUpperCase() : ''; };
  const ACT = {
    signIn() { Store().signIn().catch((e) => { console.warn(e); toast('Sign-in did not finish. Please try again.'); }); },
    signOut() { Store().signOut(); S.onb = null; },
    tab(d) { if (d.tab === 'admin' && S.tab !== 'admin') S.adminUser = null; S.tab = d.tab; if (!coaching()) LS.set('gb.tab', d.tab); S.editDay = null; render(); window.scrollTo(0, 0); },
    day(d) { S.date = addDays(S.date, +d.d); render(); },
    goToday() { S.date = todayISO(); render(); },
    week(d) { S.planOff += +d.d; render(); },
    gotoDate(d) { S.date = d.date; S.tab = 'today'; render(); window.scrollTo(0, 0); },
    open(d) { openSheet({ date: S.date, slot: d.slot }); },
    view(d) { openSheet({ exId: d.ex }); },
    close() { closeSheet(); },
    coach(d) { S.act = d.u; S.tab = 'today'; S.date = todayISO(); S.planOff = 0; S.editDay = null; render(); window.scrollTo(0, 0); },
    exitCoach() { S.act = S.uid; S.tab = 'clients'; S.date = todayISO(); S.editDay = null; render(); window.scrollTo(0, 0); },
    cstep(d) {
      const c = sheetCtx(); const log = ensureLog(S.act, c.date); const dir = +d.d;
      if (c.slot === 'cardio') { log.cardio.min = Math.max(0, (+log.cardio.min || c.plan.cardio) + dir * 5); saveLog(log); renderSheet(); return; }
      const en = ensureEntry(log, c.slot); const ex = c.ex;
      en.cur = Object.assign({}, en.cur || curDefault(S.act, ex, c.date));
      if (d.f === 'w') { const stepKg = unit() === 'lb' ? 5 / 2.20462 : ex.inc || 2.5; en.cur.w = Math.max(0, Math.round(((+en.cur.w || 0) + dir * stepKg) * 100) / 100); }
      else { const inc = ex.m === 't' || ex.m === 'wt' ? 5 : 1; en.cur.r = Math.max(0, (+en.cur.r || 0) + dir * inc); }
      saveLog(log); renderSheet();
    },
    useSug(d) { const c = sheetCtx(); const log = ensureLog(S.act, c.date); const en = ensureEntry(log, c.slot); en.cur = Object.assign({}, en.cur || curDefault(S.act, c.ex, c.date), { w: +d.w }); saveLog(log); renderSheet(); },
    logSet(d) {
      const c = sheetCtx(); const log = ensureLog(S.act, c.date); const en = ensureEntry(log, c.slot);
      const i = +d.i; while (en.sets.length <= i) en.sets.push({ w: null, r: null, d: false });
      const s = en.sets[i];
      if (s.d) s.d = false;
      else { const cur = en.cur || curDefault(S.act, c.ex, c.date); s.w = cur.w; s.r = cur.r; s.d = true; startTimer(restSecs(c.slotInfo)); }
      saveLog(log); renderSheet();
    },
    pain() { const c = sheetCtx(); const log = ensureLog(S.act, c.date); const en = ensureEntry(log, c.slot); en.pain = !en.pain; saveLog(log); if (en.pain) { S.det.notes = true; toast('Noted. Add a short note about where it hurt.'); } renderSheet(); },
    swap(d) { const c = sheetCtx(); const log = ensureLog(S.act, c.date); log.swaps[c.slot] = d.ex; const en = log.ex[c.slot]; if (en) { en.id = d.ex; en.cur = null; } saveLog(log); toast('Swapped to ' + EX[d.ex].n); renderSheet(true); },
    swapCardio(d) { const c = sheetCtx(); const log = ensureLog(S.act, c.date); log.swaps.cardio = d.ex; saveLog(log); renderSheet(true); },
    cardioDone() { const c = sheetCtx(); const log = ensureLog(S.act, c.date); log.cardio.d = !log.cardio.d; if (log.cardio.d && !log.cardio.min) log.cardio.min = c.plan.cardio; saveLog(log); renderSheet(); },
    addSet() { const c = sheetCtx(); const log = ensureLog(S.act, c.date); const en = ensureEntry(log, c.slot); if (en.sets.length < 8) en.sets.push({ w: null, r: null, d: false }); saveLog(log); renderSheet(); },
    rmSet() { const c = sheetCtx(); const log = ensureLog(S.act, c.date); const en = ensureEntry(log, c.slot); const n = c.slotInfo ? c.slotInfo.n : 3; if (en.sets.length > n && !en.sets[en.sets.length - 1].d) en.sets.pop(); else if (en.sets.length > n) toast('Untick the last set before removing it.'); saveLog(log); renderSheet(); },
    t15() { if (timer) { timer.end += 15000; timer.beeped = false; tickTimer(); } },
    tStop() { stopTimer(); },
    finish() {
      const log = ensureLog(S.act, S.date); log.finished = true; saveLog(log);
      S.finish = stats().byLog[lid(S.act, S.date)] || { pts: 0, sets: 0, prs: [] }; renderFinish();
    },
    finishClose() { S.finish = null; $('#finish').hidden = true; render(); },
    override() { renderOverride(); },
    ovPick(d) {
      const log = ensureLog(S.act, S.date);
      const spec = d.p === 'schedule' ? null : PRESETS.find((x) => x.id === d.p);
      log.plan = spec ? computePlan(P(S.act), S.date, spec, true) : computePlan(P(S.act), S.date);
      log.custom = !!spec;
      if (!hasTicks(log)) { log.ex = {}; log.swaps = {}; }
      saveLog(log); $('#finish').hidden = true; render();
    },
    ovClose() { $('#finish').hidden = true; },
    recTab(d) { S.recTab = d.t; render(); },
    adminUser(d) { S.adminUser = d.u; S.tab = 'admin'; render(); window.scrollTo(0, 0); },
    adminBack() { S.adminUser = null; render(); window.scrollTo(0, 0); },
    color(d) { saveUser(S.uid, { color: d.c }); render(); },
    unit(d) { saveUser(S.uid, { unit: d.u }); render(); },
    sound(d) { S.sound = d.v === '1'; LS.set('gb.sound', S.sound); if (S.sound) beep(); render(); },
    useRec() { me().schedule = clone(RECOMMENDED); profileFieldsSave(S.uid); invalidateFuturePlans(S.uid); toast('Recommended plan restored'); render(); },
    askTrainer() { saveUser(S.uid, { wantsTrainer: true }); toast('Request sent to the admin.'); render(); },
    async joinTrainer() {
      const code = inputVal('joinTrainer'); if (code.length !== 6) { toast('Enter the 6-letter code from your trainer.'); return; }
      const c = await Store().get(`codes/${code}`).catch(() => null);
      if (!c || !c.trainerId) { toast('That code was not found. Check it with your trainer.'); return; }
      if (c.trainerId === S.uid) { toast("That's your own trainer code."); return; }
      saveUser(S.uid, { trainerId: c.trainerId, trainerCode: code }); onMe(me()); toast(`Linked to ${c.name || 'your trainer'}.`); render();
    },
    leaveTrainer() { saveUser(S.uid, { trainerId: '', trainerCode: '' }); onMe(me()); render(); },
    async makeInvite() {
      const code = newCode();
      try { await Store().set(`codes/${code}`, { trainerId: S.uid, name: me().name, created: todayISO() }); saveUser(S.uid, { inviteCode: code }); render(); }
      catch (e) { console.warn(e); toast('Could not create a code. Is trainer access approved?'); }
    },
    copyCode(d) { try { navigator.clipboard.writeText(d.c).then(() => toast('Code copied'), () => toast(d.c)); } catch (e) { toast(d.c); } },
    async makeCircle() {
      const code = newCode();
      try { await Store().set(`circles/${code}`, { name: `${me().name}'s group`, owner: S.uid, created: todayISO() }); saveUser(S.uid, { circle: code }); onMe(me()); toast(`Group created. Share code ${code}.`); render(); }
      catch (e) { console.warn(e); toast('Could not create the group. Try again.'); }
    },
    async joinCircle() {
      const code = inputVal('joinCircle'); if (code.length !== 6) { toast('Enter the 6-letter group code.'); return; }
      const c = await Store().get(`circles/${code}`).catch(() => null);
      if (!c) { toast('That group code was not found.'); return; }
      saveUser(S.uid, { circle: code }); onMe(me()); toast(`Joined ${c.name}.`); render();
    },
    leaveCircle() { saveUser(S.uid, { circle: '' }); onMe(me()); render(); },
    setRole(d) { const u = d.u; if (S.users[u]) Object.assign(S.users[u], { role: d.r, wantsTrainer: false }); if (S.src.all[u]) Object.assign(S.src.all[u], { role: d.r, wantsTrainer: false }); queueWrite(`users/${u}`, { role: d.r, wantsTrainer: false, updatedAt: Date.now() }, true); if (u === S.uid) onMe(me()); render(); },
    publish() {
      const pid = S.act, prof = P(pid), t = todayISO(); let n = 0;
      for (let i = 0; i < 28; i++) {
        const d = addDays(t, i), l = S.logs[lid(pid, d)];
        if (l && hasTicks(l)) continue;
        const plan = computePlan(prof, d);
        if (!isTraining(plan)) { if (l && l.published && !hasTicks(l)) { l.published = false; l.plan = plan; saveLog(l); } continue; }
        const log = l && !hasTicks(l) ? Object.assign(l, { plan, swaps: l.custom ? l.swaps : {}, ex: {}, published: true, publishedBy: S.uid, custom: false }) : { pid, date: d, week: monday(d), plan, ex: {}, swaps: {}, cardio: { min: 0, d: false }, finished: false, published: true, publishedBy: S.uid };
        S.logs[lid(pid, d)] = log; saveLog(log); n++;
      }
      S.editDay = null; toast(`Published ${n} workouts for ${prof.name}.`); render(); window.scrollTo(0, 0);
    },
    // onboarding
    ocolor(d) { S.onb.color = d.c; render(); },
    async create() {
      const o = S.onb; const name = (o.name || '').trim();
      if (!name) { toast('Please type your name first.'); return; }
      const doc = { name, email: S.user.email || '', color: o.color, role: 'member', wantsTrainer: !!o.wantsTrainer, trainerId: '', trainerCode: '', circle: '', schedule: o.schedule, sets: o.sets || {}, counts: o.counts || {}, unit: 'kg', created: todayISO(), updatedAt: Date.now() };
      const tc = (o.trainerCode || '').trim().toUpperCase(), cc = (o.circle || '').trim().toUpperCase();
      if (tc) { const c = await Store().get(`codes/${tc}`).catch(() => null); if (!c) { toast('Trainer code not found. Check it or leave it empty.'); return; } doc.trainerId = c.trainerId; doc.trainerCode = tc; }
      if (cc) { const c = await Store().get(`circles/${cc}`).catch(() => null); if (!c) { toast('Group code not found. Check it or leave it empty.'); return; } doc.circle = cc; }
      S.src.me = { [S.uid]: doc }; recompose();
      queueWrite(`users/${S.uid}`, doc, false);
      S.onb = null; S.phase = 'app'; S.act = S.uid; S.tab = 'today'; S.date = todayISO(); S.editDay = null;
      onMe(doc); render(); window.scrollTo(0, 0); toast(`Welcome, ${name}!`);
    },
  };
  // schedule editors: me (self), o (onboarding), cl (trainer editing a client)
  const schedTarget = { me: () => me(), o: () => S.onb, cl: () => P(S.act) };
  ['Preset', 'Group', 'Edit', 'DayDone'].forEach((a) => {
    Object.keys(schedTarget).forEach((pre) => {
      ACT[pre + a] = (d) => {
        const obj = schedTarget[pre]();
        if (a === 'Edit') { S.editDay = S.editDay === pre + d.day ? null : pre + d.day; render(); return; }
        schedAct(obj, a, d);
        if (pre !== 'o' && (a === 'Preset' || a === 'Group')) { const pid = pre === 'me' ? S.uid : S.act; profileFieldsSave(pid); invalidateFuturePlans(pid); }
        render();
      };
    });
  });

  function renderFinish() {
    const el = $('#finish'); const i = S.finish; el.hidden = false;
    el.innerHTML = `<div class="in"><div class="glass celebrate stack" style="margin-top:40px"><div class="tiny muted">Workout logged${coaching() ? ' for ' + esc(P(S.act).name) : ''}</div><div class="big">${i.pts}</div><div class="muted">points</div><div class="mini"><div><b>${i.sets}</b><span>Sets</span></div><div><b>${i.prs.length}</b><span>PRs</span></div><div><b>${stats().streak[S.act] || 0}</b><span>Streak</span></div><div><b>${(stats().week[S.act] || { pts: 0 }).pts}</b><span>Week pts</span></div></div><button class="btn pri block" data-act="finishClose">Nice</button></div></div>`;
  }
  function renderOverride() {
    const el = $('#finish'); el.hidden = false;
    el.innerHTML = `<div class="in"><div class="sheet-top"><button class="btn sm" data-act="ovClose" aria-label="Close">${ICON.back}</button><h2>Change ${S.date === todayISO() ? "today's" : 'this'} workout</h2></div><div class="glass card stack"><p class="small muted">Pick a workout for ${fmtDay(S.date, { weekday: 'long', day: 'numeric', month: 'short' })} only. The weekly schedule stays the same.</p><div class="stack">${PRESETS.filter((p) => p.id !== 'rest').map((p) => `<button class="btn block" data-act="ovPick" data-p="${p.id}">${esc(p.name)}</button>`).join('')}<button class="btn ghost block" data-act="ovPick" data-p="schedule">Back to the schedule</button></div></div></div>`;
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const fn = ACT[b.dataset.act]; if (fn) { e.preventDefault(); fn(b.dataset, b, e); }
  });
  const noteT = {};
  document.addEventListener('input', (e) => {
    const el = e.target; const k = el.dataset && el.dataset.in; if (!k) return;
    if (k === 'oname') { S.onb.name = el.value; return; }
    if (k === 'otcode') { S.onb.trainerCode = el.value.toUpperCase(); return; }
    if (k === 'ocircle') { S.onb.circle = el.value.toUpperCase(); return; }
    if (k === 'owt') { S.onb.wantsTrainer = el.checked; return; }
    if (k === 'joinTrainer' || k === 'joinCircle') return;
    if (k === 'adminQ') { S.adminQ = el.value; const box = $('#adminUsers'); if (box) box.innerHTML = adminUserRows(adminData()); return; }
    if (k === 'pname') { const v = el.value.slice(0, 24) || 'Me'; me().name = v; clearTimeout(noteT.p); noteT.p = setTimeout(() => saveUser(S.uid, { name: v }), 600); return; }
    if (k === 'clNote') { const v = el.value.slice(0, 300); P(S.act).planNote = v; clearTimeout(noteT.c); noteT.c = setTimeout(() => saveUser(S.act, { planNote: v }), 700); return; }
    const m = k.match(/^(me|o|cl)(Count|Sets|Cardio)$/);
    if (m) {
      const obj = schedTarget[m[1]](); const pid = m[1] === 'me' ? S.uid : m[1] === 'cl' ? S.act : null;
      if (m[2] === 'Cardio') { obj.schedule = obj.schedule || {}; const day = el.dataset.day; obj.schedule[day] = obj.schedule[day] || { groups: [], cardio: 0 }; obj.schedule[day].cardio = +el.value; if (pid) { profileFieldsSave(pid); invalidateFuturePlans(pid); } }
      else { const key = m[2] === 'Count' ? 'counts' : 'sets'; obj[key] = Object.assign({}, obj[key] || {}); obj[key][el.dataset.g] = +el.value; if (pid) { profileFieldsSave(pid); applyTuning(pid, el.dataset.g); } }
      render(); return;
    }
    const c = sheetCtx(); if (!c || c.view) return;
    const log = ensureLog(S.act, c.date);
    if (k === 'exnote') { S.notes[S.act] = Object.assign({}, S.notes[S.act] || {}); S.notes[S.act][c.ex.id] = el.value; clearTimeout(noteT.x); noteT.x = setTimeout(() => saveNotes(S.act), 600); return; }
    if (c.slot === 'cardio') { if (k === 'cmin') { log.cardio.min = el.value === '' ? 0 : +el.value; saveLog(log); } return; }
    const en = ensureEntry(log, c.slot);
    if (k === 'note') { en.note = el.value; clearTimeout(noteT.n); noteT.n = setTimeout(() => saveLog(log), 600); return; }
    if (k === 'cw' || k === 'cr') {
      en.cur = Object.assign({}, en.cur || curDefault(S.act, c.ex, c.date));
      if (k === 'cw') en.cur.w = el.value === '' ? null : fromDisp(parseFloat(el.value));
      else en.cur.r = el.value === '' ? null : Math.max(0, Math.round(parseFloat(el.value)));
      saveLog(log);
    }
  });
  document.addEventListener('change', (e) => { const el = e.target; if (el.dataset && el.dataset.in === 'owt') S.onb.wantsTrainer = el.checked; });
  document.addEventListener('toggle', (e) => { const el = e.target; if (el && el.dataset && el.dataset.k) S.det[el.dataset.k] = el.open; }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.sheet) closeSheet(); });
  // lightweight tooltip for charts ([data-tip])
  const tipEl = document.createElement('div'); tipEl.className = 'atip'; tipEl.hidden = true; document.body.appendChild(tipEl);
  const showTip = (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tipEl.hidden = true; return; }
    const pt = e.touches ? e.touches[0] : e;
    tipEl.textContent = t.getAttribute('data-tip'); tipEl.hidden = false;
    const x = Math.min(window.innerWidth - tipEl.offsetWidth - 8, Math.max(8, pt.clientX - tipEl.offsetWidth / 2));
    tipEl.style.left = x + 'px'; tipEl.style.top = Math.max(8, pt.clientY - tipEl.offsetHeight - 12) + 'px';
  };
  document.addEventListener('mousemove', showTip);
  document.addEventListener('touchstart', showTip, { passive: true });
  document.addEventListener('scroll', () => { tipEl.hidden = true; }, { passive: true });

  // notes for a client load lazily while coaching
  setInterval(() => {
    if (coaching() && !subs['n:' + S.act]) { const u = S.act; sub('n:' + u, () => Store().watchDoc(`users/${u}/meta/notes`, (d) => { if (!busy(`users/${u}/meta/notes`)) { S.notes[u] = d ? clone(d) : {}; } }, onErr('client notes'))); }
  }, 1000);

  boot();
})();
