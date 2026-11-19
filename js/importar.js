// Leitura de extratos de banco/fatura (OFX e CSV) e sugestão de categoria. Funções puras, sem tela.
import { paraCentavos } from "./financas.js";

// Decodifica o arquivo: tenta UTF-8 e, se aparecerem caracteres inválidos, usa Windows-1252 (comum em bancos).
export function decodificar(buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

export const ehOFX = (texto) => /<OFX>|OFXHEADER/i.test(texto.slice(0, 2000));

// ---------- OFX ----------

export function lerOFX(texto) {
  const campo = (bloco, tag) => (bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"))?.[1] || "").trim();
  const blocos = texto.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0]);
  const cartao = /<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(texto);
  const linhas = blocos.map((b) => {
    const d = campo(b, "DTPOSTED");
    const valor = Number(campo(b, "TRNAMT").replace(",", "."));
    const memo = campo(b, "MEMO");
    const nome = campo(b, "NAME");
    return {
      data: d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "",
      descricao: limparDescricao(memo && nome && !memo.includes(nome) ? `${nome} ${memo}` : memo || nome),
      valor: Math.round(valor * 100), // negativo = saída
      idBanco: campo(b, "FITID"),
    };
  }).filter((l) => l.data && Number.isFinite(l.valor) && l.valor !== 0);
  return { linhas, cartao };
}

// ---------- CSV ----------

export function lerCSV(texto) {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim()) || "";
  const sep = [";", ",", "\t"].map((s) => [s, primeira.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const tabela = [];
  let linha = [], celula = "", aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { celula += '"'; i++; }
      else if (ch === '"') aspas = false;
      else celula += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(celula.trim()); celula = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && texto[i + 1] === "\n") i++;
      linha.push(celula.trim()); celula = "";
      if (linha.some((c) => c)) tabela.push(linha);
      linha = [];
    } else celula += ch;
  }
  linha.push(celula.trim());
  if (linha.some((c) => c)) tabela.push(linha);
  const temCabecalho = tabela.length > 1 && !lerData(tabela[0].find((c) => lerData(c)) || "") && tabela[0].some((c) => /[a-z]/i.test(c));
  return { cabecalho: temCabecalho ? tabela[0] : tabela[0].map((_, i) => `Coluna ${i + 1}`), linhas: temCabecalho ? tabela.slice(1) : tabela };
}

// Adivinha quais colunas são data, descrição e valor.
export function adivinharColunas(cabecalho, linhas) {
  const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const achar = (re) => cabecalho.findIndex((c) => re.test(sem(c)));
  let data = achar(/^data|date|dt\b/);
  let descricao = achar(/descri|hist|lancamento|title|estabelecimento|memo|detalhe/);
  let valor = achar(/^valor|amount|quantia|valor \(r\$\)|^r\$/);
  const amostra = linhas.slice(0, 10);
  const colunas = cabecalho.map((_, i) => i);
  if (data < 0) data = colunas.find((i) => amostra.every((l) => !l[i] || lerData(l[i]))) ?? 0;
  if (valor < 0) valor = [...colunas].reverse().find((i) => i !== data && amostra.every((l) => !l[i] || !Number.isNaN(lerValor(l[i])))) ?? cabecalho.length - 1;
  if (descricao < 0) descricao = colunas.find((i) => i !== data && i !== valor) ?? 1;
  return { data, descricao, valor };
}

export function linhasDoCSV(csv, col) {
  return csv.linhas.map((l) => ({
    data: lerData(l[col.data] || ""),
    descricao: limparDescricao(l[col.descricao] || ""),
    valor: lerValor(l[col.valor] || ""),
    idBanco: "",
  })).filter((l) => l.data && Number.isFinite(l.valor) && l.valor !== 0);
}

// ---------- Datas, valores e textos ----------

export function lerData(s) {
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return "";
}

// Valor em centavos com sinal. Aceita "R$ -1.234,56", "-1234.56", "(45,00)", "45,00 D".
export function lerValor(s) {
  let t = String(s).trim();
  if (!t) return NaN;
  let negativo = /^-|^\(|-\s*$|\bD$/i.test(t) || /^R\$\s*-/.test(t);
  t = t.replace(/[R$\s()CD+]/gi, "").replace(/^-|-$/g, "");
  const v = paraCentavos(t);
  return Number.isNaN(v) ? NaN : negativo ? -v : v;
}

export function limparDescricao(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

export const normalizar = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\d+\/\d+/g, " ").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();

// ---------- Sugestão de categoria ----------

const REGRAS = [
  [/posto|combust|shell|ipiranga|petrobras|br mania|auto posto|gasolina/, "Transporte", "Combustível"],
  [/uber|\b99\b|99 app|taxi|cabify/, "Transporte", "Uber / táxi"],
  [/estacion|zona azul/, "Transporte", "Estacionamento"],
  [/muffato|supermerc|mercado|atacad|assai|carrefour|condor|angeloni|big\b|extra\b|pao de acucar/, "Mercado", null],
  [/padaria|panific|confeitar/, "Alimentação", "Padaria"],
  [/ifood|rappi|delivery|aiqfome/, "Bares e restaurantes", "Delivery"],
  [/restaurante|lanchonete|pizza|burger|hamburg|churrasc|sushi|cafe|bar\b|choperia/, "Bares e restaurantes", null],
  [/farmac|drogar|raia|pague menos|panvel|nissei/, "Saúde", "Farmácia"],
  [/hospital|clinica|laborat|unimed|odonto|dentist/, "Saúde", null],
  [/netflix|spotify|disney|prime video|amazon prime|hbo|max\b|globoplay|youtube|deezer/, "Assinaturas e serviços", "Streaming"],
  [/\btim\b|vivo|claro|oi movel/, "Assinaturas e serviços", "Celular"],
  [/copel|energia|eletric|luz\b/, "Casa", "Luz"],
  [/sanepar|sabesp|agua\b|saneamento/, "Casa", "Água"],
  [/condominio/, "Casa", "Condomínio"],
  [/pet|petz|cobasi|veterin|racao/, "Pets", null],
  [/renner|riachuelo|c a\b|cea|zara|shein|hering|calcad|centauro|netshoes/, "Roupas", null],
  [/shopee|mercado livre|mercadolivre|meli|amazon|magalu|magazine|americanas|aliexpress/, "Compras", null],
  [/escola|faculdade|curso|livraria/, "Educação", null],
  [/iof|tarifa|anuidade|juros|encargo/, "Dívidas e empréstimos", "Juros"],
  [/cinema|ingresso|show|teatro|steam|playstation|xbox/, "Lazer e hobbies", null],
  [/hotel|pousada|airbnb|booking|latam|gol linhas|azul linhas|decolar/, "Viagem", null],
  [/salario|pagto salario|vencimento|proventos/, "Salário", null],
];

// Sugere categoria/subcategoria/grupo: primeiro pelo histórico (mesma descrição), depois por palavras conhecidas.
export function sugerirCategoria(descricao, valor, historico) {
  const chave = normalizar(descricao);
  const tipo = valor < 0 ? "despesa" : "receita";
  if (chave) {
    for (let i = historico.length - 1; i >= 0; i--) {
      const h = historico[i];
      if (h.tipo === tipo && h.categoria && normalizar(h.descricao) === chave) {
        return { categoria: h.categoria, subcategoria: h.subcategoria || null, grupo: h.grupo || null, origem: "historico" };
      }
    }
  }
  for (const [re, cat, sub] of REGRAS) {
    if (!re.test(chave)) continue;
    if ((cat === "Salário") !== (tipo === "receita")) continue;
    return { categoria: cat, subcategoria: sub, grupo: null, origem: "regra" };
  }
  return { categoria: tipo === "receita" ? "Outras receitas" : "Outros", subcategoria: null, grupo: null, origem: "padrao" };
}

// Identificador para não importar a mesma linha duas vezes.
export const chaveImportacao = (contaId, l) =>
  l.idBanco ? `ofx:${contaId}:${l.idBanco}` : `csv:${contaId}:${l.data}:${l.valor}:${normalizar(l.descricao)}`;
