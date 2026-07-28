// ================================================================
// pages/dashboard.js — Dashboard com indicadores reais
// ================================================================

import { supabase }     from '../config/supabase.js';
import { formatarMoeda, formatarDataHora } from '../utils/formatos.js';

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;

  try {
    const { data, error } = await supabase.rpc('fn_dashboard_indicadores');
    if (error) throw error;
    renderDashboard(container, data);
  } catch (err) {
    container.innerHTML = `
      <div class="empty">
        <i class="ti ti-alert-triangle"></i>
        <p>Erro ao carregar dashboard.</p>
        <span>${err.message}</span>
      </div>
    `;
  }
}

function renderDashboard(container, d) {
  const uc = d.ultima_conferencia;
  const movs = d.movimentacoes_recentes || [];

  container.innerHTML = `
    <div style="max-width:1100px">

      <!-- Alertas -->
      ${d.vencidos > 0 ? `
      <div style="background:var(--danger-soft);border:1px solid var(--danger);border-radius:var(--radius);padding:10px 16px;display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="location.hash='validade'">
        <i class="ti ti-alert-triangle" style="color:var(--danger);font-size:18px"></i>
        <span style="font-size:13px;color:var(--danger-text);font-weight:500">${d.vencidos} produto${d.vencidos>1?'s':''} vencido${d.vencidos>1?'s':''} no estoque — requer atenção imediata</span>
        <span style="margin-left:auto;font-size:12px;color:var(--danger);text-decoration:underline">Ver agora →</span>
      </div>` : ''}

      ${d.pendencias_nf > 0 ? `
      <div style="background:var(--warning-soft);border:1px solid var(--warning);border-radius:var(--radius);padding:10px 16px;display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="location.hash='pendencias'">
        <i class="ti ti-file-invoice" style="color:var(--warning);font-size:18px"></i>
        <span style="font-size:13px;color:var(--warning-text);font-weight:500">${d.pendencias_nf} pendência${d.pendencias_nf>1?'s':''} de nota fiscal em aberto</span>
        <span style="margin-left:auto;font-size:12px;color:var(--warning);text-decoration:underline">Ver agora →</span>
      </div>` : ''}

      ${d.sem_estoque > 0 ? `
      <div style="background:var(--surface-2);border:1px solid var(--border-strong);border-radius:var(--radius);padding:10px 16px;display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="location.hash='estoque'">
        <i class="ti ti-package-off" style="color:var(--text-muted);font-size:18px"></i>
        <span style="font-size:13px;color:var(--text-secondary);font-weight:500">${d.sem_estoque} produto${d.sem_estoque>1?'s':''} com estoque zerado</span>
        <span style="margin-left:auto;font-size:12px;color:var(--text-muted);text-decoration:underline">Ver agora →</span>
      </div>` : ''}

      <div style="height:8px"></div>

      <!-- Estoque -->
      <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Estoque</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
        ${card('Total de produtos', d.total_produtos, 'ti-packages', '', '#estoque')}
        ${card('Valor em estoque', formatarMoeda(d.valor_estoque), 'ti-coin', 'success', '')}
        ${card('Abaixo do mínimo', d.abaixo_minimo, 'ti-trending-down', d.abaixo_minimo>0?'warning':'', '#estoque')}
        ${card('Sem estoque', d.sem_estoque, 'ti-package-off', d.sem_estoque>0?'danger':'', '#estoque')}
      </div>

      <!-- Validade -->
      <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Validade</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
        ${card('Vencidos', d.vencidos, 'ti-calendar-x', d.vencidos>0?'danger':'', '#validade')}
        ${card('Vencem em 30 dias', d.vencendo_30, 'ti-clock', d.vencendo_30>0?'warning':'', '#validade')}
        ${card('Vencem em 60 dias', d.vencendo_60, 'ti-clock', d.vencendo_60>0?'warning':'', '#validade')}
        ${card('Vencem em 90 dias', d.vencendo_90, 'ti-clock', '', '#validade')}
      </div>

      <!-- Conferência + Movimentações -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">

        <!-- Última conferência -->
        <div class="card">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px">Última conferência</div>
          ${uc ? `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${infoRow('Localização', uc.localizacao)}
              ${infoRow('Finalizada em', formatarDataHora(uc.finalizado_em))}
              ${infoRow('Produtos conferidos', uc.total_itens)}
              ${infoRow('Com diferença', uc.total_com_diferenca)}
            </div>
            <a href="#conferencia" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;color:var(--accent);text-decoration:none;font-weight:500">
              <i class="ti ti-clipboard-check"></i> Nova conferência
            </a>
          ` : `
            <div class="empty" style="padding:20px 0">
              <i class="ti ti-clipboard"></i>
              <span>Nenhuma conferência realizada ainda.</span>
            </div>
            <a href="#conferencia" style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;color:var(--accent);text-decoration:none;font-weight:500">
              <i class="ti ti-clipboard-check"></i> Iniciar primeira conferência
            </a>
          `}
        </div>

        <!-- Notas pendentes -->
        <div class="card">
          <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:14px">Notas fiscais</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${infoRow('Pendentes', `<span style="color:${d.pendencias_nf>0?'var(--danger)':'var(--text-primary)'};font-weight:600">${d.pendencias_nf}</span>`)}
            ${infoRow('Parcialmente emitidas', d.parcialmente_emitidas)}
          </div>
          ${d.pendencias_nf > 0 ? `
          <a href="#pendencias" style="display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-size:13px;color:var(--danger);text-decoration:none;font-weight:500">
            <i class="ti ti-file-invoice"></i> Ver pendências
          </a>` : `
          <div style="margin-top:16px;font-size:13px;color:var(--accent)">
            <i class="ti ti-circle-check"></i> Tudo em dia!
          </div>`}
        </div>
      </div>

      <!-- Movimentações recentes -->
      <div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Movimentações recentes</div>
      <div class="table-wrap">
        ${movs.length ? `
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th style="text-align:center">Qtd.</th>
              <th>Data/hora</th>
            </tr>
          </thead>
          <tbody>
            ${movs.map(m => `
              <tr>
                <td style="font-weight:500">${esc(m.nome_simplificado)}</td>
                <td>${badgeTipo(m.tipo, m.sinal)}</td>
                <td class="td-muted" style="font-size:12px">${labelOrigem(m.origem)}</td>
                <td style="text-align:center;font-weight:600;${m.sinal>0?'color:var(--accent)':'color:var(--danger)'}">
                  ${m.sinal > 0 ? '+' : '−'}${m.quantidade}
                </td>
                <td class="td-muted">${formatarDataHora(m.ocorrido_em)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : `
        <div class="empty" style="padding:40px 0">
          <i class="ti ti-history"></i>
          <span>Nenhuma movimentação ainda.</span>
        </div>`}
      </div>

    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────
function card(titulo, valor, icon, tipo, href) {
  const colors = {
    danger:  'border-left:3px solid var(--danger)',
    warning: 'border-left:3px solid var(--warning)',
    success: 'border-left:3px solid var(--accent)',
    '':      '',
  };
  const valColors = {
    danger:  'color:var(--danger)',
    warning: 'color:var(--warning)',
    success: 'color:var(--accent)',
    '':      'color:var(--text-primary)',
  };
  const el = href ? `a href="${href}"` : 'div';
  const elEnd = href ? 'a' : 'div';
  return `
    <${el} style="
      display:block;background:var(--surface);border:1px solid var(--border);
      border-radius:var(--radius-lg);padding:16px;
      ${colors[tipo] || ''};
      ${href ? 'cursor:pointer;text-decoration:none;transition:border-color .12s' : ''}
    " ${href ? `onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'"` : ''}>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <i class="ti ${icon}" style="color:var(--text-muted);font-size:16px"></i>
        <span style="font-size:12px;color:var(--text-muted)">${titulo}</span>
      </div>
      <div style="font-size:28px;font-weight:600;line-height:1;${valColors[tipo] || ''}">${valor ?? 0}</div>
    </${elEnd}>
  `;
}

function infoRow(label, valor) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text-muted)">${label}</span>
      <span style="font-size:13px;font-weight:500;color:var(--text-primary)">${valor ?? '—'}</span>
    </div>
  `;
}

function badgeTipo(tipo, sinal) {
  const map = {
    entrada:     { cls: 'badge-success', label: 'Entrada' },
    venda:       { cls: 'badge-danger',  label: 'Venda' },
    quebra:      { cls: 'badge-warning', label: 'Quebra' },
    ajuste:      { cls: 'badge-neutral', label: 'Ajuste' },
    devolucao:   { cls: 'badge-info',    label: 'Devolução' },
    conferencia: { cls: 'badge-neutral', label: 'Conferência' },
  };
  const { cls, label } = map[tipo] || { cls: 'badge-neutral', label: tipo };
  return `<span class="badge ${cls}">${label}</span>`;
}

function labelOrigem(origem) {
  const map = {
    conferencia:   'Conferência',
    importacao:    'Importação',
    ajuste_manual: 'Ajuste manual',
    cadastro:      'Cadastro',
    nf:            'Nota fiscal',
    edicao:        'Edição',
    sistema:       'Sistema',
  };
  return map[origem] || origem;
}

function esc(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;');
}
