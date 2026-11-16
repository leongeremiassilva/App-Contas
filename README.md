# Contas da Casa

Controle financeiro do casal: os dois lançam gastos e receitas de qualquer conta ou cartão, e veem tudo junto.

## O que faz
- **Lançamentos** de despesas e receitas, com categoria, data, quem pagou/recebeu e conta/cartão.
- **Cartão de crédito**: informe o dia de fechamento e vencimento; cada compra cai automaticamente na fatura certa.
- **Parcelado** (divide o valor em N meses) e **repete todo mês** (contas fixas, assinaturas).
- **Resumo do mês**: receitas, despesas, saldo, quanto cada um recebeu e pagou, quanto um deve passar ao outro para dividir meio a meio, faturas que vencem no mês e gastos por categoria.
- Busca e filtros por pessoa, tipo e categoria. Exportação em CSV (abre no Excel).
- Funciona no celular e pode ser instalado na tela inicial ("Adicionar à tela de início").

## Configuração (feita uma vez)
1. **Firebase** (conta leon.geremias.silva@gmail.com): criar projeto → Authentication → ativar Google → Firestore Database (modo produção, região `southamerica-east1`) → colar o conteúdo de `firestore.rules` em Regras e publicar → adicionar app Web e copiar as chaves para `js/config.js`.
2. **Authentication → Configurações → Domínios autorizados**: adicionar `SEU-USUARIO.github.io`.
3. **GitHub**: Settings → Pages → Deploy from a branch → `main` / raiz.
4. Colocar o e-mail da esposa em `js/config.js` e em `firestore.rules` (e publicar as regras de novo).

Sem chaves em `js/config.js`, o app abre em modo demonstração (dados só no navegador).

## Como pedir mudanças
Abra uma conversa no projeto **App Contas** do Claude e descreva o que quer. O Claude altera o código, testa e publica. Instruções técnicas para o Claude estão em `CLAUDE.md`.
