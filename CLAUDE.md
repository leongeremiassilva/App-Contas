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
- `js/store.js` — camada de dados com a mesma interface para Firestore e modo demo (`watch`, `add`, `addMany`, `update`, `remove`, `removeMany`).
- `js/financas.js` — regras puras e dados padrão: grupos, categorias, contas fixas sugeridas, dinheiro em centavos, competência de cartão, parcelamento/recorrência, resumo do mês (orçamento por grupo).
- `js/app.js` — telas (Orçamento, Lançamentos, Contas fixas, Ajustes), formulários, modais e a preparação/migração de dados (`prepararDados`, controlada por `config/versao`).
- `css/style.css` — visual, mobile-first, com tema escuro automático.
- `sw.js` + `manifest.json` + ícones — permitem instalar na tela inicial (rede primeiro).

## Como o casal pensa o dinheiro
- O dinheiro é todo junto. O que importa é **para que** foi o gasto (grupo do orçamento) e se as **contas fixas** foram pagas; "quem pagou" é secundário. Não existe acerto entre os dois.
- Orçamento por grupos com meta em **% da receita do mês**: Fixos 30, Pessoal 30, Alimentação 20, Casa 20, Poupar 0 (editável em Ajustes).
- Gastos do grupo Pessoal indicam de quem são (Leon ou Ariane).

## Modelo de dados (Firestore)
- `lancamentos`: `tipo` ("despesa"|"receita"), `valor` (centavos, inteiro), `descricao`, `categoria` (nome), `grupo` (id do grupo; se faltar, vale o grupo da categoria), `pessoalDe` (id da pessoa, só no grupo pessoal), `data` (YYYY-MM-DD), `competencia` (YYYY-MM em que o dinheiro sai: para cartão é o mês do vencimento da fatura), `pessoa` (receita: quem recebeu; despesa: dono da conta usada), `contaId`, `obs`, `fixaId` (pagamento de conta fixa), `parcela`, `totalParcelas`, `recorrencia` ("parcelado"|"fixo"|null), `grupoId` (liga parcelas/repetições), `criadoPor`, `criadoEm`, `alteradoPor`, `alteradoEm`.
- `grupos` (id fixo: fixos, pessoal, alimentacao, casa, poupar): `nome`, `percentual`, `icone`, `ordem`.
- `categorias`: `nome`, `tipo`, `icone`, `grupo` (só despesa).
- `fixas`: `nome`, `valor` (previsto, centavos), `dia`, `categoria`, `meses` (lista 1-12; vazia = todo mês), `ativa`. Paga no mês = existe lançamento com `fixaId` e `competencia` daquele mês.
- `contas`: `nome`, `tipo` ("conta"|"cartao"|"dinheiro"), `dono` (id da pessoa), `fechamento`, `vencimento` (dias, só cartão).
- `config/versao`: `{ dados: 2 }`. Ao mudar dados padrão ou estrutura, suba `VERSAO_DADOS` em app.js e trate a migração em `prepararDados`.
- Regra de cartão: compra no dia do fechamento ou depois vai para a fatura seguinte.

## Como trabalhar
1. Faça a mudança pedida mantendo o estilo atual (sem frameworks, sem build).
2. Teste: `node --check` nos arquivos JS; rode o app em modo demo (`python3 -m http.server` na raiz, com `apiKey` vazio numa cópia ou via Playwright) e confira na tela. Não comite `config.js` com `apiKey` vazio.
3. Se mudar o modelo de dados, pense nos lançamentos que já existem (migração ou compatibilidade) e atualize esta seção.
4. Se precisar mudar quem tem acesso, altere `js/config.js` **e** `firestore.rules`, e avise o Leon para publicar as regras (ou publique pelo console).
5. Commit em português, push no `main`, e conte ao Leon em uma ou duas frases o que mudou.
