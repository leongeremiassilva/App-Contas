# Contas da Casa

Controle financeiro do casal: os dois lançam gastos e receitas de qualquer conta ou cartão, e veem tudo junto.

## O que faz
- **Orçamento do mês por grupos** (Fixos, Pessoal, Alimentação, Casa, Poupar), cada um com meta em % da receita: mostra quanto já foi gasto e quanto sobra.
- **Contas fixas**: lista do mês (financiamento, luz, condomínio, celulares, plano de saúde...) para marcar como paga.
- **Lançamentos** de despesas e receitas, com categoria, grupo, data e conta/cartão. Gastos pessoais indicam de quem são.
- **Cartão de crédito**: com o dia de fechamento e vencimento, cada compra cai na fatura certa; a fatura mostra quanto é da casa e quanto é pessoal.
- **Parcelado** e **repete todo mês**.
- Busca e filtros. Exportação em CSV (abre no Excel). Instalável na tela inicial do celular.

## Configuração (feita uma vez)
1. **Firebase** (conta leon.geremias.silva@gmail.com): criar projeto → Authentication → ativar Google → Firestore Database (modo produção, região `southamerica-east1`) → colar o conteúdo de `firestore.rules` em Regras e publicar → adicionar app Web e copiar as chaves para `js/config.js`.
2. **Authentication → Configurações → Domínios autorizados**: adicionar `SEU-USUARIO.github.io`.
3. **GitHub**: Settings → Pages → Deploy from a branch → `main` / raiz.
4. Colocar o e-mail da esposa em `js/config.js` e em `firestore.rules` (e publicar as regras de novo).

Sem chaves em `js/config.js`, o app abre em modo demonstração (dados só no navegador).

## Como pedir mudanças
Abra uma conversa no projeto **App Contas** do Claude e descreva o que quer. O Claude altera o código, testa e publica. Instruções técnicas para o Claude estão em `CLAUDE.md`.
