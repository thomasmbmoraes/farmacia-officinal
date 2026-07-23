// ================================================================
// services/importacao.service.js
// Parser inteligente + importação em lote de produtos.
//
// REGRA: nunca inventar valores. Campo sem certeza = null.
// ================================================================

import { supabase }                from '../config/supabase.js';
import {
  DICIONARIO_CATEGORIAS,
  DICIONARIO_APRESENTACOES,
  REGEX_DOSAGEM,
  REGEX_QTD_EMBALAGEM,
} from '../utils/importacao-dicionario.js';

// ── Normalização ──────────────────────────────────────────────
function norm(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ── Inferência de categoria ───────────────────────────────────
// Retorna null se não tiver certeza — nunca inventa.
function inferirCategoria(nomeNorm) {
  for (const entrada of DICIONARIO_CATEGORIAS) {
    for (const termo of entrada.termos) {
      if (nomeNorm.includes(norm(termo))) {
        return entrada.categoria;
      }
    }
  }
  return null;
}

// ── Inferência de apresentação ────────────────────────────────
function inferirApresentacao(nomeNorm) {
  for (const entrada of DICIONARIO_APRESENTACOES) {
    for (const termo of entrada.termos) {
      if (nomeNorm.includes(norm(termo))) {
        return entrada.apresentacao;
      }
    }
  }
  return null;
}

// ── Inferência de dosagem ─────────────────────────────────────
function inferirDosagem(nome) {
  const m = nome.match(REGEX_DOSAGEM);
  return m ? m[0].trim() : null;
}

// ── Inferência de qtd por embalagem ──────────────────────────
function inferirQtdEmbalagem(nome) {
  const m = nome.match(REGEX_QTD_EMBALAGEM);
  return m ? parseInt(m[1], 10) : null;
}

// ── Parser de uma linha ───────────────────────────────────────
// Entrada:  "Vitamina C + Zinco 500mg - 3"
// Saída:    objeto com todos os campos inferidos
export function parsearLinha(linha) {
  linha = linha.trim();
  if (!linha) return null;

  // Separar nome e quantidade: "Nome - 3" ou "Nome: 3"
  let nomeRaw = linha;
  let qtdAtual = null;

  const sepMatch = linha.match(/^(.+?)\s*[-–:]\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (sepMatch) {
    nomeRaw  = sepMatch[1].trim();
    qtdAtual = parseFloat(sepMatch[2].replace(',', '.'));
  }

  const nomeNorm = norm(nomeRaw);

  const categoria    = inferirCategoria(nomeNorm);
  const apresentacao = inferirApresentacao(nomeNorm);
  const dosagem      = inferirDosagem(nomeRaw);
  const qtdEmbal     = inferirQtdEmbalagem(nomeRaw);

  // Campos que precisam de revisão manual
  const requer_revisao = [];
  if (!categoria)    requer_revisao.push('categoria');
  if (!apresentacao) requer_revisao.push('apresentacao');
  if (qtdAtual === null) requer_revisao.push('qtd_atual');

  return {
    // Campos preenchidos pelo parser
    nome_simplificado:  nomeRaw,
    dosagem,
    apresentacao,
    qtd_por_embalagem:  qtdEmbal,
    unidade:            'un',
    qtd_atual:          qtdAtual ?? 0,
    // Campos para resolução posterior
    categoria_nome:     categoria,   // nome → id resolvido em resolverIds()
    categoria_id:       null,
    localizacao_id:     null,        // definido na tela de importação
    // Campos sempre vazios — usuário preenche depois
    nome_principal:     null,
    principio_ativo:    null,
    marca_id:           null,
    // Meta
    requer_revisao,
    _linha_original:    linha,
  };
}

// ── Parser de bloco de texto ──────────────────────────────────
export function parsearTexto(texto) {
  return texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(parsearLinha)
    .filter(Boolean);
}

// ── Resolver nomes de categoria → IDs do banco ────────────────
export async function resolverIds(itens) {
  const { data: cats } = await supabase
    .from('categorias')
    .select('id, nome')
    .eq('ativo', true);

  const mapa = Object.fromEntries((cats || []).map(c => [c.nome, c.id]));

  return itens.map(item => ({
    ...item,
    categoria_id: item.categoria_nome ? (mapa[item.categoria_nome] ?? null) : null,
  }));
}

// ── Importar produtos aprovados ───────────────────────────────
// localizacaoId: UUID da localização selecionada
// itens: array já revisado pelo usuário
export async function importarProdutos(itens, localizacaoId) {
  if (!localizacaoId) throw new Error('Selecione uma localização antes de importar.');
  if (!itens.length)  throw new Error('Nenhum produto para importar.');

  // Montar registros para inserção
  const registros = itens.map(item => ({
    nome_simplificado:  item.nome_simplificado?.trim() || '(sem nome)',
    nome_principal:     item.nome_principal     || null,
    principio_ativo:    item.principio_ativo    || null,
    apresentacao:       item.apresentacao       || null,
    dosagem:            item.dosagem            || null,
    qtd_por_embalagem:  item.qtd_por_embalagem  || null,
    unidade:            item.unidade            || 'un',
    categoria_id:       item.categoria_id       || null,
    localizacao_id:     localizacaoId,
    qtd_atual:          0,   // sempre começa em 0; movimentação registra o estoque inicial
    ativo:              true,
  }));

  const { data, error } = await supabase
    .from('produtos')
    .insert(registros)
    .select('id, nome_simplificado');

  if (error) throw error;

  // Registrar estoque inicial como movimentação de ajuste
  // (rastreável desde o primeiro dia — origem: importacao)
  const movs = data
    .map((prod, i) => {
      const qtd = itens[i]?.qtd_atual ?? 0;
      if (!qtd || qtd === 0) return null;
      return {
        produto_id: prod.id,
        tipo:       'ajuste',
        origem:     'importacao',
        quantidade: qtd,
        sinal:      1,
        qtd_antes:  0,
        qtd_depois: qtd,
        observacao: 'Estoque inicial — importação',
      };
    })
    .filter(Boolean);

  if (movs.length > 0) {
    const { error: errMov } = await supabase
      .from('movimentacoes')
      .insert(movs);
    if (errMov) throw errMov;
  }

  return { criados: data.length, produtos: data };
}
