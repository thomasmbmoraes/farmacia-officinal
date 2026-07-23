// ================================================================
// components/toast.js — Notificações de feedback
// Uso: toast.sucesso('Produto salvo') | toast.erro('Falhou')
// ================================================================

const container = document.getElementById('toast-container');

function show(msg, tipo = 'success', duracao = 3500) {
  const icons = { success: 'ti-check', error: 'ti-x', warning: 'ti-alert-triangle' };
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.innerHTML = `<i class="ti ${icons[tipo] ?? 'ti-info-circle'}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s';
    setTimeout(() => el.remove(), 200);
  }, duracao);
}

export const toast = {
  sucesso: (msg) => show(msg, 'success'),
  erro:    (msg) => show(msg, 'error', 5000),
  aviso:   (msg) => show(msg, 'warning'),
};
