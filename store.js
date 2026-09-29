// Firebase adapter: Google sign-in + Firestore. Exposes window.GBStore for app.js.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  onAuthStateChanged, signOut, setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, query, where, onSnapshot, setDoc, getDoc, deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const cfg = (window.GB_CONFIG || {}).firebase || {};
const configured = !!(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).startsWith('PASTE'));

let auth = null, db = null;
if (configured) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch (e) {
    db = initializeFirestore(app, {});
  }
  getRedirectResult(auth).catch(() => {});
}

const ref = (path) => doc(db, ...path.split('/'));
const colRef = (path) => collection(db, ...path.split('/'));
const clean = (o) => JSON.parse(JSON.stringify(o));

window.GBStore = {
  configured,
  onAuth(cb) {
    if (!configured) { cb(null); return () => {}; }
    return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email || '', name: u.displayName || '', photo: u.photoURL || '' } : null));
  },
  async signIn() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e && e.code) || '';
      if (code.includes('popup-blocked') || code.includes('operation-not-supported') || code.includes('web-storage-unsupported')) {
        await signInWithRedirect(auth, provider);
      } else if (!code.includes('popup-closed') && !code.includes('cancelled-popup')) {
        throw e;
      }
    }
  },
  signOut() { return signOut(auth); },
  watchDoc(path, cb, err) {
    return onSnapshot(ref(path), (s) => cb(s.exists() ? s.data() : null), (e) => err && err(e));
  },
  watchCol(path, filters, cb, err) {
    let q = colRef(path);
    if (filters && filters.length) q = query(q, ...filters.map(([f, op, v]) => where(f, op, v)));
    return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, data: d.data() }))), (e) => err && err(e));
  },
  set(path, data, merge) { return setDoc(ref(path), clean(data), merge ? { merge: true } : undefined); },
  async get(path) { const s = await getDoc(ref(path)); return s.exists() ? s.data() : null; },
  del(path) { return deleteDoc(ref(path)); },
};
window.dispatchEvent(new Event('gbstore'));
