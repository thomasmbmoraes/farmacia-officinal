// ================================================================
// utils/formatos.js — Formatadores reutilizáveis
// ================================================================

export function formatarMoeda(valor) {
  if (valor == null || valor === '') return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(valor);
}

export function formatarData(valor) {
  if (!valor) return '—';
  const d = new Date(valor + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function formatarDataHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('pt-BR');
}

export function formatarDuracao(segundos) {
  if (!segundos) return '—';
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return min > 0 ? `${min}min ${seg}s` : `${seg}s`;
}

// Badge de validade — retorna HTML do badge
export function badgeValidade(status, dias) {
  const cfg = {
    vencido:     { cls: 'badge-vencido', label: 'Vencido' },
    vencendo_30: { cls: 'badge-30',      label: dias != null ? `${dias}d` : 'Vencendo' },
    vencendo_60: { cls: 'badge-60',      label: dias != null ? `${dias}d` : 'Atenção' },
    vencendo_90: { cls: 'badge-90',      label: dias != null ? `${dias}d` : 'Atenção' },
    normal:      { cls: 'badge-normal',  label: 'OK' },
    sem_validade:{ cls: 'badge-sem',     label: '—' },
  };
  const { cls, label } = cfg[status] || cfg.sem_validade;
  return `<span class="badge ${cls}">${label}</span>`;
}

// Badge de estoque
export function badgeEstoque(status) {
  if (status === 'sem_estoque')   return `<span class="badge badge-danger">Zerado</span>`;
  if (status === 'abaixo_minimo') return `<span class="badge badge-warning">Baixo</span>`;
  return '';
}

// Tipo de movimentação legível
export function labelMovimentacao(tipo, origem) {
  const tipos = {
    entrada: 'Entrada', venda: 'Venda', quebra: 'Quebra',
    ajuste: 'Ajuste', devolucao: 'Devolução',
    conferencia: 'Conferência', transferencia: 'Transferência',
  };
  return tipos[tipo] || tipo;
}
