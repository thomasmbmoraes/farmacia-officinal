// ================================================================
// pages/pendencias.js — Pendências de nota fiscal
// ================================================================

import { supabase }      from '../config/supabase.js';
import { toast }         from '../components/toast.js';
import { confirmar }     from '../components/modal.js';
import { formatarDataHora, formatarData } from '../utils/formatos.js';
import { exportarCSV, exportarExcel, COLUNAS_PENDENCIAS } from '../utils/exportar.js';

let state = {
  pendencias:  [],
  historico:   [],
  aba:         'ativas',   // 'ativas' | 'historico'
  selecionadas: new Set(),
};

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;
  await carregarDados();
  renderTela(container);
}

async function carregarDados() {
  const [{ data: ativas }, { data: hist }] = await Promise.all([
    supabase
      .from('vw_pendencias_ativas')
      .select('*')
      .order('criado_em', { ascending: false }),
    supabase
      .from('pendencias_nf')
      .select(`
        id, qtd_total, qtd_emitida, status, criado_em, atualizado_em,
        produto:produto_id ( nome_simplificado, apresentacao, dosagem ),
        sessao:sessao_id ( iniciado_em, finalizado_em, localizacao:localizacao_id ( nome ) )
      `)
      .eq('status', 'emitida')
      .order('atualizado_em', { ascending: false })
      .limit(50),
  ]);

  state.pendencias = ativas || [];
  state.historico  = hist   || [];
}

function renderTela(container) {
  const nAtivas = state.pendencias.length;
  const nHist   = state.historico.length;

  container.innerHTML = `
    <!-- Abas -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:2px;background:var(--surface-2);border-radius:var(--radius);padding:3px">
        <button class="btn-aba ${state.aba==='ativas'?'aba-ativa':''}" data-aba="ativas" style="
          padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;
          background:${state.aba==='ativas'?'var(--surface)':'transparent'};
          color:${state.aba==='ativas'?'var(--text-primary)':'var(--text-muted)'};
          box-shadow:${state.aba==='ativas'?'var(--shadow-sm)':'none'};
        ">
          Pendentes
          ${nAtivas > 0 ? `<span style="background:var(--danger);color:#fff;border-radius:20px;padding:1px 7px;font-size:10px;margin-left:4px">${nAtivas}</span>` : ''}
        </button>
        <button class="btn-aba ${state.aba==='historico'?'aba-ativa':''}" data-aba="historico" style="
          padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;border:none;
          background:${state.aba==='historico'?'var(--surface)':'transparent'};
          color:${state.aba==='historico'?'var(--text-primary)':'var(--text-muted)'};
          box-shadow:${state.aba==='historico'?'var(--shadow-sm)':'none'};
        ">
          Emitidas
          <span style="background:var(--surface-2);color:var(--text-muted);border-radius:20px;padding:1px 7px;font-size:10px;margin-left:4px">${nHist}</span>
        </button>
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" id="btn-csv"><i class="ti ti-file-type-csv"></i> CSV</button>
        <button class="btn btn-secondary btn-sm" id="btn-excel"><i class="ti ti-file-spreadsheet"></i> Excel</button>
        ${state.aba === 'ativas' && nAtivas > 0 ? `
        <button class="btn btn-primary" id="btn-emitir-sel" style="display:none">
          <i class="ti ti-check"></i> Marcar selecionadas como emitidas
        </button>` : ''}
      </div>
    </div>

    <!-- Conteúdo -->
    <div id="conteudo-aba"></div>
  `;

  // Abas
  container.querySelectorAll('.btn-aba').forEach(btn => {
    btn.addEventListener('click', () => {
      state.aba = btn.dataset.aba;
      state.selecionadas.clear();
      renderTela(container);
    });
  });

  // Exportação
  container.querySelector('#btn-csv').addEventListener('click', () => {
    const dados = state.aba === 'ativas' ? state.pendencias : state.historico;
    exportarCSV(dados, COLUNAS_PENDENCIAS, 'pendencias');
  });
  container.querySelector('#btn-excel').addEventListener('click', () => {
    const dados = state.aba === 'ativas' ? state.pendencias : state.historico;
    exportarExcel(dados, COLUNAS_PENDENCIAS, 'pendencias');
  });

  if (state.aba === 'ativas') renderAtivas(container);
  else                        renderHistorico(container);
}

// ── Aba pendentes ─────────────────────────────────────────────
function renderAtivas(container) {
  const area = container.querySelector('#conteudo-aba');

  if (!state.pendencias.length) {
    area.innerHTML = `
      <div class="empty" style="margin-top:60px">
        <i class="ti ti-circle-check" style="color:var(--accent)"></i>
        <p>Nenhuma nota pendente!</p>
        <span>Todas as vendas da última conferência já foram registradas.</span>
      </div>
    `;
    return;
  }

  // Agrupar por conferência (data_conferencia)
  const grupos = {};
  state.pendencias.forEach(p => {
    const chave = p.data_conferencia || 'sem_data';
    if (!grupos[chave]) grupos[chave] = { data: p.data_conferencia, localizacao: p.localizacao_nome, itens: [] };
    grupos[chave].itens.push(p);
  });

  area.innerHTML = `
    ${Object.values(grupos).map(grupo => `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <i class="ti ti-clipboard-check" style="color:var(--text-muted)"></i>
          <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">
            Conferência de ${esc(grupo.localizacao)} — ${formatarDataHora(grupo.data)}
          </span>
          <span style="font-size:12px;color:var(--text-muted)">(${grupo.itens.length} item${grupo.itens.length !== 1 ? 's' : ''})</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:32px">
                  <input type="checkbox" class="check-grupo" data-grupo="${grupo.data}" style="cursor:pointer" />
                </th>
                <th>Produto</th>
                <th style="text-align:center">Qtd vendida</th>
                <th style="text-align:center">Qtd emitida</th>
                <th style="text-align:center">Pendente</th>
                <th>Status</th>
                <th style="width:140px"></th>
              </tr>
            </thead>
            <tbody>
              ${grupo.itens.map(p => `
                <tr data-id="${p.id}">
                  <td><input type="checkbox" class="check-item" data-id="${p.id}" ${state.selecionadas.has(p.id)?'checked':''} style="cursor:pointer" /></td>
                  <td>
                    <div style="font-weight:500">${esc(p.nome_simplificado)}</div>
                    ${p.apresentacao ? `<div style="font-size:11px;color:var(--text-muted)">${esc(p.apresentacao)}${p.dosagem ? ' · ' + esc(p.dosagem) : ''}</div>` : ''}
                  </td>
                  <td style="text-align:center;font-weight:600">${p.qtd_total}</td>
                  <td style="text-align:center;color:var(--text-muted)">${p.qtd_emitida}</td>
                  <td style="text-align:center;font-weight:600;color:var(--danger)">${p.qtd_pendente}</td>
                  <td>${badgeStatus(p.status)}</td>
                  <td>
                    <div style="display:flex;gap:6px;justify-content:flex-end">
                      <button class="btn btn-primary btn-sm btn-emitir-um" data-id="${p.id}" data-qtd="${p.qtd_pendente}">
                        <i class="ti ti-check"></i> Emitir
                      </button>
                      <button class="btn btn-secondary btn-sm btn-parcial" data-id="${p.id}" data-qtd-total="${p.qtd_total}" data-qtd-emitida="${p.qtd_emitida}" data-nome="${esc(p.nome_simplificado)}">
                        Parcial
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;

  bindAtivasEventos(container);
}

function bindAtivasEventos(container) {
  const btnEmitirSel = container.querySelector('#btn-emitir-sel');

  // Checkboxes individuais
  container.querySelectorAll('.check-item').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.selecionadas.add(cb.dataset.id);
      else            state.selecionadas.delete(cb.dataset.id);
      atualizarBtnSelecionadas(container);
    });
  });

  // Check grupo
  container.querySelectorAll('.check-grupo').forEach(cb => {
    cb.addEventListener('change', () => {
      const grupo = cb.dataset.grupo;
      container.querySelectorAll(`.check-item`).forEach(item => {
        const tr = item.closest('tr');
        // verificar se pertence ao grupo pela localização da conferência
        item.checked = cb.checked;
        if (cb.checked) state.selecionadas.add(item.dataset.id);
        else            state.selecionadas.delete(item.dataset.id);
      });
      atualizarBtnSelecionadas(container);
    });
  });

  // Emitir um
  container.querySelectorAll('.btn-emitir-um').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmar('Marcar como emitida?', `Quantidade: ${btn.dataset.qtd} unidade${btn.dataset.qtd > 1 ? 's' : ''}.`, 'Confirmar');
      if (!ok) return;
      await emitirPendencia(btn.dataset.id, parseFloat(btn.dataset.qtd));
    });
  });

  // Emissão parcial
  container.querySelectorAll('.btn-parcial').forEach(btn => {
    btn.addEventListener('click', () =>
      abrirModalParcial(container, btn.dataset.id, btn.dataset.nome, parseFloat(btn.dataset.qtdTotal), parseFloat(btn.dataset.qtdEmitida))
    );
  });

  // Emitir selecionadas
  if (btnEmitirSel) {
    btnEmitirSel.addEventListener('click', async () => {
      const ids = [...state.selecionadas];
      if (!ids.length) return;
      const ok = await confirmar(
        `Emitir ${ids.length} nota${ids.length > 1 ? 's' : ''}?`,
        'Todas as pendências selecionadas serão marcadas como emitidas.',
        'Confirmar'
      );
      if (!ok) return;
      await emitirVarias(ids);
    });
  }
}

function atualizarBtnSelecionadas(container) {
  const n   = state.selecionadas.size;
  let btn   = container.querySelector('#btn-emitir-sel');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-emitir-sel';
    btn.className = 'btn btn-primary';
    container.querySelector('div[style*="display:flex"][style*="gap:8px"]')?.appendChild(btn);
  }
  if (n > 0) {
    btn.style.display = 'inline-flex';
    btn.innerHTML = `<i class="ti ti-check"></i> Emitir ${n} selecionada${n > 1 ? 's' : ''}`;
    btn.onclick = async () => {
      const ok = await confirmar(`Emitir ${n} nota${n>1?'s':''}?`, 'Todas serão marcadas como emitidas.', 'Confirmar');
      if (!ok) return;
      await emitirVarias([...state.selecionadas]);
    };
  } else {
    btn.style.display = 'none';
  }
}

// ── Emitir pendência(s) ───────────────────────────────────────
async function emitirPendencia(id, qtdEmitir) {
  try {
    const pend = state.pendencias.find(p => p.id === id);
    if (!pend) return;

    const novaQtdEmitida = (pend.qtd_emitida || 0) + qtdEmitir;
    const novoStatus     = novaQtdEmitida >= pend.qtd_total ? 'emitida' : 'parcialmente_emitida';

    const { error } = await supabase
      .from('pendencias_nf')
      .update({ qtd_emitida: novaQtdEmitida, status: novoStatus })
      .eq('id', id);

    if (error) throw error;
    toast.sucesso('Nota marcada como emitida.');
    state.selecionadas.delete(id);
    await carregarDados();
    renderTela(state._container);
  } catch (err) {
    toast.erro('Erro: ' + err.message);
  }
}

async function emitirVarias(ids) {
  try {
    const updates = ids.map(id => {
      const p = state.pendencias.find(x => x.id === id);
      if (!p) return null;
      return supabase.from('pendencias_nf')
        .update({ qtd_emitida: p.qtd_total, status: 'emitida' })
        .eq('id', id);
    }).filter(Boolean);

    await Promise.all(updates);
    toast.sucesso(`${ids.length} nota${ids.length > 1 ? 's' : ''} marcada${ids.length > 1 ? 's' : ''} como emitida${ids.length > 1 ? 's' : ''}.`);
    state.selecionadas.clear();
    await carregarDados();
    renderTela(state._container);
  } catch (err) {
    toast.erro('Erro: ' + err.message);
  }
}

// ── Modal emissão parcial ─────────────────────────────────────
function abrirModalParcial(container, id, nome, qtdTotal, qtdEmitida) {
  const pendente = qtdTotal - qtdEmitida;
  const overlay  = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">Emissão parcial</span>
        <button class="btn btn-ghost btn-icon btn-sm" id="mp-f"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <div style="background:var(--surface-2);border-radius:var(--radius);padding:12px">
          <div style="font-weight:500;margin-bottom:4px">${nome}</div>
          <div style="font-size:13px;color:var(--text-muted)">
            Total vendido: <strong>${qtdTotal}</strong> ·
            Já emitido: <strong>${qtdEmitida}</strong> ·
            Pendente: <strong style="color:var(--danger)">${pendente}</strong>
          </div>
        </div>
        <div class="field">
          <label>Quantidade a emitir agora *</label>
          <input id="mp-qtd" type="number" class="input input-lg" value="${pendente}" min="1" max="${pendente}" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mp-c">Cancelar</button>
        <button class="btn btn-primary"   id="mp-s"><i class="ti ti-check"></i> Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const fechar = () => overlay.remove();
  overlay.querySelector('#mp-f').onclick = fechar;
  overlay.querySelector('#mp-c').onclick = fechar;
  overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
  overlay.querySelector('#mp-qtd').focus();

  overlay.querySelector('#mp-s').addEventListener('click', async () => {
    const qtd = parseFloat(overlay.querySelector('#mp-qtd').value);
    if (!qtd || qtd <= 0 || qtd > pendente) { toast.aviso(`Quantidade deve ser entre 1 e ${pendente}.`); return; }
    fechar();
    await emitirPendencia(id, qtd);
  });
}

// ── Aba histórico ─────────────────────────────────────────────
function renderHistorico(container) {
  const area = container.querySelector('#conteudo-aba');

  if (!state.historico.length) {
    area.innerHTML = `
      <div class="empty" style="margin-top:60px">
        <i class="ti ti-history"></i>
        <p>Nenhuma nota emitida ainda.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Localização</th>
            <th style="text-align:center">Qtd.</th>
            <th>Conferência</th>
            <th>Emitida em</th>
          </tr>
        </thead>
        <tbody>
          ${state.historico.map(p => `
            <tr>
              <td>
                <div style="font-weight:500">${esc(p.produto?.nome_simplificado || '—')}</div>
                ${p.produto?.apresentacao ? `<div style="font-size:11px;color:var(--text-muted)">${esc(p.produto.apresentacao)}</div>` : ''}
              </td>
              <td class="td-muted">${esc(p.sessao?.localizacao?.nome || '—')}</td>
              <td style="text-align:center;font-weight:500">${p.qtd_total}</td>
              <td class="td-muted">${p.sessao?.finalizado_em ? formatarDataHora(p.sessao.finalizado_em) : '—'}</td>
              <td class="td-muted">${formatarDataHora(p.atualizado_em)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────
function badgeStatus(status) {
  if (status === 'pendente')             return `<span class="badge badge-danger">Pendente</span>`;
  if (status === 'parcialmente_emitida') return `<span class="badge badge-warning">Parcial</span>`;
  if (status === 'emitida')             return `<span class="badge badge-success">Emitida</span>`;
  return '—';
}

function esc(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}
