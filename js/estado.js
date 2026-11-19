// Estado compartilhado entre as telas e funções auxiliares de consulta.
import { pessoas } from "./config.js";
import { moeda, mesAtual, CATEGORIAS_PADRAO } from "./financas.js";
import { svg, existeIcone, ICONE_GRUPO } from "./icones.js";

export const COLECOES = ["lancamentos", "contas", "categorias", "grupos", "fixas", "metas", "config"];
export const FILTRO_VAZIO = { grupo: "", pessoa: "", categoria: "", conta: "", status: "", tag: "", busca: "" };

export const estado = {
  usuario: null,
  eu: null, // pessoa (de config.js) correspondente ao usuário logado
  lancamentos: [],
  contas: [],
  categorias: [],
  grupos: [],
  fixas: [],
  metas: [],
  config: [],
  carregado: Object.fromEntries(COLECOES.map((c) => [c, false])),
  mes: mesAtual(),
  aba: "inicio",
  cartaoAberto: null,
  gerenciarFixas: false,
  rel: { aba: "fluxo", meses: 6, categoria: null, tag: null },
  importacao: null,
  diasAviso: Number(lerPreferencia("diasAviso")) || 5,
  filtro: { ...FILTRO_VAZIO },
  ocultar: lerPreferencia("ocultarValores") === "1",
  tema: lerPreferencia("tema") || "auto", // "claro" | "escuro" | "auto" (segue o aparelho)
};

function lerPreferencia(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
export function gravarPreferencia(k, v) {
  try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ }
}

export { pessoas };
export const pessoa = (id) => pessoas.find((p) => p.id === id) || { id, nome: id || "—", cor: "#888" };
export const conta = (id) => estado.contas.find((c) => c.id === id);
export const contasBancarias = () => estado.contas.filter((c) => c.tipo !== "cartao").sort(ordenarContas);
export const cartoes = () => estado.contas.filter((c) => c.tipo === "cartao").sort(ordenarContas);
function ordenarContas(a, b) {
  return (a.dono || "").localeCompare(b.dono || "") || a.nome.localeCompare(b.nome);
}
export const grupo = (id) => estado.grupos.find((g) => g.id === id) || { id, nome: id || "—" };
export const gruposOrdenados = () => [...estado.grupos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
// ---------- Ícones ----------

const CORES_RESERVA = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];
const corPorNome = (nome = "") => CORES_RESERVA[[...nome].reduce((s, ch) => s + ch.charCodeAt(0), 0) % CORES_RESERVA.length];

// Ícone e cor de uma categoria: o escolhido na categoria ou o padrão pelo nome.
export function infoCategoria(nome, tipo) {
  const c = estado.categorias.find((x) => x.nome === nome && (!tipo || x.tipo === tipo));
  const padrao = CATEGORIAS_PADRAO.find((x) => x.nome === nome && (!tipo || x.tipo === tipo));
  const icone = existeIcone(c?.icone) ? c.icone : padrao?.icone || "etiqueta";
  return { icone, cor: c?.cor || padrao?.cor || corPorNome(nome) };
}

// Bolinha colorida com o ícone da categoria (como no Organizze).
export function icCat(nome, tipo, classe = "") {
  const { icone, cor } = infoCategoria(nome, tipo);
  return `<span class="cat-ic ${classe}" style="--c:${cor}">${svg(icone)}</span>`;
}
export const icGrupo = (id) => svg(ICONE_GRUPO[id] || "etiqueta");
export const iconeConta = (c) => svg(!c ? "carteira" : c.tipo === "cartao" ? "cartao" : c.tipo === "conta" ? "banco" : "carteira");
export const icConta = (c, classe = "") => `<span class="cat-ic neutro ${classe}">${iconeConta(c)}</span>`;

// ---------- Tema (claro / escuro) ----------

export const temaEscuroAtivo = () =>
  estado.tema === "escuro" || (estado.tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);

export function aplicarTema() {
  if (estado.tema === "auto") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = estado.tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", temaEscuroAtivo() ? "#141413" : "#14532d");
}

export function alternarTema() {
  estado.tema = temaEscuroAtivo() ? "claro" : "escuro";
  gravarPreferencia("tema", estado.tema);
  aplicarTema();
}

export const TIPOS_CONTA = { conta: "Conta bancária", cartao: "Cartão de crédito", dinheiro: "Dinheiro / carteira" };
export const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const centavosParaTexto = (v) => (v ? (v / 100).toFixed(2).replace(".", ",") : "");

// Valor em reais, respeitando o "esconder valores" (olho).
export const dinheiro = (v) => (estado.ocultar ? "R$ •••••" : moeda(v));

// Tags e subcategorias já usadas (para sugestões).
export const todasAsTags = () => [...new Set(estado.lancamentos.flatMap((l) => l.tags || []))].sort((a, b) => a.localeCompare(b));
export const subcategoriasDe = (nome, tipo = "despesa") =>
  estado.categorias.find((c) => c.nome === nome && c.tipo === tipo)?.subcategorias || [];
export const meta = (id) => estado.metas.find((m) => m.id === id);
