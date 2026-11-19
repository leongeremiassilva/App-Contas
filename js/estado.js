// Estado compartilhado entre as telas e funções auxiliares de consulta.
import { pessoas } from "./config.js";
import { moeda, mesAtual, CATEGORIAS_PADRAO } from "./financas.js";

export const COLECOES = ["lancamentos", "contas", "categorias", "grupos", "fixas", "config"];
export const FILTRO_VAZIO = { grupo: "", pessoa: "", categoria: "", conta: "", status: "", busca: "" };

export const estado = {
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
  aba: "inicio",
  cartaoAberto: null,
  gerenciarFixas: false,
  filtro: { ...FILTRO_VAZIO },
  ocultar: lerPreferencia("ocultarValores") === "1",
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
export const grupo = (id) => estado.grupos.find((g) => g.id === id) || { id, nome: id || "—", icone: "•" };
export const gruposOrdenados = () => [...estado.grupos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
export const iconeCat = (nome) =>
  estado.categorias.find((c) => c.nome === nome && c.icone)?.icone || CATEGORIAS_PADRAO.find((c) => c.nome === nome)?.icone || "•";
export const iconeConta = (c) => (!c ? "•" : c.tipo === "cartao" ? "💳" : c.tipo === "conta" ? "🏦" : "💵");
export const TIPOS_CONTA = { conta: "Conta bancária", cartao: "Cartão de crédito", dinheiro: "Dinheiro / carteira" };
export const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const centavosParaTexto = (v) => (v ? (v / 100).toFixed(2).replace(".", ",") : "");

// Valor em reais, respeitando o "esconder valores" (olho).
export const dinheiro = (v) => (estado.ocultar ? "R$ •••••" : moeda(v));
