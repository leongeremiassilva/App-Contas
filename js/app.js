import * as store from "./store.js";
import { pessoas } from "./config.js";
import {
  GRUPOS_PADRAO, CATEGORIAS_PADRAO, GRUPO_POR_NOME_ANTIGO, FIXAS_PADRAO,
  moeda, paraCentavos, hojeISO, mesAtual, somarMeses, nomeMes, dataCurta,
  gerarLancamentos, competencia, resumoDoMes, grupoDe, fixasDoMes,
} from "./financas.js";

const VERSAO_DADOS = 2;

// ---------- Estado ----------

const COLECOES = ["lancamentos", "contas", "categorias", "grupos", "fixas", "config"];
const FILTRO_VAZIO = { grupo: "", pessoa: "", categoria: "", busca: "" };

const estado = {
  usuario: null,
  eu: null, // pessoa (de config.js) correspondente ao usuário logado
  lancamentos: [],
  contas: [],
  categorias: [],
  grupos: [],
  fixas: [],
  config: [],
  carregado: Object.fromEntries(COLECOES.map((c) => [c, false])),
  mes: mesAtual(),
  aba: "resumo",
  gerenciarFixas: false,
  filtro: { ...FILTRO_VAZIO },
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pessoa = (id) => pessoas.find((p) => p.id === id) || { id, nome: id || "—", cor: "#888" };
const conta = (id) => estado.contas.find((c) => c.id === id);
const grupo = (id) => estado.grupos.find((g) => g.id === id) || { id, nome: id || "—", icone: "•" };
const gruposOrdenados = () => [...estado.grupos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
const iconeCat = (nome) => estado.categorias.find((c) => c.nome === nome)?.icone || "•";
const iconeConta = (c) => (c.tipo === "cartao" ? "💳" : c.tipo === "conta" ? "🏦" : "💵");
const TIPOS_CONTA = { conta: "Conta bancária", cartao: "Cartão de crédito", dinheiro: "Dinheiro / outro" };
const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const centavosParaTexto = (v) => (v ? (v / 100).toFixed(2).replace(".", ",") : "");

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
    store.entrar().catch((e) => alert("Erro ao entrar: " + (e.code || e.message)))
  );
  document.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", () => store.entrar(pessoa(b.dataset.demo).email))
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
      <button data-aba="resumo">📊<span>Orçamento</span></button>
      <button data-aba="lancamentos">📋<span>Lançamentos</span></button>
      <button data-aba="fixas">📌<span>Contas fixas</span></button>
      <button data-aba="cadastros">⚙️<span>Ajustes</span></button>
    </nav>
    <div id="modal" class="modal" hidden></div>
    <div id="toast" class="toast" hidden></div>`;

  $("#mes-ant").onclick = () => mudarMes(-1);
  $("#mes-prox").onclick = () => mudarMes(1);
  $("#mes-hoje").onclick = () => { estado.mes = mesAtual(); render(); };
  $("#btn-novo").onclick = () => formLancamento();
  $("#btn-perfil").onclick = menuPerfil;
  document.querySelectorAll("[data-aba]").forEach((b) => (b.onclick = () => irPara(b.dataset.aba)));

  const erro = (e) => {
    console.error(e);
    $("#conteudo").innerHTML = `<p class="vazio">Sem permissão para ler os dados. Confira se as regras do Firestore foram publicadas e se seu e-mail está nelas.</p>`;
  };
  for (const col of COLECOES) {
    store.watch(col, (docs) => {
      estado[col] = docs;
      estado.carregado[col] = true;
      if (tudoCarregado()) prepararDados();
      render();
    }, erro);
  }
  render();
}

const tudoCarregado = () => Object.values(estado.carregado).every(Boolean);

function irPara(aba, filtro) {
  estado.aba = aba;
  if (filtro) estado.filtro = { ...FILTRO_VAZIO, ...filtro };
  if (aba !== "fixas") estado.gerenciarFixas = false;
  render();
  window.scrollTo(0, 0);
}

// Cria os dados padrão na primeira vez e atualiza dados da versão anterior do app.
let preparando = false;
let preparado = false;
async function prepararDados() {
  const versao = estado.config.find((c) => c.id === "versao")?.dados || 0;
  if (preparando || preparado || versao >= VERSAO_DADOS) return;
  preparando = true;
  try {
    for (const g of GRUPOS_PADRAO) {
      if (!estado.grupos.some((x) => x.id === g.id)) {
        const { id, ...dados } = g;
        await store.set("grupos", id, dados);
      }
    }
    // Categorias da versão 1 (sem grupo): apaga as que não foram usadas e liga as usadas a um grupo.
    const usadas = new Set(estado.lancamentos.map((l) => l.categoria));
    for (const c of estado.categorias) {
      if (c.tipo === "despesa" && !c.grupo) {
        if (usadas.has(c.nome)) await store.update("categorias", c.id, { grupo: GRUPO_POR_NOME_ANTIGO[c.nome] || "casa" });
        else await store.remove("categorias", c.id);
      } else if (c.tipo === "receita" && !usadas.has(c.nome) && !CATEGORIAS_PADRAO.some((p) => p.nome === c.nome)) {
        await store.remove("categorias", c.id);
      }
    }
    const existentes = new Set(estado.categorias.filter((c) => c.grupo || c.tipo === "receita" || usadas.has(c.nome)).map((c) => c.nome));
    const faltando = CATEGORIAS_PADRAO.filter((c) => !existentes.has(c.nome));
    if (faltando.length) await store.addMany("categorias", faltando);
    for (const f of FIXAS_PADRAO) {
      if (!estado.fixas.some((x) => x.id === f.id)) {
        const { id, ...dados } = f;
        await store.set("fixas", id, { ...dados, ativa: true });
      }
    }
    await store.set("config", "versao", { dados: VERSAO_DADOS, em: Date.now(), por: estado.eu.id });
    preparado = true;
  } catch (e) {
    console.error(e);
    toast("Erro ao preparar os dados: " + (e.code || e.message));
  } finally {
    preparando = false;
  }
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
  const versao = estado.config.find((c) => c.id === "versao")?.dados || 0;
  if (!tudoCarregado() || versao < VERSAO_DADOS) return;
  const el = $("#conteudo");
  if (estado.aba === "resumo") el.innerHTML = htmlResumo();
  else if (estado.aba === "lancamentos") el.innerHTML = htmlLancamentos();
  else if (estado.aba === "fixas") el.innerHTML = estado.gerenciarFixas ? htmlGerenciarFixas() : htmlFixas();
  else el.innerHTML = htmlCadastros();
  ligarEventosConteudo();
}

function resumoAtual() {
  return resumoDoMes({
    lancamentos: estado.lancamentos, mes: estado.mes, pessoas, contas: estado.contas,
    categorias: estado.categorias, grupos: estado.grupos, fixas: estado.fixas,
  });
}

function htmlResumo() {
  const r = resumoAtual();
  const cats = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maiorCat = cats[0]?.[1] || 1;
  const totalPct = estado.grupos.reduce((s, g) => s + (Number(g.percentual) || 0), 0);

  return `
    <section class="cartoes-resumo">
      <button class="kpi receita" data-ir-grupo="__receita"><span>Receitas</span><b>${moeda(r.receitas)}</b></button>
      <button class="kpi despesa" data-ir-grupo=""><span>Despesas</span><b>${moeda(r.despesas)}</b></button>
      <div class="kpi saldo ${r.saldo < 0 ? "negativo" : ""}"><span>Sobra do mês</span><b>${moeda(r.saldo)}</b></div>
    </section>

    <section class="bloco">
      <div class="cab"><h2>Orçamento do mês</h2>${totalPct !== 100 ? `<small class="alerta">metas somam ${totalPct}%</small>` : ""}</div>
      ${r.receitas === 0 ? `<p class="dica">Lance as receitas do mês (salários) para o app calcular quanto cabe em cada grupo.</p>` : ""}
      ${r.grupos.map(htmlBarraGrupo).join("")}
      ${r.semGrupo ? `<p class="sub">Gastos sem grupo: ${moeda(r.semGrupo)}</p>` : ""}
      ${r.grupos.some((g) => g.grupo.id === "pessoal" && g.gasto) ? `
        <div class="pessoal-divisao">${pessoas.map((p) => `<span><span class="ponto" style="background:${p.cor}"></span>${esc(p.nome)}: <b>${moeda(r.pessoalPorPessoa[p.id])}</b></span>`).join("")}</div>` : ""}
    </section>

    ${r.fixas.total ? `
    <button class="bloco linha-bloco" data-ir="fixas">
      <span>📌 <b>Contas fixas:</b> ${r.fixas.pagas} de ${r.fixas.total} pagas</span>
      <span>${r.fixas.pagas < r.fixas.total ? `<small>faltam</small> <b>${moeda(r.fixas.pendente)}</b>` : "✅"} ›</span>
    </button>` : ""}

    ${r.faturas.length ? `
    <section class="bloco">
      <h2>Faturas que vencem neste mês</h2>
      ${r.faturas.map((f) => `
        <div class="linha-simples">
          <span>💳 ${esc(f.conta.nome)}
            <small>${esc(pessoa(f.conta.dono).nome)} · vence dia ${f.conta.vencimento || "?"}${f.pessoal ? ` · casa ${moeda(f.casa)} · pessoal ${moeda(f.pessoal)}` : ""}</small>
          </span>
          <b>${moeda(f.total)}</b>
        </div>`).join("")}
    </section>` : ""}

    ${r.receitas ? `
    <section class="bloco">
      <h2>Receitas</h2>
      ${pessoas.map((p) => `
        <div class="linha-simples"><span><span class="ponto" style="background:${p.cor}"></span>${esc(p.nome)}</span><b>${moeda(r.receitasPorPessoa[p.id])}</b></div>`).join("")}
    </section>` : ""}

    ${cats.length ? `
    <section class="bloco">
      <h2>Onde mais gastamos</h2>
      ${cats.map(([nome, v]) => `
        <button class="barra-cat" data-filtrar-cat="${esc(nome)}">
          <span class="rotulo">${iconeCat(nome)} ${esc(nome)}</span>
          <span class="valor">${moeda(v)} <small>${Math.round((v / r.despesas) * 100)}%</small></span>
          <span class="trilho"><span style="width:${(v / maiorCat) * 100}%"></span></span>
        </button>`).join("")}
    </section>` : ""}

    ${r.quantidade === 0 ? `<p class="vazio">Nada lançado em ${nomeMes(estado.mes)} ainda. Toque no <b>+</b> para lançar.</p>` : ""}`;
}

function htmlBarraGrupo({ grupo: g, meta, gasto, resta, uso }) {
  const nivel = uso > 1 ? "estourou" : uso > 0.85 ? "atencao" : "ok";
  const largura = Math.min(100, uso === Infinity ? 100 : uso * 100);
  return `
    <button class="grupo-linha" data-ir-grupo="${g.id}">
      <span class="rotulo">${g.icone || ""} ${esc(g.nome)} <small>${g.percentual || 0}%</small></span>
      <span class="valor">${moeda(gasto)} <small>de ${moeda(meta)}</small></span>
      <span class="trilho ${nivel}"><span style="width:${largura}%"></span></span>
      <small class="resta ${nivel}">${meta === 0 && gasto === 0 ? "" : resta >= 0 ? `sobram ${moeda(resta)}` : `passou ${moeda(-resta)}`}</small>
    </button>`;
}

function lancamentosFiltrados() {
  const f = estado.filtro;
  const busca = f.busca.trim().toLowerCase();
  return estado.lancamentos
    .filter((l) => l.competencia === estado.mes)
    .filter((l) => !f.grupo || (f.grupo === "__receita" ? l.tipo === "receita" : grupoDe(l, estado.categorias) === f.grupo))
    .filter((l) => !f.pessoa || (l.pessoalDe || l.pessoa) === f.pessoa)
    .filter((l) => !f.categoria || l.categoria === f.categoria)
    .filter((l) => !busca || `${l.descricao} ${l.categoria} ${conta(l.contaId)?.nome || ""} ${l.obs || ""}`.toLowerCase().includes(busca))
    .sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || 0) - (a.criadoEm || 0));
}

function htmlLancamentos() {
  const f = estado.filtro;
  const lista = lancamentosFiltrados();
  const total = lista.reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);
  const cats = [...new Set(estado.categorias.map((c) => c.nome))].sort((a, b) => a.localeCompare(b));
  const grupos = [];
  for (const l of lista) {
    const g = grupos[grupos.length - 1];
    if (g && g.data === l.data) g.itens.push(l);
    else grupos.push({ data: l.data, itens: [l] });
  }
  return `
    <section class="filtros">
      <input type="search" id="f-busca" placeholder="Buscar…" value="${esc(f.busca)}">
      <select id="f-grupo">
        <option value="">Tudo</option>
        ${gruposOrdenados().map((g) => `<option value="${g.id}" ${f.grupo === g.id ? "selected" : ""}>${g.icone || ""} ${esc(g.nome)}</option>`).join("")}
        <option value="__receita" ${f.grupo === "__receita" ? "selected" : ""}>💰 Receitas</option>
      </select>
      <select id="f-pessoa"><option value="">Os dois</option>${pessoas.map((p) => `<option value="${p.id}" ${f.pessoa === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>
      <select id="f-categoria"><option value="">Todas as categorias</option>${cats.map((c) => `<option ${f.categoria === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      ${f.grupo || f.pessoa || f.categoria || f.busca ? `<button class="btn link" id="f-limpar">Limpar filtros</button>` : ""}
    </section>
    <p class="total-lista">${lista.length} lançamento(s) · <b class="${total < 0 ? "neg" : "pos"}">${moeda(total)}</b></p>
    ${lista.length === 0 ? `<p class="vazio">Nenhum lançamento encontrado.</p>` : grupos.map((g) => `
      <h3 class="dia">${dataCurta(g.data)}</h3>
      <ul class="lista">${g.itens.map(htmlItem).join("")}</ul>`).join("")}`;
}

function htmlItem(l) {
  const c = conta(l.contaId);
  const gid = grupoDe(l, estado.categorias);
  const quem = gid === "pessoal" ? pessoa(l.pessoalDe || l.pessoa) : null;
  const parcela = l.totalParcelas ? ` · ${l.recorrencia === "fixo" ? "mês" : "parcela"} ${l.parcela}/${l.totalParcelas}` : "";
  const etiqueta = l.tipo === "receita"
    ? `<span class="etiqueta receita">Receita · ${esc(pessoa(l.pessoa).nome)}</span>`
    : `<span class="etiqueta">${esc(grupo(gid).nome)}${quem ? ` · ${esc(quem.nome)}` : ""}</span>`;
  return `
    <li class="item" data-editar="${l.id}">
      <span class="ic">${iconeCat(l.categoria)}</span>
      <span class="txt">
        <b>${esc(l.descricao || l.categoria)}</b>
        <small>${etiqueta}${c ? ` ${iconeConta(c)} ${esc(c.nome)}` : ""}${parcela}</small>
      </span>
      <span class="val ${l.tipo}">${l.tipo === "receita" ? "+" : "−"}${moeda(l.valor)}</span>
    </li>`;
}

// ---------- Contas fixas ----------

function htmlFixas() {
  const lista = fixasDoMes(estado.fixas, estado.lancamentos, estado.mes);
  const previsto = lista.reduce((s, f) => s + (f.paga ? f.pago : f.fixa.valor || 0), 0);
  const pago = lista.reduce((s, f) => s + f.pago, 0);
  return `
    <section class="cartoes-resumo">
      <div class="kpi"><span>Total do mês</span><b>${moeda(previsto)}</b></div>
      <div class="kpi"><span>Já pago</span><b>${moeda(pago)}</b></div>
    </section>
    <p class="sub">Toque numa conta pendente para registrar o pagamento. Ela entra nos lançamentos do mês, no grupo da conta.</p>
    ${lista.length === 0 ? `<p class="vazio">Nenhuma conta fixa para ${nomeMes(estado.mes)}.</p>` : `
    <ul class="lista">${lista.map(({ fixa: f, paga, pago: valorPago, pagamentos }) => `
      <li class="item ${paga ? "paga" : ""}" data-fixa="${f.id}" ${paga ? `data-editar="${pagamentos[0].id}"` : ""}>
        <span class="ic">${paga ? "✅" : "⬜"}</span>
        <span class="txt">
          <b>${esc(f.nome)}</b>
          <small>${paga ? `paga em ${dataCurta(pagamentos[0].data)}${pagamentos[0].contaId && conta(pagamentos[0].contaId) ? ` · ${esc(conta(pagamentos[0].contaId).nome)}` : ""}` : `vence dia ${f.dia || "?"}`}${f.valor ? "" : paga ? "" : " · valor a definir"}</small>
        </span>
        <span class="val">${moeda(paga ? valorPago : f.valor)}</span>
      </li>`).join("")}
    </ul>`}
    <div class="acoes centro"><button class="btn" id="gerenciar-fixas">✏️ Editar lista de contas fixas</button></div>`;
}

function htmlGerenciarFixas() {
  const lista = [...estado.fixas].sort((a, b) => (a.ativa === false) - (b.ativa === false) || a.nome.localeCompare(b.nome));
  return `
    <section class="bloco">
      <div class="cab"><h2>Contas fixas</h2><button class="btn pequeno" id="nova-fixa">+ Adicionar</button></div>
      <p class="sub">Valor previsto e dia de vencimento de cada conta. Toque para editar.</p>
      <ul class="lista">${lista.map((f) => `
        <li class="item ${f.ativa === false ? "inativa" : ""}" data-editar-fixa="${f.id}">
          <span class="ic">${iconeCat(f.categoria)}</span>
          <span class="txt"><b>${esc(f.nome)}</b>
            <small>dia ${f.dia || "?"} · ${f.meses?.length ? f.meses.map((m) => NOMES_MESES[m - 1]).join(", ") : "todo mês"}${f.ativa === false ? " · desativada" : ""}</small></span>
          <span class="val">${f.valor ? moeda(f.valor) : "—"}</span>
        </li>`).join("")}
      </ul>
    </section>
    <div class="acoes centro"><button class="btn" id="voltar-fixas">‹ Voltar para o mês</button></div>`;
}

function formFixa(f) {
  const nova = !f;
  const cats = estado.categorias.filter((c) => c.tipo === "despesa").sort((a, b) => a.nome.localeCompare(b.nome));
  const meses = f?.meses || [];
  abrirModal(`
    <form autocomplete="off">
      <h2>${nova ? "Nova conta fixa" : "Editar conta fixa"}</h2>
      <label>Nome <input name="nome" required placeholder="Ex.: Condomínio" value="${esc(f?.nome || "")}"></label>
      <div class="duas">
        <label>Valor previsto <input name="valor" inputmode="decimal" placeholder="0,00" value="${centavosParaTexto(f?.valor)}"></label>
        <label>Dia do vencimento <input type="number" name="dia" min="1" max="31" value="${f?.dia || ""}"></label>
      </div>
      <label>Categoria <select name="categoria">${cats.map((c) => `<option value="${esc(c.nome)}" ${f?.categoria === c.nome ? "selected" : ""}>${c.icone || ""} ${esc(c.nome)} (${esc(grupo(c.grupo).nome)})</option>`).join("")}</select></label>
      <fieldset class="meses">
        <legend>Em quais meses? <small>(nenhum marcado = todo mês)</small></legend>
        ${NOMES_MESES.map((n, i) => `<label><input type="checkbox" name="mes" value="${i + 1}" ${meses.includes(i + 1) ? "checked" : ""}><span>${n}</span></label>`).join("")}
      </fieldset>
      <label class="check"><input type="checkbox" name="ativa" ${f?.ativa === false ? "" : "checked"}> Ativa</label>
      <div class="acoes">
        ${nova ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const form = m.querySelector("form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const valor = form.valor.value.trim() ? paraCentavos(form.valor.value) : 0;
      if (Number.isNaN(valor)) return toast("Valor inválido.");
      const dados = {
        nome: form.nome.value.trim(),
        valor,
        dia: Number(form.dia.value) || null,
        categoria: form.categoria.value,
        meses: [...form.querySelectorAll("[name=mes]:checked")].map((i) => Number(i.value)),
        ativa: form.ativa.checked,
      };
      try {
        if (nova) await store.add("fixas", dados);
        else await store.update("fixas", f.id, dados);
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + (err.code || err.message)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      if (await confirmar(`Excluir a conta fixa "${esc(f.nome)}"? Os pagamentos já lançados continuam nos lançamentos.`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("fixas", f.id);
        toast("Excluída.");
      }
    });
  });
}

function pagarFixa(f) {
  const cat = estado.categorias.find((c) => c.nome === f.categoria);
  const dia = String(Math.min(f.dia || 1, 28)).padStart(2, "0");
  const hoje = hojeISO();
  const data = hoje.slice(0, 7) === estado.mes ? hoje : `${estado.mes}-${dia}`;
  formLancamento(null, {
    tipo: "despesa", valor: f.valor, descricao: f.nome, categoria: f.categoria,
    grupo: cat?.grupo || "fixos", data, fixaId: f.id,
  });
}

// ---------- Ajustes ----------

function htmlCadastros() {
  const contasOrd = [...estado.contas].sort((a, b) => (a.dono || "").localeCompare(b.dono || "") || a.nome.localeCompare(b.nome));
  const totalPct = estado.grupos.reduce((s, g) => s + (Number(g.percentual) || 0), 0);
  const catsDe = (filtro) => estado.categorias.filter(filtro).sort((a, b) => a.nome.localeCompare(b.nome));
  return `
    <section class="bloco">
      <h2>Metas dos grupos</h2>
      <p class="sub">Quanto da receita do mês cada grupo pode usar.</p>
      <form id="form-metas" class="metas">
        ${gruposOrdenados().map((g) => `
          <label class="meta-linha"><span>${g.icone || ""} ${esc(g.nome)}</span>
            <span class="pct"><input type="number" name="${g.id}" min="0" max="100" step="1" value="${g.percentual || 0}">%</span></label>`).join("")}
        <p class="total-metas ${totalPct === 100 ? "" : "alerta"}">Total: <b id="total-pct">${totalPct}%</b></p>
        <button class="btn primario" type="submit">Salvar metas</button>
      </form>
    </section>

    <section class="bloco">
      <div class="cab"><h2>Contas e cartões</h2><button class="btn pequeno" id="nova-conta">+ Adicionar</button></div>
      ${contasOrd.length === 0 ? `<p class="vazio">Cadastre as contas bancárias e cartões de cada um. Para cartões, informe o dia de fechamento e de vencimento: o app calcula em qual fatura cada compra cai.</p>` : ""}
      <ul class="lista">${contasOrd.map((c) => `
        <li class="item" data-conta="${c.id}">
          <span class="ic">${iconeConta(c)}</span>
          <span class="txt"><b>${esc(c.nome)}</b><small><span class="ponto" style="background:${pessoa(c.dono).cor}"></span>${esc(pessoa(c.dono).nome)} · ${TIPOS_CONTA[c.tipo]}${c.tipo === "cartao" ? ` · fecha ${c.fechamento}, vence ${c.vencimento}` : ""}</small></span>
          <span class="seta">›</span>
        </li>`).join("")}</ul>
    </section>

    <section class="bloco">
      <div class="cab"><h2>Categorias</h2><button class="btn pequeno" id="nova-cat">+ Adicionar</button></div>
      ${gruposOrdenados().map((g) => `
        <h3 class="subtitulo">${g.icone || ""} ${esc(g.nome)}</h3>
        <div class="chips">${catsDe((c) => c.tipo === "despesa" && (c.grupo || "casa") === g.id).map((c) => `<button class="chip" data-cat="${c.id}">${c.icone || ""} ${esc(c.nome)}</button>`).join("") || `<small>nenhuma</small>`}</div>`).join("")}
      <h3 class="subtitulo">💰 Receitas</h3>
      <div class="chips">${catsDe((c) => c.tipo === "receita").map((c) => `<button class="chip" data-cat="${c.id}">${c.icone || ""} ${esc(c.nome)}</button>`).join("")}</div>
    </section>

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
  el.querySelectorAll("[data-fixa]:not([data-editar])").forEach((li) =>
    li.addEventListener("click", () => pagarFixa(estado.fixas.find((f) => f.id === li.dataset.fixa)))
  );
  el.querySelectorAll("[data-editar-fixa]").forEach((li) =>
    li.addEventListener("click", () => formFixa(estado.fixas.find((f) => f.id === li.dataset.editarFixa)))
  );
  $("#gerenciar-fixas")?.addEventListener("click", () => { estado.gerenciarFixas = true; render(); });
  $("#voltar-fixas")?.addEventListener("click", () => { estado.gerenciarFixas = false; render(); });
  $("#nova-fixa")?.addEventListener("click", () => formFixa());
  el.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => irPara(b.dataset.ir)));
  el.querySelectorAll("[data-ir-grupo]").forEach((b) =>
    b.addEventListener("click", () => irPara("lancamentos", { grupo: b.dataset.irGrupo }))
  );
  el.querySelectorAll("[data-filtrar-cat]").forEach((b) =>
    b.addEventListener("click", () => irPara("lancamentos", { categoria: b.dataset.filtrarCat }))
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
  liga("f-grupo", "grupo");
  liga("f-pessoa", "pessoa");
  liga("f-categoria", "categoria");
  $("#f-limpar")?.addEventListener("click", () => { estado.filtro = { ...FILTRO_VAZIO }; render(); });

  const metas = $("#form-metas");
  if (metas) {
    const somar = () => {
      const t = [...metas.querySelectorAll("input")].reduce((s, i) => s + (Number(i.value) || 0), 0);
      $("#total-pct").textContent = t + "%";
      metas.querySelector(".total-metas").classList.toggle("alerta", t !== 100);
    };
    metas.addEventListener("input", somar);
    metas.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await Promise.all([...metas.querySelectorAll("input")].map((i) => store.update("grupos", i.name, { percentual: Number(i.value) || 0 })));
        toast("Metas salvas.");
      } catch (err) { toast("Erro: " + (err.code || err.message)); }
    });
  }

  $("#nova-conta")?.addEventListener("click", () => formConta());
  el.querySelectorAll("[data-conta]").forEach((li) => li.addEventListener("click", () => formConta(conta(li.dataset.conta))));
  $("#nova-cat")?.addEventListener("click", () => formCategoria({ tipo: "despesa", grupo: "casa" }));
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
  m.querySelector("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select")?.focus();
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

// l: lançamento existente (edição). pre: valores iniciais para um novo (ex.: pagar conta fixa).
function formLancamento(l, pre = {}) {
  const novo = !l;
  const v = l || pre;
  const tipo = v.tipo || "despesa";
  const doGrupo = l?.grupoId ? estado.lancamentos.filter((x) => x.grupoId === l.grupoId) : [];
  const minhasContas = estado.contas.filter((c) => c.dono === estado.eu.id);
  const contaPadrao = v.contaId ?? (minhasContas.length === 1 ? minhasContas[0].id : "");
  const valorInicial = l ? (l.recorrencia === "parcelado" ? doGrupo.reduce((s, x) => s + x.valor, 0) : l.valor) : v.valor || 0;
  const grupoInicial = l ? grupoDe(l, estado.categorias) : v.grupo || "";
  const fixa = v.fixaId ? estado.fixas.find((f) => f.id === v.fixaId) : null;

  abrirModal(`
    <form id="form-lanc" autocomplete="off">
      <h2>${novo ? (fixa ? `Pagar ${esc(fixa.nome)}` : "Novo lançamento") : "Editar lançamento"}</h2>
      <div class="segmentado">
        <label><input type="radio" name="tipo" value="despesa" ${tipo === "despesa" ? "checked" : ""}><span>Despesa</span></label>
        <label><input type="radio" name="tipo" value="receita" ${tipo === "receita" ? "checked" : ""}><span>Receita</span></label>
      </div>
      <label>Valor ${l?.recorrencia === "parcelado" ? "(total da compra)" : ""}
        <input name="valor" inputmode="decimal" placeholder="0,00" required value="${centavosParaTexto(valorInicial)}">
      </label>
      <label>Descrição <input name="descricao" placeholder="Ex.: Muffato, Posto, Conta de luz" value="${esc(v.descricao || "")}" list="sugestoes"></label>
      <datalist id="sugestoes">${[...new Set(estado.lancamentos.map((x) => x.descricao).filter(Boolean))].slice(0, 300).map((d) => `<option value="${esc(d)}">`).join("")}</datalist>
      <label>Categoria <select name="categoria" required></select></label>
      <div class="duas so-despesa">
        <label>Grupo <select name="grupo">${gruposOrdenados().map((g) => `<option value="${g.id}">${g.icone || ""} ${esc(g.nome)}</option>`).join("")}</select></label>
        <label class="so-pessoal">Pessoal de <select name="pessoalDe">${pessoas.map((p) => `<option value="${p.id}" ${(v.pessoalDe || v.pessoa || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>
      <div class="duas">
        <label>Data <input type="date" name="data" required value="${v.data || hojeISO()}"></label>
        <label class="so-receita">Recebido por <select name="pessoa">${pessoas.map((p) => `<option value="${p.id}" ${(v.pessoa || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>
      <label>Conta / cartão
        <select name="contaId">
          <option value="">— sem conta —</option>
          ${pessoas.map((p) => {
            const cs = estado.contas.filter((c) => c.dono === p.id);
            return cs.length ? `<optgroup label="${esc(p.nome)}">${cs.map((c) => `<option value="${c.id}" ${contaPadrao === c.id ? "selected" : ""}>${iconeConta(c)} ${esc(c.nome)}</option>`).join("")}</optgroup>` : "";
          }).join("")}
        </select>
      </label>
      ${novo && !fixa ? `
      <label>Repetição
        <select name="modo">
          <option value="unico">Só esta vez</option>
          <option value="parcelado">Parcelado (divide o valor)</option>
          <option value="fixo">Repete todo mês (mesmo valor)</option>
        </select>
      </label>
      <label class="vezes" hidden>Quantas vezes / meses <input type="number" name="vezes" min="2" max="120" value="2"></label>` :
      l?.totalParcelas ? `<p class="sub">${l.recorrencia === "fixo" ? "Repetição" : "Parcela"} ${l.parcela} de ${l.totalParcelas}</p>` : ""}
      <p class="info-competencia sub"></p>
      <label>Observação <input name="obs" value="${esc(v.obs || "")}"></label>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    const grupoDaCategoria = () => estado.categorias.find((c) => c.nome === f.categoria.value && c.tipo === "despesa")?.grupo;
    const preencherCategorias = () => {
      const t = f.tipo.value;
      const atual = f.categoria.value || v.categoria;
      if (t === "receita") {
        const cats = estado.categorias.filter((c) => c.tipo === "receita").sort((a, b) => a.nome.localeCompare(b.nome));
        f.categoria.innerHTML = cats.map((c) => `<option value="${esc(c.nome)}">${c.icone || ""} ${esc(c.nome)}</option>`).join("");
      } else {
        f.categoria.innerHTML = gruposOrdenados().map((g) => {
          const cats = estado.categorias.filter((c) => c.tipo === "despesa" && (c.grupo || "casa") === g.id).sort((a, b) => a.nome.localeCompare(b.nome));
          return cats.length ? `<optgroup label="${esc(g.nome)}">${cats.map((c) => `<option value="${esc(c.nome)}">${c.icone || ""} ${esc(c.nome)}</option>`).join("")}</optgroup>` : "";
        }).join("");
      }
      if ([...f.categoria.options].some((o) => o.value === atual)) f.categoria.value = atual;
      atualizar();
    };
    const atualizar = () => {
      const despesa = f.tipo.value === "despesa";
      m.querySelectorAll(".so-despesa").forEach((e) => (e.hidden = !despesa));
      m.querySelectorAll(".so-receita").forEach((e) => (e.hidden = despesa));
      m.querySelectorAll(".so-pessoal").forEach((e) => (e.hidden = !despesa || f.grupo.value !== "pessoal"));
      const c = conta(f.contaId.value);
      const info = m.querySelector(".info-competencia");
      info.textContent = f.data.value && c?.tipo === "cartao" ? `Entra na fatura de ${nomeMes(competencia(f.data.value, c))}.` : "";
      if (f.modo) m.querySelector(".vezes").hidden = f.modo.value === "unico";
    };
    preencherCategorias();
    f.grupo.value = grupoInicial || grupoDaCategoria() || "casa";
    atualizar();
    f.querySelectorAll("[name=tipo]").forEach((r) => r.addEventListener("change", preencherCategorias));
    f.categoria.addEventListener("change", () => { const g = grupoDaCategoria(); if (g) f.grupo.value = g; atualizar(); });
    f.grupo.addEventListener("change", atualizar);
    f.contaId.addEventListener("change", () => {
      const c = conta(f.contaId.value);
      if (c) { f.pessoalDe.value = c.dono; f.pessoa.value = c.dono; }
      atualizar();
    });
    f.data.addEventListener("change", atualizar);
    f.modo?.addEventListener("change", atualizar);
    f.descricao.addEventListener("change", () => {
      // sugere categoria e grupo do último lançamento com a mesma descrição
      if (!novo) return;
      const ant = [...estado.lancamentos].reverse().find((x) => x.descricao === f.descricao.value);
      if (ant) {
        f.querySelector(`[name=tipo][value=${ant.tipo}]`).checked = true;
        preencherCategorias();
        f.categoria.value = ant.categoria;
        if (ant.tipo === "despesa") f.grupo.value = grupoDe(ant, estado.categorias);
        atualizar();
      }
    });
    f.addEventListener("submit", (e) => { e.preventDefault(); salvarLancamento(f, l, doGrupo, v.fixaId); });
    m.querySelector("#excluir")?.addEventListener("click", () => excluirLancamento(l, doGrupo));
  });
}

async function salvarLancamento(f, original, doGrupo, fixaId) {
  const valor = paraCentavos(f.valor.value);
  if (!(valor > 0)) return toast("Informe um valor válido.");
  if (!f.categoria.value) return toast("Escolha uma categoria.");
  const c = conta(f.contaId.value);
  const despesa = f.tipo.value === "despesa";
  const grupoEscolhido = despesa ? f.grupo.value : null;
  const base = {
    tipo: f.tipo.value,
    valor,
    descricao: f.descricao.value.trim(),
    categoria: f.categoria.value,
    grupo: grupoEscolhido,
    pessoalDe: grupoEscolhido === "pessoal" ? f.pessoalDe.value : null,
    data: f.data.value,
    // de quem é o dinheiro/conta: receita = quem recebeu; despesa = dono da conta (ou quem lançou)
    pessoa: despesa ? c?.dono || (grupoEscolhido === "pessoal" ? f.pessoalDe.value : estado.eu.id) : f.pessoa.value,
    contaId: f.contaId.value || null,
    obs: f.obs.value.trim(),
    fixaId: fixaId || original?.fixaId || null,
  };
  try {
    if (!original) {
      const modo = f.modo?.value || "unico";
      const lista = gerarLancamentos(
        { ...base, criadoPor: estado.eu.id, criadoEm: Date.now() },
        c, modo, f.vezes?.value, crypto.randomUUID?.() || String(Date.now())
      );
      // conta fixa paga: vale no mês que está aberto na tela, mesmo se paga com cartão
      if (fixaId) lista[0].competencia = estado.mes;
      await store.addMany("lancamentos", lista);
      fecharModal();
      toast(fixaId ? "Pagamento registrado." : lista.length > 1 ? `${lista.length} lançamentos criados.` : "Lançamento salvo.");
      return;
    }
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
      const comp = original.grupoId || original.fixaId ? original.competencia : competencia(base.data, c);
      await store.update("lancamentos", original.id, { ...comum, valor: valorEste, competencia: comp });
    } else {
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
      <label>Nome <input name="nome" required placeholder="Ex.: Cartão BB, Inter, C6" value="${esc(c?.nome || "")}"></label>
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
      <div class="duas">
        <label>Tipo <select name="tipo"><option value="despesa" ${c.tipo === "despesa" ? "selected" : ""}>Despesa</option><option value="receita" ${c.tipo === "receita" ? "selected" : ""}>Receita</option></select></label>
        <label class="so-despesa">Grupo <select name="grupo">${gruposOrdenados().map((g) => `<option value="${g.id}" ${(c.grupo || "casa") === g.id ? "selected" : ""}>${g.icone || ""} ${esc(g.nome)}</option>`).join("")}</select></label>
      </div>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    const mostrar = () => (m.querySelector(".so-despesa").hidden = f.tipo.value !== "despesa");
    mostrar();
    f.tipo.addEventListener("change", mostrar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = { nome: f.nome.value.trim(), icone: f.icone.value.trim(), tipo: f.tipo.value, grupo: f.tipo.value === "despesa" ? f.grupo.value : null };
      try {
        if (novo) await store.add("categorias", dados);
        else {
          await store.update("categorias", c.id, dados);
          if (dados.nome !== c.nome) {
            const afetados = estado.lancamentos.filter((l) => l.categoria === c.nome);
            await Promise.all(afetados.map((l) => store.update("lancamentos", l.id, { categoria: dados.nome })));
            const fixas = estado.fixas.filter((x) => x.categoria === c.nome);
            await Promise.all(fixas.map((x) => store.update("fixas", x.id, { categoria: dados.nome })));
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
  const cab = ["data", "mes_referencia", "tipo", "grupo", "pessoal_de", "descricao", "categoria", "valor", "conta", "dono_da_conta", "parcela", "observacao"];
  const linhas = [...estado.lancamentos]
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
    .map((l) => {
      const g = grupoDe(l, estado.categorias);
      return [
        l.data, l.competencia, l.tipo, g ? grupo(g).nome : "", l.pessoalDe ? pessoa(l.pessoalDe).nome : "",
        l.descricao, l.categoria, (l.valor / 100).toFixed(2).replace(".", ","),
        conta(l.contaId)?.nome || "", pessoa(l.pessoa).nome,
        l.totalParcelas ? `${l.parcela}/${l.totalParcelas}` : "", l.obs || "",
      ];
    });
  const csv = [cab, ...linhas].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `contas-da-casa-${hojeISO()}.csv`;
  a.click();
}

iniciar();
