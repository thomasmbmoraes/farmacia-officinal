// ================================================================
// pages/historico.js — Histórico de conferências
// ================================================================

import { supabase }                          from '../config/supabase.js';
import { formatarDataHora, formatarDuracao } from '../utils/formatos.js';
import { exportarCSV, exportarExcel }        from '../utils/exportar.js';

const COLUNAS_HISTORICO = [
  { campo: 'iniciado_em',                titulo: 'Data',            fmt: v => formatarDataHora(v) },
  { campo: 'localizacao_nome',           titulo: 'Localização' },
  { campo: 'usuario_nome',              titulo: 'Responsável' },
  { campo: 'total_itens',               titulo: 'Itens conferidos' },
  { campo: 'total_produtos_com_diferenca', titulo: 'Com diferença' },
  { campo: 'total_vendas',              titulo: 'Vendas' },
  { campo: 'total_quebras',             titulo: 'Quebras' },
  { campo: 'total_ajustes',             titulo: 'Ajustes' },
  { campo: 'duracao_segundos',          titulo: 'Duração', fmt: v => formatarDuracao(v) },
];

let state = {
  conferencias: [],
  total:        0,
  pagina:       0,
  filtro_loc:   '',
  sessaoAberta: null,
  detalhe:      [],
};

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;

  const { data: locs } = await supabase
    .from('localizacoes').select('id, nome').eq('ativo', true).order('nome');

  state.localizacoes = locs || [];
  state.pagina       = 0;

  await carregar();
  renderTela(container);
}

async function carregar() {
  let query = supabase
    .from('vw_historico_conferencias')
    .select('*', { count: 'exact' })
    .eq('status', 'finalizada')
    .order('iniciado_em', { ascending: false })
    .range(state.pagina * 20, (state.pagina + 1) * 20 - 1);

  if (state.filtro_loc) query = query.eq('localizacao_id', state.filtro_loc);

  const { data, count } = await query;
  state.conferencias = data || [];
  state.total        = count ?? 0;
}

function renderTela(container) {
  container.innerHTML = `
    <div style="max-width:1000px">

      <!-- Toolbar -->
      <div class="page-toolbar" style="margin-bottom:16px">
        <select id="filtro-loc" class="input" style="width:200px">
          <option value="">Todas localizações</option>
          ${(state.localizacoes || []).map(l =>
            `<option value="${l.id}" ${state.filtro_loc===l.id?'selected':''}>${l.nome}</option>`
          ).join('')}
        </select>

        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" id="btn-csv">
            <i class="ti ti-file-type-csv"></i> CSV
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-excel">
            <i class="ti ti-file-spreadsheet"></i> Excel
          </button>
        </div>
      </div>

      <!-- Lista de conferências -->
      <div id="lista-conf"></div>

      <!-- Paginação -->
      <div id="paginacao" class="pagination" style="display:none">
        <span id="pag-info" style="font-size:12px;color:var(--text-muted)"></span>
        <div class="pagination-btns">
          <button class="btn btn-secondary btn-sm" id="btn-prev">
            <i class="ti ti-chevron-left"></i>
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-next">
            <i class="ti ti-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Painel de detalhe -->
      <div id="painel-detalhe" style="display:none"></div>
    </div>
  `;

  renderLista(container);
  bindEventos(container);
}

function renderLista(container) {
  const lista = container.querySelector('#lista-conf');
  const pag   = container.querySelector('#paginacao');

  if (!state.conferencias.length) {
    lista.innerHTML = `
      <div class="empty" style="margin-top:60px">
        <i class="ti ti-clipboard"></i>
        <p>Nenhuma conferência realizada ainda.</p>
        <span><a href="#conferencia" style="color:var(--accent)">Iniciar primeira conferência</a></span>
      </div>
    `;
    pag.style.display = 'none';
    return;
  }

  const ini = state.pagina * 20 + 1;
  const fim = Math.min(ini + state.conferencias.length - 1, state.total);
  container.querySelector('#pag-info').textContent =
    `${ini}–${fim} de ${state.total} conferência${state.total !== 1 ? 's' : ''}`;
  pag.style.display = 'flex';
  container.querySelector('#btn-prev').disabled = state.pagina === 0;
  container.querySelector('#btn-next').disabled = fim >= state.total;

  lista.innerHTML = state.conferencias.map(c => `
    <div class="card card-sm conf-item" data-id="${c.id}" style="
      margin-bottom:8px;cursor:pointer;transition:border-color .12s;
      ${state.sessaoAberta === c.id ? 'border-color:var(--accent)' : ''}
    ">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">

        <!-- Ícone -->
        <div style="
          width:40px;height:40px;border-radius:var(--radius);flex-shrink:0;
          background:var(--accent-soft);color:var(--accent);
          display:flex;align-items:center;justify-content:center;font-size:20px;
        ">
          <i class="ti ti-clipboard-check"></i>
        </div>

        <!-- Info principal -->
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${esc(c.localizacao_nome)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
            ${formatarDataHora(c.iniciado_em)}
            ${c.usuario_nome ? ` · ${esc(c.usuario_nome)}` : ''}
            ${c.duracao_segundos ? ` · ${formatarDuracao(c.duracao_segundos)}` : ''}
          </div>
        </div>

        <!-- Indicadores -->
        <div style="display:flex;gap:16px;flex-shrink:0">
          <div style="text-align:center">
            <div style="font-size:18px;font-weight:600">${c.total_itens ?? 0}</div>
            <div style="font-size:11px;color:var(--text-muted)">conferidos</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:18px;font-weight:600;${(c.total_produtos_com_diferenca??0)>0?'color:var(--warning)':''}">${c.total_produtos_com_diferenca ?? 0}</div>
            <div style="font-size:11px;color:var(--text-muted)">diferenças</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:18px;font-weight:600;${(c.total_vendas??0)>0?'color:var(--danger)':''}">${c.total_vendas ?? 0}</div>
            <div style="font-size:11px;color:var(--text-muted)">vendas</div>
          </div>
        </div>

        <!-- Chevron -->
        <i class="ti ${state.sessaoAberta === c.id ? 'ti-chevron-up' : 'ti-chevron-down'}"
           style="color:var(--text-muted);font-size:16px;flex-shrink:0"></i>
      </div>

      <!-- Detalhe expandido -->
      ${state.sessaoAberta === c.id ? `
      <div id="detalhe-${c.id}" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <div class="loading-page" style="padding:20px 0">
          <div class="spinner"></div><span>Carregando detalhe…</span>
        </div>
      </div>` : ''}
    </div>
  `).join('');

  // Carregar detalhe se houver sessão aberta
  if (state.sessaoAberta) {
    carregarDetalhe(container, state.sessaoAberta);
  }

  // Eventos de clique nos itens
  lista.querySelectorAll('.conf-item').forEach(el => {
    el.addEventListener('click', async (e) => {
      if (e.target.closest('button') || e.target.closest('a')) return;
      const id = el.dataset.id;
      state.sessaoAberta = state.sessaoAberta === id ? null : id;
      renderLista(container);
    });
    el.addEventListener('mouseenter', () => {
      if (state.sessaoAberta !== el.dataset.id)
        el.style.borderColor = 'var(--border-strong)';
    });
    el.addEventListener('mouseleave', () => {
      if (state.sessaoAberta !== el.dataset.id)
        el.style.borderColor = 'var(--border)';
    });
  });
}

async function carregarDetalhe(container, sessaoId) {
  const { data, error } = await supabase
    .from('vw_detalhe_conferencia')
    .select('*')
    .eq('sessao_id', sessaoId)
    .order('nome_simplificado');

  const el = container.querySelector(`#detalhe-${sessaoId}`);
  if (!el) return;

  if (error || !data?.length) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:13px">Nenhum item encontrado.</p>`;
    return;
  }

  const comDiff   = data.filter(i => i.qtd_diferenca !== 0);
  const semDiff   = data.filter(i => i.qtd_diferenca === 0);

  el.innerHTML = `
    <div style="margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--text-muted)">
        <strong style="color:var(--text-primary)">${data.length}</strong> itens conferidos
      </span>
      ${comDiff.length > 0 ? `<span style="font-size:12px;color:var(--warning)"><strong>${comDiff.length}</strong> com diferença</span>` : ''}
      ${semDiff.length > 0 ? `<span style="font-size:12px;color:var(--text-muted)"><strong>${semDiff.length}</strong> sem diferença</span>` : ''}
    </div>

    <div class="table-wrap">
      <table style="font-size:12px">
        <thead>
          <tr>
            <th>Produto</th>
            <th style="text-align:center">Anterior</th>
            <th style="text-align:center">Contado</th>
            <th style="text-align:center">Diferença</th>
            <th>Motivo</th>
            <th>NF</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => {
            const diff      = item.qtd_diferenca ?? 0;
            const diffColor = diff > 0 ? 'color:var(--danger)' : diff < 0 ? 'color:var(--accent)' : 'color:var(--text-muted)';
            const diffTxt   = diff > 0 ? `−${diff}` : diff < 0 ? `+${Math.abs(diff)}` : '=';
            return `
              <tr style="${diff !== 0 ? '' : 'opacity:.6'}">
                <td style="font-weight:500">${esc(item.nome_simplificado)}</td>
                <td style="text-align:center">${item.qtd_anterior}</td>
                <td style="text-align:center">${item.qtd_contada}</td>
                <td style="text-align:center;font-weight:600;${diffColor}">${diffTxt}</td>
                <td style="color:var(--text-muted)">${labelMotivo(item.motivo)}</td>
                <td>
                  ${item.pendencia_id
                    ? `<span class="badge ${item.pendencia_status==='emitida'?'badge-success':'badge-danger'}" style="font-size:10px">
                        ${item.pendencia_status === 'emitida' ? 'Emitida' : 'Pendente'}
                       </span>`
                    : '<span style="color:var(--text-muted)">—</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-secondary btn-sm" id="btn-exp-det-csv">
        <i class="ti ti-file-type-csv"></i> Exportar CSV
      </button>
      <button class="btn btn-secondary btn-sm" id="btn-exp-det-excel">
        <i class="ti ti-file-spreadsheet"></i> Exportar Excel
      </button>
    </div>
  `;

  const colsDet = [
    { campo: 'nome_simplificado', titulo: 'Produto' },
    { campo: 'qtd_anterior',      titulo: 'Qtd. anterior' },
    { campo: 'qtd_contada',       titulo: 'Qtd. contada' },
    { campo: 'qtd_diferenca',     titulo: 'Diferença' },
    { campo: 'motivo',            titulo: 'Motivo', fmt: labelMotivo },
    { campo: 'pendencia_status',  titulo: 'NF' },
  ];

  el.querySelector('#btn-exp-det-csv')?.addEventListener('click', () =>
    exportarCSV(data, colsDet, `conferencia_${sessaoId.slice(0,8)}`));
  el.querySelector('#btn-exp-det-excel')?.addEventListener('click', () =>
    exportarExcel(data, colsDet, `conferencia_${sessaoId.slice(0,8)}`));
}

function bindEventos(container) {
  container.querySelector('#filtro-loc').addEventListener('change', async (e) => {
    state.filtro_loc   = e.target.value;
    state.pagina       = 0;
    state.sessaoAberta = null;
    await carregar();
    renderLista(container);
  });

  container.querySelector('#btn-prev').addEventListener('click', async () => {
    if (state.pagina > 0) {
      state.pagina--;
      state.sessaoAberta = null;
      await carregar();
      renderLista(container);
    }
  });

  container.querySelector('#btn-next').addEventListener('click', async () => {
    const fim = (state.pagina + 1) * 20;
    if (fim < state.total) {
      state.pagina++;
      state.sessaoAberta = null;
      await carregar();
      renderLista(container);
    }
  });

  container.querySelector('#btn-csv').addEventListener('click', () =>
    exportarCSV(state.conferencias, COLUNAS_HISTORICO, 'historico_conferencias'));

  container.querySelector('#btn-excel').addEventListener('click', () =>
    exportarExcel(state.conferencias, COLUNAS_HISTORICO, 'historico_conferencias'));
}

function labelMotivo(motivo) {
  const map = {
    venda: 'Venda', quebra: 'Quebra', ajuste: 'Ajuste',
    devolucao: 'Devolução', sem_diferenca: '—',
  };
  return map[motivo] || motivo || '—';
}

function esc(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;');
}
