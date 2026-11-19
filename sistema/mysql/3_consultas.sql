-- Script 3 de 4: consultas de demonstração. Execute uma por vez (selecione o trecho e use Ctrl+Enter).
USE rmx_estoque;

-- 1) Itens que precisam de reposição (consulta principal do projeto)
--    Esperado com os dados de demonstração: Aparelho de pressao (3/4) e Termometro (2/5).
SELECT codigo, nome, quantidade, minimo
  FROM produtos
 WHERE quantidade <= minimo
 ORDER BY nome;

-- 2) Saldo por categoria
SELECT categoria, COUNT(*) AS equipamentos, SUM(quantidade) AS unidades
  FROM produtos
 GROUP BY categoria
 ORDER BY categoria;

-- 3) Histórico com o nome do equipamento (JOIN entre as duas tabelas)
SELECT m.criado_em, p.codigo, p.nome, m.tipo, m.quantidade, m.observacao
  FROM movimentos m
  JOIN produtos   p ON p.id = m.produto_id
 ORDER BY m.criado_em DESC, m.id DESC;

-- 4) Verificação de consistência: o saldo guardado deve ser igual a entradas - saídas.
--    Se a consulta não retornar nenhuma linha, o saldo e o histórico estão coerentes.
SELECT p.codigo, p.quantidade AS saldo_guardado,
       COALESCE(SUM(IF(m.tipo = 'ENTRADA', m.quantidade, -m.quantidade)), 0) AS saldo_pelo_historico
  FROM produtos p
  LEFT JOIN movimentos m ON m.produto_id = p.id
 GROUP BY p.id, p.codigo, p.quantidade
HAVING p.quantidade <> saldo_pelo_historico;
