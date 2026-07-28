// ================================================================
// services/produto.service.js
// Toda lógica de banco relacionada a produtos.
// REGRA: nunca atualizar qtd_atual diretamente.
//        Sempre via INSERT em movimentacoes.
// ================================================================

import { supabase } from '../config/supabase.js';

// ── Busca inteligente ─────────────────────────────────────────
// Pesquisa em: nome_simplificado, nome_completo, nome_principal,
// principio_ativo, dosagem, apresentacao, codigo_barras.
// Código de barras numérico longo → match exato.
export async function buscarProdutos(termo = '', filtros = {}) {
  const {
    localizacao_id,
    categoria_id,
    status_validade,
    status_estoque,
    ativo = true,
    pagina = 0,
    por_pagina = 50,
  } = filtros;

  let query = supabase
    .from('vw_produtos')
    .select('*', { count: 'exact' })
    .eq('ativo', ativo)
    .order('nome_simplificado')
    .range(pagina * por_pagina, (pagina + 1) * por_pagina - 1);

  if (localizacao_id) query = query.eq('localizacao_id', localizacao_id);
  if (categoria_id)   query = query.eq('categoria_id',   categoria_id);

  // Filtros de validade
  const hoje = new Date().toISOString().split('T')[0];
  const diasFrente = (n) => {
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  if (status_validade === 'vencido')     query = query.lt('validade', hoje);
  if (status_validade === 'vencendo_30') query = query.gte('validade', hoje).lte('validade', diasFrente(30));
  if (status_validade === 'vencendo_60') query = query.gt('validade', diasFrente(30)).lte('validade', diasFrente(60));
  if (status_validade === 'vencendo_90') query = query.gt('validade', diasFrente(60)).lte('validade', diasFrente(90));

  // Filtros de estoque
  if (status_estoque === 'sem_estoque')   query = query.eq('qtd_atual', 0);
  if (status_estoque === 'abaixo_minimo') query = query.gt('qtd_minima', 0);

  // Busca textual
  if (termo && termo.trim()) {
    const t = termo.trim();
    // Código de barras: só dígitos com 8+
    if (/^\d{8,}$/.test(t)) {
      query = query.eq('codigo_barras', t);
    } else {
      // Full-text: cada palavra vira prefixo
      const fts = normalizar(t)
        .split(/\s+/)
        .filter(Boolean)
        .map(w => `${w}:*`)
        .join(' & ');
      query = query.textSearch('busca_ts', fts, { config: 'portuguese', type: 'websearch' });
    }
  }

  const { data, count, error } = await query;
  if (error) throw error;

  // Pós-filtro abaixo_minimo (não suportado via query simples)
  let resultado = data || [];
  if (status_estoque === 'abaixo_minimo') {
    resultado = resultado.filter(p => p.qtd_minima > 0 && p.qtd_atual < p.qtd_minima);
  }

  return { produtos: resultado, total: count ?? resultado.length };
}

// ── Busca por marca (complementar ao full-text) ───────────────
export async function buscarPorMarca(termo) {
  const { data, error } = await supabase
    .from('vw_produtos')
    .select('*')
    .ilike('marca_nome', `%${termo}%`)
    .eq('ativo', true)
    .order('nome_simplificado')
    .limit(50);
  if (error) throw error;
  return data || [];
}

// ── Produto por ID ────────────────────────────────────────────
export async function obterProduto(id) {
  const { data, error } = await supabase
    .from('vw_produtos')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── Criar produto ─────────────────────────────────────────────
export async function criarProduto(dados) {
  const { qtd_inicial = 0, ...campos } = dados;

  const { data, error } = await supabase
    .from('produtos')
    .insert(campos)
    .select('id')
    .single();
  if (error) throw error;

  if (qtd_inicial > 0) {
    await supabase.from('movimentacoes').insert({
      produto_id: data.id,
      tipo:       'ajuste',
      origem:     'cadastro',
      quantidade: qtd_inicial,
      sinal:      1,
      qtd_antes:  0,
      qtd_depois: qtd_inicial,
      observacao: 'Estoque inicial',
    });
  }
  return data.id;
}

// ── Editar produto ────────────────────────────────────────────
// Nunca altera qtd_atual diretamente.
export async function editarProduto(id, dados) {
  const { qtd_atual, busca_ts, ...campos } = dados;
  const { error } = await supabase
    .from('produtos')
    .update(campos)
    .eq('id', id);
  if (error) throw error;
}

// ── Ajuste manual de estoque ──────────────────────────────────
// Único caminho para alterar qtd_atual pelo frontend.
export async function ajustarEstoque(produtoId, novaQtd, observacao = '') {
  const produto = await obterProduto(produtoId);
  if (!produto) throw new Error('Produto não encontrado.');
  const diferenca = novaQtd - produto.qtd_atual;
  if (diferenca === 0) return;

  const { error } = await supabase.from('movimentacoes').insert({
    produto_id: produtoId,
    tipo:       'ajuste',
    origem:     'ajuste_manual',
    quantidade: Math.abs(diferenca),
    sinal:      diferenca > 0 ? 1 : -1,
    qtd_antes:  produto.qtd_atual,
    qtd_depois: novaQtd,
    observacao: observacao || 'Ajuste manual',
  });
  if (error) throw error;
}

// ── Desativar produto (soft delete) ──────────────────────────
export async function desativarProduto(id) {
  const { error } = await supabase
    .from('produtos')
    .update({ ativo: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Reativar produto ──────────────────────────────────────────
export async function reativarProduto(id) {
  const { error } = await supabase
    .from('produtos')
    .update({ ativo: true })
    .eq('id', id);
  if (error) throw error;
}

// ── Duplicar produto ──────────────────────────────────────────
export async function duplicarProduto(id) {
  const p = await obterProduto(id);
  if (!p) throw new Error('Produto não encontrado.');
  const { id: _, criado_em, atualizado_em, busca_ts,
          qtd_atual, codigo_interno, codigo_barras,
          marca_nome, fornecedor_nome, categoria_nome,
          subcategoria_nome, localizacao_nome,
          dias_para_vencer, status_validade, status_estoque,
          ...campos } = p;
  return criarProduto({
    ...campos,
    nome_simplificado: `${p.nome_simplificado} (cópia)`,
    codigo_interno:    null,
    codigo_barras:     null,
    qtd_inicial:       0,
  });
}

// ── Movimentações de um produto ───────────────────────────────
export async function movimentacoesProduto(produtoId, limite = 20) {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('produto_id', produtoId)
    .order('ocorrido_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data || [];
}

// ── Dados de domínio ──────────────────────────────────────────
export async function carregarDominio() {
  const [{ data: locs }, { data: cats }, { data: marcas }] = await Promise.all([
    supabase.from('localizacoes').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('marcas').select('id, nome').eq('ativo', true).order('nome'),
  ]);
  return {
    localizacoes: locs || [],
    categorias:   cats || [],
    marcas:       marcas || [],
  };
}

// ── Normalizar texto para busca ───────────────────────────────
function normalizar(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
