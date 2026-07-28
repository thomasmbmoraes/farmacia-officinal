// ================================================================
// pages/relatorios.js — Relatórios e exportação
// ================================================================

import { supabase }                          from '../config/supabase.js';
import { formatarMoeda, formatarData,
         formatarDataHora }                  from '../utils/formatos.js';
import { exportarCSV, exportarExcel,
         COLUNAS_ESTOQUE, COLUNAS_VALIDADE } from '../utils/exportar.js';

export async function render(container) {
  container.innerHTML = `
    <div style="max-width:900px">
      <div style="margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Relatórios</h2>
        <p style="color:var(--text-muted);font-size:13px">Gere e exporte relatórios do estoque.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">

        ${relCard('estoque-completo', 'ti-packages', 'Estoque completo',
          'Todos os produtos ativos com quantidades, preços e localizações.',
          ['CSV', 'Excel'])}

        ${relCard('por-categoria', 'ti-tag', 'Produtos por categoria',
          'Lista de produtos agrupados por categoria.',
          ['CSV', 'Excel'])}

        ${relCard('por-localizacao', 'ti-map-pin', 'Produtos por localização',
          'Lista de produtos agrupados por localização física.',
          ['CSV', 'Excel'])}

        ${relCard('validade', 'ti-calendar-x', 'Controle de validade',
          'Produtos vencidos ou próximos do vencimento (até 90 dias).',
          ['CSV', 'Excel'])}

        ${relCard('sem-estoque', 'ti-package-off', 'Produtos sem estoque',
          'Produtos com quantidade zero.',
          ['CSV', 'Excel'])}

        ${relCard('abaixo-minimo', 'ti-trending-down', 'Abaixo do estoque mínimo',
          'Produtos que precisam de reposição.',
          ['CSV', 'Excel'])}

        ${relCard('movimentacoes', 'ti-arrows-exchange', 'Movimentações',
          'Histórico de todas as movimentações de estoque.',
          ['CSV', 'Excel'], true)}

        ${relCard('valor-estoque', 'ti-coin', 'Valor do estoque por categoria',
          'Valor total em estoque agrupado por categoria.',
          ['CSV', 'Excel'])}

      </div>
    </div>
  `;

  // Filtro de período para movimentações
  container.querySelector('#filtro-mov')?.addEventListener('change', () => {});

  // Bind dos botões
  container.querySelectorAll('[data-relatorio][data-formato]').forEach(btn => {
    btn.addEventListener('click', () =>
      gerarRelatorio(btn.dataset.relatorio, btn.dataset.formato, container, btn)
    );
  });
}

function relCard(id, icon, titulo, desc, formatos, temFiltro = false) {
  return `
    <div class="card card-sm" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="
        width:42px;height:42px;border-radius:var(--radius);flex-shrink:0;
        background:var(--accent-soft);color:var(--accent);
        display:flex;align-items:center;justify-content:center;font-size:20px;
      ">
        <i class="ti ${icon}"></i>
      </div>
      <div style="flex:1;min-width:200px">
        <div style="font-weight:600;font-size:14px;margin-bottom:2px">${titulo}</div>
        <div style="font-size:12px;color:var(--text-muted)">${desc}</div>
        ${temFiltro ? `
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
          <label style="font-size:12px;color:var(--text-muted)">Período:</label>
          <select id="filtro-mov" class="input" style="height:28px;font-size:12px;width:160px">
            <option value="7">Últimos 7 dias</option>
            <option value="30" selected>Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
            <option value="">Todos</option>
          </select>
        </div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        ${formatos.map(f => `
          <button
            class="btn btn-secondary btn-sm"
            data-relatorio="${id}"
            data-formato="${f.toLowerCase()}"
          >
            <i class="ti ${f === 'CSV' ? 'ti-file-type-csv' : 'ti-file-spreadsheet'}"></i>
            ${f}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

async function gerarRelatorio(tipo, formato, container, btn) {
  const originalHTML = btn.innerHTML;
  btn.disabled  = true;
  btn.innerHTML = '<div class="spinner" style="width:12px;height:12px;border-width:2px"></div>';

  try {
    let dados = [];
    let colunas = [];
    let nome    = tipo;

    switch (tipo) {

      case 'estoque-completo': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('*')
          .eq('ativo', true)
          .order('nome_simplificado');
        dados   = data || [];
        colunas = COLUNAS_ESTOQUE;
        nome    = 'estoque_completo';
        break;
      }

      case 'por-categoria': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('categoria_nome, nome_simplificado, apresentacao, dosagem, marca_nome, localizacao_nome, qtd_atual, preco_venda')
          .eq('ativo', true)
          .order('categoria_nome')
          .order('nome_simplificado');
        dados   = data || [];
        colunas = [
          { campo: 'categoria_nome',    titulo: 'Categoria' },
          { campo: 'nome_simplificado', titulo: 'Produto' },
          { campo: 'apresentacao',      titulo: 'Apresentação' },
          { campo: 'dosagem',           titulo: 'Dosagem' },
          { campo: 'marca_nome',        titulo: 'Marca' },
          { campo: 'localizacao_nome',  titulo: 'Localização' },
          { campo: 'qtd_atual',         titulo: 'Qtd.' },
          { campo: 'preco_venda',       titulo: 'Preço venda', fmt: formatarMoeda },
        ];
        nome = 'produtos_por_categoria';
        break;
      }

      case 'por-localizacao': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('localizacao_nome, nome_simplificado, categoria_nome, marca_nome, qtd_atual, preco_venda')
          .eq('ativo', true)
          .order('localizacao_nome')
          .order('nome_simplificado');
        dados   = data || [];
        colunas = [
          { campo: 'localizacao_nome',  titulo: 'Localização' },
          { campo: 'nome_simplificado', titulo: 'Produto' },
          { campo: 'categoria_nome',    titulo: 'Categoria' },
          { campo: 'marca_nome',        titulo: 'Marca' },
          { campo: 'qtd_atual',         titulo: 'Qtd.' },
          { campo: 'preco_venda',       titulo: 'Preço venda', fmt: formatarMoeda },
        ];
        nome = 'produtos_por_localizacao';
        break;
      }

      case 'validade': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('nome_simplificado, apresentacao, dosagem, categoria_nome, marca_nome, localizacao_nome, qtd_atual, validade, dias_para_vencer, status_validade')
          .eq('ativo', true)
          .not('validade', 'is', null)
          .in('status_validade', ['vencido','vencendo_30','vencendo_60','vencendo_90'])
          .order('validade');
        dados   = data || [];
        colunas = COLUNAS_VALIDADE;
        nome    = 'controle_validade';
        break;
      }

      case 'sem-estoque': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('nome_simplificado, apresentacao, categoria_nome, marca_nome, localizacao_nome, qtd_atual')
          .eq('ativo', true)
          .eq('qtd_atual', 0)
          .order('nome_simplificado');
        dados   = data || [];
        colunas = [
          { campo: 'nome_simplificado', titulo: 'Produto' },
          { campo: 'apresentacao',      titulo: 'Apresentação' },
          { campo: 'categoria_nome',    titulo: 'Categoria' },
          { campo: 'marca_nome',        titulo: 'Marca' },
          { campo: 'localizacao_nome',  titulo: 'Localização' },
          { campo: 'qtd_atual',         titulo: 'Qtd.' },
        ];
        nome = 'sem_estoque';
        break;
      }

      case 'abaixo-minimo': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('nome_simplificado, apresentacao, categoria_nome, marca_nome, localizacao_nome, qtd_atual, qtd_minima')
          .eq('ativo', true)
          .gt('qtd_minima', 0)
          .order('nome_simplificado');
        dados   = (data || []).filter(p => p.qtd_atual < p.qtd_minima);
        colunas = [
          { campo: 'nome_simplificado', titulo: 'Produto' },
          { campo: 'apresentacao',      titulo: 'Apresentação' },
          { campo: 'categoria_nome',    titulo: 'Categoria' },
          { campo: 'localizacao_nome',  titulo: 'Localização' },
          { campo: 'qtd_atual',         titulo: 'Qtd. atual' },
          { campo: 'qtd_minima',        titulo: 'Qtd. mínima' },
        ];
        nome = 'abaixo_minimo';
        break;
      }

      case 'movimentacoes': {
        const sel   = container.querySelector('#filtro-mov');
        const dias  = sel ? parseInt(sel.value) || null : 30;
        let query   = supabase
          .from('movimentacoes')
          .select('ocorrido_em, tipo, origem, quantidade, sinal, qtd_antes, qtd_depois, observacao, produto:produto_id(nome_simplificado)')
          .order('ocorrido_em', { ascending: false })
          .limit(5000);
        if (dias) {
          const desde = new Date();
          desde.setDate(desde.getDate() - dias);
          query = query.gte('ocorrido_em', desde.toISOString());
        }
        const { data } = await query;
        dados = (data || []).map(m => ({
          ...m,
          nome_simplificado: m.produto?.nome_simplificado || '—',
          qtd_com_sinal:     (m.sinal > 0 ? '+' : '−') + m.quantidade,
        }));
        colunas = [
          { campo: 'ocorrido_em',       titulo: 'Data/hora',    fmt: formatarDataHora },
          { campo: 'nome_simplificado', titulo: 'Produto' },
          { campo: 'tipo',              titulo: 'Tipo' },
          { campo: 'origem',            titulo: 'Origem' },
          { campo: 'qtd_com_sinal',     titulo: 'Quantidade' },
          { campo: 'qtd_antes',         titulo: 'Qtd. antes' },
          { campo: 'qtd_depois',        titulo: 'Qtd. depois' },
          { campo: 'observacao',        titulo: 'Observação' },
        ];
        nome = `movimentacoes${dias ? `_${dias}dias` : ''}`;
        break;
      }

      case 'valor-estoque': {
        const { data } = await supabase
          .from('vw_produtos')
          .select('categoria_nome, qtd_atual, preco_custo, preco_venda')
          .eq('ativo', true)
          .not('preco_custo', 'is', null);

        // Agrupar por categoria
        const grupos = {};
        (data || []).forEach(p => {
          const cat = p.categoria_nome || 'Sem categoria';
          if (!grupos[cat]) grupos[cat] = { categoria: cat, total_custo: 0, total_venda: 0, qtd_itens: 0 };
          grupos[cat].total_custo  += (p.qtd_atual || 0) * (p.preco_custo || 0);
          grupos[cat].total_venda  += (p.qtd_atual || 0) * (p.preco_venda || 0);
          grupos[cat].qtd_itens    += 1;
        });
        dados = Object.values(grupos).sort((a,b) => b.total_custo - a.total_custo);
        colunas = [
          { campo: 'categoria',    titulo: 'Categoria' },
          { campo: 'qtd_itens',    titulo: 'Qtd. produtos' },
          { campo: 'total_custo',  titulo: 'Valor custo',  fmt: formatarMoeda },
          { campo: 'total_venda',  titulo: 'Valor venda',  fmt: formatarMoeda },
        ];
        nome = 'valor_estoque_por_categoria';
        break;
      }
    }

    if (!dados.length) {
      alert('Nenhum dado encontrado para este relatório.');
      return;
    }

    if (formato === 'csv')   exportarCSV(dados, colunas, nome);
    if (formato === 'excel') exportarExcel(dados, colunas, nome);

  } catch (err) {
    alert('Erro ao gerar relatório: ' + err.message);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = originalHTML;
  }
}
