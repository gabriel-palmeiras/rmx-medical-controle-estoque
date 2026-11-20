// RMX Medical – Controle de estoque (protótipo acadêmico, dados fictícios)
// Os dados ficam no navegador (localStorage). O modelo espelha as tabelas MySQL da pasta /mysql:
//   produtos(id, codigo UNIQUE, nome, categoria, minimo, quantidade)
//   movimentos(id, produto_id -> produtos.id, tipo, quantidade, observacao, criado_em)

const CHAVE = "rmx-estoque-v1";

const DEMO = () => {
  const agora = new Date().toISOString();
  const base = [
    ["RMX-001", "Oxímetro de pulso", "Monitoramento", 3, 12],
    ["RMX-002", "Aparelho de pressão digital", "Monitoramento", 4, 3],
    ["RMX-003", "Termômetro digital", "Monitoramento", 5, 2],
    ["RMX-004", "Nebulizador", "Respiratório", 2, 8],
    ["RMX-005", "Estetoscópio", "Diagnóstico", 3, 6],
  ];
  const produtos = base.map((b, i) => ({ id: i + 1, codigo: b[0], nome: b[1], categoria: b[2], minimo: b[3], quantidade: b[4] }));
  const movimentos = produtos.map((p, i) => ({
    id: i + 1, produto_id: p.id, tipo: "ENTRADA", quantidade: p.quantidade, observacao: "Saldo inicial", criado_em: agora,
  }));
  return { produtos, movimentos };
};

let banco = carregar();

function carregar() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE));
    if (d && Array.isArray(d.produtos) && Array.isArray(d.movimentos)) return d;
  } catch (e) { /* sem armazenamento: usa demonstração */ }
  return DEMO();
}
function gravar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch (e) { /* ignora */ }
}

// ---------- Regras de negócio (equivalem às restrições e à transação do MySQL) ----------
class ErroRegra extends Error {}

const inteiroPositivo = (v) => Number.isInteger(v) && v > 0;
const inteiroNaoNegativo = (v) => Number.isInteger(v) && v >= 0;

function cadastrar({ codigo, nome, categoria, minimo, saldo }) {
  codigo = String(codigo || "").trim().toUpperCase();
  nome = String(nome || "").trim();
  categoria = String(categoria || "").trim();
  if (!codigo || !nome || !categoria) throw new ErroRegra("Preencha código, nome e categoria.");
  if (!inteiroNaoNegativo(minimo) || !inteiroNaoNegativo(saldo)) throw new ErroRegra("Saldo inicial e mínimo devem ser números inteiros, sem negativos.");
  if (banco.produtos.some((p) => p.codigo === codigo)) throw new ErroRegra(`O código ${codigo} já está cadastrado.`);

  // Alterações feitas em cópia e gravadas juntas: ou salva tudo, ou nada.
  const novo = JSON.parse(JSON.stringify(banco));
  const id = Math.max(0, ...novo.produtos.map((p) => p.id)) + 1;
  novo.produtos.push({ id, codigo, nome, categoria, minimo, quantidade: saldo });
  if (saldo > 0) {
    novo.movimentos.push({
      id: Math.max(0, ...novo.movimentos.map((m) => m.id)) + 1,
      produto_id: id, tipo: "ENTRADA", quantidade: saldo, observacao: "Saldo inicial", criado_em: new Date().toISOString(),
    });
  }
  banco = novo; gravar();
}

// Equivale a UPDATE produtos SET codigo, nome, categoria, minimo. O saldo não muda aqui: só por movimento.
function editar(id, { codigo, nome, categoria, minimo }) {
  codigo = String(codigo || "").trim().toUpperCase();
  nome = String(nome || "").trim();
  categoria = String(categoria || "").trim();
  if (!banco.produtos.some((x) => x.id === id)) throw new ErroRegra("Equipamento inexistente.");
  if (!codigo || !nome || !categoria) throw new ErroRegra("Preencha código, nome e categoria.");
  if (!inteiroNaoNegativo(minimo)) throw new ErroRegra("O mínimo deve ser um número inteiro, sem negativos.");
  if (banco.produtos.some((x) => x.codigo === codigo && x.id !== id)) throw new ErroRegra(`O código ${codigo} já está cadastrado.`);
  const novo = JSON.parse(JSON.stringify(banco));
  Object.assign(novo.produtos.find((x) => x.id === id), { codigo, nome, categoria, minimo });
  banco = novo; gravar();
}

// Equivale a DELETE FROM produtos, que no MySQL falha (ON DELETE RESTRICT) se já existe movimento do item.
function excluir(id) {
  const p = banco.produtos.find((x) => x.id === id);
  if (!p) throw new ErroRegra("Equipamento inexistente.");
  if (banco.movimentos.some((m) => m.produto_id === id)) {
    throw new ErroRegra(`${p.nome} não pode ser excluído: já tem movimentos no histórico. Só dá para excluir um cadastro que nunca teve movimento (por exemplo, um cadastro feito por engano com saldo 0).`);
  }
  const novo = JSON.parse(JSON.stringify(banco));
  novo.produtos = novo.produtos.filter((x) => x.id !== id);
  banco = novo; gravar();
}

function movimentar(produtoId, tipo, quantidade, observacao) {
  const p = banco.produtos.find((x) => x.id === produtoId);
  if (!p) throw new ErroRegra("Equipamento inexistente.");
  if (tipo !== "ENTRADA" && tipo !== "SAIDA") throw new ErroRegra("Tipo de movimentação inválido.");
  if (!inteiroPositivo(quantidade)) throw new ErroRegra("A quantidade deve ser um número inteiro maior que zero.");
  if (tipo === "SAIDA" && quantidade > p.quantidade) {
    throw new ErroRegra(`Saldo insuficiente: ${p.nome} tem ${p.quantidade} unidade(s) e a saída pedida é de ${quantidade}.`);
  }
  const novo = JSON.parse(JSON.stringify(banco));
  const alvo = novo.produtos.find((x) => x.id === produtoId);
  alvo.quantidade += tipo === "ENTRADA" ? quantidade : -quantidade;
  novo.movimentos.push({
    id: Math.max(0, ...novo.movimentos.map((m) => m.id)) + 1,
    produto_id: produtoId, tipo, quantidade, observacao: String(observacao || "").trim(), criado_em: new Date().toISOString(),
  });
  banco = novo; gravar();
}

// Equivale a: SELECT ... FROM produtos WHERE quantidade <= minimo ORDER BY nome
const precisaRepor = (p) => p.quantidade <= p.minimo;

function consultar(termo, soRepor) {
  termo = (termo || "").trim().toLowerCase();
  return banco.produtos
    .filter((p) => (p.nome + " " + p.codigo).toLowerCase().includes(termo))
    .filter((p) => !soRepor || precisaRepor(p))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function csv() {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const linhas = [["codigo", "nome", "categoria", "saldo", "minimo", "situacao"]];
  banco.produtos.forEach((p) => linhas.push([p.codigo, p.nome, p.categoria, p.quantidade, p.minimo, precisaRepor(p) ? "Repor" : "OK"]));
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n");
}

// ---------- Interface ----------
const $ = (id) => document.getElementById(id);

function aviso(texto, tipo) {
  const el = $("alerta");
  el.innerHTML = "";
  if (!texto) return;
  const d = document.createElement("div");
  d.className = `alert alert-${tipo}`;
  d.textContent = texto; // textContent evita injeção de HTML
  el.appendChild(d);
}

function celula(tr, texto, classe) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (classe) td.className = classe;
  tr.appendChild(td);
  return td;
}

function desenhar() {
  const lista = consultar($("busca").value, $("so-repor").checked);

  const tb = $("tabela");
  tb.innerHTML = "";
  if (!lista.length) {
    const tr = document.createElement("tr");
    const td = celula(tr, "Nenhum equipamento encontrado.", "text-center text-secondary py-4");
    td.colSpan = 8;
    tb.appendChild(tr);
  }
  lista.forEach((p) => {
    const tr = document.createElement("tr");
    const baixo = precisaRepor(p);
    if (baixo) tr.className = "repor";
    celula(tr, p.codigo, "codigo"); celula(tr, p.nome); celula(tr, p.categoria);
    celula(tr, p.quantidade, "text-end saldo"); celula(tr, p.minimo, "text-end");

    // Barra de nível: fim da barra = 3x o mínimo; marca preta = mínimo
    const tdNivel = celula(tr, "", "");
    const razao = p.minimo > 0 ? p.quantidade / (p.minimo * 3) : (p.quantidade > 0 ? 1 : 0);
    const barra = document.createElement("div");
    barra.className = "nivel" + (baixo ? " baixo" : "");
    barra.setAttribute("role", "img");
    barra.setAttribute("aria-label", `Saldo ${p.quantidade}, mínimo ${p.minimo}`);
    const miolo = document.createElement("i");
    miolo.style.width = Math.round(Math.min(1, razao) * 100) + "%";
    barra.appendChild(miolo);
    tdNivel.appendChild(barra);

    celula(tr, baixo ? "Repor" : "Em dia", baixo ? "situacao-repor" : "situacao-ok");

    const tdAcoes = celula(tr, "", "acoes text-end text-nowrap");
    [["Editar", "editar"], ["Excluir", "excluir"]].forEach(([texto, acao]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = texto; b.dataset.acao = acao; b.dataset.id = p.id;
      b.className = "btn btn-link btn-sm p-0 ms-2 " + (acao === "excluir" ? "link-excluir" : "");
      b.setAttribute("aria-label", `${texto} ${p.nome}`);
      tdAcoes.appendChild(b);
    });
    tb.appendChild(tr);
  });

  $("r-itens").textContent = banco.produtos.length;
  $("r-unidades").textContent = banco.produtos.reduce((s, p) => s + p.quantidade, 0);
  $("r-repor").textContent = banco.produtos.filter(precisaRepor).length;

  const sel = $("m-produto");
  const atual = sel.value;
  sel.innerHTML = "";
  [...banco.produtos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).forEach((p) => {
    const o = document.createElement("option");
    o.value = p.id; o.textContent = `${p.codigo} – ${p.nome} (saldo ${p.quantidade})`;
    sel.appendChild(o);
  });
  if (atual) sel.value = atual;

  const h = $("historico");
  h.innerHTML = "";
  [...banco.movimentos].reverse().slice(0, 30).forEach((m) => {
    const p = banco.produtos.find((x) => x.id === m.produto_id);
    const tr = document.createElement("tr");
    celula(tr, new Date(m.criado_em).toLocaleString("pt-BR"));
    celula(tr, p ? p.nome : "?");
    celula(tr, m.tipo === "ENTRADA" ? "Entrada" : "Saída", m.tipo === "ENTRADA" ? "mov-entrada" : "mov-saida");
    celula(tr, (m.tipo === "ENTRADA" ? "+" : "−") + m.quantidade, "text-end saldo");
    celula(tr, m.observacao || "");
    h.appendChild(tr);
  });
}

function tratar(acao, msgOk) {
  try {
    acao();
    aviso(typeof msgOk === "function" ? msgOk() : msgOk, "success");
    desenhar();
    return true;
  }
  catch (e) {
    if (e instanceof ErroRegra) { aviso(e.message, "danger"); return false; }
    throw e;
  }
}

$("busca").addEventListener("input", desenhar);
$("so-repor").addEventListener("change", desenhar);

// Quando editandoId tem um número, o formulário de cadastro está em modo de edição.
let editandoId = null;

function modoEdicao(p) {
  editandoId = p ? p.id : null;
  $("t-cad").textContent = p ? "Editar equipamento" : "Cadastrar equipamento";
  $("btn-salvar").textContent = p ? "Salvar alterações" : "Cadastrar equipamento";
  $("cancelar-edicao").hidden = !p;
  $("p-saldo").disabled = !!p;
  $("dica-saldo").hidden = !p;
  if (p) {
    $("p-codigo").value = p.codigo; $("p-nome").value = p.nome; $("p-categoria").value = p.categoria;
    $("p-minimo").value = p.minimo; $("p-saldo").value = p.quantidade;
  } else {
    $("form-produto").reset();
  }
}

$("form-produto").addEventListener("submit", (e) => {
  e.preventDefault();
  if (editandoId !== null) {
    const id = editandoId;
    const ok = tratar(() => editar(id, {
      codigo: $("p-codigo").value, nome: $("p-nome").value, categoria: $("p-categoria").value,
      minimo: Number($("p-minimo").value),
    }), () => `Equipamento atualizado: ${$("p-nome").value.trim()}.`);
    if (ok) modoEdicao(null);
    return;
  }
  const ok = tratar(() => cadastrar({
    codigo: $("p-codigo").value, nome: $("p-nome").value, categoria: $("p-categoria").value,
    minimo: Number($("p-minimo").value), saldo: Number($("p-saldo").value),
  }), () => `Equipamento cadastrado: ${$("p-nome").value.trim()}.`);
  if (ok) e.target.reset();
});

$("cancelar-edicao").addEventListener("click", () => { modoEdicao(null); aviso("", "info"); });

$("tabela").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-acao]");
  if (!b) return;
  const id = Number(b.dataset.id);
  const p = banco.produtos.find((x) => x.id === id);
  if (!p) return;
  if (b.dataset.acao === "editar") {
    modoEdicao(p); aviso("", "info");
    $("form-produto").scrollIntoView({ behavior: "smooth", block: "center" });
    $("p-nome").focus();
    return;
  }
  if (!window.confirm(`Excluir o cadastro de ${p.nome} (${p.codigo})?`)) return;
  tratar(() => excluir(id), `Equipamento excluído: ${p.nome}.`);
  if (editandoId === id) modoEdicao(null);
});

$("form-mov").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = Number($("m-produto").value), tipo = $("m-tipo").value, qtd = Number($("m-qtd").value);
  tratar(() => movimentar(id, tipo, qtd, $("m-obs").value), () => {
    const p = banco.produtos.find((x) => x.id === id);
    return `${tipo === "ENTRADA" ? "Entrada" : "Saída"} registrada: ${p.nome}, ${qtd} un. Saldo atual: ${p.quantidade}.`;
  });
});

$("exportar").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([csv()], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "estoque_rmx.csv" });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

$("restaurar").addEventListener("click", () => {
  banco = DEMO(); gravar(); modoEdicao(null); aviso("Dados de demonstração restaurados.", "info"); desenhar();
});

desenhar();
