import { showToast } from '../../core/ui/index.js';
import { bloquearSeConvidado } from '../../core/auth/guestGate.js';
import { getPreferenciaTema, definirTema } from '../../core/state/themeStore.js';

type TemaPreferencia = Parameters<typeof definirTema>[0];

export function initConfig(): void {
    const btnSalvar = document.getElementById('config-salvar');
    if (!btnSalvar) return;

    initTemaToggle();

    document.querySelectorAll<HTMLElement>('.config-switch').forEach((switchEl) => {
        switchEl.addEventListener('click', () => {
            const ativo = switchEl.classList.toggle('active');
            switchEl.setAttribute('aria-checked', String(ativo));
            const label = switchEl.querySelector<HTMLElement>('.config-switch-label');
            if (label) label.textContent = ativo ? 'Ativado' : 'Desativado';
        });
    });

    btnSalvar.addEventListener('click', () => {
        if (bloquearSeConvidado()) return;
        showToast('Configurações salvas com sucesso', 'success');
    });
}

function initTemaToggle(): void {
    const grupo = document.getElementById('config-tema-group');
    if (!grupo) return;

    const botoes = grupo.querySelectorAll<HTMLElement>('.config-toggle-btn');
    const marcarAtivo = (tema: TemaPreferencia): void =>
        botoes.forEach((btn) => btn.classList.toggle('active', btn.dataset.tema === tema));

    marcarAtivo(getPreferenciaTema());

    botoes.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tema = btn.dataset.tema as TemaPreferencia;
            definirTema(tema);
            marcarAtivo(tema);
        });
    });
}