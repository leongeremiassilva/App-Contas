// Formulários (janelas) de lançamento, transferência, conta, cartão, categoria e conta fixa.
import * as store from "./store.js";
import {
  estado, pessoas, pessoa, conta, contasBancarias, cartoes, grupo, gruposOrdenados, infoCategoria, todasAsTags, subcategoriasDe,
  TIPOS_CONTA, NOMES_MESES, centavosParaTexto,
} from "./estado.js";
import { $$, esc, abrirModal, fecharModal, confirmar, toast, erroMsg } from "./ui.js";
import { svg, ICONES_CATEGORIA } from "./icones.js";
import {
  moeda, paraCentavos, hojeISO, mesAtual, somarMeses, nomeMes, competencia, gerarLancamentos, grupoDe, estaPago, normalizarTag,
} from "./financas.js";

const opcoesContas = (lista, selecionada, vazia = "") => `
  ${vazia ? `<option value="">${vazia}</option>` : ""}
  ${pessoas.map((p) => {
    const cs = lista.filter((c) => c.dono === p.id);
    return cs.length ? `<optgroup label="${esc(p.nome)}">${cs.map((c) => `<option value="${c.id}" ${selecionada === c.id ? "selected" : ""}>${esc(c.nome)}${c.tipo === "cartao" ? " (cartão)" : ""}</option>`).join("")}</optgroup>` : "";
  }).join("")}`;

// ---------- Lançamento (despesa / receita / transferência) ----------

// l: lançamento existente (edição). pre: valores iniciais para um novo.
export function formLancamento(l, pre = {}) {
  const novo = !l;
  const v = l || pre;
  const tipo = v.tipo || "despesa";
  const doGrupo = l?.grupoId ? estado.lancamentos.filter((x) => x.grupoId === l.grupoId) : [];
  const minhasContas = estado.contas.filter((c) => c.dono === estado.eu.id && c.tipo !== "cartao");
  const contaPadrao = v.contaId ?? (minhasContas.length === 1 ? minhasContas[0].id : "");
  const valorInicial = l ? (l.recorrencia === "parcelado" ? doGrupo.reduce((s, x) => s + x.valor, 0) : l.valor) : v.valor || 0;
  const grupoInicial = l ? grupoDe(l, estado.categorias) : v.grupo || "";
  const fixa = v.fixaId ? estado.fixas.find((f) => f.id === v.fixaId) : null;
  const dataInicial = v.data || hojeISO();
  const pagoInicial = l ? estaPago(l) : v.pago ?? dataInicial <= hojeISO();
  const titulo = !novo ? "Editar lançamento"
    : fixa ? `Pagar ${esc(fixa.nome)}`
    : v.faturaDe ? "Pagar fatura"
    : { despesa: "Nova despesa", receita: "Nova receita", transferencia: "Nova transferência" }[tipo];
  const mesesFatura = [-2, -1, 0, 1, 2].map((n) => somarMeses(v.faturaDe || estado.mes, n));

  abrirModal(`
    <form id="form-lanc" autocomplete="off" class="tipo-${tipo}">
      <h2>${titulo}</h2>
      <div class="segmentado tres">
        <label><input type="radio" name="tipo" value="despesa" ${tipo === "despesa" ? "checked" : ""}><span>Despesa</span></label>
        <label><input type="radio" name="tipo" value="receita" ${tipo === "receita" ? "checked" : ""}><span>Receita</span></label>
        <label><input type="radio" name="tipo" value="transferencia" ${tipo === "transferencia" ? "checked" : ""}><span>Transferência</span></label>
      </div>
      <label>Valor ${l?.recorrencia === "parcelado" ? "(total da compra)" : ""}
        <input name="valor" inputmode="decimal" placeholder="0,00" required value="${centavosParaTexto(valorInicial)}">
      </label>
      <label>Descrição <input name="descricao" placeholder="Ex.: Muffato, Posto, Conta de luz" value="${esc(v.descricao || "")}" list="sugestoes"></label>
      <datalist id="sugestoes">${[...new Set(estado.lancamentos.map((x) => x.descricao).filter(Boolean))].slice(0, 300).map((d) => `<option value="${esc(d)}">`).join("")}</datalist>

      <div class="duas nao-transf">
        <label>Categoria <select name="categoria"></select></label>
        <label class="so-sub">Subcategoria <select name="subcategoria"></select></label>
      </div>
      <div class="duas so-despesa">
        <label>Grupo <select name="grupo">${gruposOrdenados().map((g) => `<option value="${g.id}">${esc(g.nome)}</option>`).join("")}</select></label>
        <label class="so-pessoal">Pessoal de <select name="pessoalDe">${pessoas.map((p) => `<option value="${p.id}" ${(v.pessoalDe || v.pessoa || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>

      <div class="duas">
        <label>Data <input type="date" name="data" required value="${dataInicial}"></label>
        <label class="so-receita">Recebido por <select name="pessoa">${pessoas.map((p) => `<option value="${p.id}" ${(v.pessoa || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>

      <label class="nao-transf">Conta / cartão
        <select name="contaId">${opcoesContas(estado.contas, contaPadrao, "— sem conta —")}</select>
      </label>

      <div class="duas so-transf">
        <label>Sai de <select name="origem">${opcoesContas(contasBancarias(), v.contaId || contaPadrao, "Escolha…")}</select></label>
        <label>Vai para <select name="destino">${opcoesContas(estado.contas, v.contaDestinoId || "", "Escolha…")}</select></label>
      </div>
      <label class="so-fatura">Fatura de
        <select name="faturaDe">${mesesFatura.map((m) => `<option value="${m}" ${(v.faturaDe || estado.mes) === m ? "selected" : ""}>${nomeMes(m)}</option>`).join("")}</select>
      </label>

      <label class="check so-pago"><input type="checkbox" name="pago" ${pagoInicial ? "checked" : ""}> <span class="rotulo-pago">Pago</span></label>

      ${novo && !fixa ? `
      <label class="nao-transf">Repetição
        <select name="modo">
          <option value="unico">Só esta vez</option>
          <option value="parcelado">Parcelado (divide o valor)</option>
          <option value="fixo">Repete todo mês (mesmo valor)</option>
        </select>
      </label>
      <label class="vezes" hidden>Quantas vezes / meses <input type="number" name="vezes" min="2" max="120" value="2"></label>` :
      l?.totalParcelas ? `<p class="sub">${l.recorrencia === "fixo" ? "Repetição" : "Parcela"} ${l.parcela} de ${l.totalParcelas}</p>` : ""}
      <p class="info-competencia sub"></p>
      <label class="nao-transf">Tags <small>(opcional, separe por vírgula. Ex.: viagem praia, reforma)</small>
        <input name="tags" list="lista-tags" value="${esc((v.tags || []).join(", "))}" placeholder="sem tags">
      </label>
      <datalist id="lista-tags">${todasAsTags().map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
      ${estado.metas.length || v.metaId ? `
      <label class="nao-transf so-meta"><span class="rotulo-meta">Meta de economia</span>
        <select name="metaId"><option value="">— nenhuma —</option>${estado.metas.filter((x) => !x.arquivada || x.id === v.metaId).map((x) => `<option value="${x.id}" ${v.metaId === x.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
      </label>` : ""}
      <label>Observação <input name="obs" value="${esc(v.obs || "")}"></label>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    let pagoMexido = !!l;
    const tipoAtual = () => f.querySelector("[name=tipo]:checked").value;
    const grupoDaCategoria = () => estado.categorias.find((c) => c.nome === f.categoria.value && c.tipo === "despesa")?.grupo;
    const preencherCategorias = () => {
      const t = tipoAtual();
      const atual = f.categoria.value || v.categoria;
      if (t === "receita") {
        const cats = estado.categorias.filter((c) => c.tipo === "receita").sort((a, b) => a.nome.localeCompare(b.nome));
        f.categoria.innerHTML = cats.map((c) => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join("");
      } else {
        f.categoria.innerHTML = gruposOrdenados().map((g) => {
          const cats = estado.categorias.filter((c) => c.tipo === "despesa" && (c.grupo || "casa") === g.id).sort((a, b) => a.nome.localeCompare(b.nome));
          return cats.length ? `<optgroup label="${esc(g.nome)}">${cats.map((c) => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join("")}</optgroup>` : "";
        }).join("");
      }
      if ([...f.categoria.options].some((o) => o.value === atual)) f.categoria.value = atual;
      preencherSubs();
      atualizar();
    };
    const preencherSubs = () => {
      const subs = f.querySelector("[name=tipo]:checked").value === "transferencia" ? [] : subcategoriasDe(f.categoria.value, f.querySelector("[name=tipo]:checked").value);
      const atual = f.subcategoria.value || v.subcategoria || "";
      f.subcategoria.innerHTML = `<option value="">—</option>` + subs.map((x) => `<option ${x === atual ? "selected" : ""}>${esc(x)}</option>`).join("");
      if (atual && !subs.includes(atual)) f.subcategoria.insertAdjacentHTML("beforeend", `<option selected>${esc(atual)}</option>`);
      m.querySelector(".so-sub").hidden = !f.subcategoria.options.length || f.subcategoria.options.length < 2;
    };
    const atualizar = () => {
      const t = tipoAtual();
      f.className = `tipo-${t}`;
      const destino = conta(f.destino.value);
      const c = conta(f.contaId.value);
      const noCartao = t !== "transferencia" && c?.tipo === "cartao";
      $$(".so-despesa", m).forEach((e) => (e.hidden = t !== "despesa"));
      $$(".so-receita", m).forEach((e) => (e.hidden = t !== "receita"));
      $$(".so-transf", m).forEach((e) => (e.hidden = t !== "transferencia"));
      $$(".nao-transf", m).forEach((e) => (e.hidden = t === "transferencia"));
      $$(".so-pessoal", m).forEach((e) => (e.hidden = t !== "despesa" || f.grupo.value !== "pessoal"));
      $$(".so-fatura", m).forEach((e) => (e.hidden = t !== "transferencia" || destino?.tipo !== "cartao"));
      $$(".so-pago", m).forEach((e) => (e.hidden = noCartao));
      const rm = m.querySelector(".rotulo-meta");
      if (rm) rm.textContent = t === "receita" ? "Resgate de meta de economia" : "Guardar para meta de economia";
      m.querySelector(".rotulo-pago").textContent = t === "receita" ? "Recebido" : t === "transferencia" ? "Já foi feita" : "Pago";
      const info = m.querySelector(".info-competencia");
      info.textContent = f.data.value && noCartao ? `Entra na fatura de ${nomeMes(competencia(f.data.value, c))}.` : "";
      f.categoria.required = t !== "transferencia";
      if (f.modo) m.querySelector(".vezes").hidden = t === "transferencia" || f.modo.value === "unico";
    };
    preencherCategorias();
    f.grupo.value = grupoInicial || grupoDaCategoria() || "casa";
    atualizar();
    $$("[name=tipo]", f).forEach((r) => r.addEventListener("change", preencherCategorias));
    f.categoria.addEventListener("change", () => { const g = grupoDaCategoria(); if (g) f.grupo.value = g; f.subcategoria.value = ""; preencherSubs(); atualizar(); });
    f.grupo.addEventListener("change", atualizar);
    f.contaId.addEventListener("change", () => {
      const c = conta(f.contaId.value);
      if (c) { f.pessoalDe.value = c.dono; f.pessoa.value = c.dono; }
      atualizar();
    });
    f.destino.addEventListener("change", atualizar);
    f.pago.addEventListener("change", () => (pagoMexido = true));
    f.data.addEventListener("change", () => {
      if (!pagoMexido) f.pago.checked = f.data.value <= hojeISO();
      atualizar();
    });
    f.modo?.addEventListener("change", atualizar);
    f.descricao.addEventListener("change", () => {
      if (!novo) return; // sugere categoria e grupo do último lançamento com a mesma descrição
      const ant = [...estado.lancamentos].reverse().find((x) => x.descricao === f.descricao.value && x.tipo !== "transferencia");
      if (ant && tipoAtual() !== "transferencia") {
        f.querySelector(`[name=tipo][value=${ant.tipo}]`).checked = true;
        preencherCategorias();
        f.categoria.value = ant.categoria;
        preencherSubs();
        if (ant.subcategoria) f.subcategoria.value = ant.subcategoria;
        if (ant.tipo === "despesa") f.grupo.value = grupoDe(ant, estado.categorias);
        atualizar();
      }
    });
    f.addEventListener("submit", (e) => { e.preventDefault(); salvarLancamento(f, l, doGrupo, v.fixaId, v.mesFixa); });
    m.querySelector("#excluir")?.addEventListener("click", () => excluirLancamento(l, doGrupo));
  });
}

const lerTags = (texto) => [...new Set(String(texto || "").split(",").map(normalizarTag).filter(Boolean))];

async function salvarLancamento(f, original, doGrupo, fixaId, mesFixa) {
  const valor = paraCentavos(f.valor.value);
  if (!(valor > 0)) return toast("Informe um valor válido.");
  const tipo = f.querySelector("[name=tipo]:checked").value;
  try {
    if (tipo === "transferencia") return await salvarTransferencia(f, original, valor);
    if (!f.categoria.value) return toast("Escolha uma categoria.");
    const c = conta(f.contaId.value);
    const despesa = tipo === "despesa";
    const noCartao = c?.tipo === "cartao";
    const grupoEscolhido = despesa ? f.grupo.value : null;
    const base = {
      tipo,
      valor,
      descricao: f.descricao.value.trim(),
      categoria: f.categoria.value,
      subcategoria: f.subcategoria.value || null,
      tags: lerTags(f.tags.value),
      metaId: f.metaId?.value || null,
      grupo: grupoEscolhido,
      pessoalDe: grupoEscolhido === "pessoal" ? f.pessoalDe.value : null,
      data: f.data.value,
      // de quem é o dinheiro/conta: receita = quem recebeu; despesa = dono da conta (ou quem lançou)
      pessoa: despesa ? c?.dono || (grupoEscolhido === "pessoal" ? f.pessoalDe.value : estado.eu.id) : f.pessoa.value,
      contaId: f.contaId.value || null,
      contaDestinoId: null,
      faturaDe: null,
      obs: f.obs.value.trim(),
      fixaId: fixaId || original?.fixaId || null,
      pago: noCartao ? true : f.pago.checked,
    };
    if (!original) {
      const modo = f.modo?.value || "unico";
      const lista = gerarLancamentos(
        { ...base, criadoPor: estado.eu.id, criadoEm: Date.now() },
        c, modo, f.vezes?.value, crypto.randomUUID?.() || String(Date.now())
      );
      // repetições em meses futuros ficam pendentes (menos no cartão, que vai na fatura)
      lista.forEach((x, i) => { if (i > 0 && !noCartao) x.pago = base.pago && x.competencia <= mesAtual(); });
      if (fixaId) lista[0].competencia = mesFixa || estado.mes; // conta fixa vale no mês dela
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
      const porParcela = Object.fromEntries(doGrupo.map((x) => [x.parcela, x]));
      await Promise.all(nova.map((n) => {
        const atual = porParcela[n.parcela];
        const pago = atual.id === original.id ? base.pago : noCartao ? true : estaPago(atual);
        return store.update("lancamentos", atual.id, { ...n, pago, alteradoPor: estado.eu.id, alteradoEm: Date.now() });
      }));
    }
    fecharModal();
    toast("Alterações salvas.");
  } catch (e) {
    console.error(e);
    toast("Erro ao salvar: " + erroMsg(e));
  }
}

async function salvarTransferencia(f, original, valor) {
  const origem = conta(f.origem.value);
  const destino = conta(f.destino.value);
  if (!origem || !destino) return toast("Escolha de onde sai e para onde vai.");
  if (origem.id === destino.id) return toast("A conta de origem e a de destino são a mesma.");
  const paraCartao = destino.tipo === "cartao";
  const dados = {
    tipo: "transferencia",
    valor,
    descricao: f.descricao.value.trim() || (paraCartao ? `Fatura ${destino.nome}` : `Transferência para ${destino.nome}`),
    categoria: null,
    grupo: null,
    pessoalDe: null,
    data: f.data.value,
    competencia: f.data.value.slice(0, 7),
    pessoa: origem.dono,
    contaId: origem.id,
    contaDestinoId: destino.id,
    faturaDe: paraCartao ? f.faturaDe.value : null,
    obs: f.obs.value.trim(),
    pago: f.pago.checked,
    fixaId: null, parcela: null, totalParcelas: null, recorrencia: null, grupoId: null,
    subcategoria: null, tags: [], metaId: null,
  };
  if (original) await store.update("lancamentos", original.id, { ...dados, alteradoPor: estado.eu.id, alteradoEm: Date.now() });
  else await store.add("lancamentos", { ...dados, criadoPor: estado.eu.id, criadoEm: Date.now() });
  fecharModal();
  toast(paraCartao ? "Pagamento da fatura registrado." : "Transferência salva.");
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
    toast("Erro ao excluir: " + erroMsg(e));
  }
}

export async function alternarPago(l) {
  try {
    await store.update("lancamentos", l.id, { pago: !estaPago(l), alteradoPor: estado.eu.id, alteradoEm: Date.now() });
  } catch (e) { toast("Erro: " + erroMsg(e)); }
}

export function pagarFatura(fat) {
  const minhas = contasBancarias().filter((c) => c.dono === fat.cartao.dono);
  formLancamento(null, {
    tipo: "transferencia",
    valor: fat.falta || fat.total,
    descricao: `Fatura ${fat.cartao.nome}`,
    contaId: minhas[0]?.id || "",
    contaDestinoId: fat.cartao.id,
    faturaDe: fat.mes,
    data: hojeISO(),
    pago: true,
  });
}

export function pagarFixa(f, mes = estado.mes) {
  const dia = String(Math.min(f.dia || 1, 28)).padStart(2, "0");
  const hoje = hojeISO();
  const data = hoje.slice(0, 7) === mes || hoje < `${mes}-${dia}` ? hoje : `${mes}-${dia}`;
  formLancamento(null, {
    tipo: "despesa", valor: f.valor, descricao: f.nome, categoria: f.categoria, subcategoria: f.subcategoria || null,
    grupo: "fixos", data, fixaId: f.id, mesFixa: mes, pago: true,
  });
}

// ---------- Contas e cartões ----------

export function formConta(c, tipoNovo = "conta") {
  const novo = !c;
  const tipo = c?.tipo || tipoNovo;
  abrirModal(`
    <form autocomplete="off">
      <h2>${novo ? (tipo === "cartao" ? "Novo cartão de crédito" : "Nova conta") : "Editar"}</h2>
      <label>Nome <input name="nome" required placeholder="${tipo === "cartao" ? "Ex.: Cartão BB, Inter" : "Ex.: Banco do Brasil, C6, Carteira"}" value="${esc(c?.nome || "")}"></label>
      <div class="duas">
        <label>Tipo <select name="tipo">${Object.entries(TIPOS_CONTA).map(([k, nome]) => `<option value="${k}" ${tipo === k ? "selected" : ""}>${nome}</option>`).join("")}</select></label>
        <label>De quem <select name="dono">${pessoas.map((p) => `<option value="${p.id}" ${(c?.dono || estado.eu.id) === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></label>
      </div>
      <label class="nao-cartao">Saldo inicial <small>(quanto tinha na conta quando começou a usar o app)</small>
        <input name="saldoInicial" inputmode="decimal" placeholder="0,00" value="${c?.saldoInicial ? (c.saldoInicial / 100).toFixed(2).replace(".", ",") : ""}">
      </label>
      <div class="duas so-cartao">
        <label>Dia do fechamento <input type="number" name="fechamento" min="1" max="31" value="${c?.fechamento || ""}"></label>
        <label>Dia do vencimento <input type="number" name="vencimento" min="1" max="31" value="${c?.vencimento || ""}"></label>
      </div>
      <label class="so-cartao">Limite do cartão <small>(opcional)</small>
        <input name="limite" inputmode="decimal" placeholder="0,00" value="${centavosParaTexto(c?.limite)}">
      </label>
      <div class="acoes">
        ${novo ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    const mostrar = () => {
      $$(".so-cartao", m).forEach((e) => (e.hidden = f.tipo.value !== "cartao"));
      $$(".nao-cartao", m).forEach((e) => (e.hidden = f.tipo.value === "cartao"));
    };
    mostrar();
    f.tipo.addEventListener("change", mostrar);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = { nome: f.nome.value.trim(), tipo: f.tipo.value, dono: f.dono.value };
      if (dados.tipo === "cartao") {
        dados.fechamento = Number(f.fechamento.value);
        dados.vencimento = Number(f.vencimento.value);
        dados.limite = f.limite.value.trim() ? paraCentavos(f.limite.value) : null;
        dados.saldoInicial = 0;
        if (!dados.fechamento || !dados.vencimento) return toast("Informe os dias de fechamento e vencimento.");
      } else {
        const s = f.saldoInicial.value.trim();
        dados.saldoInicial = s ? paraCentavos(s.replace(/^-/, "")) * (s.startsWith("-") ? -1 : 1) : 0;
        if (Number.isNaN(dados.saldoInicial)) return toast("Saldo inicial inválido.");
        dados.fechamento = null;
        dados.vencimento = null;
        dados.limite = null;
      }
      try {
        if (novo) await store.add("contas", dados);
        else await store.update("contas", c.id, dados);
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + erroMsg(err)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      const usados = estado.lancamentos.filter((l) => l.contaId === c.id || l.contaDestinoId === c.id).length;
      if (usados) return toast(`Não dá para excluir: ${usados} lançamento(s) usam esta conta.`);
      if (await confirmar(`Excluir "${esc(c.nome)}"?`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("contas", c.id);
        toast("Excluído.");
      }
    });
  });
}

// ---------- Categorias ----------

const CORES_CATEGORIA = ["#22c55e", "#15803d", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#e11d48", "#ef4444", "#f97316", "#f59e0b", "#b45309", "#64748b", "#94a3b8", "#475569"];

export function formCategoria(c) {
  const novo = !c.id;
  const info = novo ? { icone: "etiqueta", cor: "#0ea5e9" } : infoCategoria(c.nome, c.tipo);
  if (!CORES_CATEGORIA.includes(info.cor)) CORES_CATEGORIA.push(info.cor);
  abrirModal(`
    <form autocomplete="off">
      <h2>${novo ? "Nova categoria" : "Editar categoria"}</h2>
      <label>Nome <input name="nome" required value="${esc(c.nome || "")}"></label>
      <fieldset class="seletor-icone" style="--c:${info.cor}">
        <legend>Ícone</legend>
        ${ICONES_CATEGORIA.map((ic) => `<label title="${ic}"><input type="radio" name="icone" value="${ic}" ${info.icone === ic ? "checked" : ""}><span>${svg(ic)}</span></label>`).join("")}
      </fieldset>
      <label>Subcategorias <small>(opcional, separe por vírgula)</small>
        <input name="subcategorias" value="${esc((c.subcategorias || []).join(", "))}" placeholder="Ex.: Luz, Água, Condomínio">
      </label>
      <fieldset class="seletor-cor">
        <legend>Cor</legend>
        ${CORES_CATEGORIA.map((cor) => `<label><input type="radio" name="cor" value="${cor}" ${info.cor === cor ? "checked" : ""}><span style="background:${cor}"></span></label>`).join("")}
      </fieldset>
      <div class="duas">
        <label>Tipo <select name="tipo"><option value="despesa" ${c.tipo === "despesa" ? "selected" : ""}>Despesa</option><option value="receita" ${c.tipo === "receita" ? "selected" : ""}>Receita</option></select></label>
        <label class="so-despesa">Grupo <select name="grupo">${gruposOrdenados().map((g) => `<option value="${g.id}" ${(c.grupo || "casa") === g.id ? "selected" : ""}>${esc(g.nome)}</option>`).join("")}</select></label>
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
    $$("[name=cor]", f).forEach((r) => r.addEventListener("change", () => m.querySelector(".seletor-icone").style.setProperty("--c", r.value)));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = {
        nome: f.nome.value.trim(),
        icone: f.querySelector("[name=icone]:checked")?.value || "etiqueta",
        cor: f.querySelector("[name=cor]:checked")?.value || "#0ea5e9",
        tipo: f.tipo.value,
        grupo: f.tipo.value === "despesa" ? f.grupo.value : null,
        subcategorias: [...new Set(f.subcategorias.value.split(",").map((x) => x.trim()).filter(Boolean))],
      };
      try {
        if (novo) await store.add("categorias", dados);
        else {
          await store.update("categorias", c.id, dados);
          if (dados.nome !== c.nome) {
            const afetados = estado.lancamentos.filter((l) => l.categoria === c.nome && l.tipo === c.tipo);
            await Promise.all(afetados.map((l) => store.update("lancamentos", l.id, { categoria: dados.nome })));
            const fixas = estado.fixas.filter((x) => x.categoria === c.nome);
            await Promise.all(fixas.map((x) => store.update("fixas", x.id, { categoria: dados.nome })));
          }
        }
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + erroMsg(err)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      const usados = estado.lancamentos.filter((l) => l.categoria === c.nome && l.tipo === c.tipo).length;
      if (usados) return toast(`Não dá para excluir: ${usados} lançamento(s) usam esta categoria.`);
      if (await confirmar(`Excluir a categoria "${esc(c.nome)}"?`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("categorias", c.id);
        toast("Excluída.");
      }
    });
  });
}

// ---------- Contas fixas ----------

export function formFixa(f) {
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
      <label>Categoria <select name="categoria">${cats.map((c) => `<option value="${esc(c.nome)}" ${f?.categoria === c.nome ? "selected" : ""}>${esc(c.nome)} (${esc(grupo(c.grupo).nome)})</option>`).join("")}</select></label>
      <label>Subcategoria <select name="subcategoria"></select></label>
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
    const subs = () => {
      const lista = subcategoriasDe(form.categoria.value);
      const atual = form.subcategoria.value || f?.subcategoria || "";
      form.subcategoria.innerHTML = `<option value="">—</option>` + lista.map((x) => `<option ${x === atual ? "selected" : ""}>${esc(x)}</option>`).join("");
    };
    subs();
    form.categoria.addEventListener("change", () => { form.subcategoria.value = ""; subs(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const valor = form.valor.value.trim() ? paraCentavos(form.valor.value) : 0;
      if (Number.isNaN(valor)) return toast("Valor inválido.");
      const dados = {
        nome: form.nome.value.trim(),
        valor,
        dia: Number(form.dia.value) || null,
        categoria: form.categoria.value,
        subcategoria: form.subcategoria.value || null,
        meses: $$("[name=mes]:checked", form).map((i) => Number(i.value)),
        ativa: form.ativa.checked,
      };
      try {
        if (nova) await store.add("fixas", dados);
        else await store.update("fixas", f.id, dados);
        fecharModal();
        toast("Salvo.");
      } catch (err) { toast("Erro: " + erroMsg(err)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      if (await confirmar(`Excluir a conta fixa "${esc(f.nome)}"? Os pagamentos já lançados continuam nos lançamentos.`, [{ texto: "Excluir", valor: true, classe: "perigo" }])) {
        await store.remove("fixas", f.id);
        toast("Excluída.");
      }
    });
  });
}

// ---------- Exportação ----------

export function exportarCSV() {
  const cab = ["data", "mes_referencia", "tipo", "situacao", "grupo", "pessoal_de", "descricao", "categoria", "subcategoria", "tags", "valor", "conta", "conta_destino", "dono_da_conta", "parcela", "observacao"];
  const linhas = [...estado.lancamentos]
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
    .map((l) => {
      const g = grupoDe(l, estado.categorias);
      return [
        l.data, l.competencia, l.tipo, estaPago(l) ? "pago" : "pendente", g ? grupo(g).nome : "", l.pessoalDe ? pessoa(l.pessoalDe).nome : "",
        l.descricao, l.categoria || "", l.subcategoria || "", (l.tags || []).join(", "), (l.valor / 100).toFixed(2).replace(".", ","),
        conta(l.contaId)?.nome || "", conta(l.contaDestinoId)?.nome || "", pessoa(l.pessoa).nome,
        l.totalParcelas ? `${l.parcela}/${l.totalParcelas}` : "", l.obs || "",
      ];
    });
  const csv = [cab, ...linhas].map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `contas-da-casa-${hojeISO()}.csv`;
  a.click();
}

// ---------- Metas de economia ----------

const CORES_META = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#475569"];

export function formMeta(mt) {
  const nova = !mt;
  const cor = mt?.cor || CORES_META[estado.metas.length % CORES_META.length];
  abrirModal(`
    <form autocomplete="off">
      <h2>${nova ? "Nova meta de economia" : "Editar meta"}</h2>
      <label>Nome <input name="nome" required placeholder="Ex.: Viagem de férias, Reserva de emergência" value="${esc(mt?.nome || "")}"></label>
      <div class="duas">
        <label>Quanto quer juntar <input name="valorAlvo" inputmode="decimal" required placeholder="0,00" value="${centavosParaTexto(mt?.valorAlvo)}"></label>
        <label>Até quando <small>(opcional)</small><input type="month" name="prazo" value="${mt?.prazo || ""}"></label>
      </div>
      <label>Já tem guardado <small>(antes de usar o app)</small>
        <input name="valorInicial" inputmode="decimal" placeholder="0,00" value="${centavosParaTexto(mt?.valorInicial)}">
      </label>
      <fieldset class="seletor-cor">
        <legend>Cor</legend>
        ${CORES_META.map((c) => `<label><input type="radio" name="cor" value="${c}" ${cor === c ? "checked" : ""}><span style="background:${c}"></span></label>`).join("")}
      </fieldset>
      ${nova ? "" : `<label class="check"><input type="checkbox" name="arquivada" ${mt.arquivada ? "checked" : ""}> Arquivar (some da lista principal)</label>`}
      <div class="acoes">
        ${nova ? "" : `<button type="button" class="btn perigo" id="excluir">Excluir</button>`}
        <button type="button" class="btn link" data-fechar>Cancelar</button>
        <button type="submit" class="btn primario">Salvar</button>
      </div>
    </form>`, (m) => {
    const f = m.querySelector("form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alvo = paraCentavos(f.valorAlvo.value);
      if (!(alvo > 0)) return toast("Informe quanto quer juntar.");
      const dados = {
        nome: f.nome.value.trim(),
        valorAlvo: alvo,
        prazo: f.prazo.value || null,
        valorInicial: f.valorInicial.value.trim() ? paraCentavos(f.valorInicial.value) || 0 : 0,
        cor: f.querySelector("[name=cor]:checked")?.value || cor,
        arquivada: f.arquivada?.checked || false,
      };
      try {
        if (nova) await store.add("metas", { ...dados, criadoEm: Date.now(), criadoPor: estado.eu.id });
        else await store.update("metas", mt.id, dados);
        fecharModal();
        toast("Meta salva.");
      } catch (err) { toast("Erro: " + erroMsg(err)); }
    });
    m.querySelector("#excluir")?.addEventListener("click", async () => {
      const usados = estado.lancamentos.filter((l) => l.metaId === mt.id).length;
      const r = await confirmar(`Excluir a meta "${esc(mt.nome)}"?${usados ? ` Os ${usados} lançamento(s) dela continuam, só deixam de estar ligados à meta.` : ""}`, [{ texto: "Excluir", valor: true, classe: "perigo" }]);
      if (!r) return;
      await Promise.all(estado.lancamentos.filter((l) => l.metaId === mt.id).map((l) => store.update("lancamentos", l.id, { metaId: null })));
      await store.remove("metas", mt.id);
      fecharModal();
      toast("Meta excluída.");
    });
  });
}

// Guardar dinheiro na meta = despesa no grupo Poupar ligada à meta.
export function guardarNaMeta(mt) {
  formLancamento(null, { tipo: "despesa", categoria: "Investimentos", grupo: "poupar", metaId: mt.id, descricao: `Guardar: ${mt.nome}`, pago: true });
}

// Resgatar da meta = receita ligada à meta.
export function resgatarDaMeta(mt) {
  formLancamento(null, { tipo: "receita", categoria: "Investimentos", metaId: mt.id, descricao: `Resgate: ${mt.nome}`, pago: true });
}
