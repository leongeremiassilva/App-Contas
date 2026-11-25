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
  $$("input[inputmode=decimal]", m).forEach(mascaraDinheiro); // antes do aoMontar: a máscara formata primeiro
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

// ---------- Campo de dinheiro com vírgula automática ----------
// Digita-se só números e os dois últimos viram centavos (1, 2, 5, 0 -> 12,50), como nos apps de banco.
// Campos que podem ser negativos (saldo) ganham um botão "+/−".
const CAMPOS_COM_SINAL = ["saldoInicial", "saldoBanco"];

function formatarDigitos(digitos) {
  const limpo = digitos.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  if (!limpo) return "";
  const c = limpo.padStart(3, "0");
  const inteiro = c.slice(0, -2).replace(/^0+(?=\d)/, "");
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${c.slice(-2)}`;
}

export function mascaraDinheiro(input) {
  if (input.dataset.mascara) return;
  input.dataset.mascara = "1";
  const comSinal = CAMPOS_COM_SINAL.includes(input.name);
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  let negativo = input.value.trim().startsWith("-");
  const desenhar = () => {
    const txt = formatarDigitos(input.value);
    input.value = txt && negativo ? `-${txt}` : txt;
  };
  // valor que já vinha preenchido (ex.: 12,5 ou 1234,56)
  if (input.value.trim()) {
    const [i, d = ""] = input.value.replace(/[^\d,]/g, "").split(",");
    input.value = (i || "0") + (d + "00").slice(0, 2);
    desenhar();
  }
  input.addEventListener("input", (e) => {
    if (comSinal && e.data === "-") negativo = !negativo;
    desenhar();
    const fim = input.value.length;
    requestAnimationFrame(() => input.setSelectionRange(fim, fim));
  });
  input.addEventListener("focus", () => {
    const fim = input.value.length;
    requestAnimationFrame(() => input.setSelectionRange(fim, fim));
  });
  if (comSinal) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn pequeno botao-sinal";
    botao.textContent = "+/−";
    botao.title = "Trocar entre positivo e negativo";
    botao.addEventListener("click", () => { negativo = !negativo; desenhar(); input.dispatchEvent(new Event("input")); });
    const caixa = document.createElement("div");
    caixa.className = "campo-com-sinal";
    input.replaceWith(caixa);
    caixa.append(input, botao);
  }
}
