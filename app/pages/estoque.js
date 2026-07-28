// ================================================================
// pages/estoque.js — Tela de estoque completa
// ================================================================

import { buscarProdutos, obterProduto, criarProduto, editarProduto,
         ajustarEstoque, desativarProduto, duplicarProduto,
         carregarDominio } from '../services/produto.service.js';
import { toast }           from '../components/toast.js';
import { confirmar }       from '../components/modal.js';
import { badgeValidade, badgeEstoque, formatarMoeda } from '../utils/formatos.js';
import { exportarCSV, exportarExcel, COLUNAS_ESTOQUE } from '../utils/exportar.js';

// ── Estado ────────────────────────────────────────────────────
let state = {
  termo: '', localizacao_id: '', categoria_id: '',
  status_validade: '', status_estoque: '',
  pagina: 0, total: 0,
  produtos: [],
  dominio: { localizacoes: [], categorias: [], marcas: [] },
  carregando: false,
};

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;
  state.dominio = await carregarDominio();
  state.pagina  = 0;
  state.termo = '';
  renderTela(container);
  await carregar(container);
}

function renderTela(container) {
  container.innerHTML = `
    <div class="page-toolbar">
      <div class="search-wrap" style="flex:1;max-width:360px">
        <i class="ti ti-search"></i>
        <input id="busca-input" class="input" placeholder="Buscar produto… (Ctrl+K)" autocomplete="off" />
      </div>
      <select id="filtro-loc" class="input" style="width:180px">
        <option value="">Todas localizações</option>
        ${state.dominio.localizacoes.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')}
      </select>
      <select id="filtro-cat" class="input" style="width:160px">
        <option value="">Todas categorias</option>
        ${state.dominio.categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
      </select>
      <select id="filtro-val" class="input" style="width:150px">
        <option value="">Validade: todas</option>
        <option value="vencido">Vencidos</option>
        <option value="vencendo_30">Vence em 30d</option>
        <option value="vencendo_60">Vence em 60d</option>
        <option value="vencendo_90">Vence em 90d</option>
      </select>
      <select id="filtro-est" class="input" style="width:150px">
        <option value="">Estoque: todos</option>
        <option value="sem_estoque">Sem estoque</option>
        <option value="abaixo_minimo">Abaixo mínimo</option>
      </select>
      <div style="display:flex;gap:6px;margin-left:auto">
        <button class="btn btn-secondary btn-sm" id="btn-csv" title="Exportar CSV"><i class="ti ti-file-type-csv"></i></button>
        <button class="btn btn-secondary btn-sm" id="btn-excel" title="Exportar Excel"><i class="ti ti-file-spreadsheet"></i></button>
        <button class="btn btn-primary" id="btn-novo"><i class="ti ti-plus"></i> Novo produto</button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Localização</th>
            <th style="text-align:center">Qtd.</th>
            <th>Validade</th>
            <th>Preço venda</th>
            <th style="width:80px"></th>
          </tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
      <div id="estado-vazio" style="display:none">
        <div class="empty">
          <i class="ti ti-package-off"></i>
          <p>Nenhum produto encontrado.</p>
          <span>Ajuste os filtros ou <a href="#importacao" style="color:var(--accent)">importe produtos</a>.</span>
        </div>
      </div>
      <div id="paginacao" class="pagination" style="display:none">
        <span id="pag-info" style="font-size:12px;color:var(--text-muted)"></span>
        <div class="pagination-btns">
          <button class="btn btn-secondary btn-sm" id="btn-prev"><i class="ti ti-chevron-left"></i></button>
          <button class="btn btn-secondary btn-sm" id="btn-next"><i class="ti ti-chevron-right"></i></button>
        </div>
      </div>
    </div>
  `;
  bindEventos(container);
}

function bindEventos(container) {
  let debounce;
  container.querySelector('#busca-input').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.termo = e.target.value; state.pagina = 0; carregar(container); }, 300);
  });

  ['filtro-loc','filtro-cat','filtro-val','filtro-est'].forEach(id => {
    container.querySelector('#' + id).addEventListener('change', (e) => {
      const mapa = { 'filtro-loc':'localizacao_id','filtro-cat':'categoria_id','filtro-val':'status_validade','filtro-est':'status_estoque' };
      state[mapa[id]] = e.target.value;
      state.pagina = 0;
      carregar(container);
    });
  });

  container.querySelector('#btn-novo').addEventListener('click', () => abrirModal(container, null));
  container.querySelector('#btn-csv').addEventListener('click', () => exportarCSV(state.produtos, COLUNAS_ESTOQUE, 'estoque'));
  container.querySelector('#btn-excel').addEventListener('click', () => exportarExcel(state.produtos, COLUNAS_ESTOQUE, 'estoque'));
  container.querySelector('#btn-prev').addEventListener('click', () => { if (state.pagina > 0) { state.pagina--; carregar(container); } });
  container.querySelector('#btn-next').addEventListener('click', () => { if ((state.pagina+1)*50 < state.total) { state.pagina++; carregar(container); } });
}

async function carregar(container) {
  if (state.carregando) return;
  state.carregando = true;
  const tbody = container.querySelector('#tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)"><div style="display:flex;align-items:center;justify-content:center;gap:8px"><div class="spinner"></div> Carregando…</div></td></tr>`;

  try {
    const { produtos, total } = await buscarProdutos(state.termo, {
      localizacao_id:  state.localizacao_id  || undefined,
      categoria_id:    state.categoria_id    || undefined,
      status_validade: state.status_validade || undefined,
      status_estoque:  state.status_estoque  || undefined,
      pagina: state.pagina, por_pagina: 50,
    });
    state.produtos = produtos;
    state.total    = total;
    renderTabela(container, produtos, total);
  } catch (err) {
    toast.erro('Erro ao carregar: ' + err.message);
  } finally {
    state.carregando = false;
  }
}

function renderTabela(container, produtos, total) {
  const tbody   = container.querySelector('#tbody');
  const vazio   = container.querySelector('#estado-vazio');
  const pag     = container.querySelector('#paginacao');
  const pagInfo = container.querySelector('#pag-info');

  if (!produtos.length) {
    tbody.innerHTML = '';
    vazio.style.display = 'block';
    pag.style.display   = 'none';
    return;
  }

  vazio.style.display = 'none';
  pag.style.display   = 'flex';
  const ini = state.pagina * 50 + 1;
  const fim = Math.min(ini + produtos.length - 1, total);
  pagInfo.textContent = `${ini}–${fim} de ${total} produto${total !== 1 ? 's' : ''}`;
  container.querySelector('#btn-prev').disabled = state.pagina === 0;
  container.querySelector('#btn-next').disabled = fim >= total;

  tbody.innerHTML = produtos.map(p => `
    <tr data-id="${p.id}" style="cursor:pointer">
      <td>
        <div style="font-weight:500;line-height:1.3">${esc(p.nome_simplificado)}</div>
        ${p.marca_nome ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${esc(p.marca_nome)}</div>` : ''}
      </td>
      <td class="td-muted">${esc(p.categoria_nome) || '—'}</td>
      <td class="td-muted">${esc(p.localizacao_nome) || '—'}</td>
      <td style="text-align:center">
        <span style="font-weight:600;font-size:15px">${p.qtd_atual ?? 0}</span>
        ${badgeEstoque(p.status_estoque)}
      </td>
      <td>${badgeValidade(p.status_validade, p.dias_para_vencer)}</td>
      <td class="td-muted">${p.preco_venda ? formatarMoeda(p.preco_venda) : '—'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-icon btn-sm btn-editar" data-id="${p.id}" title="Editar"><i class="ti ti-pencil" style="pointer-events:none"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm btn-mais"   data-id="${p.id}" title="Mais"><i class="ti ti-dots-vertical" style="pointer-events:none"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', (e) => { if (!e.target.closest('button')) abrirModal(container, tr.dataset.id); });
  });
  tbody.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); abrirModal(container, btn.dataset.id); });
  });
  tbody.querySelectorAll('.btn-mais').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); abrirMenuOpcoes(container, btn.dataset.id, btn); });
  });
}

function abrirMenuOpcoes(container, id, anchor) {
  document.querySelector('.menu-flutuante')?.remove();
  const menu = document.createElement('div');
  menu.className = 'menu-flutuante';
  menu.style.cssText = 'position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-md);z-index:300;min-width:160px;padding:4px';
  menu.innerHTML = `
    <button class="mi" data-acao="ajustar"><i class="ti ti-adjustments"></i> Ajustar estoque</button>
    <button class="mi" data-acao="duplicar"><i class="ti ti-copy"></i> Duplicar</button>
    <div style="height:1px;background:var(--border);margin:4px 0"></div>
    <button class="mi" data-acao="desativar" style="color:var(--danger)"><i class="ti ti-trash"></i> Desativar</button>
  `;
  const rect = anchor.getBoundingClientRect();
  menu.style.top   = rect.bottom + 4 + 'px';
  menu.style.right = window.innerWidth - rect.right + 'px';
  menu.querySelectorAll('.mi').forEach(b => {
    b.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border-radius:var(--radius-sm);font-size:13px;cursor:pointer;background:none;border:none;color:inherit;text-align:left';
    b.addEventListener('mouseenter', () => b.style.background = 'var(--surface-2)');
    b.addEventListener('mouseleave', () => b.style.background = 'none');
  });
  document.body.appendChild(menu);
  menu.addEventListener('click', async (e) => {
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    menu.remove();
    if (acao === 'ajustar')  abrirAjusteEstoque(container, id);
    if (acao === 'duplicar') executarDuplicar(container, id);
    if (acao === 'desativar') executarDesativar(container, id);
  });
  setTimeout(() => document.addEventListener('click', function f(e) {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', f); }
  }), 0);
}

async function abrirModal(container, id) {
  let produto = null;
  if (id) { try { produto = await obterProduto(id); } catch { toast.erro('Produto não encontrado.'); return; } }
  const { localizacoes, categorias, marcas } = state.dominio;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:640px;max-height:90vh;overflow-y:auto">
      <div class="modal-header" style="position:sticky;top:0;background:var(--surface);z-index:1;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:4px">
        <span class="modal-title">${produto ? 'Editar produto' : 'Novo produto'}</span>
        <button class="btn btn-ghost btn-icon btn-sm" id="m-fechar"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <div class="field">
          <label>Nome simplificado *</label>
          <input id="f-nome" class="input" value="${esc(produto?.nome_simplificado)}" placeholder="Ex: Berberina 60 Cápsulas 500mg" />
        </div>
        <div class="grid-2">
          <div class="field"><label>Apresentação</label><input id="f-apre" class="input" value="${esc(produto?.apresentacao)}" placeholder="Cápsulas, Gotas…" /></div>
          <div class="field"><label>Dosagem</label><input id="f-dos" class="input" value="${esc(produto?.dosagem)}" placeholder="500mg, 10ml…" /></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Qtd. por embalagem</label><input id="f-qemb" type="number" class="input" value="${produto?.qtd_por_embalagem ?? ''}" placeholder="60" /></div>
          <div class="field"><label>Unidade</label><select id="f-un" class="input">${['un','cx','fr','pote','sach','ml','g'].map(u=>`<option value="${u}" ${(produto?.unidade||'un')===u?'selected':''}>${u}</option>`).join('')}</select></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Categoria</label><select id="f-cat" class="input"><option value="">— selecione —</option>${categorias.map(c=>`<option value="${c.id}" ${produto?.categoria_id===c.id?'selected':''}>${c.nome}</option>`).join('')}</select></div>
          <div class="field"><label>Localização</label><select id="f-loc" class="input"><option value="">— selecione —</option>${localizacoes.map(l=>`<option value="${l.id}" ${produto?.localizacao_id===l.id?'selected':''}>${l.nome}</option>`).join('')}</select></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Marca</label><select id="f-marca" class="input"><option value="">— selecione —</option>${marcas.map(m=>`<option value="${m.id}" ${produto?.marca_id===m.id?'selected':''}>${m.nome}</option>`).join('')}</select></div>
          <div class="field"><label>Código de barras</label><input id="f-barras" class="input" value="${esc(produto?.codigo_barras)}" placeholder="EAN-13…" /></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Preço de custo</label><input id="f-custo" type="number" step="0.01" class="input" value="${produto?.preco_custo??''}" placeholder="0,00" /></div>
          <div class="field"><label>Preço de venda</label><input id="f-venda" type="number" step="0.01" class="input" value="${produto?.preco_venda??''}" placeholder="0,00" /></div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Validade</label><input id="f-val" type="date" class="input" value="${produto?.validade??''}" /></div>
          <div class="field"><label>Qtd. mínima</label><input id="f-qmin" type="number" class="input" value="${produto?.qtd_minima??''}" placeholder="0" /></div>
        </div>
        ${!produto ? `<div class="field"><label>Estoque inicial</label><input id="f-qini" type="number" class="input" value="0" min="0" /><span class="field-hint">Quantidade atual ao cadastrar</span></div>` : ''}
        <div class="field"><label>Observações</label><textarea id="f-obs" class="input" style="height:70px;resize:vertical">${esc(produto?.observacoes)}</textarea></div>
      </div>
      <div class="modal-footer" style="position:sticky;bottom:0;background:var(--surface);padding-top:12px;border-top:1px solid var(--border);margin-top:4px">
        <button class="btn btn-secondary" id="m-cancelar">Cancelar</button>
        <button class="btn btn-primary" id="m-salvar"><i class="ti ti-check"></i> ${produto ? 'Salvar' : 'Cadastrar'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#f-nome').focus();
  const fechar = () => overlay.remove();
  overlay.querySelector('#m-fechar').onclick = fechar;
  overlay.querySelector('#m-cancelar').onclick = fechar;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });

  overlay.querySelector('#m-salvar').addEventListener('click', async () => {
    const nome = overlay.querySelector('#f-nome').value.trim();
    if (!nome) { toast.aviso('Nome é obrigatório.'); return; }
    const btn = overlay.querySelector('#m-salvar');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div>';
    const dados = {
      nome_simplificado: nome,
      apresentacao:      overlay.querySelector('#f-apre').value || null,
      dosagem:           overlay.querySelector('#f-dos').value  || null,
      qtd_por_embalagem: parseFloat(overlay.querySelector('#f-qemb').value)  || null,
      unidade:           overlay.querySelector('#f-un').value   || 'un',
      categoria_id:      overlay.querySelector('#f-cat').value  || null,
      localizacao_id:    overlay.querySelector('#f-loc').value  || null,
      marca_id:          overlay.querySelector('#f-marca').value || null,
      codigo_barras:     overlay.querySelector('#f-barras').value || null,
      preco_custo:       parseFloat(overlay.querySelector('#f-custo').value) || null,
      preco_venda:       parseFloat(overlay.querySelector('#f-venda').value) || null,
      validade:          overlay.querySelector('#f-val').value  || null,
      qtd_minima:        parseFloat(overlay.querySelector('#f-qmin').value)  || 0,
      observacoes:       overlay.querySelector('#f-obs').value  || null,
    };
    try {
      if (produto) {
        await editarProduto(produto.id, dados);
        toast.sucesso('Produto atualizado.');
      } else {
        const qini = parseFloat(overlay.querySelector('#f-qini').value) || 0;
        await criarProduto({ ...dados, qtd_inicial: qini });
        toast.sucesso('Produto cadastrado.');
      }
      fechar(); state.pagina = 0; await carregar(container);
    } catch (err) {
      toast.erro('Erro: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = `<i class="ti ti-check"></i> ${produto ? 'Salvar' : 'Cadastrar'}`;
    }
  });
}

async function abrirAjusteEstoque(container, id) {
  let produto;
  try { produto = await obterProduto(id); } catch { toast.erro('Produto não encontrado.'); return; }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header"><span class="modal-title">Ajustar estoque</span><button class="btn btn-ghost btn-icon btn-sm" id="aj-f"><i class="ti ti-x"></i></button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <div style="background:var(--surface-2);border-radius:var(--radius);padding:12px">
          <div style="font-weight:500">${esc(produto.nome_simplificado)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Qtd. atual: <strong>${produto.qtd_atual}</strong></div>
        </div>
        <div class="field"><label>Nova quantidade *</label><input id="aj-q" type="number" class="input input-lg" value="${produto.qtd_atual}" min="0" /></div>
        <div class="field"><label>Motivo</label><input id="aj-o" class="input" placeholder="Ex: Reposição, correção…" /></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="aj-c">Cancelar</button>
        <button class="btn btn-primary" id="aj-s"><i class="ti ti-check"></i> Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const q = overlay.querySelector('#aj-q'); q.focus(); q.select();
  const fechar = () => overlay.remove();
  overlay.querySelector('#aj-f').onclick = fechar;
  overlay.querySelector('#aj-c').onclick = fechar;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
  overlay.querySelector('#aj-s').addEventListener('click', async () => {
    const nq = parseFloat(overlay.querySelector('#aj-q').value);
    if (isNaN(nq) || nq < 0) { toast.aviso('Informe uma quantidade válida.'); return; }
    const btn = overlay.querySelector('#aj-s'); btn.disabled = true;
    try {
      await ajustarEstoque(produto.id, nq, overlay.querySelector('#aj-o').value);
      toast.sucesso(`Estoque ajustado para ${nq}.`);
      fechar(); await carregar(container);
    } catch (err) { toast.erro('Erro: ' + err.message); btn.disabled = false; }
  });
}

async function executarDuplicar(container, id) {
  const ok = await confirmar('Duplicar produto?', 'Uma cópia será criada com estoque zerado.');
  if (!ok) return;
  try { await duplicarProduto(id); toast.sucesso('Produto duplicado.'); await carregar(container); }
  catch (err) { toast.erro('Erro: ' + err.message); }
}

async function executarDesativar(container, id) {
  const ok = await confirmar('Desativar produto?', 'O produto será ocultado. O histórico é preservado.', 'Desativar', true);
  if (!ok) return;
  try { await desativarProduto(id); toast.sucesso('Produto desativado.'); await carregar(container); }
  catch (err) { toast.erro('Erro: ' + err.message); }
}

function esc(str) {
  return (str || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
}
