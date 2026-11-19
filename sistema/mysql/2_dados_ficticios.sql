-- Script 2 de 4: dados FICTÍCIOS de demonstração (não são o estoque real da RMX Medical).
USE rmx_estoque;

-- Os produtos nascem com saldo 0 e o saldo inicial entra pela procedure,
-- gerando o registro de ENTRADA no histórico.
INSERT INTO produtos (codigo, nome, categoria, minimo, quantidade) VALUES
  ('RMX-001', 'Oximetro de pulso',          'Monitoramento', 3, 0),
  ('RMX-002', 'Aparelho de pressao digital','Monitoramento', 4, 0),
  ('RMX-003', 'Termometro digital',         'Monitoramento', 5, 0),
  ('RMX-004', 'Nebulizador',                'Respiratorio',  2, 0),
  ('RMX-005', 'Estetoscopio',               'Diagnostico',   3, 0);

CALL sp_movimentar('RMX-001', 'ENTRADA', 12, 'Saldo inicial');
CALL sp_movimentar('RMX-002', 'ENTRADA',  3, 'Saldo inicial');
CALL sp_movimentar('RMX-003', 'ENTRADA',  2, 'Saldo inicial');
CALL sp_movimentar('RMX-004', 'ENTRADA',  8, 'Saldo inicial');
CALL sp_movimentar('RMX-005', 'ENTRADA',  6, 'Saldo inicial');

-- Total esperado: 31 unidades em 5 equipamentos.
SELECT COUNT(*) AS equipamentos, SUM(quantidade) AS unidades FROM produtos;
