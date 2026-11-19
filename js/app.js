// Início do app: login, estrutura da tela (menu lateral / barra inferior), navegação e preparação dos dados.
import * as store from "./store.js";
import { estado, pessoas, pessoa, COLECOES, FILTRO_VAZIO, gravarPreferencia } from "./estado.js";
import { $, $$, esc, toast, abrirModal, erroMsg } from "./ui.js";
import { TELAS, ligarEventos } from "./telas.js";
import { formLancamento, exportarCSV } from "./formularios.js";
import {
  GRUPOS_PADRAO, CATEGORIAS_PADRAO, GRUPO_POR_NOME_ANTIGO, CATEGORIA_V2_PARA_V3, FIXAS_PADRAO,
  mesAtual, somarMeses, nomeMes, grupoDe,
} from "./financas.js";

const VERSAO_DADOS = 3;
const MENU_LATERAL = ["inicio", "lancamentos", "fixas", "limites", "cartoes", "contas", "categorias"];
const MENU_INFERIOR = ["inicio", "lancamentos", "fixas", "cartoes", "mais"];

// ---------- Inicialização e login ----------

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
  $("#btn-google")?.addEventListener("click", () => store.entrar().catch((e) => alert("Erro ao entrar: " + erroMsg(e))));
  $$("[data-demo]").forEach((b) => b.addEventListener("click", () => store.entrar(pessoa(b.dataset.demo).email)));
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

// ---------- Estrutura da tela ----------

let jaAbriu = false;
function abrirApp() {
  if (jaAbriu) return;
  jaAbriu = true;
  const item = (id) => `<button data-aba="${id}"><span class="i">${TELAS[id].icone}</span><span>${TELAS[id].titulo}</span></button>`;
  $("#app").innerHTML = `
    <aside class="lateral">
      <div class="marca">💰 <b>Contas da Casa</b></div>
      <nav>${MENU_LATERAL.map(item).join("")}</nav>
      <div class="lateral-rodape">
        <button class="btn link" id="exportar-lateral">⬇️ Exportar lançamentos</button>
        <div class="usuario">
          <span class="avatar" style="background:${estado.eu.cor}">${esc(estado.eu.nome[0])}</span>
          <span class="txt"><b>${esc(estado.eu.nome)}</b><small>${esc(estado.usuario.email)}</small></span>
          <button class="btn link" id="sair-lateral" title="Sair">Sair</button>
        </div>
      </div>
    </aside>
    <div class="principal">
      <header class="topo">
        <div class="seletor-mes">
          <button class="icone" id="mes-ant" aria-label="Mês anterior">‹</button>
          <button class="mes-nome" id="mes-hoje" title="Voltar ao mês atual"></button>
          <button class="icone" id="mes-prox" aria-label="Próximo mês">›</button>
        </div>
        <span class="titulo-topo"></span>
        <button class="avatar so-celular" id="btn-perfil" style="background:${estado.eu.cor}" title="${esc(estado.usuario.email)}">${esc(estado.eu.nome[0])}</button>
      </header>
      <main id="conteudo"><p class="carregando">Carregando…</p></main>
    </div>
    <button class="fab" id="btn-novo" aria-label="Novo lançamento">+</button>
    <nav class="abas">${MENU_INFERIOR.map(item).join("")}</nav>
    <div id="modal" class="modal" hidden></div>
    <div id="toast" class="toast" hidden></div>`;

  $("#mes-ant").onclick = () => mudarMes(-1);
  $("#mes-prox").onclick = () => mudarMes(1);
  $("#mes-hoje").onclick = () => { estado.mes = mesAtual(); render(); };
  $("#btn-novo").onclick = escolherNovo;
  $("#btn-perfil").onclick = menuPerfil;
  $("#sair-lateral").onclick = () => store.sair();
  $("#exportar-lateral").onclick = exportarCSV;
  $$("[data-aba]").forEach((b) => (b.onclick = () => irPara(b.dataset.aba)));

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

function escolherNovo() {
  abrirModal(`
    <h2>O que você quer lançar?</h2>
    <div class="acoes coluna">
      <button class="btn atalho despesa grande" data-n="despesa">− Despesa</button>
      <button class="btn atalho receita grande" data-n="receita">+ Receita</button>
      <button class="btn atalho grande" data-n="transferencia">⇄ Transferência / pagar fatura</button>
      <button class="btn link" data-fechar>Cancelar</button>
    </div>`, (m) => $$("[data-n]", m).forEach((b) => (b.onclick = () => formLancamento(null, { tipo: b.dataset.n }))));
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

const tudoCarregado = () => Object.values(estado.carregado).every(Boolean);
const versaoDados = () => estado.config.find((c) => c.id === "versao")?.dados || 0;

function irPara(aba, filtro) {
  if (!TELAS[aba]) return;
  estado.aba = aba;
  if (filtro) estado.filtro = { ...FILTRO_VAZIO, ...filtro };
  if (aba !== "fixas") estado.gerenciarFixas = false;
  render();
  window.scrollTo(0, 0);
}

function mudarMes(n) {
  estado.mes = somarMeses(estado.mes, n);
  render();
}

function alternarOcultar() {
  estado.ocultar = !estado.ocultar;
  gravarPreferencia("ocultarValores", estado.ocultar ? "1" : "0");
  render();
}

const nav = { irPara, render, alternarOcultar };

function render() {
  if (!estado.eu || !$("#conteudo")) return;
  const tela = TELAS[estado.aba];
  $("#mes-hoje").textContent = nomeMes(estado.mes);
  $(".seletor-mes").hidden = !tela.usaMes;
  $(".titulo-topo").textContent = tela.usaMes ? "" : tela.titulo;
  $$("[data-aba]").forEach((b) => b.classList.toggle("ativa",
    b.dataset.aba === estado.aba || (b.dataset.aba === "mais" && ["contas", "categorias", "limites"].includes(estado.aba))));
  if (!tudoCarregado() || versaoDados() < VERSAO_DADOS) return;
  const el = $("#conteudo");
  el.innerHTML = tela.html();
  ligarEventos(el, nav);
}

// ---------- Dados padrão e atualização de versões anteriores ----------

let preparando = false;
let preparado = false;
async function prepararDados() {
  const versao = versaoDados();
  if (preparando || preparado || versao >= VERSAO_DADOS) return;
  preparando = true;
  try {
    if (versao < 2) await primeiraPreparacao();
    else if (versao < 3) await migrarParaCategoriasOrganizze();
    await store.set("config", "versao", { dados: VERSAO_DADOS, em: Date.now(), por: estado.eu.id });
    preparado = true;
  } catch (e) {
    console.error(e);
    toast("Erro ao preparar os dados: " + erroMsg(e));
  } finally {
    preparando = false;
  }
}

// Primeiro uso (ou dados da versão 1): grupos, categorias e contas fixas padrão.
async function primeiraPreparacao() {
  for (const g of GRUPOS_PADRAO) {
    if (!estado.grupos.some((x) => x.id === g.id)) {
      const { id, ...dados } = g;
      await store.set("grupos", id, dados);
    }
  }
  const usadas = new Set(estado.lancamentos.map((l) => l.categoria));
  for (const c of estado.categorias) {
    if (usadas.has(c.nome)) {
      if (c.tipo === "despesa" && !c.grupo) await store.update("categorias", c.id, { grupo: GRUPO_POR_NOME_ANTIGO[c.nome] || "casa" });
    } else {
      await store.remove("categorias", c.id);
    }
  }
  const ficam = new Set(estado.categorias.filter((c) => usadas.has(c.nome)).map((c) => `${c.tipo}:${c.nome}`));
  const faltando = CATEGORIAS_PADRAO.filter((c) => !ficam.has(`${c.tipo}:${c.nome}`));
  if (faltando.length) await store.addMany("categorias", faltando);
  for (const f of FIXAS_PADRAO) {
    if (!estado.fixas.some((x) => x.id === f.id)) {
      const { id, ...dados } = f;
      await store.set("fixas", id, { ...dados, ativa: true });
    }
  }
}

// Versão 2 -> 3: troca as categorias pelas do Organizze, mantendo o grupo de cada lançamento.
async function migrarParaCategoriasOrganizze() {
  const novoNome = (tipo, nome) => CATEGORIA_V2_PARA_V3[tipo]?.[nome];
  for (const l of estado.lancamentos) {
    const n = novoNome(l.tipo, l.categoria);
    if (!n) continue;
    const dados = { categoria: n };
    if (l.tipo === "despesa") dados.grupo = grupoDe(l, estado.categorias);
    await store.update("lancamentos", l.id, dados);
  }
  for (const f of estado.fixas) {
    const n = novoNome("despesa", f.categoria);
    if (n) await store.update("fixas", f.id, { categoria: n });
  }
  const existentes = new Set();
  for (const c of estado.categorias) {
    if (novoNome(c.tipo, c.nome)) await store.remove("categorias", c.id);
    else existentes.add(`${c.tipo}:${c.nome}`);
  }
  const faltando = CATEGORIAS_PADRAO.filter((c) => !existentes.has(`${c.tipo}:${c.nome}`));
  if (faltando.length) await store.addMany("categorias", faltando);
}

iniciar();
