import { isAdmin } from '../../core/auth/permissions.js';
import { subscribe as subscribeAuth } from '../../core/state/authStore.js';
import { subscribe as subscribeI18n, t, traduzirErro } from '../../core/state/i18nStore.js';
import { showToast } from '../../core/ui/index.js';
import {
    EVENTO_ESTADO_PUSH,
    orientacaoDePermissao,
    registrarDesativacao,
    solicitarAtivacao
} from '../../core/notifications/pushActivation.js';
import { pushDisponivelNoServidor } from '../../core/api/notificacoes.js';
import type { PushPreferencias } from '../../core/api/notificacoes.js';
import { definirSomAtivo, desbloquearAudio, isSomAtivo, tocarAlerta } from '../../core/notifications/alertSound.js';
import {
    ERRO_PERMISSAO_SEM_RESPOSTA,
    atualizarPreferencias,
    desativar,
    enviarTeste,
    obterEstadoPush
} from '../../core/notifications/pushNotifications.js';
import type { EstadoPush } from '../../core/notifications/pushNotifications.js';
import { setButtonLoading } from '../../shared/dom/buttonLoading.js';

type ChavePreferencia = keyof PushPreferencias;

const SWITCHES_PUSH: ChavePreferencia[] = ['emprestimo', 'devolucao', 'ocorrencia'];

function definirSwitch(elemento: HTMLButtonElement, ativo: boolean, habilitado: boolean): void {
    elemento.classList.toggle('active', ativo);
    elemento.setAttribute('aria-checked', String(ativo));
    elemento.disabled = !habilitado;
    const rotulo = elemento.querySelector<HTMLElement>('.config-switch-label');
    if (rotulo) rotulo.textContent = t(ativo ? 'notif.ligado' : 'notif.desligado');
}

function definirRotuloBotao(botao: HTMLButtonElement, texto: string): void {
    const rotulo = botao.querySelector<HTMLElement>('.btn-label');
    if (rotulo) rotulo.textContent = texto;
}

/**
 * Wires the "Notificações" card of the settings panel. These controls apply immediately (not through
 * a save button) and are marked data-notif-switch so the generic .config-switch handler skips them.
 */
export function initNotificacoesConfig(): void {
    const card = document.getElementById('config-notif-card');
    const status = document.getElementById('config-notif-status');
    const ajuda = document.getElementById('config-notif-ajuda');
    const btnAtivar = document.getElementById('config-notif-ativar') as HTMLButtonElement | null;
    const btnTeste = document.getElementById('config-notif-teste') as HTMLButtonElement | null;
    const switchSom = document.getElementById('config-notif-som') as HTMLButtonElement | null;
    if (!card || !status || !ajuda || !btnAtivar || !btnTeste || !switchSom) return;

    const switchesPush = SWITCHES_PUSH.map((chave) => ({
        chave,
        elemento: document.getElementById(`config-notif-${chave}`) as HTMLButtonElement | null
    })).filter((item): item is { chave: ChavePreferencia; elemento: HTMLButtonElement } => item.elemento !== null);

    let renderizacao = 0;
    let ocupado = false;
    let estadoAtual: EstadoPush | null = null;
    let preferencias: PushPreferencias = { emprestimo: true, devolucao: true, ocorrencia: true };

    function mostrarStatus(chaveStatus: string, chaveAjuda: string | null): void {
        status!.textContent = t(chaveStatus);
        ajuda!.hidden = chaveAjuda === null;
        ajuda!.textContent = chaveAjuda ? t(chaveAjuda) : '';
    }

    function pintar(estado: EstadoPush, servidorDisponivel: boolean): void {
        estadoAtual = estado;
        preferencias = estado.preferencias;
        const ativo = estado.suporte === 'suportado' && estado.inscrito;
        const podeAtivar = estado.suporte === 'suportado' && !estado.inscrito && servidorDisponivel;

        switch (true) {
            case estado.suporte === 'ios_instalar':
                mostrarStatus('notif.status_ios', 'notif.ajuda_ios');
                break;
            case estado.suporte === 'nao_suportado':
                mostrarStatus('notif.status_nao_suportado', 'notif.ajuda_nao_suportado');
                break;
            case estado.suporte === 'bloqueado':
                mostrarStatus('notif.status_bloqueado', 'notif.ajuda_bloqueado');
                break;
            case ativo:
                mostrarStatus('notif.status_ativo', null);
                break;
            case !servidorDisponivel:
                mostrarStatus('notif.status_servidor', null);
                break;
            default:
                // After an Activate click the browser showed no prompt: keep the guidance visible next to the status.
                mostrarStatus(
                    'notif.status_inativo',
                    orientacaoDePermissao() === ERRO_PERMISSAO_SEM_RESPOSTA ? ERRO_PERMISSAO_SEM_RESPOSTA : null
                );
        }

        // The button is only offered when it can do something: enable on supported devices, disable when active.
        btnAtivar!.hidden = !(ativo || podeAtivar);
        definirRotuloBotao(btnAtivar!, t(ativo ? 'notif.btn_desativar' : 'notif.btn_ativar'));
        btnAtivar!.classList.toggle('btn-primary', !ativo);
        btnAtivar!.classList.toggle('btn-neutral', ativo);

        switchesPush.forEach(({ chave, elemento }) => definirSwitch(elemento, preferencias[chave], ativo && !ocupado));
        btnTeste!.disabled = !(ativo && servidorDisponivel) || ocupado;
        definirSwitch(switchSom!, isSomAtivo(), true);
    }

    async function renderizar(): Promise<void> {
        const admin = isAdmin();
        card!.hidden = !admin;
        if (!admin) return;
        const atual = ++renderizacao;
        const [servidor, estado] = await Promise.all([
            pushDisponivelNoServidor().catch(() => false),
            obterEstadoPush()
        ]);
        if (atual !== renderizacao) return;
        pintar(estado, servidor);
    }

    async function executar(botao: HTMLButtonElement | null, tarefa: () => Promise<void>): Promise<void> {
        if (ocupado) return;
        ocupado = true;
        setButtonLoading(botao, true);
        try {
            await tarefa();
        } catch (erro) {
            showToast(traduzirErro(erro, 'notif.erro_generico'), 'error');
        } finally {
            ocupado = false;
            setButtonLoading(botao, false);
            await renderizar();
        }
    }

    btnAtivar.addEventListener('click', () => {
        if (!isAdmin()) return;
        const desativando = estadoAtual?.inscrito === true;
        // solicitarAtivacao() asks for the permission synchronously inside this click handler (user gesture)
        // and shows its own feedback (a long guidance toast when the browser shows no prompt).
        void executar(btnAtivar, async () => {
            if (desativando) {
                const servidorAtualizado = await desativar();
                registrarDesativacao();
                showToast(t(servidorAtualizado ? 'notif.desativadas_ok' : 'notif.desativadas_parcial'), servidorAtualizado ? 'success' : 'warning');
            } else {
                await solicitarAtivacao();
            }
        });
    });

    switchesPush.forEach(({ chave, elemento }) => {
        elemento.addEventListener('click', () => {
            if (!isAdmin() || ocupado || elemento.disabled) return;
            const proximas = { ...preferencias, [chave]: !preferencias[chave] };
            void executar(null, async () => {
                preferencias = await atualizarPreferencias(proximas);
            });
        });
    });

    switchSom.addEventListener('click', () => {
        const ativo = !isSomAtivo();
        definirSomAtivo(ativo);
        definirSwitch(switchSom, ativo, true);
        if (ativo) {
            // This click is a user gesture: unlock audio and play a short preview.
            desbloquearAudio();
            tocarAlerta();
        }
    });

    btnTeste.addEventListener('click', () => {
        if (!isAdmin()) return;
        void executar(btnTeste, async () => {
            await enviarTeste();
            showToast(t('notif.teste_enviado'), 'success');
        });
    });

    // Refresh whenever the card can have gone stale: session, language, opening the panel, returning to the tab
    // (the user may have changed the browser permission in between).
    subscribeAuth(() => { void renderizar(); });
    subscribeI18n(() => { void renderizar(); });
    document.addEventListener('click', (evento) => {
        if ((evento.target as HTMLElement).closest('.nav-link[data-panel="panel-config"]')) void renderizar();
    });
    // Activation, deactivation or automatic activation (also triggered from the banner) changes this card.
    window.addEventListener(EVENTO_ESTADO_PUSH, () => { void renderizar(); });
    window.addEventListener('focus', () => { void renderizar(); });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void renderizar();
    });

    void renderizar();
}
