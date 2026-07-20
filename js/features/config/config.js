import { showToast } from '../../core/toast/toast.js';

export function initConfig() {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    const temaGroup = document.getElementById('config-tema-group');
    if (temaGroup) {
        temaGroup.querySelectorAll('.config-toggle-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                temaGroup.querySelectorAll('.config-toggle-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    document.querySelectorAll('.config-switch').forEach((switchEl) => {
        switchEl.addEventListener('click', () => {
            const ativo = switchEl.classList.toggle('active');
            switchEl.setAttribute('aria-checked', String(ativo));
            switchEl.querySelector('.config-switch-label').textContent = ativo ? 'Ativado' : 'Desativado';
        });
    });

    btnSalvar.addEventListener('click', () => {
        showToast('Configurações salvas com sucesso', 'success');
    });
}