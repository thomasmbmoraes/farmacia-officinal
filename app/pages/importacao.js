// ================================================================
// pages/importacao.js — Importação de produtos via lista de texto
// ================================================================

import { supabase }                              from '../config/supabase.js';
import { parsearTexto, resolverIds, importarProdutos } from '../services/importacao.service.js';
import { toast }                                 from '../components/toast.js';

// Estado local da tela
let localizacoes  = [];
let categorias    = [];
let itensParsados = [];
let localizacaoSelecionada = null;

export async function render(container) {
  container.innerHTML = `<div class="loading-page"><div class="spinner"></div><span>Carregando…</span></div>`;

  // Carregar dados de domínio
  const [{ data: locs }, { data: cats }] = await Promise.all([
    supabase.from('localizacoes').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('categorias').select('id, nome').eq('ativo', true).order('nome'),
  ]);

  localizacoes = locs || [];
  categorias   = cats || [];

  renderTela(container);
}

function renderTela(container) {
  container.innerHTML = `
    <div style="max-width:900px">

      <!-- Cabeçalho -->
      <div style="margin-bottom:24px">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">Importar produtos</h2>
        <p style="color:var(--text-muted);font-size:13px">
          Cole sua lista de produtos no formato <code style="background:var(--surface-2);padding:1px 6px;border-radius:4px;font-size:12px">Nome do produto - quantidade</code>
        </p>
      </div>

      <!-- Etapa 1: Colar lista -->
      <div id="etapa-1">
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">1</div>
            <span style="font-weight:600;font-size:14px">Selecione a localização</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px" id="grid-localizacoes">
            ${localizacoes.map(l => `
              <button
                class="btn-loc"
                data-id="${l.id}"
                data-nome="${l.nome}"
                style="
                  padding:10px 14px;border-radius:var(--radius);border:1px solid var(--border);
                  background:var(--surface);color:var(--text-primary);font-size:13px;
                  cursor:pointer;text-align:left;transition:all .12s;
                "
              >
                <i class="ti ti-map-pin" style="color:var(--text-muted);margin-right:6px"></i>${l.nome}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <div style="width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">2</div>
            <span style="font-weight:600;font-size:14px">Cole sua lista de produtos</span>
          </div>
          <textarea
            id="txt-lista"
            placeholder="Vitamina C + Zinco 500mg - 3
Magnésio Quelado 300mg - 2
Berberina 500mg 60cps - 1
Óleo de Coco 200ml - 5"
            style="
              width:100%;height:200px;padding:12px;
              background:var(--surface-2);border:1px solid var(--border);
              border-radius:var(--radius);resize:vertical;
              font-size:13px;color:var(--text-primary);
              font-family:var(--font-mono);line-height:1.6;outline:none;
            "
          ></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <span style="font-size:12px;color:var(--text-muted)">Um produto por linha. Formato: <strong>Nome - quantidade</strong></span>
            <button class="btn btn-primary" id="btn-parsear">
              <i class="ti ti-wand"></i> Analisar lista
            </button>
          </div>
        </div>
      </div>

      <!-- Etapa 2: Revisão (oculta até parsear) -->
      <div id="etapa-2" style="display:none">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">3</div>
              <span style="font-weight:600;font-size:14px">Revise e confirme</span>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary" id="btn-voltar">
                <i class="ti ti-arrow-left"></i> Voltar
              </button>
              <button class="btn btn-primary" id="btn-importar">
                <i class="ti ti-download"></i> Importar produtos
              </button>
            </div>
          </div>

          <!-- Resumo -->
          <div id="resumo-importacao" style="
            display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;
          "></div>

          <!-- Tabela de revisão -->
          <div class="table-wrap">
            <table id="tabela-revisao">
              <thead>
                <tr>
                  <th style="width:32px"><input type="checkbox" id="check-todos" checked style="cursor:pointer"></th>
                  <th>Nome do produto</th>
                  <th>Dosagem</th>
                  <th>Apresentação</th>
                  <th>Categoria</th>
                  <th>Qtd</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody id="tbody-revisao"></tbody>
            </table>
          </div>

          <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
            <i class="ti ti-alert-circle" style="color:var(--warning)"></i>
            Campos em <span style="background:var(--warning-soft);color:var(--warning-text);padding:1px 6px;border-radius:4px;font-size:11px">amarelo</span> não foram identificados automaticamente — revise antes de importar.
          </p>
        </div>
      </div>

    </div>
  `;

  bindEventos(container);
}

function bindEventos(container) {
  // Seleção de localização
  container.querySelectorAll('.btn-loc').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-loc').forEach(b => {
        b.style.borderColor  = 'var(--border)';
        b.style.background   = 'var(--surface)';
        b.style.color        = 'var(--text-primary)';
      });
      btn.style.borderColor = 'var(--accent)';
      btn.style.background  = 'var(--accent-soft)';
      btn.style.color       = 'var(--accent-text)';
      localizacaoSelecionada = btn.dataset.id;
    });
  });

  // Analisar lista
  container.querySelector('#btn-parsear').addEventListener('click', async () => {
    if (!localizacaoSelecionada) {
      toast.aviso('Selecione uma localização primeiro.');
      return;
    }
    const texto = container.querySelector('#txt-lista').value.trim();
    if (!texto) {
      toast.aviso('Cole sua lista de produtos antes de continuar.');
      return;
    }
    await parsearEMostrar(container, texto);
  });

  // Voltar
  container.querySelector('#btn-voltar')?.addEventListener('click', () => {
    container.querySelector('#etapa-1').style.display = 'block';
    container.querySelector('#etapa-2').style.display = 'none';
  });
}

async function parsearEMostrar(container, texto) {
  const btn = container.querySelector('#btn-parsear');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Analisando…';

  try {
    const itens = parsearTexto(texto);
    itensParsados = await resolverIds(itens);

    container.querySelector('#etapa-1').style.display = 'none';
    container.querySelector('#etapa-2').style.display = 'block';

    renderRevisao(container);

    // Bind do botão importar (aparece depois de renderizar etapa 2)
    container.querySelector('#btn-importar').addEventListener('click', () => executarImportacao(container));
    container.querySelector('#btn-voltar').addEventListener('click', () => {
      container.querySelector('#etapa-1').style.display = 'block';
      container.querySelector('#etapa-2').style.display = 'none';
    });

  } catch (err) {
    toast.erro('Erro ao analisar a lista: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-wand"></i> Analisar lista';
  }
}

function renderRevisao(container) {
  const total        = itensParsados.length;
  const comCategoria = itensParsados.filter(i => i.categoria_id).length;
  const semCategoria = total - comCategoria;

  // Resumo
  container.querySelector('#resumo-importacao').innerHTML = `
    <div style="background:var(--accent-soft);color:var(--accent-text);padding:8px 14px;border-radius:var(--radius);font-size:13px;font-weight:500">
      <i class="ti ti-package"></i> ${total} produto${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}
    </div>
    ${comCategoria > 0 ? `
    <div style="background:var(--info-soft);color:var(--info-text);padding:8px 14px;border-radius:var(--radius);font-size:13px">
      <i class="ti ti-check"></i> ${comCategoria} com categoria identificada
    </div>` : ''}
    ${semCategoria > 0 ? `
    <div style="background:var(--warning-soft);color:var(--warning-text);padding:8px 14px;border-radius:var(--radius);font-size:13px">
      <i class="ti ti-alert-triangle"></i> ${semCategoria} sem categoria — revise
    </div>` : ''}
  `;

  // Tabela
  const tbody = container.querySelector('#tbody-revisao');
  tbody.innerHTML = itensParsados.map((item, idx) => `
    <tr data-idx="${idx}">
      <td><input type="checkbox" class="check-item" data-idx="${idx}" checked style="cursor:pointer"></td>
      <td>
        <input
          class="input item-nome"
          data-idx="${idx}"
          data-campo="nome_simplificado"
          value="${escapar(item.nome_simplificado)}"
          style="min-width:200px"
        />
      </td>
      <td>
        <input
          class="input item-campo ${!item.dosagem ? 'campo-revisar' : ''}"
          data-idx="${idx}"
          data-campo="dosagem"
          value="${escapar(item.dosagem)}"
          placeholder="ex: 500mg"
          style="width:90px;${!item.dosagem ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}"
        />
      </td>
      <td>
        <input
          class="input item-campo ${!item.apresentacao ? 'campo-revisar' : ''}"
          data-idx="${idx}"
          data-campo="apresentacao"
          value="${escapar(item.apresentacao)}"
          placeholder="ex: Cápsulas"
          style="width:110px;${!item.apresentacao ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}"
        />
      </td>
      <td>
        <select
          class="input item-campo"
          data-idx="${idx}"
          data-campo="categoria_id"
          style="width:150px;${!item.categoria_id ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}"
        >
          <option value="">— selecione —</option>
          ${categorias.map(c => `
            <option value="${c.id}" ${item.categoria_id === c.id ? 'selected' : ''}>${c.nome}</option>
          `).join('')}
        </select>
      </td>
      <td>
        <input
          type="number"
          class="input item-campo ${item.qtd_atual === 0 ? 'campo-revisar' : ''}"
          data-idx="${idx}"
          data-campo="qtd_atual"
          value="${item.qtd_atual}"
          min="0"
          style="width:70px;${item.qtd_atual === 0 ? 'border-color:var(--warning);background:var(--warning-soft)' : ''}"
        />
      </td>
      <td>
        <button class="btn btn-ghost btn-icon btn-sm btn-remover" data-idx="${idx}" title="Remover">
          <i class="ti ti-trash" style="color:var(--danger)"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Eventos da tabela
  tbody.addEventListener('input', (e) => {
    const campo = e.target.dataset.campo;
    const idx   = parseInt(e.target.dataset.idx);
    if (campo && !isNaN(idx)) {
      itensParsados[idx][campo] = campo === 'qtd_atual'
        ? parseFloat(e.target.value) || 0
        : e.target.value;
      // Remover destaque amarelo ao preencher
      if (e.target.value) {
        e.target.style.borderColor = '';
        e.target.style.background  = '';
      }
    }
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remover');
    if (btn) {
      const idx = parseInt(btn.dataset.idx);
      itensParsados.splice(idx, 1);
      renderRevisao(container);
    }
  });

  // Check todos
  container.querySelector('#check-todos').addEventListener('change', (e) => {
    container.querySelectorAll('.check-item').forEach(c => c.checked = e.target.checked);
  });
}

async function executarImportacao(container) {
  // Coletar apenas os itens marcados
  const marcados = [];
  container.querySelectorAll('.check-item').forEach(cb => {
    if (cb.checked) {
      const idx = parseInt(cb.dataset.idx);
      marcados.push(itensParsados[idx]);
    }
  });

  if (marcados.length === 0) {
    toast.aviso('Selecione pelo menos um produto para importar.');
    return;
  }

  const btn = container.querySelector('#btn-importar');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px"></div> Importando…';

  try {
    const resultado = await importarProdutos(marcados, localizacaoSelecionada);

    toast.sucesso(`${resultado.criados} produto${resultado.criados !== 1 ? 's' : ''} importado${resultado.criados !== 1 ? 's' : ''} com sucesso!`);

    // Mostrar tela de sucesso
    container.innerHTML = `
      <div style="max-width:500px;margin:60px auto;text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px">
          <i class="ti ti-circle-check"></i>
        </div>
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Importação concluída!</h2>
        <p style="color:var(--text-muted);font-size:14px;margin-bottom:24px">
          <strong>${resultado.criados} produto${resultado.criados !== 1 ? 's' : ''}</strong> adicionado${resultado.criados !== 1 ? 's' : ''} ao estoque com sucesso.
        </p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="#estoque" class="btn btn-primary">
            <i class="ti ti-packages"></i> Ver estoque
          </a>
          <button class="btn btn-secondary" id="btn-nova-importacao">
            <i class="ti ti-plus"></i> Nova importação
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-nova-importacao')?.addEventListener('click', () => render(container));

  } catch (err) {
    toast.erro('Erro na importação: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-download"></i> Importar produtos';
  }
}

function escapar(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
