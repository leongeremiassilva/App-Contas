# Contas da Casa

Controle financeiro do casal: os dois lançam gastos e receitas de qualquer conta ou cartão, e veem tudo junto.

## O que faz
Funciona nos moldes do Organizze, adaptado ao jeito do casal:
- **Visão geral**: receita e despesa do mês, botões rápidos (despesa, receita, transferência), saldo das contas, faturas dos cartões, contas a pagar, limite de gastos por grupo e gráfico dos maiores gastos. Botão de olho para esconder os valores.
- **Lançamentos** pagos ou pendentes, com filtros por grupo, conta, categoria, pessoa e situação.
- **Transferências** entre contas e **pagamento de fatura** (não contam como gasto).
- **Cartões**: fatura de cada mês com situação (aberta, fechada, paga, atrasada), divisão casa x pessoal e próximas faturas.
- **Contas fixas** do mês para marcar como paga.
- **Limite de gastos**: grupos Fixos, Pessoal, Alimentação, Casa e Poupar, com meta em % da receita.
- **Relatórios**: entradas x saídas por mês, gastos por categoria (com evolução e subcategorias), uso das metas dos grupos mês a mês e gastos por tag.
- **Importar extrato** OFX ou CSV do banco/fatura, com categoria sugerida e proteção contra duplicados.
- **Avisos de vencimento**: sino no topo e aviso na visão geral para contas atrasadas ou que vencem nos próximos dias.
- **Tags**, **subcategorias** e **metas de economia** (guardar e resgatar, com quanto falta por mês).
- **Parcelamentos**: compras parceladas em andamento, quanto falta e quanto já está comprometido nos próximos meses.
- **Quanto ainda posso gastar** no mês (e por dia), descontando contas fixas e o que falta guardar.
- **Conferir saldo com o banco**: se não bater, o app lança um ajuste de saldo.
- **A receber e a pagar** de outras pessoas, com pagamentos parciais.
- **Dívidas**: total de tudo que ainda vão pagar, de onde vem, quanto vence em cada mês, quanto da renda está comprometido e cadastro de financiamentos e empréstimos com parcelas restantes.
- Categorias padrão do Organizze. Exportação em CSV. Menu lateral no computador e barra inferior no celular; instalável na tela inicial.

## Configuração (feita uma vez)
1. **Firebase** (conta leon.geremias.silva@gmail.com): criar projeto → Authentication → ativar Google → Firestore Database (modo produção, região `southamerica-east1`) → colar o conteúdo de `firestore.rules` em Regras e publicar → adicionar app Web e copiar as chaves para `js/config.js`.
2. **Authentication → Configurações → Domínios autorizados**: adicionar `SEU-USUARIO.github.io`.
3. **GitHub**: Settings → Pages → Deploy from a branch → `main` / raiz.
4. Colocar o e-mail da esposa em `js/config.js` e em `firestore.rules` (e publicar as regras de novo).

Sem chaves em `js/config.js`, o app abre em modo demonstração (dados só no navegador).

## Como pedir mudanças
Abra uma conversa no projeto **App Contas** do Claude e descreva o que quer. O Claude altera o código, testa e publica. Instruções técnicas para o Claude estão em `CLAUDE.md`.
