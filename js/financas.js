// Regras de negócio puras (sem tela, sem banco). Valores sempre em CENTAVOS (inteiros).

export const CATEGORIAS_PADRAO = [
  { nome: "Mercado", tipo: "despesa", icone: "🛒" },
  { nome: "Combustível", tipo: "despesa", icone: "⛽" },
  { nome: "Contas básicas (luz, água, gás)", tipo: "despesa", icone: "💡" },
  { nome: "Internet e telefone", tipo: "despesa", icone: "📶" },
  { nome: "Moradia", tipo: "despesa", icone: "🏠" },
  { nome: "Casa e manutenção", tipo: "despesa", icone: "🔧" },
  { nome: "Restaurante e delivery", tipo: "despesa", icone: "🍽️" },
  { nome: "Saúde e farmácia", tipo: "despesa", icone: "💊" },
  { nome: "Transporte", tipo: "despesa", icone: "🚗" },
  { nome: "Educação", tipo: "despesa", icone: "📚" },
  { nome: "Lazer", tipo: "despesa", icone: "🎉" },
  { nome: "Vestuário", tipo: "despesa", icone: "👕" },
  { nome: "Assinaturas", tipo: "despesa", icone: "📺" },
  { nome: "Pets", tipo: "despesa", icone: "🐾" },
  { nome: "Impostos e taxas", tipo: "despesa", icone: "🧾" },
  { nome: "Outros gastos", tipo: "despesa", icone: "📦" },
  { nome: "Salário", tipo: "receita", icone: "💼" },
  { nome: "Renda extra", tipo: "receita", icone: "✨" },
  { nome: "Rendimentos", tipo: "receita", icone: "📈" },
  { nome: "Reembolso", tipo: "receita", icone: "↩️" },
  { nome: "Outras receitas", tipo: "receita", icone: "💰" },
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

// ---------- Resumo do mês ----------

export function resumoDoMes(lancamentos, mes, pessoas, contas) {
  const doMes = lancamentos.filter((l) => l.competencia === mes);
  const r = {
    receitas: 0,
    despesas: 0,
    porPessoa: Object.fromEntries(pessoas.map((p) => [p.id, { receitas: 0, despesas: 0 }])),
    porCategoria: {},
    porConta: {},
    quantidade: doMes.length,
  };
  for (const l of doMes) {
    const campo = l.tipo === "receita" ? "receitas" : "despesas";
    r[campo] += l.valor;
    if (r.porPessoa[l.pessoa]) r.porPessoa[l.pessoa][campo] += l.valor;
    if (l.tipo === "despesa") {
      r.porCategoria[l.categoria || "Sem categoria"] = (r.porCategoria[l.categoria || "Sem categoria"] || 0) + l.valor;
      if (l.contaId) r.porConta[l.contaId] = (r.porConta[l.contaId] || 0) + l.valor;
    }
  }
  r.saldo = r.receitas - r.despesas;

  // Acerto meio a meio: cada um deveria pagar metade das despesas.
  if (pessoas.length === 2) {
    const [a, b] = pessoas;
    const metade = r.despesas / 2;
    const dif = Math.round(r.porPessoa[a.id].despesas - metade); // >0: A pagou a mais
    r.acerto = dif === 0 ? null : dif > 0 ? { de: b.id, para: a.id, valor: dif } : { de: a.id, para: b.id, valor: -dif };
  }
  r.faturas = contas
    .filter((c) => c.tipo === "cartao")
    .map((c) => ({ conta: c, valor: r.porConta[c.id] || 0 }))
    .filter((f) => f.valor > 0);
  return r;
}
