// ================================================================
// utils/exportar.js — Exportação CSV e Excel
// Requer SheetJS carregado no index.html como XLSX global.
// ================================================================

export const COLUNAS_VALIDADE = [
  { campo: 'nome_simplificado', titulo: 'Produto' },
  { campo: 'apresentacao',      titulo: 'Apresentação' },
  { campo: 'dosagem',           titulo: 'Dosagem' },
  { campo: 'categoria_nome',    titulo: 'Categoria' },
  { campo: 'marca_nome',        titulo: 'Marca' },
  { campo: 'localizacao_nome',  titulo: 'Localização' },
  { campo: 'qtd_atual',         titulo: 'Qtd. atual' },
  { campo: 'validade',          titulo: 'Validade',      fmt: fmtData },
  { campo: 'dias_para_vencer',  titulo: 'Dias restantes' },
  { campo: 'status_validade',   titulo: 'Status' },
];

export const COLUNAS_PENDENCIAS = [
  { campo: 'criado_em',         titulo: 'Data conferência', fmt: fmtDataHora },
  { campo: 'nome_simplificado', titulo: 'Produto' },
  { campo: 'apresentacao',      titulo: 'Apresentação' },
  { campo: 'dosagem',           titulo: 'Dosagem' },
  { campo: 'localizacao_nome',  titulo: 'Localização' },
  { campo: 'qtd_total',         titulo: 'Qtd. vendida' },
  { campo: 'qtd_emitida',       titulo: 'Qtd. emitida' },
  { campo: 'qtd_pendente',      titulo: 'Qtd. pendente' },
  { campo: 'status',            titulo: 'Status' },
];

export const COLUNAS_ESTOQUE = [
  { campo: 'codigo_interno',    titulo: 'Código' },
  { campo: 'codigo_barras',     titulo: 'Cód. barras' },
  { campo: 'nome_simplificado', titulo: 'Nome' },
  { campo: 'apresentacao',      titulo: 'Apresentação' },
  { campo: 'dosagem',           titulo: 'Dosagem' },
  { campo: 'qtd_por_embalagem', titulo: 'Qtd/emb.' },
  { campo: 'unidade',           titulo: 'Unidade' },
  { campo: 'categoria_nome',    titulo: 'Categoria' },
  { campo: 'marca_nome',        titulo: 'Marca' },
  { campo: 'localizacao_nome',  titulo: 'Localização' },
  { campo: 'prateleira',        titulo: 'Prateleira' },
  { campo: 'qtd_atual',         titulo: 'Qtd. atual' },
  { campo: 'qtd_minima',        titulo: 'Qtd. mínima' },
  { campo: 'preco_custo',       titulo: 'Preço custo',  fmt: fmtMoeda },
  { campo: 'preco_venda',       titulo: 'Preço venda',  fmt: fmtMoeda },
  { campo: 'validade',          titulo: 'Validade',     fmt: fmtData },
  { campo: 'status_validade',   titulo: 'Status val.' },
  { campo: 'observacoes',       titulo: 'Obs.' },
];

export function exportarCSV(dados, colunas, nome = 'exportacao') {
  if (!dados?.length) { alert('Nenhum dado para exportar.'); return; }
  const cab   = colunas.map(c => `"${c.titulo}"`).join(';');
  const linhas = dados.map(row =>
    colunas.map(c => {
      const v = row[c.campo];
      const f = c.fmt ? c.fmt(v) : (v ?? '');
      return `"${String(f).replace(/"/g, '""')}"`;
    }).join(';')
  );
  const bom  = '\uFEFF';
  const blob = new Blob([bom + [cab, ...linhas].join('\n')], { type: 'text/csv;charset=utf-8;' });
  baixar(blob, `${nome}_${hoje()}.csv`);
}

export function exportarExcel(dados, colunas, nome = 'exportacao') {
  if (!dados?.length) { alert('Nenhum dado para exportar.'); return; }
  if (typeof XLSX === 'undefined') { exportarCSV(dados, colunas, nome); return; }
  const cab    = colunas.map(c => c.titulo);
  const linhas = dados.map(row =>
    colunas.map(c => {
      const v = row[c.campo];
      return c.fmt ? c.fmt(v) : (v ?? '');
    })
  );
  const ws = XLSX.utils.aoa_to_sheet([cab, ...linhas]);
  ws['!cols'] = colunas.map((c, i) => ({
    wch: Math.min(Math.max(c.titulo.length, ...linhas.map(l => String(l[i] ?? '').length)) + 2, 50)
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${nome}_${hoje()}.xlsx`);
}

function fmtDataHora(v) {
  if (!v) return '';
  return new Date(v).toLocaleString('pt-BR');
}
function fmtMoeda(v) {
  if (v == null) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtData(v) {
  if (!v) return '';
  return new Date(v + 'T12:00:00').toLocaleDateString('pt-BR');
}
function hoje() { return new Date().toISOString().split('T')[0]; }
function baixar(blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
