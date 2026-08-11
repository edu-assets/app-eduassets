import { sair, getUsuario } from '../state/authStore.js';
import { showToast, openModal } from '../ui/index.js';

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const EVENTOS_ATIVIDADE = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

let timer: ReturnType<typeof setTimeout> | null = null;

function expirarSessaoAdmin(): void {
    if (getUsuario()?.nivelAcesso !== 'ADMINISTRADOR') return;
    sair();
    showToast('Sessão expirada por inatividade. Faça login novamente.', 'warning');
    openModal('modal-login');
}

function registrarAtividade(): void {
    if (getUsuario()?.nivelAcesso !== 'ADMINISTRADOR') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(expirarSessaoAdmin, IDLE_LIMIT_MS);
}

export function initSessionTimeout(): void {
    EVENTOS_ATIVIDADE.forEach((evento) => document.addEventListener(evento, registrarAtividade, { passive: true }));
    
    window.addEventListener('eduassets:sessao-expirada', expirarSessaoAdmin);

    registrarAtividade();
}