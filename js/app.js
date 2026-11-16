import * as store from "./store.js";
import { pessoas } from "./config.js";
import {
  CATEGORIAS_PADRAO, moeda, paraCentavos, hojeISO, mesAtual, somarMeses, nomeMes, dataCurta,
  gerarLancamentos, competencia, resumoDoMes,
} from "./financas.js";

// ---------- Estado ----------

const estado = {
  usuario: null,
  eu: null, // pessoa (de config.js) correspondente ao usuário logado
  lancamentos: [],
  contas: [],
  categorias: [],
  carregado: { lancamentos: false, contas: false, categorias: false },
  mes: mesAtual(),
  aba: "resumo",
  filtro: { pessoa: "", tipo: "", categoria: "", busca: "" },
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pessoa = (id) => pessoas.find((p) => p.id === id) || { id, nome: id || "—", cor: "#888" };
const conta = (id) => estado.contas.find((c) => c.id === id);
const iconeCat = (nome) => estado.categorias.find((c) => c.nome === nome)?.icone || "•";
const TIPOS_CONTA = { conta: "Conta bancária", cartao: "Cartão de crédito", dinheiro: "Dinheiro / outro" };

// ---------- Inicialização ----------

async function iniciar() {
  if (store.modoDemo) {
    document.body.classList.add("demo");
    pessoas.forEach((p) => { if (!p.email) p.email = `${p.id}@demo`; });
  }
  try {
    await store.iniciar();
  } catch (e) {
    telaErro("Não foi possível conectar ao Firebase. Verifique a internet e as chaves em js/config.js.", e);
    return;
  }
  store.aoMudarUsuario((u) => {
    estado.usuario = u;
    if (!u) return telaLogin();
    estado.eu = pessoas.find((p) => p.email && p.email.toLowerCase() === u.email);
    if (!estado.eu) return telaSemAcesso(u.email);
    abrirApp();
  });
}

function telaLogin() {
  const demo = store.modoDemo;
  $("#app").innerHTML = `
    <section class="login">
      <div class="logo">💰</div>
      <h1>Contas da Casa</h1>
      <p>Gastos e receitas do casal, num lugar só.</p>
      ${demo
        ? `<p class="aviso">Modo demonstração: os dados ficam só neste navegador.</p>
           ${pessoas.map((p) => `<button class="btn primario" data-demo="${p.id}">Entrar como ${esc(p.nome)}</button>`).join("")}`
        : `<button class="btn primario" id="btn-google">Entrar com Google</button>`}
    </section>`;
  $("#btn-google")?.addEventListener("click", () =>
    store.entrar().catch((e) => toast("Erro ao entrar: " + (e.code || e.message)))
  );
  document.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = pessoa(b.dataset.demo);
      store.entrar(p.email);
    })
  );
}

function telaSemAcesso(email) {
  $("#app").innerHTML = `
    <section class="login">
      <div class="logo">🔒</div>
      <h1>Sem acesso</h1>
      <p>A conta <b>${esc(email)}</b> não está autorizada a usar este app.</p>
      <button class="btn" id="btn-sair">Entrar com outra conta</button>
    </section>`;
  $("#btn-sair").addEventListener("click", () => store.sair());
}

function telaErro(msg, e) {
  console.error(e);
  $("#app").innerHTML = `<section class="login"><div class="logo">⚠️</div><h1>Ops</h1><p>${esc(msg)}</p></section>`;
}

let jaAbriu = false;
function abrirApp() {
  if (jaAbriu) return;
  jaAbriu = true;
  $("#app").innerHTML = `
    <header class="topo">
      <div class="seletor-mes">
        <button class="icone" id="mes-ant" aria-label="Mês anterior">‹</button>
        <button class="mes-nome" id="mes-hoje" title="Voltar ao mês atual"></button>
        <button class="icone" id="mes-prox" aria-label="Próximo mês">›</button>
      </div>
      <button class="avatar" id="btn-perfil" style="background:${estado.eu.cor}" title="${esc(estado.usuario.email)}">${esc(estado.eu.nome[0])}</button>
    </header>
    <main id="conteudo"><p class="carregando">Carregando…</p></main>
    <button class="fab" id="btn-novo" aria-label="Novo lançamento">+</button>
    <nav class="abas">
      <button data-aba="resumo">📊<span>Resumo</span></button>
      <button data-aba="lancamentos">📋<span>Lançamentos</span></button>
      <button data-aba="cadastros">⚙️<span>Cadastros</span></button>
    </nav>
    <div id="modal" class="modal" hidden></div>
    <div id="toast" class="toast" hidden></div>`;

  $("#mes-ant").onclick = () => mudarMes(-1);
  $("#mes-prox").onclick = () => mudarMes(1);
  $("#mes-hoje").onclick = () => { estado.mes = mesAtual(); render(); };
  $("#btn-novo").onclick = () => formLancamento();
  $("#btn-perfil").onclick = menuPerfil;
  document.querySelectorAll("[data-aba]").forEach((b) => (b.onclick = () => { estado.aba = b.dataset.aba; render(); }));

  const erro = (e) => {
    console.error(e);
    $("#conteudo").innerHTML = `<p class="vazio">Sem permissão para ler os dados. Confira se as regras do Firestore foram publicadas e se seu e-mail está nelas.</p>`;
  };
  for (const col of ["lancamentos", "contas", "categorias"]) {
    store.watch(col, (docs) => {
      estado[col] = docs;
      estado.carregado[col] = true;
      if (col === "categorias" && docs.length === 0) criarCategoriasPadrao();
      render();
    }, erro);
  }
  render();
}

let criandoCategorias = false;
async function criarCategoriasPadrao() {
  if (criandoCategorias) return;
  criandoCategorias = true;
  await store.addMany("categorias", CATEGORIAS_PADRAO);
}

function mudarMes(n) {
  estado.mes = somarMeses(estado.mes, n);
  render();
}

// ---------- Renderização ----------

function render() {
  if (!estado.eu || !$("#conteudo")) return;
  $("#mes-hoje").textContent = nomeMes(estado.mes);
  $(".seletor-mes").style.visibility = estado.aba === "cadastros" ? "hidden" : "visible";
  document.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === estado.aba));
  if (!Object.values(estado.carregado).every(Boolean)) return;
  const el = $("#conteudo");
  if (estado.aba === "resumo") el.innerHTML = htmlResumo();
  else if (estado.aba === "lancamentos") el.innerHTML = htmlLancamentos();
  else el.innerHTML = htmlCadastros();
  ligarEventosConteudo();
}

function htmlResumo() {
  const r = resumoDoMes(estado.lancamentos, estado.mes, pessoas, estado.contas);
  if (r.quantidade === 0) {
    return `<div class="vazio">
      <p>Nada lançado em ${nomeMes(estado.mes)}.</p>
      ${estado.contas.length === 0 ? `<p>Comece cadastrando suas contas e cartões em <b>Cadastros</b>, depois toque no <b>+</b>.</p>` : `<p>Toque no <b>+</b> para lançar um gasto ou receita.</p>`}
    </div>`;
  }
  const cats = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]);
  const maior = cats[0]?.[1] || 1;
  const a = r.acerto;
  return `
    <section class="cartoes-resumo">
      <div class="kpi receita"><span>Receitas</span><b>${moeda(r.receitas)}</b></div>
      <div class="kpi despesa"><span>Despesas</span><b>${moeda(r.despesas)}</b></div>
      <div class="kpi saldo ${r.saldo < 0 ? "negativo" : ""}"><span>Saldo do mês</span><b>${moeda(r.saldo)}</b></div>
    </section>

    <section class="bloco">
      <h2>Quem pagou e quem recebeu</h2>
      <table class="tabela">
        <thead><tr><th></th><th>Recebeu</th><th>Pagou</th></tr></thead>
        <tbody>${pessoas.map((p) => `
          <tr><td><span class="ponto" style="background:${p.cor}"></span>${esc(p.nome)}</td>
          <td class="num">${moeda(r.porPessoa[p.id].receitas)}</td>
          <td class="num">${moeda(r.porPessoa[p.id].despesas)}</td></tr>`).join("")}
        </tbody>
      </table>
      <p class="acerto">${a
        ? `Para dividir os gastos meio a meio, <b>${esc(pessoa(a.de).nome)}</b> passa <b>${moeda(a.valor)}</b> para <b>${esc(pessoa(a.para).nome)}</b>.`
        : `Os gastos do mês estão divididos meio a meio. 👍`}</p>
    </section>

    ${r.faturas.length ? `
    <section class="bloco">
      <h2>Faturas que vencem neste mês</h2>
      ${r.faturas.map((f) => `
        <div class="linha-simples">
          <span>💳 ${esc(f.conta.nome)} <small>${esc(pessoa(f.conta.dono).nome)} · vence dia ${f.conta.vencimento || "?"}</small></span>
          <b>${moeda(f.valor)}</b>
        </div>`).join("")}
    </section>` : ""}

    <section class="bloco">
      <h2>Gastos por categoria</h2>
      ${cats.map(([nome, v]) => `
        <button class="barra-cat" data-filtrar-cat="${esc(nome)}">
          <span class="rotulo">${iconeCat(nome)} ${esc(nome)}</span>
          <span class="valor">${moeda(v)} <small>${Math.round((v / r.despesas) * 100)}%</small></span>
          <span class="trilho"><span style="width:${(v / maior) * 100}%"></span></span>
        </button>`).join("")}
    </section>`;
}

function lancamentosFiltrados() {
  const f = estado.filtro;
  const busca = f.busca.trim().toLowerCase();
  return estado.lancamentos
    .filter((l) => l.competencia === estado.mes)
    .filter((l) => !f.pessoa || l.pessoa === f.pessoa)
    .filter((l) => !f.tipo || l.tipo === f.tipo)
    .filter((l) => !f.categoria || l.categoria === f.categoria)
    .filter((l) => !busca || `${l.descricao} ${l.categoria} ${conta(l.contaId)?.nome || ""} ${l.obs || ""}`.toLowerCase().includes(busca))
    .sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || 0) - (a.criadoEm || 0));
}

function htmlLancamentos() {
  const f = estado.filtro;
  const lista = lancamentosFiltrados();
  const total = lista.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);
  const cats = [...new Set(estado.categorias.map((c) => c.nome))].sort((a, b) => a.localeCompare(b));
  // agrupa por data
  const grupos = [];
  for (const l of lista) {
    const g = grupos[grupos.length - 1];
    if (g && g.data === l.data) g.itens.push(l);
    else grupos.push({ data: l.data, itens: [l] });
  }
  return `
    <section class="filtros">
      <input type="search" id="f-busca" placeholder="Buscar…" value="${esc(f.busca)}">
      <select id="f-pessoa"><option value="">Todos</option>${pessoas.map((p) => `<option value="${p.id}" ${f.pessoa === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>
      <select id="f-tipo"><option value="">Tudo</option><option value="despesa" ${f.tipo === "despesa" ? "selected" : ""}>Despesas</option><option value="receita" ${f.tipo === "receita" ? "selected" : ""}>Receitas</option></select>
      <select id="f-categoria"><option value="">Todas as categorias</option>${cats.map((c) => `<option ${f.categoria === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      ${f.pessoa || f.tipo || f.categoria || f.busca ? `<button class="btn link" id="f-limpar">Limpar filtros</button>` : ""}
    </section>
    <p class="total-lista">${lista.length} lançamento(s) · <b class="${total < 0 ? "neg" : "pos"}">${moeda(total)}</b></p>
    ${lista.length === 0 ? `<p class="vazio">Nenhum lançamento encontrado.</p>` : grupos.map((g) => `
      <h3 class="dia">${dataCurta(g.data)}</h3>
      <ul class="lista">${g.itens.map(htmlItem).join("")}</ul>`).join("")}`;
}

function htmlItem(l) {
  const c = conta(l.contaId);
  const p = pessoa(l.pessoa);
  const parcela = l.totalParcelas ? ` · ${l.recorrencia === "fixo" ? "mês" : "parcela"} ${l.parcela}/${l.totalParcelas}` : "";
  return `
    <li class="item" data-editar="${l.id}">
      <span class="ic">${iconeCat(l.categoria)}</span>
      <span class="txt">
        <b>${esc(l.descricao || l.categoria)}</b>
        <small><span class="ponto" style="background:${p.cor}"></span>${esc(p.nome)}${c ? ` · ${esc(c.nome)}` : ""}${parcela}</small>
      </span>
      <span class="val ${l.tipo}">${l.tipo === "receita" ? "+" : "−"}${moeda(l.valor)}</span>
    </li>`;
}

function htmlCadastros() {
  const contasOrd = [...estado.contas].sort((a, b) => (a.dono || "").localeCompare(b.dono || "") || a.nome.localeCompare(b.nome));
  const cat = (tipo) => estado.categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome));
  return `
    <section class="bloco">
      <div class="cab"><h2>Contas e cartões</h2><button class="btn pequeno" id="nova-conta">+ Adicionar</button></div>
      ${contasOrd.length === 0 ? `<p class="vazio">Cadastre as contas bancárias e cartões de cada um. Para cartões, informe o dia de fechamento e de vencimento: o app calcula em qual fatura cada compra cai.</p>` : ""}
      <ul class="lista">${contasOrd.map((c) => `
        <li class="item" data-conta="${c.id}">
          <span class="ic">${c.tipo === "cartao" ? "💳" : c.tipo === "conta" ? "🏦" : "💵"}</span>
          <span class="txt"><b>${esc(c.nome)}</b><small><span class="ponto" style="background:${pessoa(c.dono).cor}"></span>${esc(pessoa(c.dono).nome)} · ${TIPOS_CONTA[c.tipo]}${c.tipo === "cartao" ? ` · fecha ${c.fechamento}, vence ${c.vencimento}` : ""}</small></span>
          <span class="seta">›</span>
        </li>`).join("")}</ul>
    </section>
    ${["despesa", "receita"].map((t) => `
    <section class="bloco">
      <div class="cab"><h2>Categorias de ${t}</h2><button class="btn pequeno" data-nova-cat="${t}">+ Adicionar</button></div>
      <div class="chips">${cat(t).map((c) => `<button class="chip" data-cat="${c.id}">${c.icone || ""} ${esc(c.nome)}</button>`).join("")}</div>
    </section>`).join("")}
    <section class="bloco">
      <h2>Exportar</h2>
      <button class="btn" id="exportar">Baixar todos os lançamentos (CSV)</button>
    </section>`;
}

function ligarEventosConteudo() {
  const el = $("#conteudo");
  el.querySelectorAll("[data-editar]").forEach((li) =>
    li.addEventListener("click", () => formLancamento(estado.lancamentos.find((l) => l.id === li.dataset.editar)))
  );
  el.querySelectorAll("[data-filtrar-cat]").forEach((b) =>
    b.addEventListener("click", () => {
      estado.filtro = { pessoa: "", tipo: "despesa", categoria: b.dataset.filtrarCat, busca: "" };
      estado.aba = "lancamentos";
      render();
    })
  );
  const liga = (id, campo, evento = "change") => {
    const i = $("#" + id);
    if (i) i.addEventListener(evento, () => {
      estado.filtro[campo] = i.value;
      render();
      if (campo === "busca") { const n = $("#f-busca"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    });
  };
  liga("f-busca", "busca", "input");
  liga("f-pessoa", "pessoa");
  liga("f-tipo", "tipo");
  liga("f-categoria", "categoria");
  $("#f-limpar")?.addEventListener("click", () => { estado.filtro = { pessoa: "", tipo: "", categoria: "", busca: "" }; render(); });

  $("#nova-conta")?.addEventListener("click", () => formConta());
  el.querySelectorAll("[data-conta]").forEach((li) => li.addEventListener("click", () => formConta(conta(li.dataset.conta))));
  el.querySelectorAll("[data-nova-cat]").forEach((b) => b.addEventListener("click", () => formCategoria({ tipo: b.dataset.novaCat })));
  el.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => formCategoria(estado.categorias.find((c) => c.id === b.dataset.cat))));
  $("#exportar")?.addEventListener("click", exportarCSV);
}

// ---------- Modal ----------

function abrirModal(html, aoMontar) {
  const m = $("#modal");
  m.innerHTML = `<div class="janela" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) fecharModal(); };
  m.querySelectorAll("[data-fechar]").forEach((b) => (b.onclick = fecharModal));
  aoMontar?.(m);
  m.querySelector("input:not([type=hidden]):not([type=radio]), select")?.focus();
}
function fecharModal() {
  $("#modal").hidden = true;
  $("#modal").innerHTML = "";
}

function confirmar(texto, botoes) {
  return new Promise((resolve) => {
    abrirModal(`
      <p class="pergunta">${texto}</p>
      <div class="acoes coluna">
        ${botoes.map((b, i) => `<button class="btn ${b.classe || ""}" data-i="${i}">${b.texto}</button>`).join("")}
        <button class="btn link" data-fechar>Cancelar</button>
      </div>`, (m) => {
      m.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { fecharModal(); resolve(botoes[b.dataset.i].valor); }));
      m.querySelector("[data-fechar]").onclick = () => { fecharModal(); resolve(null); };
    });
  });
}

function toast(msg) {
  const t = $("#toast");
  if (!t) return alert(msg);
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3000);
}

function menuPerfil() {
  abrirModal(`
    <h2>${esc(estado.eu.nome)}</h2>
    <p class="sub">${esc(estado.usuario.email)}</p>
    ${store.modoDemo ? `<p class="aviso">Modo demonstração. Os dados ficam só neste navegador.</p>` : ""}
    <div class="acoes coluna">
      <button class="btn" id="sair">Sair</button>
      <button class="btn link" data-fechar>Fechar</button>
    </div>`, (m) => (m.querySelector("#sair").onclick = () => store.sair()));
}

// ---------- Formulário de lançamento ----------

function formLancamento(l) {
  const novo = !l;
  const tipo = l?.tipo || "despesa";
  const doGrupo = l?.grupoId ? estado.lancamentos.filter((x) => x.grupoId === l.grupoId) : [];
  const minhasContas = estado.contas.filter((c) => c.dono === estado.eu.id);
  const contaPadrao = l?.contaId ?? (minhasContas.length === 1 ? minhasContas[0].id : "");
  const valorInicial = l ? (l.recorrencia === "parcelado" ? doGrupo.reduce((s, x) => s + x.valor, 0) : l.valor) : 0;

  abrirModal(`
    <form id="form-lanc" autocomplete="off">
      <h2>${novo ? "Novo lançamento" : "Editar lançamento"}</h2>
      <div class="segmentado">
        <label><input type="radio" name="tipo" value="despesa" ${tipo === "despesa" ? "checked" : ""}><span>Despesa</span></label>
        <label><input type="radio" name="tipo" value="receita" ${tipo === "receita" ? "checked" : ""}><span>Receita</span></label>
      </div>
      <label>Valor ${l?.recorrencia === "parcelado" ? "(total da compra)" : ""}
        <input name="valor" inputmode="decimal" placeholder="0,00" required value="${valorInicial ? (valorInicial / 100).toFixed(2).replace(".", ",") : ""}">
      </label>
      <label>Descrição <input name="descricao" placeholder="Ex.: Supermercado, Posto, Conta de luz" value="${esc(l?.descricao || "")}" list="sugestoes"></label>
      <datalist id="sugestoes">${[...new Set(estado.lancamentos.map((x) => x.descricao).filter(Boolean))].slice(0, 200).map((d) => `<option value="${esc(d)}">`).join("")}</datalist>
      <label>Categoria <select name="categoria" required></select></label>
      <div class="duas">
        <label>Data <input type="date" name="data" required value="${l?.data || hojeISO()}"></label>
        <label>Quem <select name="pessoa">${pessoas.map((p) => `<option value="${p.id}" ${(l?.pessoa || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>
      <label>Conta / cartão
        <select name="contaId">
          <option value="">— sem conta —</option>
          ${pessoas.map((p) => {
            const cs = estado.contas.filter((c) => c.dono === p.id);
            return cs.length ? `<optgroup label="${esc(p.nome)}">${cs.map((c) => `<option value="${c.id}" ${contaPadrao === c.id ? "selected" : ""}>${c.tipo === "cartao" ? "💳" : c.tipo === "conta" ? "🏦" : "💵"} ${esc(c.nome)}</option>`).join("")}</optgroup>` : "";
          }).join("")}
        </select>
      </label>
      ${novo ? `
      <label>Repetição
        <select name="modo">
          <option value="unico">Só esta vez</option>
          <option value="parcelado">Parcelado (divide o valor)</option>
          <option value="fixo">Repete todo mês (mesmo valor)</option>
        </select>
      </label>
      <label class="vezes" hidden>Quantas vezes / meses <input type="number" name="vezes" min="2" max="120" value="2"></label>` :
      l.totalParcelas ? `<p class="sub">${l.recorrencia === "fixo" ? "Repetição" : "Parcela"} ${l.parcela} de ${l.totalParcelas}</p>` : ""}
      <p class="info-competencia sub"></p>
      <label>Observação <input name="obs" value="${esc(l?.obs || "")}"></label>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    const preencherCategorias = () => {
      const t = f.tipo.value;
      const cats = estado.categorias.filter((c) => c.tipo === t).sort((a, b) => a.nome.localeCompare(b.nome));
      const atual = f.categoria.value || l?.categoria;
      f.categoria.innerHTML = cats.map((c) => `<option value="${esc(c.nome)}" ${atual === c.nome ? "selected" : ""}>${c.icone || ""} ${esc(c.nome)}</option>`).join("");
    };
    const atualizarInfo = () => {
      const c = conta(f.contaId.value);
      const info = m.querySelector(".info-competencia");
      if (f.data.value && c?.tipo === "cartao") info.textContent = `Entra na fatura de ${nomeMes(competencia(f.data.value, c))}.`;
      else info.textContent = "";
      if (f.modo) m.querySelector(".vezes").hidden = f.modo.value === "unico";
    };
    preencherCategorias();
    atualizarInfo();
    f.querySelectorAll("[name=tipo]").forEach((r) => r.addEventListener("change", preencherCategorias));
    f.contaId.addEventListener("change", () => {
      const c = conta(f.contaId.value);
      if (c) f.pessoa.value = c.dono;
      atualizarInfo();
    });
    f.data.addEventListener("change", atualizarInfo);
    f.modo?.addEventListener("change", atualizarInfo);
    f.descricao.addEventListener("change", () => {
      // sugere categoria/conta do último lançamento com a mesma descrição
      if (!novo) return;
      const ant = [...estado.lancamentos].reverse().find((x) => x.descricao === f.descricao.value);
      if (ant) {
        f.querySelector(`[name=tipo][value=${ant.tipo}]`).checked = true;
        preencherCategorias();
        f.categoria.value = ant.categoria;
      }
    });
    f.addEventListener("submit", (e) => { e.preventDefault(); salvarLancamento(f, l, doGrupo); });
    m.querySelector("#excluir")?.addEventListener("click", () => excluirLancamento(l, doGrupo));
  });
}

async function salvarLancamento(f, original, doGrupo) {
  const valor = paraCentavos(f.valor.value);
  if (!(valor > 0)) return toast("Informe um valor válido.");
  const c = conta(f.contaId.value);
  const base = {
    tipo: f.tipo.value,
    valor,
    descricao: f.descricao.value.trim(),
    categoria: f.categoria.value,
    data: f.data.value,
    pessoa: f.pessoa.value,
    contaId: f.contaId.value || null,
    obs: f.obs.value.trim(),
  };
  try {
    if (!original) {
      const lista = gerarLancamentos(
        { ...base, criadoPor: estado.eu.id, criadoEm: Date.now() },
        c, f.modo.value, f.vezes.value, crypto.randomUUID?.() || String(Date.now())
      );
      await store.addMany("lancamentos", lista);
      fecharModal();
      toast(lista.length > 1 ? `${lista.length} lançamentos criados.` : "Lançamento salvo.");
      return;
    }
    // Edição
    let escopo = "este";
    if (original.grupoId && doGrupo.length > 1) {
      escopo = await confirmar("Esta alteração vale para:", [
        { texto: "Só este lançamento", valor: "este" },
        { texto: `Todos os ${doGrupo.length} do grupo`, valor: "todos", classe: "primario" },
      ]);
      if (!escopo) return;
    }
    const comum = { ...base, alteradoPor: estado.eu.id, alteradoEm: Date.now() };
    if (escopo === "este") {
      const valorEste = original.recorrencia === "parcelado" && doGrupo.length > 1 ? original.valor : valor;
      await store.update("lancamentos", original.id, { ...comum, valor: valorEste, competencia: original.grupoId ? original.competencia : competencia(base.data, c) });
    } else {
      // regera o grupo inteiro mantendo a 1ª data do grupo como referência
      const primeira = doGrupo.reduce((a, b) => (a.parcela < b.parcela ? a : b));
      const nova = gerarLancamentos({ ...base, criadoPor: primeira.criadoPor, criadoEm: primeira.criadoEm }, c, original.recorrencia, doGrupo.length, original.grupoId);
      const porParcela = Object.fromEntries(doGrupo.map((x) => [x.parcela, x.id]));
      await Promise.all(nova.map((n) => store.update("lancamentos", porParcela[n.parcela], { ...n, alteradoPor: estado.eu.id, alteradoEm: Date.now() })));
    }
    fecharModal();
    toast("Alterações salvas.");
  } catch (e) {
    console.error(e);
    toast("Erro ao salvar: " + (e.code || e.message));
  }
}

async function excluirLancamento(l, doGrupo) {
  let ids = [l.id];
  if (l.grupoId && doGrupo.length > 1) {
    const futuros = doGrupo.filter((x) => x.parcela >= l.parcela);
    const r = await confirmar("Excluir qual parte?", [
      { texto: "Só este lançamento", valor: "este" },
      { texto: `Este e os próximos (${futuros.length})`, valor: "futuros" },
      { texto: `Todos os ${doGrupo.length}`, valor: "todos", classe: "perigo" },
    ]);
    if (!r) return;
    if (r === "futuros") ids = futuros.map((x) => x.id);
    if (r === "todos") ids = doGrupo.map((x) => x.id);
  } else {
    const r = await confirmar(`Excluir "${esc(l.descricao || l.categoria)}" de ${moeda(l.valor)}?`, [{ texto: "Excluir", valor: true, classe: "perigo" }]);
    if (!r) return;
  }
  try {
    await store.removeMany("lancamentos", ids);
    fecharModal();
    toast("Excluído.");
  } catch (e) {
    toast("Erro ao excluir: " + (e.code || e.message));
  }
}

// ---------- Contas / cartões ----------

function formConta(c) {
  const novo = !c;
  abrirModal(`
    <form autocomplete="off">
      <h2>${novo ? "Nova conta ou cartão" : "Editar"}</h2>
      <label>Nome <input name="nome" required placeholder="Ex.: Nubank, Itaú, Cartão Inter" value="${esc(c?.nome || "")}"></label>
      <div class="duas">
        <label>Tipo <select name="tipo">${Object.entries(TIPOS_CONTA).map(([k, v]) => `<option value="${k}" ${c?.tipo === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>De quem <select name="dono">${pessoas.map((p) => `<option value="${p.id}" ${(c?.dono || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>
      <div class="duas so-cartao">
        <label>Dia do fechamento <input type="number" name="fechamento" min="1" max="31" value="${c?.fechamento || ""}"></label>
        <label>Dia do vencimento <input type="number" name="vencimento" min="1" max="31" value="${c?.vencimento || ""}"></label>
      </div>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    const mostrar = () => (m.querySelector(".so-cartao").hidden = f.tipo.value !== "cartao");
    mostrar();
    f.tipo.addEventListener("change", mostrar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = { nome: f.nome.value.trim(), tipo: f.tipo.value, dono: f.dono.value };
      if (dados.tipo === "cartao") {
        dados.fechamento = Number(f.fechamento.value);
        dados.vencimento = Number(f.vencimento.value);
        if (!dados.fechamento || !dados.vencimento) return toast("Informe os dias de fechamento e vencimento.");
      } else {
        dados.fechamento = null;
        dados.vencimento = null;
      }
      try {
        if (novo) await store.add("contas", dados);
        else await store.update("contas", c.id, dados);
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + (err.code || err.message)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      const usados = estado.lancamentos.filter((l) => l.contaId === c.id).length;
      if (usados) return toast(`Não dá para excluir: ${usados} lançamento(s) usam esta conta.`);
      if (await confirmar(`Excluir "${esc(c.nome)}"?`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("contas", c.id);
        toast("Excluído.");
      }
    });
  });
}

// ---------- Categorias ----------

function formCategoria(c) {
  const novo = !c.id;
  abrirModal(`
    <form autocomplete="off">
      <h2>${novo ? "Nova categoria" : "Editar categoria"}</h2>
      <div class="duas estreita">
        <label>Ícone <input name="icone" maxlength="4" value="${esc(c.icone || "")}" placeholder="🙂"></label>
        <label>Nome <input name="nome" required value="${esc(c.nome || "")}"></label>
      </div>
      <label>Tipo <select name="tipo"><option value="despesa" ${c.tipo === "despesa" ? "selected" : ""}>Despesa</option><option value="receita" ${c.tipo === "receita" ? "selected" : ""}>Receita</option></select></label>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = { nome: f.nome.value.trim(), icone: f.icone.value.trim(), tipo: f.tipo.value };
      try {
        if (novo) await store.add("categorias", dados);
        else {
          await store.update("categorias", c.id, dados);
          // renomeia nos lançamentos que usavam o nome antigo
          if (dados.nome !== c.nome) {
            const afetados = estado.lancamentos.filter((l) => l.categoria === c.nome);
            await Promise.all(afetados.map((l) => store.update("lancamentos", l.id, { categoria: dados.nome })));
          }
        }
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + (err.code || err.message)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      const usados = estado.lancamentos.filter((l) => l.categoria === c.nome).length;
      if (usados) return toast(`Não dá para excluir: ${usados} lançamento(s) usam esta categoria.`);
      if (await confirmar(`Excluir a categoria "${esc(c.nome)}"?`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("categorias", c.id);
        toast("Excluída.");
      }
    });
  });
}

// ---------- Exportação ----------

function exportarCSV() {
  const cab = ["data", "mes_referencia", "tipo", "descricao", "categoria", "valor", "pessoa", "conta", "parcela", "observacao"];
  const linhas = [...estado.lancamentos]
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
    .map((l) => [
      l.data, l.competencia, l.tipo, l.descricao, l.categoria,
      (l.valor / 100).toFixed(2).replace(".", ","),
      pessoa(l.pessoa).nome, conta(l.contaId)?.nome || "",
      l.totalParcelas ? `${l.parcela}/${l.totalParcelas}` : "", l.obs || "",
    ]);
  const csv = [cab, ...linhas].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `contas-da-casa-${hojeISO()}.csv`;
  a.click();
}

iniciar();
