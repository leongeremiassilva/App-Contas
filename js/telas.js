// Telas do app. Cada tela tem html() e, se precisar, ligar(el, nav) para os eventos.
import * as store from "./store.js";
import {
  estado, pessoas, pessoa, conta, contasBancarias, cartoes, grupo, gruposOrdenados, iconeCat, iconeConta,
  TIPOS_CONTA, NOMES_MESES, dinheiro, FILTRO_VAZIO,
} from "./estado.js";
import { $, $$, esc, toast, erroMsg } from "./ui.js";
import {
  hojeISO, mesAtual, nomeMes, dataCurta, somarMeses, resumoDoMes, grupoDe, fixasDoMes, estaPago,
  saldosDasContas, faturaDoCartao, contasAPagar, aReceber, dataDoMes,
} from "./financas.js";
import {
  formLancamento, formConta, formCategoria, formFixa, pagarFixa, pagarFatura, alternarPago, exportarCSV,
} from "./formularios.js";

const CORES_GRAFICO = ["#16a34a", "#2f6fde", "#d9467a", "#f59e0b", "#8b5cf6", "#0891b2", "#a3a3a3"];

function resumoAtual() {
  return resumoDoMes({
    lancamentos: estado.lancamentos, mes: estado.mes, pessoas, contas: estado.contas,
    categorias: estado.categorias, grupos: estado.grupos, fixas: estado.fixas,
  });
}

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

const STATUS_FATURA = { aberta: "Aberta", fechada: "Fechada", paga: "Paga", atrasada: "Atrasada" };

// ---------- Visão geral ----------

function htmlInicio() {
  const r = resumoAtual();
  const saldos = saldosDasContas(estado.contas, estado.lancamentos, estado.mes);
  const contas = contasBancarias();
  const saldoGeral = contas.reduce((s, c) => s + saldos[c.id].atual, 0);
  const previstoGeral = contas.reduce((s, c) => s + saldos[c.id].previsto, 0);
  const apagar = contasAPagar({ lancamentos: estado.lancamentos, fixas: estado.fixas, contas: estado.contas, mes: estado.mes });
  const areceber = aReceber(estado.lancamentos, estado.mes);
  const [a, m] = estado.mes.split("-").map(Number);
  const ultimoDia = new Date(a, m, 0).getDate();

  return `
    <div class="saudacao">
      <span>${saudacao()}, <b>${esc(estado.eu.nome)}</b></span>
      <span class="periodo">Período: <b>1 ${NOMES_MESES[m - 1]} – ${ultimoDia} ${NOMES_MESES[m - 1]}</b></span>
    </div>

    <section class="painel destaque">
      <button class="olho" id="olho" title="${estado.ocultar ? "Mostrar valores" : "Esconder valores"}">${estado.ocultar ? "🙈" : "👁️"}</button>
      <button class="numero rec" data-ir-filtro='{"grupo":"__receita"}'><span>Receita mensal</span><b class="pos">${dinheiro(r.receitas)}</b></button>
      <button class="numero desp" data-ir-filtro='{"grupo":"__despesa"}'><span>Despesa mensal</span><b class="neg">${dinheiro(r.despesas)}</b></button>
      <div class="numero saldo-mes"><span>Saldo do mês</span><b class="${r.saldo < 0 ? "neg" : ""}">${dinheiro(r.saldo)}</b></div>
      <div class="atalhos">
        <button class="btn atalho despesa" data-novo="despesa">− Despesa</button>
        <button class="btn atalho receita" data-novo="receita">+ Receita</button>
        <button class="btn atalho" data-novo="transferencia">⇄ Transferir</button>
      </div>
    </section>

    <div class="grade">
      <section class="painel">
        <div class="cab"><h2>Minhas contas</h2><button class="btn link" data-ir="contas">Gerenciar ›</button></div>
        <div class="saldo-geral"><span>Saldo geral</span><b class="${saldoGeral < 0 ? "neg" : ""}">${dinheiro(saldoGeral)}</b>
          ${previstoGeral !== saldoGeral ? `<small>previsto no fim do mês: ${dinheiro(previstoGeral)}</small>` : ""}</div>
        ${contas.length ? `<ul class="lista simples">${contas.map((c) => `
          <li class="item" data-ir-filtro='{"conta":"${c.id}"}'>
            <span class="ic">${iconeConta(c)}</span>
            <span class="txt"><b>${esc(c.nome)}</b><small>${esc(pessoa(c.dono).nome)}</small></span>
            <span class="val ${saldos[c.id].atual < 0 ? "neg" : "azul"}">${dinheiro(saldos[c.id].atual)}</span>
          </li>`).join("")}</ul>` : `<p class="vazio">Nenhuma conta cadastrada.</p>`}
        <div class="acoes"><button class="btn suave" data-nova-conta="conta">+ Adicionar conta</button></div>
      </section>

      <section class="painel">
        <div class="cab"><h2>Cartões de crédito</h2>${cartoes().length ? `<button class="btn link" data-ir="cartoes">Ver faturas ›</button>` : ""}</div>
        ${cartoes().length ? `<ul class="lista simples">${cartoes().map((c) => {
          const f = faturaDoCartao(c, estado.mes, estado.lancamentos);
          return `
          <li class="item" data-abrir-cartao="${c.id}">
            <span class="ic">💳</span>
            <span class="txt"><b>${esc(c.nome)}</b><small>${esc(pessoa(c.dono).nome)} · vence ${dataCurta(f.vencimento)} · <span class="status ${f.status}">${STATUS_FATURA[f.status]}</span></small></span>
            <span class="val">${dinheiro(f.total)}</span>
          </li>`;
        }).join("")}</ul>` : `<p class="vazio">Aqui aparecem as faturas dos cartões de vocês.</p>`}
        <div class="acoes"><button class="btn suave" data-nova-conta="cartao">+ Adicionar cartão</button></div>
      </section>

      <section class="painel">
        <div class="cab"><h2>Contas a pagar</h2><button class="btn link" data-ir="fixas">Contas fixas ›</button></div>
        ${apagar.length ? `
          <p class="total-apagar">${apagar.length} pendente(s) · <b>${dinheiro(apagar.reduce((s, i) => s + i.valor, 0))}</b></p>
          <ul class="lista simples">${apagar.slice(0, 8).map((i) => `
            <li class="item" data-apagar="${i.tipo}:${i.id}">
              <span class="ic">${i.tipo === "fatura" ? "💳" : i.tipo === "fixa" ? "📌" : "🧾"}</span>
              <span class="txt"><b>${esc(i.nome)}</b><small class="${i.atrasada ? "neg" : ""}">${i.atrasada ? "venceu" : "vence"} ${dataCurta(i.vence)}</small></span>
              <span class="val">${i.valor ? dinheiro(i.valor) : "—"}</span>
            </li>`).join("")}</ul>
          ${apagar.length > 8 ? `<p class="sub">e mais ${apagar.length - 8}…</p>` : ""}` : `<p class="vazio">Tudo pago neste mês. 🎉</p>`}
        ${areceber.length ? `<p class="sub">A receber: ${areceber.length} lançamento(s) · ${dinheiro(areceber.reduce((s, l) => s + l.valor, 0))}</p>` : ""}
      </section>

      <section class="painel">
        <div class="cab"><h2>Limite de gastos</h2><button class="btn link" data-ir="limites">Ajustar ›</button></div>
        ${r.receitas === 0 ? `<p class="dica">Lance as receitas do mês para calcular quanto cabe em cada grupo.</p>` : ""}
        ${r.grupos.filter((g) => g.meta || g.gasto).map(htmlBarraGrupo).join("") || `<p class="vazio">Sem metas para mostrar.</p>`}
      </section>

      <section class="painel largo">
        <div class="cab"><h2>Maiores gastos do mês</h2></div>
        ${htmlGraficoCategorias(r)}
      </section>
    </div>`;
}

function htmlBarraGrupo({ grupo: g, meta, gasto, resta, uso }) {
  const nivel = uso > 1 ? "estourou" : uso > 0.85 ? "atencao" : "ok";
  const largura = Math.min(100, uso === Infinity ? 100 : uso * 100);
  return `
    <button class="grupo-linha" data-ir-filtro='{"grupo":"${g.id}"}'>
      <span class="rotulo">${g.icone || ""} ${esc(g.nome)} <small>${g.percentual || 0}%</small></span>
      <span class="valor">${dinheiro(gasto)} <small>de ${dinheiro(meta)}</small></span>
      <span class="trilho ${nivel}"><span style="width:${largura}%"></span></span>
      <small class="resta ${nivel}">${meta === 0 && gasto === 0 ? "" : resta >= 0 ? `sobram ${dinheiro(resta)}` : `passou ${dinheiro(-resta)}`}</small>
    </button>`;
}

function htmlGraficoCategorias(r) {
  const todas = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]);
  if (!todas.length) return `<p class="vazio">Nenhum gasto lançado em ${nomeMes(estado.mes)}.</p>`;
  const principais = todas.slice(0, 6);
  const resto = todas.slice(6).reduce((s, [, v]) => s + v, 0);
  if (resto) principais.push(["Demais categorias", resto]);
  const total = r.despesas || 1;
  let acumulado = 0;
  const raio = 15.915; // circunferência = 100
  const fatias = principais.map(([nome, v], i) => {
    const pct = (v / total) * 100;
    const fatia = `<circle r="${raio}" cx="21" cy="21" fill="transparent" stroke="${CORES_GRAFICO[i % CORES_GRAFICO.length]}" stroke-width="6"
      stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - acumulado}"><title>${esc(nome)}: ${Math.round(pct)}%</title></circle>`;
    acumulado += pct;
    return fatia;
  }).join("");
  return `
    <div class="grafico">
      <svg viewBox="0 0 42 42" class="rosca" role="img" aria-label="Gastos por categoria">
        <circle r="${raio}" cx="21" cy="21" fill="transparent" stroke="var(--fundo)" stroke-width="6"></circle>
        ${fatias}
        <text x="21" y="20" text-anchor="middle" class="rosca-rotulo">Total</text>
        <text x="21" y="25" text-anchor="middle" class="rosca-valor">${estado.ocultar ? "•••" : Math.round(r.despesas / 100).toLocaleString("pt-BR")}</text>
      </svg>
      <ul class="legenda">${principais.map(([nome, v], i) => `
        <li ${nome !== "Demais categorias" ? `data-ir-filtro='${JSON.stringify({ categoria: nome }).replace(/'/g, "&#39;")}'` : ""}>
          <span class="ponto" style="background:${CORES_GRAFICO[i % CORES_GRAFICO.length]}"></span>
          <span class="nome">${nome === "Demais categorias" ? "" : iconeCat(nome) + " "}${esc(nome)}</span>
          <span class="pct">${Math.round((v / total) * 100)}%</span>
          <b>${dinheiro(v)}</b>
        </li>`).join("")}</ul>
    </div>`;
}

// ---------- Lançamentos ----------

function lancamentosFiltrados() {
  const f = estado.filtro;
  const busca = f.busca.trim().toLowerCase();
  return estado.lancamentos
    .filter((l) => l.competencia === estado.mes)
    .filter((l) => {
      if (!f.grupo) return true;
      if (f.grupo === "__receita") return l.tipo === "receita";
      if (f.grupo === "__despesa") return l.tipo === "despesa";
      if (f.grupo === "__transf") return l.tipo === "transferencia";
      return grupoDe(l, estado.categorias) === f.grupo;
    })
    .filter((l) => !f.pessoa || (l.pessoalDe || l.pessoa) === f.pessoa)
    .filter((l) => !f.categoria || l.categoria === f.categoria)
    .filter((l) => !f.conta || l.contaId === f.conta || l.contaDestinoId === f.conta)
    .filter((l) => !f.status || (f.status === "pago" ? estaPago(l) : !estaPago(l)))
    .filter((l) => !busca || `${l.descricao} ${l.categoria || ""} ${conta(l.contaId)?.nome || ""} ${l.obs || ""}`.toLowerCase().includes(busca))
    .sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || 0) - (a.criadoEm || 0));
}

function htmlLancamentos() {
  const f = estado.filtro;
  const lista = lancamentosFiltrados();
  const receitas = lista.filter((l) => l.tipo === "receita").reduce((s, l) => s + l.valor, 0);
  const despesas = lista.filter((l) => l.tipo === "despesa").reduce((s, l) => s + l.valor, 0);
  const cats = [...new Set(estado.categorias.map((c) => c.nome))].sort((a, b) => a.localeCompare(b));
  const dias = [];
  for (const l of lista) {
    const g = dias[dias.length - 1];
    if (g && g.data === l.data) g.itens.push(l);
    else dias.push({ data: l.data, itens: [l] });
  }
  const filtrando = Object.entries(f).some(([k, v]) => v && k in FILTRO_VAZIO);
  return `
    <div class="cab-pagina"><h1>Lançamentos</h1>
      <div class="atalhos pequenos">
        <button class="btn atalho despesa" data-novo="despesa">− Despesa</button>
        <button class="btn atalho receita" data-novo="receita">+ Receita</button>
        <button class="btn atalho" data-novo="transferencia">⇄</button>
      </div>
    </div>
    <section class="filtros">
      <input type="search" id="f-busca" placeholder="Buscar…" value="${esc(f.busca)}">
      <select id="f-grupo">
        <option value="">Tudo</option>
        <option value="__despesa" ${f.grupo === "__despesa" ? "selected" : ""}>Só despesas</option>
        <option value="__receita" ${f.grupo === "__receita" ? "selected" : ""}>Só receitas</option>
        <option value="__transf" ${f.grupo === "__transf" ? "selected" : ""}>Transferências</option>
        <optgroup label="Grupo">${gruposOrdenados().map((g) => `<option value="${g.id}" ${f.grupo === g.id ? "selected" : ""}>${g.icone || ""} ${esc(g.nome)}</option>`).join("")}</optgroup>
      </select>
      <select id="f-conta"><option value="">Todas as contas</option>${estado.contas.map((c) => `<option value="${c.id}" ${f.conta === c.id ? "selected" : ""}>${iconeConta(c)} ${esc(c.nome)}</option>`).join("")}</select>
      <select id="f-categoria"><option value="">Todas as categorias</option>${cats.map((c) => `<option ${f.categoria === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <select id="f-pessoa"><option value="">Os dois</option>${pessoas.map((p) => `<option value="${p.id}" ${f.pessoa === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>
      <select id="f-status"><option value="">Pagos e pendentes</option><option value="pago" ${f.status === "pago" ? "selected" : ""}>Só pagos</option><option value="pendente" ${f.status === "pendente" ? "selected" : ""}>Só pendentes</option></select>
      ${filtrando ? `<button class="btn link" id="f-limpar">Limpar filtros</button>` : ""}
    </section>
    <section class="totais-lista">
      <div><span>Receitas</span><b class="pos">${dinheiro(receitas)}</b></div>
      <div><span>Despesas</span><b class="neg">${dinheiro(despesas)}</b></div>
      <div><span>Saldo</span><b>${dinheiro(receitas - despesas)}</b></div>
    </section>
    ${lista.length === 0 ? `<p class="vazio">Nenhum lançamento encontrado em ${nomeMes(estado.mes)}.</p>` : dias.map((g) => `
      <h3 class="dia">${dataCurta(g.data)}</h3>
      <ul class="lista">${g.itens.map(htmlItem).join("")}</ul>`).join("")}`;
}

export function htmlItem(l) {
  const c = conta(l.contaId);
  if (l.tipo === "transferencia") {
    const d = conta(l.contaDestinoId);
    return `
      <li class="item" data-editar="${l.id}">
        ${htmlStatus(l, false)}
        <span class="ic">⇄</span>
        <span class="txt"><b>${esc(l.descricao || "Transferência")}</b>
          <small><span class="etiqueta">${d?.tipo === "cartao" ? `Pagamento de fatura ${l.faturaDe ? nomeMes(l.faturaDe) : ""}` : "Transferência"}</span> ${esc(c?.nome || "?")} → ${esc(d?.nome || "?")}</small></span>
        <span class="val">${dinheiro(l.valor)}</span>
      </li>`;
  }
  const gid = grupoDe(l, estado.categorias);
  const quem = gid === "pessoal" ? pessoa(l.pessoalDe || l.pessoa) : null;
  const parcela = l.totalParcelas ? ` · ${l.recorrencia === "fixo" ? "mês" : "parcela"} ${l.parcela}/${l.totalParcelas}` : "";
  const etiqueta = l.tipo === "receita"
    ? `<span class="etiqueta receita">Receita · ${esc(pessoa(l.pessoa).nome)}</span>`
    : `<span class="etiqueta">${esc(grupo(gid).nome)}${quem ? ` · ${esc(quem.nome)}` : ""}</span>`;
  return `
    <li class="item ${estaPago(l) ? "" : "pendente"}" data-editar="${l.id}">
      ${htmlStatus(l, c?.tipo === "cartao")}
      <span class="ic">${iconeCat(l.categoria)}</span>
      <span class="txt">
        <b>${esc(l.descricao || l.categoria)}</b>
        <small>${etiqueta}${c ? ` ${iconeConta(c)} ${esc(c.nome)}` : ""}${parcela}</small>
      </span>
      <span class="val ${l.tipo}">${l.tipo === "receita" ? "+" : "−"}${dinheiro(l.valor)}</span>
    </li>`;
}

function htmlStatus(l, noCartao) {
  if (noCartao) return `<span class="status-pago cartao" title="No cartão: entra na fatura">💳</span>`;
  const pago = estaPago(l);
  return `<button class="status-pago ${pago ? "ok" : ""}" data-alternar="${l.id}" title="${pago ? "Pago. Toque para marcar como pendente" : "Pendente. Toque para marcar como pago"}">${pago ? "✓" : ""}</button>`;
}

// ---------- Contas fixas ----------

function htmlFixas() {
  if (estado.gerenciarFixas) return htmlGerenciarFixas();
  const lista = fixasDoMes(estado.fixas, estado.lancamentos, estado.mes);
  const previsto = lista.reduce((s, f) => s + (f.paga ? f.pago : f.fixa.valor || 0), 0);
  const pago = lista.reduce((s, f) => s + f.pago, 0);
  const hoje = hojeISO();
  return `
    <div class="cab-pagina"><h1>Contas fixas</h1><button class="btn" id="gerenciar-fixas">✏️ Editar lista</button></div>
    <section class="totais-lista">
      <div><span>Total do mês</span><b>${dinheiro(previsto)}</b></div>
      <div><span>Já pago</span><b class="pos">${dinheiro(pago)}</b></div>
      <div><span>Falta</span><b class="neg">${dinheiro(previsto - pago)}</b></div>
    </section>
    <p class="sub">Toque numa conta pendente para registrar o pagamento.</p>
    ${lista.length === 0 ? `<p class="vazio">Nenhuma conta fixa para ${nomeMes(estado.mes)}.</p>` : `
    <ul class="lista">${lista.map(({ fixa: f, paga, pago: valorPago, pagamentos }) => {
      const vence = dataDoMes(estado.mes, f.dia);
      const atrasada = !paga && vence < hoje;
      return `
      <li class="item ${paga ? "paga" : ""}" data-fixa="${f.id}" ${paga ? `data-editar="${pagamentos[0].id}"` : ""}>
        <span class="status-pago ${paga ? "ok" : ""}">${paga ? "✓" : ""}</span>
        <span class="ic">${iconeCat(f.categoria)}</span>
        <span class="txt">
          <b>${esc(f.nome)}</b>
          <small class="${atrasada ? "neg" : ""}">${paga ? `paga em ${dataCurta(pagamentos[0].data)}${conta(pagamentos[0].contaId) ? ` · ${esc(conta(pagamentos[0].contaId).nome)}` : ""}` : `${atrasada ? "venceu" : "vence"} ${dataCurta(vence)}${f.valor ? "" : " · valor a definir"}`}</small>
        </span>
        <span class="val">${dinheiro(paga ? valorPago : f.valor)}</span>
      </li>`;
    }).join("")}
    </ul>`}`;
}

function htmlGerenciarFixas() {
  const lista = [...estado.fixas].sort((a, b) => (a.ativa === false) - (b.ativa === false) || a.nome.localeCompare(b.nome));
  return `
    <div class="cab-pagina"><h1>Editar contas fixas</h1><button class="btn" id="voltar-fixas">‹ Voltar</button></div>
    <section class="painel">
      <div class="cab"><p class="sub">Valor previsto e dia de vencimento de cada conta.</p><button class="btn pequeno" id="nova-fixa">+ Adicionar</button></div>
      <ul class="lista simples">${lista.map((f) => `
        <li class="item ${f.ativa === false ? "inativa" : ""}" data-editar-fixa="${f.id}">
          <span class="ic">${iconeCat(f.categoria)}</span>
          <span class="txt"><b>${esc(f.nome)}</b>
            <small>dia ${f.dia || "?"} · ${f.meses?.length ? f.meses.map((m) => NOMES_MESES[m - 1]).join(", ") : "todo mês"}${f.ativa === false ? " · desativada" : ""}</small></span>
          <span class="val">${f.valor ? dinheiro(f.valor) : "—"}</span>
        </li>`).join("")}
      </ul>
    </section>`;
}

// ---------- Cartões e faturas ----------

function htmlCartoes() {
  const lista = cartoes();
  if (!lista.length) {
    return `<div class="cab-pagina"><h1>Cartões de crédito</h1></div>
      <section class="painel"><p class="vazio">Cadastre os cartões de vocês com o dia de fechamento e de vencimento.</p>
      <div class="acoes centro"><button class="btn primario" data-nova-conta="cartao">+ Adicionar cartão</button></div></section>`;
  }
  const atual = lista.find((c) => c.id === estado.cartaoAberto) || lista[0];
  const f = faturaDoCartao(atual, estado.mes, estado.lancamentos);
  const proximas = [1, 2, 3].map((n) => faturaDoCartao(atual, somarMeses(estado.mes, n), estado.lancamentos)).filter((x) => x.total);
  const itens = [...f.itens].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const casa = f.itens.filter((l) => l.tipo === "despesa" && grupoDe(l, estado.categorias) !== "pessoal").reduce((s, l) => s + l.valor, 0);
  const pessoal = f.itens.filter((l) => l.tipo === "despesa" && grupoDe(l, estado.categorias) === "pessoal").reduce((s, l) => s + l.valor, 0);
  return `
    <div class="cab-pagina"><h1>Cartões de crédito</h1><button class="btn pequeno" data-nova-conta="cartao">+ Cartão</button></div>
    <div class="abas-cartao">${lista.map((c) => `<button class="chip ${c.id === atual.id ? "ativo" : ""}" data-abrir-cartao="${c.id}">💳 ${esc(c.nome)}</button>`).join("")}</div>
    <section class="painel fatura ${f.status}">
      <div class="cab">
        <div><h2>Fatura de ${nomeMes(estado.mes)}</h2>
          <small>${esc(pessoa(atual.dono).nome)} · fecha ${dataCurta(f.fechamento)} · vence ${dataCurta(f.vencimento)}</small></div>
        <span class="status ${f.status}">${STATUS_FATURA[f.status]}</span>
      </div>
      <div class="fatura-total"><b>${dinheiro(f.total)}</b>
        ${f.pago ? `<small>pago ${dinheiro(f.pago)}${f.falta ? ` · falta ${dinheiro(f.falta)}` : ""}</small>` : ""}
        ${pessoal ? `<small>casa ${dinheiro(casa)} · pessoal ${dinheiro(pessoal)}</small>` : ""}
        ${atual.limite ? `<small>limite ${dinheiro(atual.limite)}</small>` : ""}
      </div>
      <div class="acoes">
        <button class="btn link" data-editar-conta="${atual.id}">Editar cartão</button>
        ${f.falta > 0 ? `<button class="btn primario" id="pagar-fatura">Pagar fatura</button>` : ""}
      </div>
    </section>
    ${itens.length ? `<ul class="lista">${itens.map(htmlItem).join("")}</ul>` : `<p class="vazio">Nenhuma compra nesta fatura.</p>`}
    ${f.pagamentos.length ? `<h3 class="dia">Pagamentos</h3><ul class="lista">${f.pagamentos.map(htmlItem).join("")}</ul>` : ""}
    ${proximas.length ? `
      <section class="painel"><h2>Próximas faturas</h2>${proximas.map((p) => `
        <div class="linha-simples"><span>${nomeMes(p.mes)} <small>vence ${dataCurta(p.vencimento)}</small></span><b>${dinheiro(p.total)}</b></div>`).join("")}
      </section>` : ""}`;
}

// ---------- Contas ----------

function htmlContas() {
  const saldos = saldosDasContas(estado.contas, estado.lancamentos, estado.mes);
  const lista = contasBancarias();
  const total = lista.reduce((s, c) => s + saldos[c.id].atual, 0);
  return `
    <div class="cab-pagina"><h1>Contas</h1><button class="btn pequeno" data-nova-conta="conta">+ Conta</button></div>
    <section class="totais-lista"><div><span>Saldo geral</span><b class="${total < 0 ? "neg" : ""}">${dinheiro(total)}</b></div></section>
    ${lista.length ? `<ul class="lista">${lista.map((c) => `
      <li class="item" data-editar-conta="${c.id}">
        <span class="ic">${iconeConta(c)}</span>
        <span class="txt"><b>${esc(c.nome)}</b><small><span class="ponto" style="background:${pessoa(c.dono).cor}"></span>${esc(pessoa(c.dono).nome)} · ${TIPOS_CONTA[c.tipo]}${saldos[c.id].previsto !== saldos[c.id].atual ? ` · previsto ${dinheiro(saldos[c.id].previsto)}` : ""}</small></span>
        <span class="val ${saldos[c.id].atual < 0 ? "neg" : "azul"}">${dinheiro(saldos[c.id].atual)}</span>
      </li>`).join("")}</ul>` : `<p class="vazio">Cadastre as contas bancárias de cada um. Informe o saldo atual como saldo inicial.</p>`}
    <p class="sub">O saldo é o saldo inicial mais tudo que já foi pago ou recebido na conta. Lançamentos pendentes entram só no previsto.</p>`;
}

// ---------- Categorias ----------

function htmlCategorias() {
  const catsDe = (filtro) => estado.categorias.filter(filtro).sort((a, b) => a.nome.localeCompare(b.nome));
  return `
    <div class="cab-pagina"><h1>Categorias</h1><button class="btn pequeno" id="nova-cat">+ Categoria</button></div>
    <section class="painel">
      <h2>Despesas, por grupo</h2>
      ${gruposOrdenados().map((g) => `
        <h3 class="subtitulo">${g.icone || ""} ${esc(g.nome)}</h3>
        <div class="chips">${catsDe((c) => c.tipo === "despesa" && (c.grupo || "casa") === g.id).map((c) => `<button class="chip" data-cat="${c.id}">${c.icone || ""} ${esc(c.nome)}</button>`).join("") || `<small>nenhuma</small>`}</div>`).join("")}
    </section>
    <section class="painel">
      <h2>Receitas</h2>
      <div class="chips">${catsDe((c) => c.tipo === "receita").map((c) => `<button class="chip" data-cat="${c.id}">${c.icone || ""} ${esc(c.nome)}</button>`).join("")}</div>
    </section>`;
}

// ---------- Limite de gastos (metas dos grupos) ----------

function htmlLimites() {
  const r = resumoAtual();
  const totalPct = estado.grupos.reduce((s, g) => s + (Number(g.percentual) || 0), 0);
  return `
    <div class="cab-pagina"><h1>Limite de gastos</h1></div>
    <section class="painel">
      <div class="cab"><h2>${nomeMes(estado.mes)}</h2><small>receita do mês: ${dinheiro(r.receitas)}</small></div>
      ${r.receitas === 0 ? `<p class="dica">Lance as receitas do mês (salários) para o app calcular quanto cabe em cada grupo.</p>` : ""}
      ${r.grupos.map(htmlBarraGrupo).join("")}
      ${r.grupos.some((g) => g.grupo.id === "pessoal" && g.gasto) ? `
        <div class="pessoal-divisao">${pessoas.map((p) => `<span><span class="ponto" style="background:${p.cor}"></span>Pessoal ${esc(p.nome)}: <b>${dinheiro(r.pessoalPorPessoa[p.id])}</b></span>`).join("")}</div>` : ""}
    </section>
    <section class="painel">
      <h2>Metas dos grupos</h2>
      <p class="sub">Quanto da receita do mês cada grupo pode usar.</p>
      <form id="form-metas" class="metas">
        ${gruposOrdenados().map((g) => `
          <label class="meta-linha"><span>${g.icone || ""} ${esc(g.nome)}</span>
            <span class="pct"><input type="number" name="${g.id}" min="0" max="100" step="1" value="${g.percentual || 0}">%</span></label>`).join("")}
        <p class="total-metas ${totalPct === 100 ? "" : "alerta"}">Total: <b id="total-pct">${totalPct}%</b></p>
        <button class="btn primario" type="submit">Salvar metas</button>
      </form>
    </section>`;
}

// ---------- Mais (celular) ----------

function htmlMais() {
  return `
    <div class="cab-pagina"><h1>Mais</h1></div>
    <ul class="lista menu-mais">
      <li class="item" data-ir="contas"><span class="ic">🏦</span><span class="txt"><b>Contas</b><small>saldos das contas bancárias</small></span><span class="seta">›</span></li>
      <li class="item" data-ir="limites"><span class="ic">🎯</span><span class="txt"><b>Limite de gastos</b><small>metas dos grupos</small></span><span class="seta">›</span></li>
      <li class="item" data-ir="categorias"><span class="ic">🏷️</span><span class="txt"><b>Categorias</b></span><span class="seta">›</span></li>
      <li class="item" id="exportar"><span class="ic">⬇️</span><span class="txt"><b>Exportar lançamentos</b><small>planilha CSV (abre no Excel)</small></span><span class="seta">›</span></li>
      <li class="item" id="sair-mais"><span class="ic">🚪</span><span class="txt"><b>Sair</b><small>${esc(estado.usuario.email)}</small></span></li>
    </ul>`;
}

export const TELAS = {
  inicio: { titulo: "Visão geral", icone: "🏠", html: htmlInicio, usaMes: true },
  lancamentos: { titulo: "Lançamentos", icone: "📋", html: htmlLancamentos, usaMes: true },
  fixas: { titulo: "Contas fixas", icone: "📌", html: htmlFixas, usaMes: true },
  limites: { titulo: "Limite de gastos", icone: "🎯", html: htmlLimites, usaMes: true },
  cartoes: { titulo: "Cartões", icone: "💳", html: htmlCartoes, usaMes: true },
  contas: { titulo: "Contas", icone: "🏦", html: htmlContas, usaMes: false },
  categorias: { titulo: "Categorias", icone: "🏷️", html: htmlCategorias, usaMes: false },
  mais: { titulo: "Mais", icone: "☰", html: htmlMais, usaMes: false },
};

// ---------- Eventos comuns a todas as telas ----------

export function ligarEventos(el, nav) {
  const on = (sel, fn) => $$(sel, el).forEach((e) => e.addEventListener("click", (ev) => fn(e, ev)));
  on("[data-alternar]", (b, ev) => {
    ev.stopPropagation();
    alternarPago(estado.lancamentos.find((l) => l.id === b.dataset.alternar));
  });
  on("[data-editar]", (li) => formLancamento(estado.lancamentos.find((l) => l.id === li.dataset.editar)));
  on("[data-fixa]:not([data-editar])", (li) => pagarFixa(estado.fixas.find((f) => f.id === li.dataset.fixa)));
  on("[data-editar-fixa]", (li) => formFixa(estado.fixas.find((f) => f.id === li.dataset.editarFixa)));
  on("[data-novo]", (b) => formLancamento(null, { tipo: b.dataset.novo }));
  on("[data-nova-conta]", (b) => formConta(null, b.dataset.novaConta));
  on("[data-editar-conta]", (b) => formConta(conta(b.dataset.editarConta)));
  on("[data-abrir-cartao]", (b) => { estado.cartaoAberto = b.dataset.abrirCartao; nav.irPara("cartoes"); });
  on("[data-ir]", (b) => nav.irPara(b.dataset.ir));
  on("[data-ir-filtro]", (b) => nav.irPara("lancamentos", JSON.parse(b.dataset.irFiltro)));
  on("[data-apagar]", (li) => {
    const [tipo, id] = li.dataset.apagar.split(":");
    if (tipo === "fixa") pagarFixa(estado.fixas.find((f) => f.id === id));
    else if (tipo === "fatura") pagarFatura(faturaDoCartao(conta(id), estado.mes, estado.lancamentos));
    else formLancamento(estado.lancamentos.find((l) => l.id === id));
  });
  on("[data-cat]", (b) => formCategoria(estado.categorias.find((c) => c.id === b.dataset.cat)));
  $("#nova-cat", el)?.addEventListener("click", () => formCategoria({ tipo: "despesa", grupo: "casa" }));
  $("#olho", el)?.addEventListener("click", () => nav.alternarOcultar());
  $("#gerenciar-fixas", el)?.addEventListener("click", () => { estado.gerenciarFixas = true; nav.render(); });
  $("#voltar-fixas", el)?.addEventListener("click", () => { estado.gerenciarFixas = false; nav.render(); });
  $("#nova-fixa", el)?.addEventListener("click", () => formFixa());
  $("#exportar", el)?.addEventListener("click", exportarCSV);
  $("#sair-mais", el)?.addEventListener("click", () => store.sair());
  $("#pagar-fatura", el)?.addEventListener("click", () => {
    const c = conta(estado.cartaoAberto) || cartoes()[0];
    pagarFatura(faturaDoCartao(c, estado.mes, estado.lancamentos));
  });

  // filtros dos lançamentos
  const liga = (id, campo, evento = "change") => {
    const i = $("#" + id, el);
    if (i) i.addEventListener(evento, () => {
      estado.filtro[campo] = i.value;
      nav.render();
      if (campo === "busca") { const n = $("#f-busca"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
    });
  };
  liga("f-busca", "busca", "input");
  ["grupo", "pessoa", "categoria", "conta", "status"].forEach((c) => liga("f-" + c, c));
  $("#f-limpar", el)?.addEventListener("click", () => { estado.filtro = { ...FILTRO_VAZIO }; nav.render(); });

  // metas
  const metas = $("#form-metas", el);
  if (metas) {
    metas.addEventListener("input", () => {
      const t = $$("input", metas).reduce((s, i) => s + (Number(i.value) || 0), 0);
      $("#total-pct").textContent = t + "%";
      metas.querySelector(".total-metas").classList.toggle("alerta", t !== 100);
    });
    metas.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await Promise.all($$("input", metas).map((i) => store.update("grupos", i.name, { percentual: Number(i.value) || 0 })));
        toast("Metas salvas.");
      } catch (err) { toast("Erro: " + erroMsg(err)); }
    });
  }
}

export { mesAtual };
