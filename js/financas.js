// Regras de negócio puras (sem tela, sem banco). Valores sempre em CENTAVOS (inteiros).

// Grupos do orçamento (como na planilha do Leon). A meta é um % da receita do mês.
export const GRUPOS_PADRAO = [
  { id: "fixos", nome: "Fixos", percentual: 30, icone: "📌", ordem: 1 },
  { id: "pessoal", nome: "Pessoal", percentual: 30, icone: "🙋", ordem: 2 },
  { id: "alimentacao", nome: "Alimentação", percentual: 20, icone: "🛒", ordem: 3 },
  { id: "casa", nome: "Casa", percentual: 20, icone: "🏠", ordem: 4 },
  { id: "poupar", nome: "Poupar", percentual: 0, icone: "🐷", ordem: 5 },
];

export const CATEGORIAS_PADRAO = [
  { nome: "Mercado", tipo: "despesa", icone: "🛒", grupo: "alimentacao" },
  { nome: "Padaria", tipo: "despesa", icone: "🥖", grupo: "alimentacao" },
  { nome: "Restaurante e delivery", tipo: "despesa", icone: "🍽️", grupo: "alimentacao" },
  { nome: "Combustível", tipo: "despesa", icone: "⛽", grupo: "alimentacao" },
  { nome: "Moradia e financiamento", tipo: "despesa", icone: "🏠", grupo: "fixos" },
  { nome: "Condomínio", tipo: "despesa", icone: "🏢", grupo: "fixos" },
  { nome: "Contas básicas (luz, água, gás)", tipo: "despesa", icone: "💡", grupo: "fixos" },
  { nome: "Internet e telefone", tipo: "despesa", icone: "📶", grupo: "fixos" },
  { nome: "Plano de saúde", tipo: "despesa", icone: "🏥", grupo: "fixos" },
  { nome: "Impostos (IPTU, IPVA)", tipo: "despesa", icone: "🧾", grupo: "fixos" },
  { nome: "Assinaturas", tipo: "despesa", icone: "📺", grupo: "fixos" },
  { nome: "Casa e manutenção", tipo: "despesa", icone: "🔧", grupo: "casa" },
  { nome: "Móveis e utilidades", tipo: "despesa", icone: "🛋️", grupo: "casa" },
  { nome: "Farmácia", tipo: "despesa", icone: "💊", grupo: "casa" },
  { nome: "Bebê e filhos", tipo: "despesa", icone: "🍼", grupo: "casa" },
  { nome: "Carro e transporte", tipo: "despesa", icone: "🚗", grupo: "casa" },
  { nome: "Juros e tarifas", tipo: "despesa", icone: "🏦", grupo: "casa" },
  { nome: "Presentes e eventos", tipo: "despesa", icone: "🎁", grupo: "casa" },
  { nome: "Pets", tipo: "despesa", icone: "🐾", grupo: "casa" },
  { nome: "Outros gastos", tipo: "despesa", icone: "📦", grupo: "casa" },
  { nome: "Cuidados pessoais", tipo: "despesa", icone: "💈", grupo: "pessoal" },
  { nome: "Roupas e calçados", tipo: "despesa", icone: "👕", grupo: "pessoal" },
  { nome: "Lazer", tipo: "despesa", icone: "🎉", grupo: "pessoal" },
  { nome: "Educação", tipo: "despesa", icone: "📚", grupo: "pessoal" },
  { nome: "Poupança e investimentos", tipo: "despesa", icone: "🐷", grupo: "poupar" },
  { nome: "Salário", tipo: "receita", icone: "💼" },
  { nome: "Renda extra", tipo: "receita", icone: "✨" },
  { nome: "Rendimentos", tipo: "receita", icone: "📈" },
  { nome: "Reembolso", tipo: "receita", icone: "↩️" },
  { nome: "Outras receitas", tipo: "receita", icone: "💰" },
];

// Para categorias criadas na primeira versão (antes de existirem grupos).
export const GRUPO_POR_NOME_ANTIGO = {
  "Mercado": "alimentacao", "Combustível": "alimentacao", "Restaurante e delivery": "alimentacao",
  "Contas básicas (luz, água, gás)": "fixos", "Internet e telefone": "fixos", "Moradia": "fixos",
  "Assinaturas": "fixos", "Impostos e taxas": "fixos",
  "Casa e manutenção": "casa", "Saúde e farmácia": "casa", "Transporte": "casa", "Pets": "casa", "Outros gastos": "casa",
  "Educação": "pessoal", "Lazer": "pessoal", "Vestuário": "pessoal",
};

// Contas fixas sugeridas a partir da planilha (valores podem ser ajustados no app).
// meses: lista de meses (1-12) em que a conta aparece; vazio = todo mês.
export const FIXAS_PADRAO = [
  { id: "financiamento", nome: "Financiamento", valor: 82235, dia: 2, categoria: "Moradia e financiamento", meses: [] },
  { id: "condominio", nome: "Condomínio", valor: 0, dia: 10, categoria: "Condomínio", meses: [] },
  { id: "luz", nome: "Luz", valor: 11950, dia: 2, categoria: "Contas básicas (luz, água, gás)", meses: [] },
  { id: "internet", nome: "Internet", valor: 0, dia: 10, categoria: "Internet e telefone", meses: [] },
  { id: "tim-leon", nome: "Celular Leon (TIM)", valor: 9099, dia: 2, categoria: "Internet e telefone", meses: [] },
  { id: "tim-ariane", nome: "Celular Ariane (TIM)", valor: 0, dia: 10, categoria: "Internet e telefone", meses: [] },
  { id: "hospitalar-leon", nome: "Plano hospitalar Leon", valor: 26500, dia: 2, categoria: "Plano de saúde", meses: [] },
  { id: "hospitalar-ariane", nome: "Plano hospitalar Ariane", valor: 0, dia: 10, categoria: "Plano de saúde", meses: [] },
  { id: "aapomil", nome: "Aapomil", valor: 0, dia: 10, categoria: "Plano de saúde", meses: [] },
  { id: "iptu", nome: "IPTU", valor: 0, dia: 10, categoria: "Impostos (IPTU, IPVA)", meses: [] },
  { id: "ipva", nome: "IPVA", valor: 0, dia: 10, categoria: "Impostos (IPTU, IPVA)", meses: [1, 2, 3] },
];

// ---------- Dinheiro ----------

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const moeda = (centavos) => fmt.format((centavos || 0) / 100);

// Aceita "1.234,56", "1234,5", "1234.56", "R$ 12"
export function paraCentavos(texto) {
  let s = String(texto ?? "").replace(/[R$\s]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, ""); // "3.000" = três mil
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

// Divide um total em N partes que somam exatamente o total (centavos que sobram vão na 1ª parcela).
export function dividir(total, n) {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? resto : 0));
}

// ---------- Datas e meses ----------

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const mesAtual = () => hojeISO().slice(0, 7);

export function somarMeses(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function nomeMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  const n = NOMES_MES[m - 1];
  return `${n[0].toUpperCase()}${n.slice(1)} de ${a}`;
}
export const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

// Mês em que o dinheiro sai do bolso ("competência").
// - Conta bancária/dinheiro/PIX: o mês da data.
// - Cartão de crédito: o mês do vencimento da fatura onde a compra cai.
//   Compra no dia do fechamento ou depois vai para a fatura seguinte.
export function competencia(dataISO, conta) {
  const mes = dataISO.slice(0, 7);
  if (!conta || conta.tipo !== "cartao" || !conta.fechamento) return mes;
  const dia = Number(dataISO.slice(8, 10));
  const fecha = Number(conta.fechamento);
  const vence = Number(conta.vencimento || fecha);
  let mesFechamento = dia >= fecha ? somarMeses(mes, 1) : mes;
  return vence > fecha ? mesFechamento : somarMeses(mesFechamento, 1);
}

// ---------- Geração de lançamentos ----------

// modo: "unico" | "parcelado" (divide o valor em N meses) | "fixo" (repete o mesmo valor por N meses)
export function gerarLancamentos(base, conta, modo, vezes, grupoId) {
  const n = modo === "unico" ? 1 : Math.max(1, Math.min(120, Number(vezes) || 1));
  const primeira = competencia(base.data, conta);
  const valores = modo === "parcelado" ? dividir(base.valor, n) : Array(n).fill(base.valor);
  return valores.map((valor, i) => ({
    ...base,
    valor,
    competencia: somarMeses(primeira, i),
    parcela: n > 1 ? i + 1 : null,
    totalParcelas: n > 1 ? n : null,
    recorrencia: n > 1 ? modo : null,
    grupoId: n > 1 ? grupoId : null,
  }));
}

// ---------- Grupos e contas fixas ----------

// Grupo de um lançamento: o escolhido no lançamento ou, se não houver, o da categoria.
export function grupoDe(l, categorias) {
  if (l.tipo === "receita") return null;
  return l.grupo || categorias.find((c) => c.nome === l.categoria && c.tipo === "despesa")?.grupo || "casa";
}

export const fixaValeNoMes = (f, mes) => f.ativa !== false && (!f.meses?.length || f.meses.includes(Number(mes.slice(5, 7))));

// Situação das contas fixas no mês: paga se existe lançamento com fixaId naquele mês.
export function fixasDoMes(fixas, lancamentos, mes) {
  return fixas
    .filter((f) => fixaValeNoMes(f, mes))
    .map((f) => {
      const pagamentos = lancamentos.filter((l) => l.fixaId === f.id && l.competencia === mes);
      return { fixa: f, pagamentos, pago: pagamentos.reduce((s, l) => s + l.valor, 0), paga: pagamentos.length > 0 };
    })
    .sort((a, b) => a.paga - b.paga || (a.fixa.dia || 0) - (b.fixa.dia || 0) || a.fixa.nome.localeCompare(b.fixa.nome));
}

// ---------- Resumo do mês ----------

export function resumoDoMes({ lancamentos, mes, pessoas, contas, categorias, grupos, fixas }) {
  const doMes = lancamentos.filter((l) => l.competencia === mes);
  const r = {
    receitas: 0,
    despesas: 0,
    receitasPorPessoa: Object.fromEntries(pessoas.map((p) => [p.id, 0])),
    pessoalPorPessoa: Object.fromEntries(pessoas.map((p) => [p.id, 0])),
    porCategoria: {},
    quantidade: doMes.length,
  };
  const gastoGrupo = {};
  const faturas = {};
  for (const l of doMes) {
    if (l.tipo === "receita") {
      r.receitas += l.valor;
      if (l.pessoa in r.receitasPorPessoa) r.receitasPorPessoa[l.pessoa] += l.valor;
      continue;
    }
    r.despesas += l.valor;
    const g = grupoDe(l, categorias);
    gastoGrupo[g] = (gastoGrupo[g] || 0) + l.valor;
    if (g === "pessoal") {
      const quem = l.pessoalDe || l.pessoa;
      if (quem in r.pessoalPorPessoa) r.pessoalPorPessoa[quem] += l.valor;
    }
    r.porCategoria[l.categoria || "Sem categoria"] = (r.porCategoria[l.categoria || "Sem categoria"] || 0) + l.valor;
    const c = contas.find((x) => x.id === l.contaId);
    if (c?.tipo === "cartao") {
      const f = (faturas[c.id] ||= { conta: c, total: 0, pessoal: 0, casa: 0 });
      f.total += l.valor;
      if (g === "pessoal") f.pessoal += l.valor;
      else f.casa += l.valor;
    }
  }
  r.saldo = r.receitas - r.despesas;
  r.grupos = [...grupos]
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((g) => {
      const meta = Math.round((r.receitas * (Number(g.percentual) || 0)) / 100);
      const gasto = gastoGrupo[g.id] || 0;
      return { grupo: g, meta, gasto, resta: meta - gasto, uso: meta ? gasto / meta : gasto ? Infinity : 0 };
    });
  const conhecidos = new Set(grupos.map((g) => g.id));
  r.semGrupo = Object.entries(gastoGrupo).filter(([g]) => !conhecidos.has(g)).reduce((s, [, v]) => s + v, 0);
  r.faturas = Object.values(faturas);
  const fx = fixasDoMes(fixas, lancamentos, mes);
  r.fixas = {
    total: fx.length,
    pagas: fx.filter((f) => f.paga).length,
    pendente: fx.filter((f) => !f.paga).reduce((s, f) => s + (f.fixa.valor || 0), 0),
  };
  return r;
}
