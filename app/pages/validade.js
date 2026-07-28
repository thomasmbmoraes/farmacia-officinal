// ================================================================
// pages/validade.js — Controle de validade com 4 faixas
// ================================================================

import { supabase }    from '../config/supabase.js';
import { formatarData } from '../utils/formatos.js';
import { exportarCSV, exportarExcel, COLUNAS_VALIDADE } from '../utils/exportar.js';

let state = {
  produtos:  [],
  filtro:    'todos',  // todos | vencido | vencendo_30 | vencendo_60 | vencendo_90
  carregando: false,
};

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;
  await carregar();
  renderTela(container);
}

async function carregar() {
  state.carregando = true;
  const { data } = await supabase
    .from('vw_produtos')
    .select('id, nome_simplificado, apresentacao, dosagem, marca_nome, categoria_nome, localizacao_nome, qtd_atual, validade, dias_para_vencer, status_validade')
    .eq('ativo', true)
    .not('validade', 'is', null)
    .in('status_validade', ['vencido', 'vencendo_30', 'vencendo_60', 'vencendo_90'])
    .order('validade', { ascending: true });
  state.produtos   = data || [];
  state.carregando = false;
}

function renderTela(container) {
  const todos      = state.produtos;
  const vencidos   = todos.filter(p => p.status_validade === 'vencido');
  const v30        = todos.filter(p => p.status_validade === 'vencendo_30');
  const v60        = todos.filter(p => p.status_validade === 'vencendo_60');
  const v90        = todos.filter(p => p.status_validade === 'vencendo_90');

  const filtrados = state.filtro === 'todos'        ? todos
                  : state.filtro === 'vencido'      ? vencidos
                  : state.filtro === 'vencendo_30'  ? v30
                  : state.filtro === 'vencendo_60'  ? v60
                  : v90;

  container.innerHTML = `
    <!-- Filtros por faixa -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">
      ${abaFiltro('todos',       `Todos (${todos.length})`,       state.filtro === 'todos')}
      ${abaFiltro('vencido',     `Vencidos (${vencidos.length})`, state.filtro === 'vencido',     'danger')}
      ${abaFiltro('vencendo_30', `30 dias (${v30.length})`,       state.filtro === 'vencendo_30', 'warning')}
      ${abaFiltro('vencendo_60', `60 dias (${v60.length})`,       state.filtro === 'vencendo_60', 'warning')}
      ${abaFiltro('vencendo_90', `90 dias (${v90.length})`,       state.filtro === 'vencendo_90', '')}

      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" id="btn-csv"><i class="ti ti-file-type-csv"></i> CSV</button>
        <button class="btn btn-secondary btn-sm" id="btn-excel"><i class="ti ti-file-spreadsheet"></i> Excel</button>
      </div>
    </div>

    ${!filtrados.length ? `
      <div class="empty" style="margin-top:60px">
        <i class="ti ti-circle-check" style="color:var(--accent)"></i>
        <p>${state.filtro === 'todos' ? 'Nenhum produto próximo do vencimento!' : 'Nenhum produto nesta faixa.'}</p>
        <span>Continue monitorando os prazos de validade.</span>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Localização</th>
              <th style="text-align:center">Qtd.</th>
              <th>Validade</th>
              <th style="text-align:center">Dias rest.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filtrados.map(p => `
              <tr>
                <td>
                  <div style="font-weight:500">${esc(p.nome_simplificado)}</div>
                  ${p.marca_nome ? `<div style="font-size:11px;color:var(--text-muted)">${esc(p.marca_nome)}</div>` : ''}
                </td>
                <td class="td-muted">${esc(p.categoria_nome) || '—'}</td>
                <td class="td-muted">${esc(p.localizacao_nome) || '—'}</td>
                <td style="text-align:center;font-weight:600">${p.qtd_atual}</td>
                <td style="font-weight:500">${formatarData(p.validade)}</td>
                <td style="text-align:center">
                  ${p.dias_para_vencer < 0
                    ? `<span style="color:var(--danger);font-weight:600">${Math.abs(p.dias_para_vencer)}d atrás</span>`
                    : `<span style="font-weight:600;${p.dias_para_vencer<=30?'color:var(--danger)':p.dias_para_vencer<=60?'color:var(--warning)':''}">${p.dias_para_vencer}d</span>`
                  }
                </td>
                <td>${badgeValidade(p.status_validade)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="padding:12px 16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
          ${filtrados.length} produto${filtrados.length !== 1 ? 's' : ''}
        </div>
      </div>
    `}
  `;

  // Filtros
  container.querySelectorAll('[data-filtro]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filtro = btn.dataset.filtro;
      renderTela(container);
    });
  });

  // Exportação
  container.querySelector('#btn-csv')?.addEventListener('click', () =>
    exportarCSV(filtrados, COLUNAS_VALIDADE, 'validade'));
  container.querySelector('#btn-excel')?.addEventListener('click', () =>
    exportarExcel(filtrados, COLUNAS_VALIDADE, 'validade'));
}

function abaFiltro(valor, label, ativo, tipo = '') {
  const cores = {
    danger:  ativo ? 'background:var(--danger);color:#fff;border-color:var(--danger)' : 'color:var(--danger);border-color:var(--danger)',
    warning: ativo ? 'background:var(--warning);color:#fff;border-color:var(--warning)' : 'color:var(--warning);border-color:var(--warning)',
    '':      ativo ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : '',
  };
  return `
    <button
      data-filtro="${valor}"
      style="
        padding:6px 14px;border-radius:var(--radius-sm);font-size:13px;
        font-weight:${ativo ? '600' : '400'};cursor:pointer;
        border:1px solid var(--border);
        background:${ativo ? '' : 'var(--surface)'};
        color:${ativo ? '' : 'var(--text-secondary)'};
        transition:all .12s;
        ${cores[tipo] || (ativo ? 'background:var(--surface-2);border-color:var(--border-strong);color:var(--text-primary)' : '')}
      "
    >${label}</button>
  `;
}

function badgeValidade(status) {
  const map = {
    vencido:     { cls: 'badge-vencido', label: 'Vencido' },
    vencendo_30: { cls: 'badge-30',      label: 'Vence em 30d' },
    vencendo_60: { cls: 'badge-60',      label: 'Vence em 60d' },
    vencendo_90: { cls: 'badge-90',      label: 'Vence em 90d' },
  };
  const { cls, label } = map[status] || { cls: 'badge-sem', label: '—' };
  return `<span class="badge ${cls}">${label}</span>`;
}

function esc(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;');
}
