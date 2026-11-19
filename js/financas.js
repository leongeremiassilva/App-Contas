// Regras de negócio puras (sem tela, sem banco). Valores sempre em CENTAVOS (inteiros).

// Grupos do orçamento (como na planilha do Leon). A meta é um % da receita do mês.
export const GRUPOS_PADRAO = [
  { id: "fixos", nome: "Fixos", percentual: 30, icone: "fixos", ordem: 1 },
  { id: "pessoal", nome: "Pessoal", percentual: 30, icone: "pessoa", ordem: 2 },
  { id: "alimentacao", nome: "Alimentação", percentual: 20, icone: "carrinho", ordem: 3 },
  { id: "casa", nome: "Casa", percentual: 20, icone: "casa", ordem: 4 },
  { id: "poupar", nome: "Poupar", percentual: 0, icone: "porquinho", ordem: 5 },
];

// Categorias padrão (mesmas do Organizze), cada despesa ligada a um grupo do orçamento.
export const CATEGORIAS_PADRAO = [
  { nome: "Alimentação", tipo: "despesa", icone: "pao", cor: "#f59e0b", grupo: "alimentacao" },
  { nome: "Assinaturas e serviços", tipo: "despesa", icone: "tela", cor: "#8b5cf6", grupo: "fixos" },
  { nome: "Bares e restaurantes", tipo: "despesa", icone: "taca", cor: "#f97316", grupo: "alimentacao" },
  { nome: "Casa", tipo: "despesa", icone: "casa", cor: "#0ea5e9", grupo: "casa" },
  { nome: "Compras", tipo: "despesa", icone: "sacola", cor: "#ec4899", grupo: "casa" },
  { nome: "Cuidados pessoais", tipo: "despesa", icone: "brilho", cor: "#d946ef", grupo: "pessoal" },
  { nome: "Dívidas e empréstimos", tipo: "despesa", icone: "porcento", cor: "#ef4444", grupo: "casa" },
  { nome: "Educação", tipo: "despesa", icone: "livro", cor: "#6366f1", grupo: "casa" },
  { nome: "Família e filhos", tipo: "despesa", icone: "familia", cor: "#f472b6", grupo: "casa" },
  { nome: "Impostos e Taxas", tipo: "despesa", icone: "recibo", cor: "#64748b", grupo: "fixos" },
  { nome: "Investimentos", tipo: "despesa", icone: "porquinho", cor: "#10b981", grupo: "poupar" },
  { nome: "Lazer e hobbies", tipo: "despesa", icone: "controle", cor: "#a855f7", grupo: "pessoal" },
  { nome: "Mercado", tipo: "despesa", icone: "carrinho", cor: "#22c55e", grupo: "alimentacao" },
  { nome: "Outros", tipo: "despesa", icone: "caixa", cor: "#94a3b8", grupo: "casa" },
  { nome: "Pets", tipo: "despesa", icone: "pata", cor: "#b45309", grupo: "casa" },
  { nome: "Presentes e doações", tipo: "despesa", icone: "presente", cor: "#e11d48", grupo: "casa" },
  { nome: "Roupas", tipo: "despesa", icone: "camisa", cor: "#3b82f6", grupo: "pessoal" },
  { nome: "Saúde", tipo: "despesa", icone: "saude", cor: "#dc2626", grupo: "casa" },
  { nome: "Trabalho", tipo: "despesa", icone: "maleta", cor: "#475569", grupo: "pessoal" },
  { nome: "Transporte", tipo: "despesa", icone: "carro", cor: "#0284c7", grupo: "alimentacao" },
  { nome: "Viagem", tipo: "despesa", icone: "aviao", cor: "#06b6d4", grupo: "casa" },
  { nome: "Empréstimos", tipo: "receita", icone: "mao", cor: "#0891b2" },
  { nome: "Investimentos", tipo: "receita", icone: "grafico", cor: "#059669" },
  { nome: "Outras receitas", tipo: "receita", icone: "moedas", cor: "#16a34a" },
  { nome: "Salário", tipo: "receita", icone: "carteira", cor: "#15803d" },
];

// Categorias da versão 2 do app -> categoria equivalente do Organizze (versão 3).
export const CATEGORIA_V2_PARA_V3 = {
  despesa: {
    "Padaria": "Alimentação", "Restaurante e delivery": "Bares e restaurantes", "Combustível": "Transporte",
    "Moradia e financiamento": "Casa", "Condomínio": "Casa", "Contas básicas (luz, água, gás)": "Casa",
    "Internet e telefone": "Assinaturas e serviços", "Plano de saúde": "Saúde", "Impostos (IPTU, IPVA)": "Impostos e Taxas",
    "Assinaturas": "Assinaturas e serviços", "Casa e manutenção": "Casa", "Móveis e utilidades": "Compras",
    "Farmácia": "Saúde", "Bebê e filhos": "Família e filhos", "Carro e transporte": "Transporte",
    "Juros e tarifas": "Dívidas e empréstimos", "Presentes e eventos": "Presentes e doações", "Outros gastos": "Outros",
    "Roupas e calçados": "Roupas", "Lazer": "Lazer e hobbies", "Poupança e investimentos": "Investimentos",
  },
  receita: { "Renda extra": "Outras receitas", "Rendimentos": "Investimentos", "Reembolso": "Outras receitas" },
};

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
  { id: "financiamento", nome: "Financiamento", valor: 82235, dia: 2, categoria: "Casa", meses: [] },
  { id: "condominio", nome: "Condomínio", valor: 0, dia: 10, categoria: "Casa", meses: [] },
  { id: "luz", nome: "Luz", valor: 11950, dia: 2, categoria: "Casa", meses: [] },
  { id: "internet", nome: "Internet", valor: 0, dia: 10, categoria: "Assinaturas e serviços", meses: [] },
  { id: "tim-leon", nome: "Celular Leon (TIM)", valor: 9099, dia: 2, categoria: "Assinaturas e serviços", meses: [] },
  { id: "tim-ariane", nome: "Celular Ariane (TIM)", valor: 0, dia: 10, categoria: "Assinaturas e serviços", meses: [] },
  { id: "hospitalar-leon", nome: "Plano hospitalar Leon", valor: 26500, dia: 2, categoria: "Saúde", meses: [] },
  { id: "hospitalar-ariane", nome: "Plano hospitalar Ariane", valor: 0, dia: 10, categoria: "Saúde", meses: [] },
  { id: "aapomil", nome: "Aapomil", valor: 0, dia: 10, categoria: "Saúde", meses: [] },
  { id: "iptu", nome: "IPTU", valor: 0, dia: 10, categoria: "Impostos e Taxas", meses: [] },
  { id: "ipva", nome: "IPVA", valor: 0, dia: 10, categoria: "Impostos e Taxas", meses: [1, 2, 3] },
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
  if (l.tipo !== "despesa") return null;
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
    quantidade: doMes.filter((l) => l.tipo !== "transferencia").length,
  };
  const gastoGrupo = {};
  const faturas = {};
  for (const l of doMes) {
    if (l.tipo === "transferencia") continue;
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

// ---------- Pago / pendente, saldos e faturas ----------

// Lançamentos antigos não têm o campo "pago": contam como pagos.
export const estaPago = (l) => l.pago !== false;

// Diferença no dia (YYYY-MM-DD) para o mês/dia de referência
export function dataDoMes(mes, dia) {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return `${mes}-${String(Math.min(Number(dia) || 1, ultimo)).padStart(2, "0")}`;
}

// Saldo de cada conta (bancária/dinheiro). Cartões não têm saldo: têm fatura.
//   atual: só o que já foi pago
//   previsto: inclui pendentes com mês de referência até "mesLimite"
export function saldosDasContas(contas, lancamentos, mesLimite) {
  const r = {};
  for (const c of contas) {
    if (c.tipo === "cartao") continue;
    r[c.id] = { atual: c.saldoInicial || 0, previsto: c.saldoInicial || 0 };
  }
  for (const l of lancamentos) {
    const mov = [];
    if (l.tipo === "receita") mov.push([l.contaId, l.valor]);
    else if (l.tipo === "despesa") mov.push([l.contaId, -l.valor]);
    else if (l.tipo === "transferencia") mov.push([l.contaId, -l.valor], [l.contaDestinoId, l.valor]);
    for (const [id, v] of mov) {
      if (!r[id]) continue;
      if (estaPago(l)) { r[id].atual += v; r[id].previsto += v; }
      else if (!mesLimite || (l.competencia || "") <= mesLimite) r[id].previsto += v;
    }
  }
  return r;
}

// Fatura de um cartão no mês de vencimento "mes".
export function faturaDoCartao(cartao, mes, lancamentos, hoje = hojeISO()) {
  const itens = lancamentos.filter((l) => l.contaId === cartao.id && l.competencia === mes && l.tipo !== "transferencia");
  const total = itens.reduce((s, l) => s + (l.tipo === "receita" ? -l.valor : l.valor), 0);
  const pagamentos = lancamentos.filter((l) => l.tipo === "transferencia" && l.contaDestinoId === cartao.id && l.faturaDe === mes && estaPago(l));
  const pago = pagamentos.reduce((s, l) => s + l.valor, 0);
  const vence = Number(cartao.vencimento || 1);
  const fecha = Number(cartao.fechamento || 1);
  const vencimento = dataDoMes(mes, vence);
  const fechamento = dataDoMes(vence > fecha ? mes : somarMeses(mes, -1), fecha);
  let status = hoje >= fechamento ? "fechada" : "aberta";
  if (total > 0 && pago >= total) status = "paga";
  else if (status === "fechada" && hoje > vencimento && total > pago) status = "atrasada";
  return { cartao, mes, itens, total, pago, falta: Math.max(0, total - pago), pagamentos, vencimento, fechamento, status };
}

// O que falta pagar no mês: lançamentos pendentes, contas fixas não pagas e faturas em aberto.
export function contasAPagar({ lancamentos, fixas, contas, mes, hoje = hojeISO() }) {
  const itens = [];
  for (const l of lancamentos) {
    if (l.tipo !== "despesa" || estaPago(l) || l.competencia !== mes) continue;
    if (contas.find((c) => c.id === l.contaId)?.tipo === "cartao") continue;
    itens.push({ tipo: "lancamento", id: l.id, nome: l.descricao || l.categoria, valor: l.valor, vence: l.data || dataDoMes(mes, 1), lanc: l });
  }
  for (const f of fixasDoMes(fixas, lancamentos, mes)) {
    if (!f.paga) itens.push({ tipo: "fixa", id: f.fixa.id, nome: f.fixa.nome, valor: f.fixa.valor || 0, vence: dataDoMes(mes, f.fixa.dia), fixa: f.fixa });
  }
  for (const c of contas.filter((x) => x.tipo === "cartao")) {
    const fat = faturaDoCartao(c, mes, lancamentos, hoje);
    if (fat.falta > 0) itens.push({ tipo: "fatura", id: c.id, nome: `Fatura ${c.nome}`, valor: fat.falta, vence: fat.vencimento, fatura: fat });
  }
  return itens
    .map((i) => ({ ...i, atrasada: i.vence < hoje }))
    .sort((a, b) => a.vence.localeCompare(b.vence));
}

export function aReceber(lancamentos, mes) {
  return lancamentos.filter((l) => l.tipo === "receita" && !estaPago(l) && l.competencia === mes);
}
