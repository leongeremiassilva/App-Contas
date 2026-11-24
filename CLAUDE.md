# Contas da Casa — instruções para o Claude

App de controle financeiro do casal (Leon e Ariane; no código a Ariane tem id `esposa`). O Leon descreve as funções em português no chat; o Claude implementa, testa e publica. Responda sempre em português do Brasil, em linguagem simples (o usuário não é programador).

## Arquitetura
- Site estático, **sem build e sem npm**: HTML + CSS + JavaScript (módulos ES). Firebase carregado pelo CDN (`https://www.gstatic.com/firebasejs/11.0.2/...`).
- Hospedagem: **GitHub Pages** do branch `main` (raiz), em https://leongeremiassilva.github.io/App-Contas/ . Todo push no `main` publica em ~1 minuto.
- Firebase: projeto `contas-da-casa-1fd37` (Firestore em southamerica-east1, plano Spark gratuito). Console: https://console.firebase.google.com/u/1/project/contas-da-casa-1fd37 (no navegador, a conta leon é a /u/1/; a /u/0/ é a sdeesfopmpr, não mexer).
- Login: Firebase Auth com Google. Banco: Cloud Firestore.
- Segurança: `firestore.rules` só deixa as duas contas Google lerem/gravarem. As regras são publicadas no Console do Firebase (Firestore → Regras), não pelo push.
- Firebase do projeto fica na conta Google **leon.geremias.silva@gmail.com**. O repositório também é dessa conta; a conta GitHub `sdeesfopmpr` é colaboradora.

## Arquivos
- `js/config.js` — chaves do Firebase e a lista `pessoas` (id, nome, email, cor). Com `apiKey` vazio o app roda em **modo demonstração** (localStorage).
- `js/store.js` — camada de dados com a mesma interface para Firestore e modo demo (`watch`, `add`, `addMany`, `set`, `update`, `remove`, `removeMany`).
- `js/financas.js` — regras puras e dados padrão: grupos, categorias (as do Organizze), contas fixas sugeridas, dinheiro em centavos, competência de cartão, parcelamento, resumo do mês, saldos das contas, fatura do cartão, contas a pagar.
- `js/estado.js` — estado compartilhado e consultas (pessoa, conta, grupo, `dinheiro()` que respeita o "esconder valores").
- `js/ui.js` — modal, confirmação, aviso (toast), escape de HTML.
- `js/formularios.js` — janelas de lançamento (despesa/receita/transferência), pagar fatura, pagar conta fixa, conta/cartão, categoria, conta fixa, exportar CSV, e `formComprasFatura` (adicionar compras direto numa fatura: cartão e mês fixos, "parcela X de Y", salvar e adicionar outra, contador do total lançado).
- `js/telas.js` — telas principais (`TELAS`: inicio, lancamentos, fixas, limites, cartoes, contas, categorias, relatorios, metas, importar, mais) e `ligarEventos` (atributos `data-*`).
- `js/telas-extras.js` — Relatórios (gráfico de barras SVG próprio, com dica ao passar o dedo/mouse), Metas de economia, Importar extrato, Avisos de vencimento (sino no topo + faixa na visão geral), Parcelamentos, A receber e a pagar (pessoas), Dívidas (panorama + bloco "Minhas dívidas" na visão geral) e o painel "Quanto ainda posso gastar" da visão geral.
- `js/importar.js` — leitura de OFX e CSV (detecta separador, colunas e acentuação Windows-1252), sugestão de categoria (histórico → palavras-chave) e chave anti-duplicado.
- `js/app.js` — login, estrutura (menu lateral no computador ≥900px, barra inferior no celular), navegação e preparação/migração de dados (`prepararDados`, controlada por `config/versao`).
- `js/icones.js` — ícones de traço em SVG desenhados para o app (`svg(nome)`), lista de ícones de categoria e ícone de cada grupo.
- `css/style.css` — visual, mobile-first. Tema: `data-tema` no `<html>` ("claro"/"escuro"; sem atributo = segue o aparelho), escolhido no botão Modo escuro e salvo no navegador.
- `sw.js` + `manifest.json` + ícones — instalar na tela inicial (rede primeiro; ao mudar muito, suba o nome do CACHE).

## Referência de funcionamento
- O Leon gosta do **Organizze** (app.organizze.com.br) e pediu o app nos moldes dele: visão geral com receita/despesa do mês e botões rápidos, minhas contas com saldo, cartões com fatura, contas a pagar, limite de gastos, maiores gastos. Visual próprio, sem copiar marca.
- Combinado: implementar o básico e **perguntar antes** de cada função extra. Já feitas (19/11/2026): relatórios, importar extrato, avisos de vencimento, tags, subcategorias, metas de economia. **Anexar comprovante: o Leon não quer.** Também feitas (19/11/2026): tela de parcelamentos, "quanto ainda posso gastar", conferir saldo com o banco (ajuste), valores a receber/pagar de pessoas e o panorama de **Dívidas** com cadastro de financiamentos/empréstimos. Sugeridas e ainda não pedidas: lembretes no Google Agenda (.ics), comparação com mês anterior, metas dos grupos guardadas por mês, backup completo, relatório para IR. Conexão bancária automática não é viável (Open Finance).
- Gráficos: receitas `#0d9488` e despesas `#ea580c` (par validado para daltonismo; verde x vermelho reprova). Valores ocultos respeitam o olho.

## Preferências visuais do Leon
- **Sem emojis** em lugar nenhum da interface: usar só os ícones de traço de `js/icones.js` (criar novos no mesmo estilo se precisar). Dentro de `<option>` não dá para usar ícone: só texto.
- Categoria aparece como bolinha colorida com ícone (`icCat`), como no Organizze. Categorias guardam `icone` (nome do ícone) e `cor`; se faltar, vale o padrão pelo nome.
- Modo claro/escuro com interruptor (menu lateral, "Mais" no celular e menu do perfil).

## Como o casal pensa o dinheiro
- O dinheiro é todo junto. O que importa é **para que** foi o gasto (grupo do orçamento) e se as **contas fixas** foram pagas; "quem pagou" é secundário. Não existe acerto entre os dois.
- Orçamento por grupos com meta em **% da receita do mês**: Fixos 30, Pessoal 30, Alimentação 20, Casa 20, Poupar 0 (editável em Ajustes).
- Gastos do grupo Pessoal indicam de quem são (Leon ou Ariane).

## Modelo de dados (Firestore)
- `lancamentos`: `tipo` ("despesa"|"receita"|"transferencia"|"ajuste"), `valor` (centavos, inteiro), `descricao`, `categoria` (nome; null em transferência), `grupo` (id do grupo; se faltar, vale o grupo da categoria), `pessoalDe` (id da pessoa, só no grupo pessoal), `data` (YYYY-MM-DD), `competencia` (YYYY-MM em que o dinheiro sai: para cartão é o mês do vencimento da fatura), `pago` (false = pendente; ausente = pago), `pessoa` (receita: quem recebeu; despesa/transferência: dono da conta usada), `contaId` (conta usada / origem da transferência), `contaDestinoId` (destino da transferência), `faturaDe` (YYYY-MM da fatura paga, quando o destino é cartão), `obs`, `fixaId`, `subcategoria` (nome, opcional), `tags` (lista de textos em minúsculas), `metaId` (meta de economia: despesa = guardar, receita = resgatar), `importId` + `importadoDe` (linhas vindas de extrato; evita importar duas vezes), `parcela`, `totalParcelas`, `recorrencia` ("parcelado"|"fixo"|null), `grupoId`, `criadoPor`, `criadoEm`, `alteradoPor`, `alteradoEm`.
- **Ajuste** (`tipo: "ajuste"`): `valor` COM SINAL, mexe só no saldo da `contaId`; criado ao conferir saldo com o banco ou ao emprestar/receber/pagar pessoas (`acertoId`). Use `ehMovimento(l)` (só receita/despesa) em qualquer soma de receitas/despesas.
- Transferência não conta como receita nem despesa. Pagamento de fatura = transferência de uma conta para o cartão com `faturaDe`; a fatura fica "paga" quando os pagamentos cobrem o total.
- Saldo da conta = `saldoInicial` + receitas pagas − despesas pagas ± transferências pagas. Cartão não tem saldo, tem fatura (aberta / fechada / paga / atrasada).
- `grupos` (id fixo: fixos, pessoal, alimentacao, casa, poupar): `nome`, `percentual`, `icone`, `ordem`.
- `categorias`: `nome`, `tipo`, `icone` (nome de ícone de `icones.js`; dados antigos podem ter emoji, que é ignorado), `cor`, `grupo` (só despesa), `subcategorias` (lista de nomes). "Investimentos" existe como despesa e como receita: compare sempre nome **e** tipo.
- `fixas`: `nome`, `valor` (previsto), `dia`, `categoria`, `subcategoria`, `meses` (1-12; vazio = todo mês), `ativa`. Paga no mês = lançamento com `fixaId` e `competencia` do mês. Pagamento de conta fixa vai sempre para o grupo Fixos.
- `contas`: `nome`, `tipo` ("conta"|"cartao"|"dinheiro"), `dono`, `saldoInicial` (centavos), `fechamento`, `vencimento`, `limite` (só cartão), `conferidoEm` + `saldoConferido` (última conferência com o banco).
- `acertos` (a receber / a pagar de pessoas): `tipo` ("receber"|"pagar"), `pessoaNome`, `descricao`, `valor`, `data`, `vencimento`, `obs`, `baixas` [{valor, data, contaId, por}]. Restante = valor − soma das baixas.
- Quanto ainda posso gastar = receitas do mês − despesas do mês (inclui pendentes e faturas) − contas fixas não lançadas − o que falta guardar no grupo Poupar.
- Parcelamentos = lançamentos com `recorrencia: "parcelado"` agrupados por `grupoId`. Um grupo pode começar no meio (ex.: parcelas 6 a 10, lançadas pela fatura); as anteriores contam como já pagas. Editar "todos do grupo" mantém mês e número de cada parcela.
- O Leon achou confuso lançar compras de cartão pelo formulário geral (23/11/2026): o caminho principal é Cartões → fatura → "Adicionar compras nesta fatura". No formulário geral o rótulo da data muda: Data da compra (cartão) / Data do pagamento (pago) / Vencimento (pendente) / Data do recebimento / Previsto para.
- `emprestimos` (financiamentos/empréstimos): `tipo` (imovel|veiculo|emprestimo|consorcio|outro), `nome`, `credor`, `valorParcela`, `dia`, `totalParcelas`, `parcelasPagasInicial`, `saldoDevedor` (opcional, informado pelo banco), `fixaId` (se a prestação já é uma conta fixa: os pagamentos da fixa feitos depois do cadastro contam como parcela), `contaId`, `categoria`/`subcategoria`, `ativo`, `criadoEm`. Pagamento direto = despesa com `emprestimoId` (grupo Fixos). Não ligado a fixa → aparece em Contas a pagar/avisos e desconta do "quanto posso gastar".
- Panorama de dívidas (`panoramaDividas`): financiamentos (parcelas restantes × valor), faturas de cartão sem pagamento (dos últimos 3 meses em diante, inclui parcelas futuras), parcelados fora do cartão pendentes, contas com saldo negativo, valores a pagar a pessoas e despesas vencidas pendentes. Também: projeção 12 meses, renda média (3 meses) e comprometimento (prestações do mês ÷ renda; ≤30% ok, ≤50% atenção).
- `metas`: `nome`, `valorAlvo`, `prazo` (YYYY-MM, opcional), `valorInicial`, `cor`, `arquivada`. Guardado = valorInicial + despesas pagas com `metaId` − receitas pagas com `metaId`.
- `config/versao`: `{ dados: 5 }`. v4→v5 passou Transporte (categoria e lançamentos) do grupo Alimentação para Casa. v2→v3 trocou as categorias pelas do Organizze (`CATEGORIA_V2_PARA_V3`); v3→v4 adicionou subcategorias padrão (`SUBCATEGORIAS_PADRAO`, `SUBCATEGORIA_FIXAS`).
- Preferências só do aparelho (localStorage): `tema`, `ocultarValores`, `diasAviso` (antecedência dos avisos). Ao mudar dados padrão ou estrutura, suba `VERSAO_DADOS` em app.js e trate a migração em `prepararDados`.
- Regra de cartão: compra no dia do fechamento ou depois vai para a fatura seguinte.

## Como trabalhar
1. Faça a mudança pedida mantendo o estilo atual (sem frameworks, sem build).
2. Teste: `node --check` nos arquivos JS; rode o app em modo demo (`python3 -m http.server` na raiz, com `apiKey` vazio numa cópia ou via Playwright) e confira na tela. Não comite `config.js` com `apiKey` vazio.
3. Se mudar o modelo de dados, pense nos lançamentos que já existem (migração ou compatibilidade) e atualize esta seção.
4. Se precisar mudar quem tem acesso, altere `js/config.js` **e** `firestore.rules`, e avise o Leon para publicar as regras (ou publique pelo console).
5. Commit em português, push no `main`, e conte ao Leon em uma ou duas frases o que mudou.
