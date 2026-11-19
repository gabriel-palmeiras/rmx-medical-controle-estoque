-- Script 4 de 4: demonstração da transação e das restrições. Execute um bloco por vez.
USE rmx_estoque;

-- A) Saída válida: o oxímetro tem 12; saem 2 e o saldo passa a 10.
CALL sp_movimentar('RMX-001', 'SAIDA', 2, 'Venda demonstrativa');
SELECT codigo, nome, quantidade FROM produtos WHERE codigo = 'RMX-001';   -- esperado: 10

-- B) Saída maior que o saldo: deve dar ERRO "Saldo insuficiente para a saida"
--    e NADA deve ser gravado (rollback).
CALL sp_movimentar('RMX-001', 'SAIDA', 99, 'Tentativa invalida');
SELECT codigo, quantidade FROM produtos WHERE codigo = 'RMX-001';         -- continua 10
SELECT COUNT(*) AS movimentos_do_oximetro FROM movimentos
 WHERE produto_id = (SELECT id FROM produtos WHERE codigo = 'RMX-001');   -- continua 2 (entrada inicial + saída A)

-- C) Código duplicado: deve dar ERRO 1062 (Duplicate entry) pela restrição UNIQUE.
INSERT INTO produtos (codigo, nome, categoria, minimo, quantidade)
VALUES ('RMX-001', 'Duplicado', 'Teste', 1, 0);

-- D) Produto inexistente: deve dar ERRO "Produto inexistente".
CALL sp_movimentar('RMX-999', 'ENTRADA', 1, 'Teste');

-- E) Entrada válida: o termômetro tinha 2 (abaixo do mínimo 5); entram 10 e ele sai da lista de reposição.
CALL sp_movimentar('RMX-003', 'ENTRADA', 10, 'Compra do fornecedor (demonstrativa)');
SELECT codigo, nome, quantidade, minimo FROM produtos WHERE quantidade <= minimo ORDER BY nome;
