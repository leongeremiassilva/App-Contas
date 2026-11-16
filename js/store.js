// Camada de dados. Mesma interface para o Firestore (produção) e para o modo demonstração (localStorage).
//   watch(colecao, callback)   -> chama callback([...docs]) sempre que algo muda; retorna função para parar
//   add(colecao, dados)        -> id
//   addMany(colecao, [dados])
//   update(colecao, id, dados)
//   remove(colecao, id)
//   removeMany(colecao, [ids])

import { firebaseConfig } from "./config.js";

export const modoDemo = !firebaseConfig.apiKey;

const FB = "https://www.gstatic.com/firebasejs/11.0.2";

let fb = null; // módulos do Firebase carregados sob demanda

export async function iniciar() {
  if (modoDemo) return;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  let db;
  try {
    db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
    });
  } catch {
    db = fsMod.getFirestore(app);
  }
  fb = { app, auth: authMod.getAuth(app), db, authMod, fsMod };
}

// ---------- Autenticação ----------

export function aoMudarUsuario(cb) {
  if (modoDemo) {
    const salvo = localStorage.getItem("demo_usuario");
    cb(salvo ? JSON.parse(salvo) : null);
    return () => {};
  }
  return fb.authMod.onAuthStateChanged(fb.auth, (u) =>
    cb(u ? { email: (u.email || "").toLowerCase(), nome: u.displayName, foto: u.photoURL } : null)
  );
}

export async function entrar(emailDemo) {
  if (modoDemo) {
    localStorage.setItem("demo_usuario", JSON.stringify({ email: emailDemo, nome: emailDemo }));
    location.reload();
    return;
  }
  const provider = new fb.authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await fb.authMod.signInWithPopup(fb.auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
      await fb.authMod.signInWithRedirect(fb.auth, provider);
    } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      throw e;
    }
  }
}

export async function sair() {
  if (modoDemo) {
    localStorage.removeItem("demo_usuario");
    location.reload();
    return;
  }
  await fb.authMod.signOut(fb.auth);
}

// ---------- Dados ----------

const ouvintesDemo = {};
const chaveDemo = (c) => `demo_${c}`;
const lerDemo = (c) => JSON.parse(localStorage.getItem(chaveDemo(c)) || "[]");
function gravarDemo(c, docs) {
  localStorage.setItem(chaveDemo(c), JSON.stringify(docs));
  (ouvintesDemo[c] || []).forEach((cb) => cb(docs.map((d) => ({ ...d }))));
}
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function watch(colecao, cb, aoErro) {
  if (modoDemo) {
    (ouvintesDemo[colecao] ||= []).push(cb);
    cb(lerDemo(colecao));
    return () => (ouvintesDemo[colecao] = ouvintesDemo[colecao].filter((f) => f !== cb));
  }
  const { collection, onSnapshot } = fb.fsMod;
  return onSnapshot(
    collection(fb.db, colecao),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => (aoErro ? aoErro(e) : console.error(e))
  );
}

export async function add(colecao, dados) {
  if (modoDemo) {
    const id = novoId();
    gravarDemo(colecao, [...lerDemo(colecao), { id, ...dados }]);
    return id;
  }
  const { collection, addDoc } = fb.fsMod;
  const ref = await addDoc(collection(fb.db, colecao), dados);
  return ref.id;
}

export async function addMany(colecao, lista) {
  if (modoDemo) {
    gravarDemo(colecao, [...lerDemo(colecao), ...lista.map((d) => ({ id: novoId(), ...d }))]);
    return;
  }
  const { collection, doc, writeBatch } = fb.fsMod;
  for (let i = 0; i < lista.length; i += 400) {
    const batch = writeBatch(fb.db);
    lista.slice(i, i + 400).forEach((d) => batch.set(doc(collection(fb.db, colecao)), d));
    await batch.commit();
  }
}

export async function update(colecao, id, dados) {
  if (modoDemo) {
    gravarDemo(colecao, lerDemo(colecao).map((d) => (d.id === id ? { ...d, ...dados } : d)));
    return;
  }
  const { doc, updateDoc } = fb.fsMod;
  await updateDoc(doc(fb.db, colecao, id), dados);
}

export async function remove(colecao, id) {
  return removeMany(colecao, [id]);
}

export async function removeMany(colecao, ids) {
  if (modoDemo) {
    const set = new Set(ids);
    gravarDemo(colecao, lerDemo(colecao).filter((d) => !set.has(d.id)));
    return;
  }
  const { doc, writeBatch } = fb.fsMod;
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(fb.db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(fb.db, colecao, id)));
    await batch.commit();
  }
}
