// Telas extras: Relatórios, Metas de economia, Importar extrato e Avisos de vencimento.
import * as store from "./store.js";
import {
  estado, pessoa, conta, grupo, gruposOrdenados, icCat, icGrupo, infoCategoria, icConta, dinheiro, todasAsTags,
  NOMES_MESES, subcategoriasDe,
} from "./estado.js";
import { $, $$, esc, abrirModal, fecharModal, toast, erroMsg } from "./ui.js";
import { svg } from "./icones.js";
import {
  moeda, hojeISO, nomeMes, dataCurta, somarMeses, mesesAte, serieMensal, despesasPorCategoria, totaisPorTag,
  resumoDoMes, progressoMeta, avisosDeVencimento, faturaDoCartao, competencia, grupoDe, estaPago,
  quantoPossoGastar, parcelamentos, compromissoParcelas, situacaoAcerto,
  panoramaDividas, prestacoesPendentesNoMes, TIPOS_EMPRESTIMO,
} from "./financas.js";
import { pessoas } from "./config.js";
import { formMeta, guardarNaMeta, resgatarDaMeta, pagarFixa, pagarFatura, formLancamento, formAcerto, formBaixa, formEmprestimo, pagarPrestacao } from "./formularios.js";
import {
  decodificar, ehOFX, lerOFX, lerCSV, adivinharColunas, linhasDoCSV, sugerirCategoria, chaveImportacao,
} from "./importar.js";

// Cores dos gráficos de entradas x saídas (par testado para daltonismo).
const COR_RECEITA = "#0d9488";
const COR_DESPESA = "#ea580c";

const mesCurto = (m) => `${NOMES_MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

function abreviar(c) {
  const v = Math.abs(c) / 100;
  const s = c < 0 ? "-" : "";
  if (v >= 1e6) return `${s}${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 1e3) return `${s}${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `${s}${Math.round(v)}`;
}

// ---------- Gráfico de barras (SVG próprio) ----------

// Passo "redondo" da escala (1, 2, 2,5 ou 5 vezes uma potência de 10) para 4 faixas.
function escala(v) {
  const bruto = Math.max(v, 100) / 4;
  const p = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((k) => k * p).find((x) => x >= bruto);
  return { passo, max: passo * Math.ceil(Math.max(v, 1) / passo) };
}

// Largura real disponível, para o texto do gráfico sair no tamanho certo em qualquer tela.
const larguraGrafico = () => {
  const w = window.innerWidth;
  return Math.max(300, Math.min(1100, w >= 900 ? w - 250 - 56 - 34 : w - 28 - 34));
};

function graficoBarras({ rotulos, series, altura = 220, dicas }) {
  const W = larguraGrafico(), H = altura, ml = 46, mr = 6, mt = 10, mb = 26;
  const pw = W - ml - mr, ph = H - mt - mb;
  const { passo, max } = escala(Math.max(...series.flatMap((s) => s.valores)));
  const n = rotulos.length, k = series.length;
  const gw = pw / n;
  const bw = Math.max(4, Math.min(26, (gw * 0.72 - (k - 1) * 2) / k));
  const y = (v) => mt + ph - (v / max) * ph;
  const barra = (x, v) => {
    const h = Math.max(0, (v / max) * ph), yy = mt + ph - h, r = Math.min(4, bw / 2, h);
    if (h <= 0) return "";
    return `M${x},${mt + ph}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bw - r}Q${x + bw},${yy} ${x + bw},${yy + r}V${mt + ph}Z`;
  };
  const grade = Array.from({ length: Math.round(max / passo) + 1 }, (_, i) => {
    const v = passo * i;
    return `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="g-linha"/><text x="${ml - 6}" y="${y(v) + 4}" class="g-eixo" text-anchor="end">${estado.ocultar ? "" : abreviar(v)}</text>`;
  }).join("");
  const pulo = Math.max(1, Math.ceil(44 / gw)); // em telas estreitas mostra só alguns meses no eixo
  const grupos = rotulos.map((rot, i) => {
    const x0 = ml + gw * i + (gw - (bw * k + (k - 1) * 2)) / 2;
    const barras = series.map((s, j) => `<path d="${barra(x0 + j * (bw + 2), s.valores[i])}" fill="${s.cor}"/>`).join("");
    const rotulo = i % pulo === 0 ? `<text x="${ml + gw * i + gw / 2}" y="${H - 8}" class="g-eixo" text-anchor="middle">${esc(rot)}</text>` : "";
    return `<g class="g-col">${barras}${rotulo}
      <rect x="${ml + gw * i}" y="${mt}" width="${gw}" height="${ph}" class="g-alvo" data-tip="${esc(dicas[i])}"/></g>`;
  }).join("");
  const legenda = k > 1 ? `<div class="g-legenda">${series.map((s) => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join("")}</div>` : "";
  return `<div class="grafico-barras">${legenda}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map((s) => s.nome).join(" e "))} por mês">${grade}${grupos}</svg><div class="g-dica" hidden></div></div>`;
}

// ---------- Relatórios ----------

const ABAS_REL = [["fluxo", "Entradas e saídas"], ["categorias", "Categorias"], ["grupos", "Grupos e metas"], ["tags", "Tags"]];

export function htmlRelatorios() {
  const r = estado.rel;
  const meses = mesesAte(estado.mes, r.meses);
  const corpo = { fluxo: relFluxo, categorias: relCategorias, grupos: relGrupos, tags: relTags }[r.aba](meses);
  return `
    <div class="cab-pagina"><h1>Relatórios</h1>
      <select id="rel-meses" class="estreito">
        ${[3, 6, 12].map((q) => `<option value="${q}" ${r.meses === q ? "selected" : ""}>Últimos ${q} meses</option>`).join("")}
      </select>
    </div>
    <div class="abas-cartao">${ABAS_REL.map(([id, nome]) => `<button class="chip ${r.aba === id ? "ativo" : ""}" data-rel-aba="${id}">${nome}</button>`).join("")}</div>
    <p class="sub">De ${nomeMes(meses[0])} a ${nomeMes(meses.at(-1))}. Mude o mês final no topo.</p>
    ${corpo}`;
}

function relFluxo(meses) {
  const serie = serieMensal(estado.lancamentos, meses);
  const tot = serie.reduce((a, s) => ({ receitas: a.receitas + s.receitas, despesas: a.despesas + s.despesas }), { receitas: 0, despesas: 0 });
  const comDados = serie.filter((s) => s.receitas || s.despesas).length || 1;
  return `
    <section class="totais-lista">
      <div><span>Receitas no período</span><b class="pos">${dinheiro(tot.receitas)}</b></div>
      <div><span>Despesas no período</span><b class="neg">${dinheiro(tot.despesas)}</b></div>
      <div><span>Sobra no período</span><b>${dinheiro(tot.receitas - tot.despesas)}</b></div>
      <div><span>Gasto médio por mês</span><b>${dinheiro(Math.round(tot.despesas / comDados))}</b></div>
    </section>
    <section class="painel">
      <h2>Receitas e despesas por mês</h2>
      ${graficoBarras({
        rotulos: meses.map(mesCurto),
        series: [
          { nome: "Receitas", cor: COR_RECEITA, valores: serie.map((s) => s.receitas) },
          { nome: "Despesas", cor: COR_DESPESA, valores: serie.map((s) => s.despesas) },
        ],
        dicas: serie.map((s) => `${nomeMes(s.mes)}\nReceitas: ${dinheiro(s.receitas)}\nDespesas: ${dinheiro(s.despesas)}\nSobra: ${dinheiro(s.saldo)}`),
      })}
    </section>
    <section class="painel">
      <h2>Mês a mês</h2>
      <div class="tabela-rolagem"><table class="tabela-rel">
        <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Sobra</th></tr></thead>
        <tbody>${serie.slice().reverse().map((s) => `
          <tr data-ir-mes="${s.mes}"><td>${nomeMes(s.mes)}</td><td>${dinheiro(s.receitas)}</td><td>${dinheiro(s.despesas)}</td><td class="${s.saldo < 0 ? "neg" : ""}">${dinheiro(s.saldo)}</td></tr>`).join("")}
        </tbody>
      </table></div>
    </section>`;
}

function relCategorias(meses) {
  const dados = despesasPorCategoria(estado.lancamentos, meses);
  const lista = Object.entries(dados).sort((a, b) => b[1].total - a[1].total);
  const total = lista.reduce((s, [, d]) => s + d.total, 0) || 1;
  const sel = estado.rel.categoria;
  if (sel && dados[sel]) {
    const d = dados[sel];
    const { cor } = infoCategoria(sel, "despesa");
    const subs = Object.entries(d.porSub).sort((a, b) => b[1] - a[1]);
    const maiorSub = subs[0]?.[1] || 1;
    const comGasto = meses.filter((m) => d.porMes[m]).length || 1;
    return `
      <button class="btn link" id="rel-voltar">${svg("esquerda")} Todas as categorias</button>
      <section class="painel">
        <div class="cab"><h2 class="com-ic">${icCat(sel, "despesa")} ${esc(sel)}</h2><b>${dinheiro(d.total)}</b></div>
        <p class="sub">Média de ${dinheiro(Math.round(d.total / comGasto))} nos meses com gasto.</p>
        ${graficoBarras({
          rotulos: meses.map(mesCurto),
          series: [{ nome: sel, cor, valores: meses.map((m) => d.porMes[m] || 0) }],
          dicas: meses.map((m) => `${nomeMes(m)}\n${dinheiro(d.porMes[m] || 0)}`),
        })}
      </section>
      ${subs.length > 1 || subs[0]?.[0] !== "Sem subcategoria" ? `
      <section class="painel"><h2>Subcategorias</h2>
        ${subs.map(([nome, v]) => `
          <div class="barra-cat">
            <span class="rotulo">${esc(nome)}</span>
            <span class="valor">${dinheiro(v)} <small>${Math.round((v / d.total) * 100)}%</small></span>
            <span class="trilho"><span style="width:${(v / maiorSub) * 100}%;background:${cor}"></span></span>
          </div>`).join("")}
      </section>` : ""}`;
  }
  if (!lista.length) return `<p class="vazio">Nenhum gasto no período.</p>`;
  const maior = lista[0][1].total;
  return `
    <section class="painel">
      <h2>Gastos por categoria no período</h2>
      <p class="sub">Toque numa categoria para ver a evolução mês a mês e as subcategorias.</p>
      ${lista.map(([nome, d]) => `
        <button class="barra-cat com-ic" data-rel-cat="${esc(nome)}">
          <span class="rotulo">${icCat(nome, "despesa", "mini")} ${esc(nome)}</span>
          <span class="valor">${dinheiro(d.total)} <small>${Math.round((d.total / total) * 100)}%</small></span>
          <span class="trilho"><span style="width:${(d.total / maior) * 100}%;background:${infoCategoria(nome, "despesa").cor}"></span></span>
        </button>`).join("")}
    </section>`;
}

function relGrupos(meses) {
  const resumos = meses.map((m) => resumoDoMes({
    lancamentos: estado.lancamentos, mes: m, pessoas, contas: estado.contas,
    categorias: estado.categorias, grupos: estado.grupos, fixas: estado.fixas,
  }));
  return `
    <section class="painel">
      <h2>Quanto de cada meta foi usado</h2>
      <p class="sub">Cada célula mostra o gasto do grupo e quanto isso representa da meta do mês. Acima de 100% passou do limite.</p>
      <div class="tabela-rolagem"><table class="tabela-rel grupos">
        <thead><tr><th>Grupo</th>${meses.map((m) => `<th>${mesCurto(m)}</th>`).join("")}</tr></thead>
        <tbody>
          <tr class="linha-receita"><td>Receita</td>${resumos.map((r) => `<td>${estado.ocultar ? "•••" : abreviar(r.receitas)}</td>`).join("")}</tr>
          ${gruposOrdenados().map((g) => `
          <tr><td><span class="g-ic">${icGrupo(g.id)}</span>${esc(g.nome)} <small>${g.percentual || 0}%</small></td>
            ${resumos.map((r) => {
              const x = r.grupos.find((y) => y.grupo.id === g.id);
              if (!x || (!x.meta && !x.gasto)) return `<td class="vazia">—</td>`;
              const pct = x.meta ? Math.round((x.gasto / x.meta) * 100) : null;
              const nivel = pct === null ? "estourou" : pct > 100 ? "estourou" : pct > 85 ? "atencao" : "ok";
              return `<td class="nivel ${nivel}"><b>${pct === null ? "sem meta" : pct + "%"}</b><small>${estado.ocultar ? "•••" : abreviar(x.gasto)}</small></td>`;
            }).join("")}
          </tr>`).join("")}
        </tbody>
      </table></div>
    </section>`;
}

function relTags(meses) {
  const totais = totaisPorTag(estado.lancamentos, meses);
  const lista = Object.entries(totais).sort((a, b) => b[1].despesas - a[1].despesas);
  const sel = estado.rel.tag;
  if (sel) {
    const set = new Set(meses);
    const itens = estado.lancamentos.filter((l) => (l.tags || []).includes(sel) && set.has(l.competencia)).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    const t = totais[sel] || { despesas: 0, receitas: 0 };
    return `
      <button class="btn link" id="rel-voltar">${svg("esquerda")} Todas as tags</button>
      <section class="totais-lista">
        <div><span>Gasto com #${esc(sel)}</span><b class="neg">${dinheiro(t.despesas)}</b></div>
        ${t.receitas ? `<div><span>Entradas</span><b class="pos">${dinheiro(t.receitas)}</b></div>` : ""}
      </section>
      <ul class="lista">${itens.map((l) => `
        <li class="item" data-editar="${l.id}">${icCat(l.categoria, l.tipo)}
          <span class="txt"><b>${esc(l.descricao || l.categoria)}</b><small>${dataCurta(l.data)} · ${esc(l.categoria || "")}</small></span>
          <span class="val ${l.tipo}">${l.tipo === "receita" ? "+" : "−"}${dinheiro(l.valor)}</span></li>`).join("")}</ul>`;
  }
  if (!lista.length) {
    return `<section class="painel"><p class="vazio">Nenhum lançamento com tag no período.</p>
      <p class="sub">Tags são etiquetas livres que você coloca nos lançamentos (campo "Tags"), como <b>viagem praia</b> ou <b>reforma</b>. Aqui aparece quanto foi gasto com cada uma, somando categorias diferentes.</p></section>`;
  }
  const maior = lista[0][1].despesas || 1;
  return `
    <section class="painel">
      <h2>Gastos por tag no período</h2>
      ${lista.map(([t, d]) => `
        <button class="barra-cat" data-rel-tag="${esc(t)}">
          <span class="rotulo"><span class="tag">#${esc(t)}</span> <small>${d.quantidade} lançamento(s)</small></span>
          <span class="valor">${dinheiro(d.despesas)}</span>
          <span class="trilho"><span style="width:${(d.despesas / maior) * 100}%"></span></span>
        </button>`).join("")}
    </section>`;
}

// ---------- Metas de economia ----------

export function htmlMetas() {
  const ativas = estado.metas.filter((m) => !m.arquivada);
  const arquivadas = estado.metas.filter((m) => m.arquivada);
  const card = (mt) => {
    const p = progressoMeta(mt, estado.lancamentos);
    return `
      <section class="painel meta-card ${p.concluida ? "concluida" : ""}" style="--c:${mt.cor || "#0d9488"}">
        <div class="cab">
          <div class="meta-titulo"><span class="cat-ic" style="--c:${mt.cor || "#0d9488"}">${svg(p.concluida ? "check" : "bandeira")}</span>
            <div><h2>${esc(mt.nome)}</h2><small>${mt.prazo ? `até ${nomeMes(mt.prazo)}` : "sem prazo"}</small></div></div>
          <button class="btn link" data-editar-meta="${mt.id}" title="Editar">${svg("lapis")}</button>
        </div>
        <div class="meta-numeros"><b>${dinheiro(p.guardado)}</b><span>de ${dinheiro(p.alvo)}</span><span class="pct">${Math.round(p.pct * 100)}%</span></div>
        <div class="trilho-meta"><span style="width:${p.pct * 100}%"></span></div>
        <p class="sub">${p.concluida ? "Meta alcançada!" : `Faltam ${dinheiro(p.falta)}${p.porMes ? `. Guardando ${dinheiro(p.porMes)} por mês, chega lá ${p.mesesRestantes > 1 ? `em ${p.mesesRestantes} meses` : "neste mês"}.` : "."}`}</p>
        <div class="acoes">
          ${p.guardado > 0 ? `<button class="btn" data-resgatar-meta="${mt.id}">${svg("saida")} Resgatar</button>` : ""}
          <button class="btn primario" data-guardar-meta="${mt.id}">${svg("entrada")} Guardar</button>
        </div>
      </section>`;
  };
  return `
    <div class="cab-pagina"><h1>Metas de economia</h1><button class="btn pequeno" id="nova-meta">${svg("mais")} Nova meta</button></div>
    ${ativas.length ? `<div class="grade">${ativas.map(card).join("")}</div>` : `
      <section class="painel"><p class="vazio">Nenhuma meta ainda.</p>
      <p class="sub">Crie uma meta (ex.: reserva de emergência, viagem) com o valor e o prazo. Cada vez que guardarem dinheiro, toque em <b>Guardar</b>: o valor entra como gasto do grupo <b>Poupar</b> e soma no progresso da meta.</p>
      <div class="acoes centro"><button class="btn primario" id="nova-meta-2">${svg("mais")} Criar meta</button></div></section>`}
    ${arquivadas.length ? `<h3 class="dia">Arquivadas</h3><ul class="lista">${arquivadas.map((mt) => {
      const p = progressoMeta(mt, estado.lancamentos);
      return `<li class="item" data-editar-meta="${mt.id}"><span class="cat-ic neutro">${svg("bandeira")}</span><span class="txt"><b>${esc(mt.nome)}</b><small>${dinheiro(p.guardado)} de ${dinheiro(p.alvo)}</small></span></li>`;
    }).join("")}</ul>` : ""}`;
}

// ---------- Avisos de vencimento ----------

export const avisosAtuais = () =>
  avisosDeVencimento({ lancamentos: estado.lancamentos, fixas: estado.fixas, contas: estado.contas, dias: estado.diasAviso, emprestimos: estado.emprestimos });

export function htmlAvisoInicio() {
  const av = avisosAtuais();
  if (!av.length) return "";
  const atrasadas = av.filter((a) => a.atrasada).length;
  const texto = atrasadas
    ? `${atrasadas} conta(s) atrasada(s)${av.length > atrasadas ? ` e ${av.length - atrasadas} vencendo em breve` : ""}`
    : `${av.length} conta(s) vencendo nos próximos ${estado.diasAviso} dias`;
  return `<button class="aviso-venc ${atrasadas ? "atrasado" : ""}" data-abrir-avisos>${svg("sino")}<span>${texto}</span>${svg("direita")}</button>`;
}

export function abrirAvisos() {
  const av = avisosAtuais();
  abrirModal(`
    <h2>Avisos de vencimento</h2>
    <p class="sub">Contas pendentes atrasadas ou que vencem nos próximos dias.</p>
    ${av.length ? `<ul class="lista simples">${av.map((i, n) => `
      <li class="item" data-aviso="${n}">
        ${i.tipo === "fatura" ? icConta({ tipo: "cartao" }) : i.tipo === "emprestimo" ? `<span class="cat-ic neutro">${svg(iconeEmprestimo(i.emprestimo))}</span>` : icCat(i.tipo === "fixa" ? i.fixa.categoria : i.lanc.categoria, "despesa")}
        <span class="txt"><b>${esc(i.nome)}</b><small class="${i.atrasada ? "neg" : ""}">${i.atrasada ? "venceu em" : i.venceHoje ? "vence hoje," : "vence"} ${dataCurta(i.vence)}</small></span>
        <span class="val">${i.valor ? dinheiro(i.valor) : "—"}</span>
      </li>`).join("")}</ul>` : `<p class="vazio">Nada vencendo nos próximos ${estado.diasAviso} dias.</p>`}
    <label class="linha-config">Avisar com antecedência de
      <select id="dias-aviso">${[3, 5, 7, 10, 15].map((d) => `<option value="${d}" ${estado.diasAviso === d ? "selected" : ""}>${d} dias</option>`).join("")}</select>
    </label>
    <div class="acoes"><button class="btn link" data-fechar>Fechar</button></div>`, (m) => {
    $$("[data-aviso]", m).forEach((li) => li.addEventListener("click", () => {
      const i = av[Number(li.dataset.aviso)];
      if (i.tipo === "fixa") pagarFixa(i.fixa, i.mes);
      else if (i.tipo === "fatura") pagarFatura(faturaDoCartao(i.fatura.cartao, i.mes, estado.lancamentos));
      else if (i.tipo === "emprestimo") pagarPrestacao(i.emprestimo, i.mes);
      else formLancamento(i.lanc);
    }));
    $("#dias-aviso", m).addEventListener("change", (e) => {
      estado.diasAviso = Number(e.target.value);
      try { localStorage.setItem("diasAviso", e.target.value); } catch { /* sem armazenamento */ }
      abrirAvisos();
      document.dispatchEvent(new Event("avisos-mudaram"));
    });
  });
}

// ---------- Importar extrato ----------

export function htmlImportar() {
  const imp = estado.importacao || {};
  const contaSel = conta(imp.contaId);
  const ehCartao = contaSel?.tipo === "cartao";
  const passo1 = `
    <section class="painel">
      <h2>1. Escolha a conta ou o cartão e o arquivo</h2>
      <p class="sub">No app ou site do banco, baixe o extrato (ou a fatura do cartão) em <b>OFX</b> ou <b>CSV</b>. O OFX é o mais confiável: aparece como "Money", "OFX" ou "exportar para outro programa".</p>
      <div class="duas">
        <label>Conta / cartão <select id="imp-conta"><option value="">Escolha…</option>
          ${estado.contas.map((c) => `<option value="${c.id}" ${imp.contaId === c.id ? "selected" : ""}>${esc(c.nome)}${c.tipo === "cartao" ? " (cartão)" : ""} · ${esc(pessoa(c.dono).nome)}</option>`).join("")}
        </select></label>
        <label ${ehCartao ? "" : "hidden"}>Fatura de <select id="imp-fatura">
          ${[-2, -1, 0, 1].map((n) => somarMeses(estado.mes, n)).map((m) => `<option value="${m}" ${(imp.faturaDe || estado.mes) === m ? "selected" : ""}>${nomeMes(m)}</option>`).join("")}
        </select></label>
      </div>
      <label class="arquivo ${imp.contaId ? "" : "desativado"}">
        <input type="file" id="imp-arquivo" accept=".ofx,.csv,.txt,.qfx" ${imp.contaId ? "" : "disabled"}>
        <span>${svg("arquivo")} ${imp.nomeArquivo ? `<b>${esc(imp.nomeArquivo)}</b> · trocar arquivo` : imp.contaId ? "Escolher arquivo OFX ou CSV" : "Escolha a conta primeiro"}</span>
      </label>
    </section>`;
  if (!imp.linhas) return `<div class="cab-pagina"><h1>Importar extrato</h1></div>${passo1}`;

  const colunasCSV = imp.tipo === "csv" ? `
    <div class="config-csv">
      ${["data", "descricao", "valor"].map((k) => `<label>${{ data: "Coluna da data", descricao: "Coluna da descrição", valor: "Coluna do valor" }[k]}
        <select data-coluna="${k}">${imp.csv.cabecalho.map((c, i) => `<option value="${i}" ${imp.colunas[k] === i ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>`).join("")}
    </div>` : "";
  const selecionadas = imp.linhas.filter((l) => l.incluir);
  const totalDesp = selecionadas.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valorAbs, 0);
  const totalRec = selecionadas.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valorAbs, 0);
  return `
    <div class="cab-pagina"><h1>Importar extrato</h1></div>
    ${passo1}
    <section class="painel">
      <h2>2. Confira antes de importar</h2>
      ${colunasCSV}
      <label class="check"><input type="checkbox" id="imp-inverter" ${imp.inverter ? "checked" : ""}><span>Inverter entradas e saídas<br><small>use se as compras aparecerem como receita</small></span></label>
      <p class="sub">${imp.linhas.length} linha(s) no arquivo. As marcadas serão importadas como <b>já pagas</b>${ehCartao ? ` na fatura de <b>${nomeMes(imp.faturaDe)}</b>` : ""}. Linhas já importadas ou parecidas com lançamentos existentes vêm desmarcadas.</p>
      <div class="acoes esquerda"><button class="btn pequeno" id="imp-todas">Marcar todas</button><button class="btn pequeno" id="imp-nenhuma">Desmarcar todas</button></div>
    </section>
    <ul class="lista importacao">${imp.linhas.map((l, i) => `
      <li class="item imp ${l.incluir ? "" : "fora"}" data-linha="${i}">
        <input type="checkbox" class="imp-incluir" ${l.incluir ? "checked" : ""} aria-label="Importar esta linha">
        <span class="txt">
          <b>${esc(l.descricao)}</b>
          <small>${dataCurta(l.data)}${l.aviso ? ` · <span class="aviso-linha">${esc(l.aviso)}</span>` : ""}</small>
          <select class="imp-cat">${opcoesCategoria(l.tipo, l.categoria, l.subcategoria)}</select>
        </span>
        <span class="val ${l.tipo}">${l.tipo === "receita" ? "+" : "−"}${moeda(l.valorAbs)}</span>
      </li>`).join("")}
    </ul>
    <section class="painel barra-importar">
      <span><b id="imp-qtd">${selecionadas.length}</b> selecionada(s) · <span id="imp-tot">${moeda(totalDesp)} em despesas${totalRec ? ` · ${moeda(totalRec)} em receitas` : ""}</span></span>
      <div class="acoes"><button class="btn link" id="imp-cancelar">Cancelar</button><button class="btn primario" id="imp-confirmar">${svg("importar")} Importar</button></div>
    </section>`;
}

function opcoesCategoria(tipo, cat, sub) {
  const cats = estado.categorias.filter((c) => c.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome));
  return cats.map((c) => {
    const ops = [`<option value="${esc(c.nome)}||" ${c.nome === cat && !sub ? "selected" : ""}>${esc(c.nome)}</option>`];
    for (const s of c.subcategorias || []) ops.push(`<option value="${esc(c.nome)}||${esc(s)}" ${c.nome === cat && s === sub ? "selected" : ""}>${esc(c.nome)} › ${esc(s)}</option>`);
    return ops.join("");
  }).join("");
}

function montarLinhas(bruto, imp) {
  const historico = [...estado.lancamentos].sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
  const c = conta(imp.contaId);
  return bruto.map((b) => {
    const valor = imp.inverter ? -b.valor : b.valor;
    const tipo = valor < 0 ? "despesa" : "receita";
    const valorAbs = Math.abs(valor);
    const sug = sugerirCategoria(b.descricao, valor, historico);
    const importId = chaveImportacao(imp.contaId, b);
    let aviso = "";
    if (estado.lancamentos.some((l) => l.importId === importId)) aviso = "já importado";
    else if (estado.lancamentos.some((l) => l.contaId === imp.contaId && l.data === b.data && l.valor === valorAbs && l.tipo === tipo)) aviso = "parece já lançado";
    else if (c?.tipo === "cartao" && tipo === "receita" && /pagamento|pgto|pag fat/i.test(b.descricao)) aviso = "pagamento da fatura (lance em Pagar fatura)";
    const existe = estado.categorias.some((x) => x.nome === sug.categoria && x.tipo === tipo);
    return {
      ...b, tipo, valorAbs, importId, aviso, incluir: !aviso,
      categoria: existe ? sug.categoria : tipo === "receita" ? "Outras receitas" : "Outros",
      subcategoria: existe ? sug.subcategoria : null,
      grupo: sug.grupo,
    };
  });
}

function recalcular(imp) {
  const bruto = imp.tipo === "ofx" ? imp.bruto : linhasDoCSV(imp.csv, imp.colunas);
  imp.linhas = montarLinhas(bruto, imp);
}

async function lerArquivo(arquivo, nav) {
  const imp = estado.importacao;
  try {
    const texto = decodificar(await arquivo.arrayBuffer());
    const c = conta(imp.contaId);
    imp.nomeArquivo = arquivo.name;
    if (ehOFX(texto)) {
      const r = lerOFX(texto);
      imp.tipo = "ofx";
      imp.bruto = r.linhas;
      imp.inverter = false;
    } else {
      imp.tipo = "csv";
      imp.csv = lerCSV(texto);
      imp.colunas = adivinharColunas(imp.csv.cabecalho, imp.csv.linhas);
      const amostra = linhasDoCSV(imp.csv, imp.colunas);
      // fatura em CSV (ex.: Nubank) costuma trazer compras como valor positivo
      imp.inverter = c?.tipo === "cartao" && amostra.filter((l) => l.valor > 0).length > amostra.length / 2;
    }
    recalcular(imp);
    if (!imp.linhas.length) toast("Não encontrei lançamentos nesse arquivo. Confira se é um OFX ou CSV de extrato.");
  } catch (e) {
    console.error(e);
    toast("Não consegui ler o arquivo: " + erroMsg(e));
  }
  nav.render();
}

async function confirmarImportacao(nav) {
  const imp = estado.importacao;
  const c = conta(imp.contaId);
  const sel = imp.linhas.filter((l) => l.incluir);
  if (!sel.length) return toast("Nenhuma linha selecionada.");
  const agora = Date.now();
  const lista = sel.map((l, i) => {
    const grupoCat = estado.categorias.find((x) => x.nome === l.categoria && x.tipo === "despesa")?.grupo;
    return {
      tipo: l.tipo,
      valor: l.valorAbs,
      descricao: l.descricao,
      categoria: l.categoria,
      subcategoria: l.subcategoria || null,
      grupo: l.tipo === "despesa" ? l.grupo || grupoCat || "casa" : null,
      pessoalDe: null,
      data: l.data,
      competencia: c.tipo === "cartao" ? imp.faturaDe : l.data.slice(0, 7),
      pessoa: c.dono,
      contaId: c.id,
      contaDestinoId: null, faturaDe: null, obs: "", fixaId: null, tags: [], metaId: null,
      parcela: null, totalParcelas: null, recorrencia: null, grupoId: null,
      pago: true,
      importId: l.importId,
      importadoDe: imp.nomeArquivo,
      criadoPor: estado.eu.id,
      criadoEm: agora + i,
    };
  });
  try {
    await store.addMany("lancamentos", lista);
    toast(`${lista.length} lançamento(s) importado(s).`);
    estado.importacao = null;
    if (c.tipo === "cartao") estado.mes = imp.faturaDe;
    nav.irPara("lancamentos", { conta: c.id });
  } catch (e) {
    toast("Erro ao importar: " + erroMsg(e));
  }
}

// ---------- Quanto ainda posso gastar (visão geral) ----------

export function htmlQuantoPossoGastar(r) {
  const prestacoes = prestacoesPendentesNoMes(estado.emprestimos, estado.lancamentos, estado.mes).reduce((s, e) => s + (e.valorParcela || 0), 0);
  const q = quantoPossoGastar(r, estado.mes, hojeISO(), prestacoes);
  if (!q.receitas && !q.despesas) return "";
  const negativo = q.disponivel < 0;
  return `
    <section class="painel quanto ${negativo ? "negativo" : ""}">
      <div class="quanto-topo">
        <div>
          <span class="rotulo-quanto">${negativo ? "Passou do que entra no mês" : "Ainda dá para gastar este mês"}</span>
          <b class="valor-quanto">${dinheiro(Math.abs(q.disponivel))}</b>
          ${!negativo && q.porDia ? `<small>cerca de <b>${dinheiro(q.porDia)} por dia</b> nos próximos ${q.diasRestantes} dia(s)</small>` : ""}
        </div>
      </div>
      <details class="conta-quanto">
        <summary>Como chegamos nesse valor</summary>
        <div class="linha-simples"><span>Receitas do mês</span><b>${dinheiro(q.receitas)}</b></div>
        <div class="linha-simples"><span>Gastos já lançados (inclui faturas e pendentes)</span><b>− ${dinheiro(q.despesas)}</b></div>
        <div class="linha-simples"><span>Contas fixas que ainda faltam lançar</span><b>− ${dinheiro(q.fixasPendentes)}</b></div>
        ${q.prestacoesPendentes ? `<div class="linha-simples"><span>Prestações de financiamentos que faltam pagar</span><b>− ${dinheiro(q.prestacoesPendentes)}</b></div>` : ""}
        ${q.reservaPoupar ? `<div class="linha-simples"><span>Falta guardar no grupo Poupar</span><b>− ${dinheiro(q.reservaPoupar)}</b></div>` : ""}
      </details>
    </section>`;
}

// ---------- Parcelamentos ----------

export function htmlParcelamentos() {
  const todos = parcelamentos(estado.lancamentos, estado.mes);
  const ver = estado.verParcelas;
  const lista = todos
    .filter((p) => ver === "todos" || (ver === "terminado" ? p.situacao === "terminado" : p.situacao !== "terminado"))
    .sort((a, b) => (a.situacao === "futuro") - (b.situacao === "futuro") || a.fim.localeCompare(b.fim));
  const ativos = todos.filter((p) => p.situacao !== "terminado");
  const doMes = ativos.reduce((s, p) => s + (p.doMes?.valor || 0), 0);
  const aPagar = ativos.reduce((s, p) => s + p.valorRestante, 0);
  const comp = compromissoParcelas(estado.lancamentos, somarMeses(estado.mes, 1), 6);
  const maiorComp = Math.max(1, ...comp.map((c) => c.valor));
  return `
    <div class="cab-pagina"><h1>Parcelamentos</h1></div>
    <section class="totais-lista">
      <div><span>Compras em andamento</span><b>${ativos.length}</b></div>
      <div><span>Parcelas em ${nomeMes(estado.mes).split(" ")[0].toLowerCase()}</span><b class="neg">${dinheiro(doMes)}</b></div>
      <div><span>Ainda a pagar depois</span><b>${dinheiro(aPagar)}</b></div>
    </section>
    ${comp.some((c) => c.valor) ? `
    <section class="painel">
      <h2>Já comprometido nos próximos meses</h2>
      <p class="sub">Soma das parcelas que vão cair em cada mês (faturas e contas).</p>
      ${comp.map((c) => `
        <div class="barra-cat">
          <span class="rotulo">${nomeMes(c.mes)}</span>
          <span class="valor">${dinheiro(c.valor)}</span>
          <span class="trilho"><span style="width:${(c.valor / maiorComp) * 100}%;background:${COR_DESPESA}"></span></span>
        </div>`).join("")}
    </section>` : ""}
    <div class="abas-cartao">
      ${[["andamento", "Em andamento"], ["terminado", "Terminados"], ["todos", "Todos"]].map(([id, nome]) => `<button class="chip ${ver === id ? "ativo" : ""}" data-ver-parcelas="${id}">${nome}</button>`).join("")}
    </div>
    ${lista.length ? `<ul class="lista">${lista.map((p) => {
      const l = p.doMes || p.primeira;
      const c = conta(l.contaId);
      const atual = p.doMes ? `parcela ${p.doMes.parcela} de ${p.totalParcelas} neste mês` : p.situacao === "futuro" ? `começa em ${nomeMes(p.inicio)}` : p.situacao === "terminado" ? `terminou em ${nomeMes(p.fim)}` : `${p.pagas} de ${p.totalParcelas} pagas`;
      const progresso = Math.min(1, (p.pagas + (p.doMes ? 1 : 0)) / p.totalParcelas);
      return `
        <li class="item parcelamento" data-editar="${l.id}">
          ${icCat(l.categoria, "despesa")}
          <span class="txt">
            <b>${esc(l.descricao || l.categoria)}</b>
            <small>${c ? `${esc(c.nome)} · ` : ""}${atual}${p.situacao !== "terminado" ? ` · última em ${nomeMes(p.fim)}` : ""}</small>
            <span class="trilho-mini"><span style="width:${progresso * 100}%"></span></span>
          </span>
          <span class="val-duplo"><b>${dinheiro(l.valor)}</b><small>${p.valorRestante ? `faltam ${dinheiro(p.valorRestante)}` : `total ${dinheiro(p.total)}`}</small></span>
        </li>`;
    }).join("")}</ul>` : `<p class="vazio">${ver === "terminado" ? "Nenhum parcelamento terminado." : "Nenhuma compra parcelada em andamento. Ao lançar uma despesa, escolha Repetição → Parcelado."}</p>`}`;
}

// ---------- A receber e a pagar (pessoas) ----------

function totaisAcertos() {
  let receber = 0, pagar = 0;
  for (const a of estado.acertos) {
    const { restante } = situacaoAcerto(a);
    if (a.tipo === "receber") receber += restante; else pagar += restante;
  }
  return { receber, pagar };
}

export function htmlResumoPessoas() {
  const t = totaisAcertos();
  if (!t.receber && !t.pagar) return "";
  return `<button class="linha-pessoas" data-ir="pessoas">${svg("pessoas")}
    <span>${t.receber ? `A receber <b class="pos">${dinheiro(t.receber)}</b>` : ""}${t.receber && t.pagar ? " · " : ""}${t.pagar ? `A pagar <b class="neg">${dinheiro(t.pagar)}</b>` : ""}</span>${svg("direita")}</button>`;
}

export function htmlPessoas() {
  const t = totaisAcertos();
  const hoje = hojeISO();
  const abertos = estado.acertos.filter((a) => !situacaoAcerto(a).quitado);
  const quitados = estado.acertos.filter((a) => situacaoAcerto(a).quitado);
  const porPessoa = {};
  for (const a of abertos) (porPessoa[a.pessoaNome] ||= []).push(a);
  const item = (a) => {
    const s = situacaoAcerto(a);
    const atrasado = !s.quitado && a.vencimento && a.vencimento < hoje;
    return `
      <li class="item" data-editar-acerto="${a.id}">
        <span class="cat-ic ${a.tipo === "receber" ? "receber" : "pagar"}">${svg(a.tipo === "receber" ? "entrada" : "saida")}</span>
        <span class="txt"><b>${esc(a.descricao || (a.tipo === "receber" ? "A receber" : "A pagar"))}</b>
          <small>${a.tipo === "receber" ? "vai receber" : "vai pagar"} · desde ${dataCurta(a.data)}${a.vencimento ? ` · <span class="${atrasado ? "neg" : ""}">combinado para ${dataCurta(a.vencimento)}</span>` : ""}${s.pago && !s.quitado ? ` · já ${a.tipo === "receber" ? "recebeu" : "pagou"} ${dinheiro(s.pago)}` : ""}</small></span>
        <span class="val-duplo"><b class="${a.tipo === "receber" ? "pos" : "neg"}">${dinheiro(s.quitado ? a.valor : s.restante)}</b>
          ${s.quitado ? `<small>quitado</small>` : `<button class="btn pequeno" data-baixa="${a.id}">${a.tipo === "receber" ? "Recebi" : "Paguei"}</button>`}</span>
      </li>`;
  };
  return `
    <div class="cab-pagina"><h1>A receber e a pagar</h1>
      <div class="atalhos pequenos">
        <button class="btn atalho receita" data-novo-acerto="receber">${svg("entrada")} A receber</button>
        <button class="btn atalho despesa" data-novo-acerto="pagar">${svg("saida")} A pagar</button>
      </div>
    </div>
    <section class="totais-lista">
      <div><span>Vocês vão receber</span><b class="pos">${dinheiro(t.receber)}</b></div>
      <div><span>Vocês vão pagar</span><b class="neg">${dinheiro(t.pagar)}</b></div>
    </section>
    ${abertos.length ? Object.entries(porPessoa).sort((a, b) => a[0].localeCompare(b[0])).map(([nome, itens]) => {
      const liq = itens.reduce((s, a) => s + (a.tipo === "receber" ? 1 : -1) * situacaoAcerto(a).restante, 0);
      return `<h3 class="dia pessoa-cab"><span>${esc(nome)}</span><span class="${liq >= 0 ? "pos" : "neg"}">${liq >= 0 ? "a receber" : "a pagar"} ${dinheiro(Math.abs(liq))}</span></h3>
        <ul class="lista">${itens.map(item).join("")}</ul>`;
    }).join("") : `<section class="painel"><p class="vazio">Nada pendente com outras pessoas.</p>
      <p class="sub">Anote aqui dinheiro emprestado, valores que alguém deve a vocês ou que vocês devem a alguém. Se o dinheiro saiu ou entrou numa conta, o app ajusta o saldo dela sem contar como receita ou despesa do mês.</p></section>`}
    ${quitados.length ? `
      <button class="btn link" id="ver-quitados">${estado.verAcertos ? "Esconder" : "Mostrar"} quitados (${quitados.length})</button>
      ${estado.verAcertos ? `<ul class="lista">${quitados.sort((a, b) => (b.data || "").localeCompare(a.data || "")).map((a) => item(a).replace('class="item"', 'class="item paga"')).join("")}</ul>` : ""}` : ""}`;
}

// ---------- Dívidas ----------

const iconeEmprestimo = (e) => ({ imovel: "casa", veiculo: "carro", emprestimo: "banco", consorcio: "moedas" }[e?.tipo] || "recibo");
const CORES_DIVIDA = { financiamentos: "#7c3aed", cartoes: "#2563eb", parcelados: "#0d9488", cheque: "#dc2626", pessoas: "#ea580c", vencidas: "#b45309" };
const ICONES_DIVIDA = { financiamentos: "banco", cartoes: "cartao", parcelados: "parcelas", cheque: "porcento", pessoas: "pessoas", vencidas: "alerta" };

const panoramaAtual = () => panoramaDividas({
  lancamentos: estado.lancamentos, contas: estado.contas, emprestimos: estado.emprestimos, acertos: estado.acertos, fixas: estado.fixas,
});

function nivelComprometimento(c) {
  if (c === null) return { classe: "", texto: "Lance as receitas para calcular quanto da renda vai para parcelas." };
  const pct = Math.round(c * 100);
  if (c <= 0.3) return { classe: "ok", texto: `${pct}% da renda mensal vai para parcelas e prestações. Está em um nível saudável (até 30%).` };
  if (c <= 0.5) return { classe: "atencao", texto: `${pct}% da renda mensal vai para parcelas e prestações. Atenção: acima de 30% já aperta o orçamento.` };
  return { classe: "estourou", texto: `${pct}% da renda mensal vai para parcelas e prestações. Nível alto: mais da metade da renda já está comprometida.` };
}

// Bloco resumido da visão geral.
export function htmlResumoDividas() {
  const p = panoramaAtual();
  if (!p.total && !estado.emprestimos.length) return "";
  const partes = p.composicao.filter((g) => g.valor > 0);
  return `
    <section class="painel">
      <div class="cab"><h2>Minhas dívidas</h2><button class="btn link" data-ir="dividas">Ver panorama ${svg("direita")}</button></div>
      <div class="saldo-geral divida"><span>Total que ainda vão pagar</span><b>${dinheiro(p.total)}</b>
        ${p.comprometimento !== null ? `<small>${Math.round(p.comprometimento * 100)}% da renda comprometida com parcelas</small>` : ""}</div>
      ${partes.length ? `<div class="barra-composicao">${partes.map((g) => `<span style="width:${(g.valor / p.total) * 100}%;background:${CORES_DIVIDA[g.id]}" title="${esc(g.nome)}"></span>`).join("")}</div>
      <ul class="legenda-divida">${partes.map((g) => `<li><i style="background:${CORES_DIVIDA[g.id]}"></i>${esc(g.nome)}<b>${dinheiro(g.valor)}</b></li>`).join("")}</ul>` : `<p class="sub">Nenhuma dívida em aberto.</p>`}
    </section>`;
}

export function htmlDividas() {
  const p = panoramaAtual();
  const nivel = nivelComprometimento(p.comprometimento);
  const partes = p.composicao.filter((g) => g.valor > 0);
  const proj = p.projecao;
  const mesesComValor = proj.filter((x) => x.valor > 0);
  const detalhe = {
    financiamentos: (x) => {
      const e = x.emprestimo;
      return `
        <li class="item divida-item" data-editar-emprestimo="${e.id}">
          <span class="cat-ic" style="--c:${CORES_DIVIDA.financiamentos}">${svg(iconeEmprestimo(e))}</span>
          <span class="txt"><b>${esc(e.nome)}</b>
            <small>${esc(TIPOS_EMPRESTIMO[e.tipo] || "")}${e.credor ? ` · ${esc(e.credor)}` : ""} · ${dinheiro(e.valorParcela)}/mês · ${x.pagas} de ${x.total} pagas</small>
            <small>Faltam ${x.restantes} parcela(s) · última em ${x.ultimaParcela ? nomeMes(x.ultimaParcela) : "—"}${e.saldoDevedor ? ` · saldo devedor no banco: ${dinheiro(e.saldoDevedor)}` : ""}</small>
            <span class="trilho-mini"><span style="width:${x.pct * 100}%;background:${CORES_DIVIDA.financiamentos}"></span></span>
          </span>
          <span class="val-duplo"><b>${dinheiro(x.valor)}</b>${x.pagaNoMes ? `<small>paga este mês</small>` : `<button class="btn pequeno" data-pagar-prestacao="${e.id}">Pagar parcela</button>`}</span>
        </li>`;
    },
    cartoes: (x) => `
      <li class="item divida-item" data-abrir-cartao="${x.conta.id}">
        ${icConta(x.conta)}
        <span class="txt"><b>${esc(x.conta.nome)}</b>
          <small>${x.faturas.map((f) => `${mesCurto(f.mes)}: ${dinheiro(f.falta)}${f.status === "atrasada" ? " (atrasada)" : f.mes < hojeISO().slice(0, 7) ? " (sem pagamento registrado)" : ""}`).join(" · ")}</small></span>
        <span class="val-duplo"><b>${dinheiro(x.valor)}</b><small>${x.faturas.length} fatura(s)</small></span>
      </li>`,
    parcelados: (x) => `
      <li class="item divida-item" data-editar="${x.primeira.id}">
        ${icCat(x.primeira.categoria, "despesa")}
        <span class="txt"><b>${esc(x.descricao)}</b><small>${x.parcelas.length} parcela(s) pendente(s) · última em ${nomeMes(x.fim)}</small></span>
        <span class="val-duplo"><b>${dinheiro(x.valor)}</b></span>
      </li>`,
    cheque: (x) => `
      <li class="item divida-item" data-editar-conta="${x.conta.id}">
        ${icConta(x.conta)}
        <span class="txt"><b>${esc(x.conta.nome)}</b><small>saldo negativo · ${esc(pessoa(x.conta.dono).nome)} · os juros do cheque especial costumam ser os mais caros</small></span>
        <span class="val-duplo"><b class="neg">${dinheiro(x.valor)}</b></span>
      </li>`,
    pessoas: (x) => `
      <li class="item divida-item" data-ir="pessoas">
        <span class="cat-ic" style="--c:${CORES_DIVIDA.pessoas}">${svg("pessoas")}</span>
        <span class="txt"><b>${esc(x.acerto.pessoaNome)}</b><small>${esc(x.acerto.descricao || "")}${x.acerto.vencimento ? ` · combinado para ${dataCurta(x.acerto.vencimento)}` : ""}</small></span>
        <span class="val-duplo"><b>${dinheiro(x.valor)}</b></span>
      </li>`,
    vencidas: (x) => `
      <li class="item divida-item" data-editar="${x.lanc.id}">
        ${icCat(x.lanc.categoria, "despesa")}
        <span class="txt"><b>${esc(x.lanc.descricao || x.lanc.categoria)}</b><small>venceu em ${dataCurta(x.lanc.data)}</small></span>
        <span class="val-duplo"><b>${dinheiro(x.valor)}</b></span>
      </li>`,
  };
  return `
    <div class="cab-pagina"><h1>Dívidas</h1><button class="btn pequeno" id="novo-emprestimo">${svg("mais")} Financiamento ou empréstimo</button></div>

    <section class="painel destaque-divida">
      <span class="rotulo-quanto">Total que vocês ainda vão pagar</span>
      <b class="valor-divida">${dinheiro(p.total)}</b>
      <div class="indicadores">
        <div><span>Parcelas e prestações por mês</span><b>${dinheiro(p.compromissoMensal)}</b></div>
        <div><span>Renda média (últimos meses)</span><b>${dinheiro(p.rendaMedia)}</b></div>
        <div><span>Livres das parcelas atuais em</span><b>${p.livreEm ? nomeMes(p.livreEm) : "—"}</b></div>
      </div>
      <p class="comprometimento ${nivel.classe}">${nivel.texto}</p>
    </section>

    ${partes.length ? `
    <section class="painel">
      <h2>De onde vem o total</h2>
      <div class="barra-composicao grande">${partes.map((g) => `<span style="width:${(g.valor / p.total) * 100}%;background:${CORES_DIVIDA[g.id]}" title="${esc(g.nome)}"></span>`).join("")}</div>
      ${partes.map((g) => `
        <div class="linha-composicao">
          <span class="cat-ic mini" style="--c:${CORES_DIVIDA[g.id]}">${svg(ICONES_DIVIDA[g.id])}</span>
          <span class="nome">${esc(g.nome)}</span>
          <span class="pct">${g.valor / p.total < 0.01 ? "menos de 1%" : Math.round((g.valor / p.total) * 100) + "%"}</span>
          <b>${dinheiro(g.valor)}</b>
        </div>`).join("")}
    </section>` : ""}

    ${mesesComValor.length ? `
    <section class="painel">
      <h2>Quanto vence em cada mês</h2>
      <p class="sub">Faturas, prestações, parcelas e valores combinados com pessoas, nos próximos 12 meses.</p>
      ${graficoBarras({
        rotulos: proj.map((x) => mesCurto(x.mes)),
        series: [{ nome: "A pagar", cor: COR_DESPESA, valores: proj.map((x) => x.valor) }],
        dicas: proj.map((x) => `${nomeMes(x.mes)}\n${dinheiro(x.valor)}`),
        altura: 200,
      })}
    </section>` : ""}

    ${p.composicao.map((g) => {
      if (g.id === "financiamentos") {
        return `<h3 class="dia pessoa-cab"><span>${esc(g.nome)}</span><span>${dinheiro(g.valor)}</span></h3>
          ${g.itens.length ? `<ul class="lista">${g.itens.map(detalhe.financiamentos).join("")}</ul>` : `<section class="painel"><p class="sub">Cadastre aqui financiamento da casa, do carro, empréstimos e consórcios: o app conta as parcelas pagas e mostra quanto falta e quando termina.</p>
            <div class="acoes centro"><button class="btn primario" id="novo-emprestimo-2">${svg("mais")} Cadastrar</button></div></section>`}`;
      }
      if (!g.itens.length) return "";
      return `<h3 class="dia pessoa-cab"><span>${esc(g.nome)}</span><span>${dinheiro(g.valor)}</span></h3>
        <ul class="lista">${g.itens.map(detalhe[g.id]).join("")}</ul>`;
    }).join("")}

    ${estado.emprestimos.some((e) => e.ativo === false) ? `<h3 class="dia">Encerrados</h3><ul class="lista">${estado.emprestimos.filter((e) => e.ativo === false).map((e) => `
      <li class="item paga" data-editar-emprestimo="${e.id}"><span class="cat-ic neutro">${svg(iconeEmprestimo(e))}</span><span class="txt"><b>${esc(e.nome)}</b><small>${esc(TIPOS_EMPRESTIMO[e.tipo] || "")}</small></span></li>`).join("")}</ul>` : ""}
    <p class="sub">O total soma o que ainda vai sair do bolso: parcelas restantes dos financiamentos (sem descontar juros de uma quitação antecipada), faturas em aberto (inclusive parcelas futuras), saldo negativo das contas, valores devidos a pessoas e contas vencidas.</p>`;
}

// ---------- Eventos das telas extras ----------

export function ligarExtras(el, nav) {
  const on = (sel, fn) => $$(sel, el).forEach((e) => e.addEventListener("click", (ev) => fn(e, ev)));

  // relatórios
  $("#rel-meses", el)?.addEventListener("change", (e) => { estado.rel.meses = Number(e.target.value); nav.render(); });
  on("[data-rel-aba]", (b) => { estado.rel.aba = b.dataset.relAba; estado.rel.categoria = null; estado.rel.tag = null; nav.render(); });
  on("[data-rel-cat]", (b) => { estado.rel.categoria = b.dataset.relCat; nav.render(); window.scrollTo(0, 0); });
  on("[data-rel-tag]", (b) => { estado.rel.tag = b.dataset.relTag; nav.render(); window.scrollTo(0, 0); });
  $("#rel-voltar", el)?.addEventListener("click", () => { estado.rel.categoria = null; estado.rel.tag = null; nav.render(); });
  on("[data-ir-mes]", (tr) => { estado.mes = tr.dataset.irMes; nav.irPara("lancamentos", {}); });
  ligarDicasGrafico(el);

  // metas
  on("#nova-meta, #nova-meta-2", () => formMeta());
  on("[data-editar-meta]", (b) => formMeta(estado.metas.find((m) => m.id === b.dataset.editarMeta)));
  on("[data-guardar-meta]", (b) => guardarNaMeta(estado.metas.find((m) => m.id === b.dataset.guardarMeta)));
  on("[data-resgatar-meta]", (b) => resgatarDaMeta(estado.metas.find((m) => m.id === b.dataset.resgatarMeta)));

  // avisos
  on("[data-abrir-avisos]", () => abrirAvisos());

  // dívidas
  on("#novo-emprestimo, #novo-emprestimo-2", () => formEmprestimo());
  on("[data-editar-emprestimo]", (li) => formEmprestimo(estado.emprestimos.find((e) => e.id === li.dataset.editarEmprestimo)));
  on("[data-pagar-prestacao]", (b, ev) => { ev.stopPropagation(); pagarPrestacao(estado.emprestimos.find((e) => e.id === b.dataset.pagarPrestacao), hojeISO().slice(0, 7)); });

  // parcelamentos
  on("[data-ver-parcelas]", (b) => { estado.verParcelas = b.dataset.verParcelas; nav.render(); });

  // a receber e a pagar
  on("[data-novo-acerto]", (b) => formAcerto(null, b.dataset.novoAcerto));
  on("[data-editar-acerto]", (li) => formAcerto(estado.acertos.find((a) => a.id === li.dataset.editarAcerto)));
  on("[data-baixa]", (b, ev) => { ev.stopPropagation(); formBaixa(estado.acertos.find((a) => a.id === b.dataset.baixa)); });
  $("#ver-quitados", el)?.addEventListener("click", () => { estado.verAcertos = !estado.verAcertos; nav.render(); });

  // importação
  const impConta = $("#imp-conta", el);
  if (impConta) {
    impConta.addEventListener("change", () => {
      estado.importacao = { contaId: impConta.value, faturaDe: estado.importacao?.faturaDe || estado.mes };
      nav.render();
    });
    $("#imp-fatura", el)?.addEventListener("change", (e) => { estado.importacao.faturaDe = e.target.value; if (estado.importacao.linhas) recalcular(estado.importacao); nav.render(); });
    $("#imp-arquivo", el)?.addEventListener("change", (e) => e.target.files[0] && lerArquivo(e.target.files[0], nav));
    $("#imp-inverter", el)?.addEventListener("change", (e) => { estado.importacao.inverter = e.target.checked; recalcular(estado.importacao); nav.render(); });
    $$("[data-coluna]", el).forEach((s) => s.addEventListener("change", () => {
      estado.importacao.colunas[s.dataset.coluna] = Number(s.value);
      recalcular(estado.importacao);
      nav.render();
    }));
    const atualizarResumo = () => {
      const sel = estado.importacao.linhas.filter((l) => l.incluir);
      const d = sel.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valorAbs, 0);
      const r = sel.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valorAbs, 0);
      $("#imp-qtd").textContent = sel.length;
      $("#imp-tot").textContent = `${moeda(d)} em despesas${r ? ` · ${moeda(r)} em receitas` : ""}`;
    };
    $$(".imp", el).forEach((li) => {
      const l = estado.importacao.linhas[Number(li.dataset.linha)];
      li.querySelector(".imp-incluir").addEventListener("change", (e) => { l.incluir = e.target.checked; li.classList.toggle("fora", !l.incluir); atualizarResumo(); });
      li.querySelector(".imp-cat").addEventListener("change", (e) => { [l.categoria, l.subcategoria] = e.target.value.split("||"); l.grupo = null; });
    });
    const marcar = (v) => { estado.importacao.linhas.forEach((l) => (l.incluir = v)); nav.render(); };
    $("#imp-todas", el)?.addEventListener("click", () => marcar(true));
    $("#imp-nenhuma", el)?.addEventListener("click", () => marcar(false));
    $("#imp-cancelar", el)?.addEventListener("click", () => { estado.importacao = null; nav.render(); });
    $("#imp-confirmar", el)?.addEventListener("click", () => confirmarImportacao(nav));
  }
}

function ligarDicasGrafico(el) {
  $$(".grafico-barras", el).forEach((g) => {
    const dica = g.querySelector(".g-dica");
    const mostrar = (alvo, ev) => {
      dica.textContent = alvo.dataset.tip;
      dica.hidden = false;
      const caixa = g.getBoundingClientRect();
      const x = Math.min(Math.max(ev.clientX - caixa.left + 12, 0), caixa.width - 170);
      dica.style.left = `${x}px`;
      dica.style.top = `${Math.max(0, ev.clientY - caixa.top - 70)}px`;
      $$(".g-col", g).forEach((c) => c.classList.toggle("realce", c === alvo.parentNode));
    };
    $$("[data-tip]", g).forEach((a) => {
      a.addEventListener("pointerenter", (ev) => mostrar(a, ev));
      a.addEventListener("pointermove", (ev) => mostrar(a, ev));
      a.addEventListener("pointerdown", (ev) => mostrar(a, ev));
    });
    g.addEventListener("pointerleave", () => { dica.hidden = true; $$(".g-col", g).forEach((c) => c.classList.remove("realce")); });
  });
}

