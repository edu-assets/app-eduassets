import { showToast } from '../../core/ui/index.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { getPreferenciaTema, definirTema } from '../../core/state/themeStore.js';

export function initConfig() {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    initTemaToggle();

    document.querySelectorAll('.config-switch').forEach((switchEl) => {
        switchEl.addEventListener('click', () => {
            const ativo = switchEl.classList.toggle('active');
            switchEl.setAttribute('aria-checked', String(ativo));
            switchEl.querySelector('.config-switch-label').textContent = ativo ? 'Ativado' : 'Desativado';
        });
    });

    btnSalvar.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        showToast('Configurações salvas com sucesso', 'success');
    });
}

function initTemaToggle() {
    const grupo = document.getElementById('config-tema-group');
    if (!grupo) return;

    const botoes = grupo.querySelectorAll('.config-toggle-btn');
    const marcarAtivo = (tema) => botoes.forEach((btn) => btn.classList.toggle('active', btn.dataset.tema === tema));

    marcarAtivo(getPreferenciaTema());

    botoes.forEach((btn) => {
        btn.addEventListener('click', () => {
            definirTema(btn.dataset.tema);
            marcarAtivo(btn.dataset.tema);
        });
    });
}