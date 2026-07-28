// ================================================================
// pages/conferencia.js — Fluxo completo de conferência
// ================================================================

import { supabase }       from '../config/supabase.js';
import { toast }          from '../components/toast.js';
import { confirmar }      from '../components/modal.js';
import { badgeValidade }  from '../utils/formatos.js';

let state = {
  localizacoes: [],
  rascunho:     null,
};

const RASCUNHO_KEY = 'conf_rascunho';

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;

  const { data: locs } = await supabase
    .from('localizacoes').select('id, nome').eq('ativo', true).order('nome');

  state.localizacoes = locs || [];

  const rascunho = lerRascunho();
  if (rascunho) {
    state.rascunho = rascunho;
    const ok = await confirmar(
      'Conferência em andamento',
      `Há uma conferência pausada em "${rascunho.localizacao_nome}". Deseja continuar?`,
      'Continuar'
    );
    if (ok) { renderConferencia(container); return; }
    limparRascunho();
    state.rascunho = null;
  }

  renderSelecaoLocalizacao(container);
}

function renderSelecaoLocalizacao(container) {
  container.innerHTML = `
    <div style="max-width:700px">
      <div style="margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Conferência de estoque</h2>
        <p style="color:var(--text-muted);font-size:13px">Selecione a localização para iniciar.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${state.localizacoes.map(l => `
          <button class="btn-loc" data-id="${l.id}" data-nome="${l.nome}" style="
            text-align:left;cursor:pointer;padding:18px 20px;
            border:1px solid var(--border);border-radius:var(--radius-lg);
            background:var(--surface);transition:all .12s;
          ">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:36px;height:36px;border-radius:var(--radius);background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                <i class="ti ti-map-pin"></i>
              </div>
              <div style="font-weight:500;font-size:14px">${l.nome}</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-loc').forEach(btn => {
    btn.addEventListener('mouseenter', () => { btn.style.borderColor='var(--accent)'; btn.style.background='var(--accent-soft)'; });
    btn.addEventListener('mouseleave', () => { btn.style.borderColor='var(--border)'; btn.style.background='var(--surface)'; });
    btn.addEventListener('click', () => iniciarConferencia(container, btn.dataset.id, btn.dataset.nome));
  });
}

async function iniciarConferencia(container, localizacaoId, localizacaoNome) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando produtos…</span></div>`;

  const { data: produtos, error } = await supabase
    .from('vw_produtos')
    .select('id, nome_simplificado, dosagem, qtd_atual, validade, status_validade, dias_para_vencer, prateleira')
    .eq('localizacao_id', localizacaoId)
    .eq('ativo', true)
    .order('nome_simplificado');

  if (error) { toast.erro('Erro ao carregar produtos.'); return; }
  if (!produtos?.length) {
    toast.aviso('Nenhum produto nesta localização.');
    renderSelecaoLocalizacao(container);
    return;
  }

  state.rascunho = {
    localizacao_id:   localizacaoId,
    localizacao_nome: localizacaoNome,
    iniciado_em:      new Date().toISOString(),
    itens: produtos.map(p => ({
      produto_id:       p.id,
      nome:             p.nome_simplificado,
      dosagem:          p.dosagem,
      prateleira:       p.prateleira,
      qtd_anterior:     p.qtd_atual,
      qtd_contada:      null,
      motivo:           'venda',
      observacoes:      '',
      validade:         p.validade,
      status_validade:  p.status_validade,
      dias_para_vencer: p.dias_para_vencer,
      conferido:        false,
    })),
  };

  salvarRascunho(state.rascunho);
  renderConferencia(container);
}

function renderConferencia(container) {
  const r          = state.rascunho;
  const conferidos = r.itens.filter(i => i.conferido).length;
  const total      = r.itens.length;
  const pct        = Math.round((conferidos / total) * 100);

  container.innerHTML = `
    <div style="max-width:900px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
          <h2 style="font-size:18px;font-weight:600">
            <i class="ti ti-map-pin" style="color:var(--accent)"></i> ${r.localizacao_nome}
          </h2>
          <p style="font-size:12px;color:var(--text-muted);margin-top:2px">
            Iniciada ${new Date(r.iniciado_em).toLocaleString('pt-BR')}
          </p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" id="btn-cancelar"><i class="ti ti-x"></i> Cancelar</button>
          <button class="btn btn-primary"   id="btn-finalizar"><i class="ti ti-clipboard-check"></i> Finalizar</button>
        </div>
      </div>

      <div style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;color:var(--text-secondary)">
            <strong id="conf-count">${conferidos}</strong> de <strong>${total}</strong> conferidos
          </span>
          <span id="conf-pct" style="font-size:13px;font-weight:500;color:var(--accent)">${pct}%</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden">
          <div id="conf-barra" style="height:100%;width:${pct}%;background:var(--accent);border-radius:99px;transition:width .3s"></div>
        </div>
      </div>

      <div class="hide-mobile" style="background:var(--surface-2);border-radius:var(--radius);padding:8px 14px;margin-bottom:16px;display:flex;gap:20px;font-size:12px;color:var(--text-muted)">
        <span><kbd style="background:var(--border);padding:1px 6px;border-radius:4px">Enter</kbd> próximo</span>
        <span><kbd style="background:var(--border);padding:1px 6px;border-radius:4px">Shift+Tab</kbd> anterior</span>
        <span><kbd style="background:var(--border);padding:1px 6px;border-radius:4px">Ctrl+Enter</kbd> finalizar</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:32px">#</th>
              <th>Produto</th>
              <th style="text-align:center;width:90px">Anterior</th>
              <th style="text-align:center;width:120px">Contado</th>
              <th style="text-align:center;width:90px">Dif.</th>
              <th style="width:100px">Validade</th>
              <th style="width:100px">Motivo</th>
            </tr>
          </thead>
          <tbody id="tbody-conf">
            ${r.itens.map((item, idx) => renderLinha(item, idx)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  bindConferenciaEventos(container);

  // Foco no primeiro vazio
  setTimeout(() => {
    const inputs = container.querySelectorAll('.input-conf');
    const vazio  = [...inputs].find(i => i.value === '');
    if (vazio) { vazio.focus(); vazio.select(); }
  }, 100);
}

function renderLinha(item, idx) {
  const diff      = item.qtd_contada !== null ? item.qtd_anterior - item.qtd_contada : null;
  const diffTxt   = diff === null ? '—' : diff > 0 ? `−${diff}` : diff < 0 ? `+${Math.abs(diff)}` : '=';
  const diffColor = diff === null ? '' : diff > 0 ? 'color:var(--danger)' : diff < 0 ? 'color:var(--accent)' : 'color:var(--text-muted)';
  const conferido = item.conferido;

  return `
    <tr data-idx="${idx}" style="${conferido ? 'opacity:.65' : ''}">
      <td style="color:var(--text-muted);font-size:12px">${idx + 1}</td>
      <td>
        <div style="font-weight:500;font-size:13px">${esc(item.nome)}</div>
        ${item.dosagem ? `<div style="font-size:11px;color:var(--text-muted)">${esc(item.dosagem)}</div>` : ''}
      </td>
      <td style="text-align:center;font-size:15px;font-weight:500">${item.qtd_anterior}</td>
      <td style="text-align:center">
        <input
          class="input input-conf" type="number" min="0" step="1" inputmode="decimal"
          data-idx="${idx}"
          value="${item.qtd_contada !== null ? item.qtd_contada : ''}"
          placeholder="—"
          style="width:80px;text-align:center;font-size:15px;font-weight:600;
                 ${conferido ? 'border-color:var(--accent);background:var(--accent-soft)' : ''}"
        />
      </td>
      <td id="diff-${idx}" style="text-align:center;font-weight:600;font-size:15px;${diffColor}">${diffTxt}</td>
      <td>${badgeValidade(item.status_validade, item.dias_para_vencer)}</td>
      <td>
        <select class="input sel-motivo" data-idx="${idx}"
          style="font-size:11px;padding:0 6px;height:28px;${diff === null || diff === 0 ? 'visibility:hidden' : ''}">
          <option value="venda"     ${item.motivo==='venda'     ?'selected':''}>Venda</option>
          <option value="quebra"    ${item.motivo==='quebra'    ?'selected':''}>Quebra</option>
          <option value="ajuste"    ${item.motivo==='ajuste'    ?'selected':''}>Ajuste</option>
          <option value="devolucao" ${item.motivo==='devolucao' ?'selected':''}>Devolução</option>
        </select>
      </td>
    </tr>
  `;
}

function bindConferenciaEventos(container) {
  container.querySelector('#btn-cancelar').addEventListener('click', async () => {
    const ok = await confirmar('Cancelar conferência?', 'O rascunho será descartado.', 'Cancelar', true);
    if (!ok) return;
    limparRascunho(); state.rascunho = null;
    renderSelecaoLocalizacao(container);
  });

  container.querySelector('#btn-finalizar').addEventListener('click', () => finalizarConferencia(container));

  // Ctrl+Enter finaliza
  const handler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      finalizarConferencia(container);
    }
  };
  document.addEventListener('keydown', handler);
  // Limpar listener ao navegar
  const obs = new MutationObserver(() => {
    if (!document.contains(container)) { document.removeEventListener('keydown', handler); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true });

  // Input quantidade
  container.addEventListener('input', (e) => {
    const input = e.target.closest('.input-conf');
    if (!input) return;
    const idx = parseInt(input.dataset.idx);
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) return;

    state.rascunho.itens[idx].qtd_contada = val;
    state.rascunho.itens[idx].conferido   = true;
    salvarRascunho(state.rascunho);

    // Atualizar diff em tempo real
    const diff      = state.rascunho.itens[idx].qtd_anterior - val;
    const diffEl    = container.querySelector(`#diff-${idx}`);
    const selMotivo = container.querySelector(`.sel-motivo[data-idx="${idx}"]`);
    const tr        = container.querySelector(`tr[data-idx="${idx}"]`);

    if (diffEl) {
      diffEl.textContent = diff > 0 ? `−${diff}` : diff < 0 ? `+${Math.abs(diff)}` : '=';
      diffEl.style.color = diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--accent)' : 'var(--text-muted)';
    }
    if (selMotivo) selMotivo.style.visibility = diff !== 0 ? 'visible' : 'hidden';
    if (tr) tr.style.opacity = '0.65';
    input.style.borderColor = 'var(--accent)';
    input.style.background  = 'var(--accent-soft)';

    // Barra de progresso
    const conferidos = state.rascunho.itens.filter(i => i.conferido).length;
    const pct        = Math.round((conferidos / state.rascunho.itens.length) * 100);
    const barra      = container.querySelector('#conf-barra');
    const count      = container.querySelector('#conf-count');
    const pctEl      = container.querySelector('#conf-pct');
    if (barra)  barra.style.width    = pct + '%';
    if (count)  count.textContent    = conferidos;
    if (pctEl)  pctEl.textContent    = pct + '%';
  });

  // Enter → próximo campo
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const input = e.target.closest('.input-conf');
    if (!input) return;
    e.preventDefault();
    const inputs  = [...container.querySelectorAll('.input-conf')];
    const proximo = inputs[inputs.indexOf(input) + 1];
    if (proximo) { proximo.focus(); proximo.select(); }
  });

  // Motivo
  container.addEventListener('change', (e) => {
    const sel = e.target.closest('.sel-motivo');
    if (!sel) return;
    state.rascunho.itens[parseInt(sel.dataset.idx)].motivo = sel.value;
    salvarRascunho(state.rascunho);
  });
}

async function finalizarConferencia(container) {
  const r          = state.rascunho;
  const conferidos = r.itens.filter(i => i.conferido);
  if (!conferidos.length) { toast.aviso('Confira pelo menos um produto.'); return; }

  const nConf = conferidos.length;
  const nIgn  = r.itens.length - nConf;
  const msg   = `${nConf} produto${nConf !== 1 ? 's' : ''} será${nConf !== 1 ? 'ão' : ''} atualizado${nConf !== 1 ? 's' : ''}.${nIgn > 0 ? ` ${nIgn} sem conferência serão ignorados.` : ''}`;

  const ok = await confirmar('Finalizar conferência?', msg, 'Finalizar');
  if (!ok) return;

  const btn = container.querySelector('#btn-finalizar');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Salvando…';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: sessao, error: e1 } = await supabase
      .from('sessoes_conferencia')
      .insert({ localizacao_id: r.localizacao_id, usuario_id: user?.id, status: 'em_andamento' })
      .select('id').single();
    if (e1) throw e1;

    const { error: e2 } = await supabase.from('itens_conferencia').insert(
      conferidos.map(i => ({
        sessao_id:    sessao.id,
        produto_id:   i.produto_id,
        qtd_anterior: i.qtd_anterior,
        qtd_contada:  i.qtd_contada,
        motivo:       i.qtd_anterior === i.qtd_contada ? 'sem_diferenca' : i.motivo,
        observacoes:  i.observacoes || null,
      }))
    );
    if (e2) { await supabase.from('sessoes_conferencia').update({ status:'cancelada' }).eq('id', sessao.id); throw e2; }

    const { error: e3 } = await supabase
      .from('sessoes_conferencia').update({ status: 'finalizada' }).eq('id', sessao.id);
    if (e3) throw e3;

    limparRascunho();
    state.rascunho = null;

    const comDiff    = conferidos.filter(i => i.qtd_anterior !== i.qtd_contada);
    const pendencias = comDiff.filter(i => i.motivo === 'venda' && i.qtd_anterior > i.qtd_contada).length;

    renderSucesso(container, { localizacao: r.localizacao_nome, conferidos: nConf, com_diferenca: comDiff.length, pendencias });
  } catch (err) {
    toast.erro('Erro ao finalizar: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-clipboard-check"></i> Finalizar';
  }
}

function renderSucesso(container, r) {
  container.innerHTML = `
    <div style="max-width:500px;margin:60px auto;text-align:center">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:36px;margin:0 auto 24px">
        <i class="ti ti-circle-check"></i>
      </div>
      <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Conferência finalizada!</h2>
      <p style="color:var(--text-muted);font-size:14px;margin-bottom:24px">${r.localizacao}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
        <div class="card card-sm" style="text-align:center">
          <div style="font-size:28px;font-weight:600;color:var(--accent)">${r.conferidos}</div>
          <div style="font-size:12px;color:var(--text-muted)">Conferidos</div>
        </div>
        <div class="card card-sm" style="text-align:center">
          <div style="font-size:28px;font-weight:600;${r.com_diferenca>0?'color:var(--warning)':'color:var(--text-muted)'}">${r.com_diferenca}</div>
          <div style="font-size:12px;color:var(--text-muted)">Com diferença</div>
        </div>
        <div class="card card-sm" style="text-align:center">
          <div style="font-size:28px;font-weight:600;${r.pendencias>0?'color:var(--danger)':'color:var(--text-muted)'}">${r.pendencias}</div>
          <div style="font-size:12px;color:var(--text-muted)">Notas pendentes</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-nova-conf"><i class="ti ti-plus"></i> Nova conferência</button>
        ${r.pendencias > 0 ? `<a href="#pendencias" class="btn btn-secondary"><i class="ti ti-file-invoice"></i> Ver pendências</a>` : ''}
        <a href="#estoque" class="btn btn-secondary"><i class="ti ti-packages"></i> Ver estoque</a>
      </div>
    </div>
  `;
  container.querySelector('#btn-nova-conf').addEventListener('click', () => render(container));
}

function salvarRascunho(r)  { try { localStorage.setItem(RASCUNHO_KEY, JSON.stringify(r)); } catch {} }
function lerRascunho()      { try { const s = localStorage.getItem(RASCUNHO_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function limparRascunho()   { try { localStorage.removeItem(RASCUNHO_KEY); } catch {} }
function esc(str)           { return (str||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
