# RMX Medical – Controle de estoque (Projeto Integrador IV)

Protótipo acadêmico com dados FICTÍCIOS. Duas partes: a página web e os scripts MySQL.

## 1) Página web (HTML, CSS, JavaScript e Bootstrap)
1. Descompacte o arquivo.
2. Abra a pasta `rmx-estoque` e dê dois cliques em `index.html` (Chrome, Edge ou Firefox).
   Não precisa instalar nada nem ter internet. Os dados ficam salvos no navegador.

Como verificar a funcionalidade principal:
- Resumo no topo: 5 equipamentos, 31 unidades, 2 precisam de reposição.
- Digite "oxímetro" na busca, ou marque "Mostrar só itens a repor".
- Em "Movimentar estoque", escolha o Oxímetro, tipo Saída, quantidade 99: aparece "Saldo insuficiente" e nada é gravado.
- Repita com quantidade 2: o saldo vai de 12 para 10 e a saída aparece no histórico.
- Cadastre um equipamento novo; tente repetir o mesmo código (é recusado).
- "Baixar CSV" baixa a lista; "Voltar aos dados de demonstração" volta ao início.

## 2) Banco de dados (MySQL 8.0.16 ou superior, no MySQL Workbench)
Abra e execute os scripts da pasta `mysql`, nesta ordem:
1. `1_schema.sql`: cria o banco `rmx_estoque`, as tabelas `produtos` e `movimentos` (chave primária, chave estrangeira, UNIQUE e CHECK) e a procedure `sp_movimentar` (transação).
2. `2_dados_ficticios.sql`: insere 5 equipamentos (31 unidades).
3. `3_consultas.sql`: consulta de reposição, saldo por categoria, histórico (JOIN) e verificação de consistência.
4. `4_teste_transacao.sql`: saída válida, saída recusada (erro esperado), código duplicado (erro esperado) e entrada.

Os blocos de `3_` e `4_` devem ser executados um por vez (selecione o trecho e use Ctrl+Enter).
Alguns comandos do script 4 geram ERRO de propósito, para mostrar que as regras funcionam.

## Observação
A página guarda os dados no navegador e aplica as mesmas regras do banco; a ligação direta entre a página e o MySQL
(que exigiria um servidor) fica como próximo passo.
