// Peças de interface reutilizadas: seletores, escape de texto, janela (modal), confirmação e aviso.

export const $ = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function abrirModal(html, aoMontar) {
  const m = $("#modal");
  m.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  document.body.classList.add("com-modal");
  m.onclick = (e) => { if (e.target === m) fecharModal(); };
  $$("[data-fechar]", m).forEach((b) => (b.onclick = fecharModal));
  aoMontar?.(m);
  if (matchMedia("(min-width: 900px)").matches) {
    m.querySelector("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select")?.focus();
  }
}

export function fecharModal() {
  const m = $("#modal");
  m.hidden = true;
  m.innerHTML = "";
  document.body.classList.remove("com-modal");
}

export function confirmar(texto, botoes) {
  return new Promise((resolve) => {
    abrirModal(`
      <p class="pergunta">${texto}</p>
      <div class="acoes coluna">
        ${botoes.map((b, i) => `<button class="btn ${b.classe || ""}" data-i="${i}">${b.texto}</button>`).join("")}
        <button class="btn link" data-fechar>Cancelar</button>
      </div>`, (m) => {
      $$("[data-i]", m).forEach((b) => (b.onclick = () => { fecharModal(); resolve(botoes[b.dataset.i].valor); }));
      m.querySelector("[data-fechar]").onclick = () => { fecharModal(); resolve(null); };
    });
  });
}

export function toast(msg) {
  const t = $("#toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3000);
}

export const erroMsg = (e) => e?.code || e?.message || String(e);
