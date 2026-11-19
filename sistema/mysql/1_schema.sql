-- RMX Medical - Controle de estoque (protótipo acadêmico)
-- Script 1 de 4: criação do banco, das tabelas e da procedure de movimentação.
-- Execute no MySQL Workbench (File > Open SQL Script, depois o raio para executar tudo).
-- Requer MySQL 8.0.16 ou superior (CHECK constraints são aplicadas a partir dessa versão).

DROP DATABASE IF EXISTS rmx_estoque;
CREATE DATABASE rmx_estoque CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE rmx_estoque;

-- Um produto pode ter várias movimentações (1:N).
CREATE TABLE produtos (
  id          INT          NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(20)  NOT NULL,
  nome        VARCHAR(80)  NOT NULL,
  categoria   VARCHAR(40)  NOT NULL,
  minimo      INT          NOT NULL DEFAULT 0,
  quantidade  INT          NOT NULL DEFAULT 0,
  CONSTRAINT pk_produtos        PRIMARY KEY (id),
  CONSTRAINT uq_produtos_codigo UNIQUE (codigo),
  CONSTRAINT ck_produtos_minimo CHECK (minimo >= 0),
  CONSTRAINT ck_produtos_qtd    CHECK (quantidade >= 0)
) ENGINE = InnoDB;

CREATE TABLE movimentos (
  id          INT          NOT NULL AUTO_INCREMENT,
  produto_id  INT          NOT NULL,
  tipo        ENUM('ENTRADA','SAIDA') NOT NULL,
  quantidade  INT          NOT NULL,
  observacao  VARCHAR(120) NULL,
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_movimentos      PRIMARY KEY (id),
  CONSTRAINT fk_mov_produto     FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE RESTRICT,
  CONSTRAINT ck_mov_quantidade  CHECK (quantidade > 0)
) ENGINE = InnoDB;

CREATE INDEX idx_mov_produto ON movimentos (produto_id, criado_em);

-- Procedure: registra a movimentação e atualiza o saldo na MESMA transação.
-- Se qualquer passo falhar (produto inexistente, saldo insuficiente...), nada é gravado.
DELIMITER $$

CREATE PROCEDURE sp_movimentar (
  IN p_codigo VARCHAR(20),
  IN p_tipo   VARCHAR(10),
  IN p_qtd    INT,
  IN p_obs    VARCHAR(120)
)
BEGIN
  DECLARE v_id    INT DEFAULT NULL;
  DECLARE v_saldo INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_tipo NOT IN ('ENTRADA', 'SAIDA') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo invalido: use ENTRADA ou SAIDA';
  END IF;
  IF p_qtd IS NULL OR p_qtd <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A quantidade deve ser maior que zero';
  END IF;

  START TRANSACTION;

  -- FOR UPDATE trava a linha do produto até o fim da transação.
  SELECT id, quantidade INTO v_id, v_saldo
    FROM produtos
   WHERE codigo = p_codigo
     FOR UPDATE;

  IF v_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produto inexistente';
  END IF;

  IF p_tipo = 'SAIDA' AND p_qtd > v_saldo THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente para a saida';
  END IF;

  INSERT INTO movimentos (produto_id, tipo, quantidade, observacao)
  VALUES (v_id, p_tipo, p_qtd, p_obs);

  UPDATE produtos
     SET quantidade = IF(p_tipo = 'ENTRADA', quantidade + p_qtd, quantidade - p_qtd)
   WHERE id = v_id;

  COMMIT;
END$$

DELIMITER ;
