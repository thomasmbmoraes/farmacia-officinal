// ================================================================
// components/modal.js — Modal de confirmação
// Uso: await confirmar('Desativar produto?', 'Esta ação não pode ser desfeita.')
// ================================================================

export function confirmar(titulo, descricao = '', textoBotao = 'Confirmar', perigo = false) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <span class="modal-title" id="modal-title">${titulo}</span>
          <button class="btn btn-ghost btn-icon btn-sm" id="modal-close" aria-label="Fechar">
            <i class="ti ti-x"></i>
          </button>
        </div>
        ${descricao ? `<div class="modal-body"><p style="color:var(--text-secondary);font-size:13px">${descricao}</p></div>` : ''}
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${textoBotao}</button>
        </div>
      </div>
    `;

    const close = (result) => { overlay.remove(); resolve(result); };

    overlay.querySelector('#modal-close').onclick   = () => close(false);
    overlay.querySelector('#modal-cancel').onclick  = () => close(false);
    overlay.querySelector('#modal-confirm').onclick = () => close(true);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    document.body.appendChild(overlay);
    overlay.querySelector('#modal-confirm').focus();
  });
}
