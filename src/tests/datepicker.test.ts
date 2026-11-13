// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const UA_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Navegadores normalizam datetime-local com segundos 0 para HH:MM
const SEM_SEGUNDOS = /T\d\d:\d\d(:00(\.000)?)?$/;

vi.mock('flatpickr/dist/flatpickr.min.css', () => ({}));

async function carregar(userAgent: string) {
    vi.resetModules();
    vi.stubGlobal('navigator', { ...window.navigator, userAgent });
    Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
    return import('../core/ui/datepicker.js');
}

function montarForm(): { form: HTMLFormElement; input: HTMLInputElement } {
    document.body.innerHTML = '<form id="f"><input id="d" type="text"></form>';
    return {
        form: document.getElementById('f') as HTMLFormElement,
        input: document.getElementById('d') as HTMLInputElement
    };
}

describe('datepicker', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 5, 10, 22, 19, 47, 321));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('mobile: input nativo sem segundos, step=60 e valido apos HH:MM e reset', async () => {
        const { criarDataAutoPicker, definirAgora } = await carregar(UA_IPHONE);
        const { form, input } = montarForm();
        const picker = await criarDataAutoPicker(input);

        const mobile = picker.mobileInput as HTMLInputElement;
        expect(mobile).toBeDefined();
        expect(mobile.type).toBe('datetime-local');
        expect(mobile.step).toBe('60');
        expect(mobile.value).toMatch(SEM_SEGUNDOS);
        expect(mobile.defaultValue).toMatch(SEM_SEGUNDOS);

        mobile.value = '2026-06-10T08:30';
        mobile.dispatchEvent(new Event('change'));
        // jsdom calcula stepMismatch para datetime-local
        expect(mobile.validity.stepMismatch).toBe(false);
        expect(form.checkValidity()).toBe(true);

        form.reset();
        definirAgora(picker);
        expect(mobile.value).toMatch(SEM_SEGUNDOS);
        expect(mobile.defaultValue).toMatch(SEM_SEGUNDOS);
        expect(form.checkValidity()).toBe(true);
    });

    it('desktop: defaultDate tem segundos zerados', async () => {
        const { criarDataAutoPicker, definirAgora } = await carregar('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120');
        const { input } = montarForm();
        const picker = await criarDataAutoPicker(input);

        expect(picker.mobileInput).toBeUndefined();
        expect(picker.selectedDates[0].getSeconds()).toBe(0);
        expect(picker.selectedDates[0].getMilliseconds()).toBe(0);

        vi.setSystemTime(new Date(2026, 5, 10, 22, 21, 59, 999));
        definirAgora(picker);
        expect(picker.selectedDates[0].getMinutes()).toBe(21);
        expect(picker.selectedDates[0].getSeconds()).toBe(0);
    });
});

const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120';

function definirVisibilidade(valor: 'visible' | 'hidden'): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor });
}

describe('datepicker: horario vivo e relogio do servidor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 10, 22, 19, 47));
        definirVisibilidade('visible');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    async function criarAutomatico(userAgent = UA_DESKTOP) {
        const { criarDataAutoPicker } = await carregar(userAgent);
        const { input } = montarForm();
        input.classList.add('input-auto');
        const picker = await criarDataAutoPicker(input);
        return { picker, input };
    }

    it('campo automatico acompanha o relogio (a cada 15 s) enquanto nao foi editado', async () => {
        const { picker } = await criarAutomatico();
        expect(picker.selectedDates[0].getMinutes()).toBe(19);

        await vi.advanceTimersByTimeAsync(3 * 60_000);

        expect(picker.selectedDates[0].getMinutes()).toBe(22);
        expect(picker.selectedDates[0].getSeconds()).toBe(0);
    });

    it('campo editado pelo usuario (sem input-auto) nunca e sobrescrito', async () => {
        const { picker, input } = await criarAutomatico();
        picker.setDate(new Date(2026, 5, 1, 8, 0), true); // dispara onChange -> remove input-auto
        expect(input.classList.contains('input-auto')).toBe(false);

        await vi.advanceTimersByTimeAsync(5 * 60_000);

        expect(picker.selectedDates[0].getDate()).toBe(1);
        expect(picker.selectedDates[0].getHours()).toBe(8);
    });

    it('campo aberto nao e sobrescrito', async () => {
        const { picker } = await criarAutomatico();
        picker.isOpen = true;

        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(picker.selectedDates[0].getMinutes()).toBe(19);

        picker.isOpen = false;
        await vi.advanceTimersByTimeAsync(15_000);
        expect(picker.selectedDates[0].getMinutes()).toBe(25);
    });

    it('mobile: campo nativo focado nao e sobrescrito e o defaultValue continua sem segundos', async () => {
        const { picker } = await criarAutomatico(UA_IPHONE);
        const mobile = picker.mobileInput as HTMLInputElement;
        mobile.focus();
        expect(document.activeElement).toBe(mobile);

        await vi.advanceTimersByTimeAsync(2 * 60_000);
        expect(mobile.value).toMatch(/T22:19(:00)?$/);

        mobile.blur();
        await vi.advanceTimersByTimeAsync(15_000);
        expect(mobile.value).toMatch(/T22:22(:00)?$/);
        expect(mobile.defaultValue).toMatch(SEM_SEGUNDOS);
    });

    it('aba oculta pausa a atualizacao; ao voltar atualiza na hora', async () => {
        const { picker } = await criarAutomatico();
        definirVisibilidade('hidden');

        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(picker.selectedDates[0].getMinutes()).toBe(19);

        definirVisibilidade('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(picker.selectedDates[0].getMinutes()).toBe(24);
    });

    it('usa o horario do servidor (offset) em vez do relogio do aparelho', async () => {
        const { criarDataAutoPicker, definirAgora } = await carregar(UA_DESKTOP);
        const { registrarAmostra } = await import('../core/time/serverClock.js');
        const t0 = Date.now();
        // servidor 2 h a frente do aparelho
        registrarAmostra(new Date(t0 + 2 * 3_600_000 + 10).toISOString(), t0, t0 + 20);

        const { input } = montarForm();
        const picker = await criarDataAutoPicker(input);
        expect(picker.selectedDates[0].getHours()).toBe(0); // 22:19 + 2 h = 00:19 do dia seguinte
        expect(picker.selectedDates[0].getMinutes()).toBe(19);

        vi.setSystemTime(new Date(2026, 5, 10, 22, 40, 5));
        definirAgora(picker);
        expect(picker.selectedDates[0].getHours()).toBe(0);
        expect(picker.selectedDates[0].getMinutes()).toBe(40);
        expect(picker.selectedDates[0].getSeconds()).toBe(0);
    });
});
