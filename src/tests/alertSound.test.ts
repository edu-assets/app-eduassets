import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    __resetAlertSoundForTests,
    definirSomAtivo,
    desbloquearAudio,
    isSomAtivo,
    tocarAlerta
} from '../core/notifications/alertSound.js';

function criarAudioContextFalso(estadoInicial: 'running' | 'suspended' = 'running') {
    const oscillators: Array<{ frequency: { value: number }; start: ReturnType<typeof vi.fn> }> = [];
    const instancias: unknown[] = [];
    class FakeAudioContext {
        state = estadoInicial;
        currentTime = 0;
        destination = {};
        constructor() { instancias.push(this); }
        resume = vi.fn(async () => undefined);
        createGain() {
            return {
                gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
                connect: vi.fn()
            };
        }
        createOscillator() {
            const osc = { type: '', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
            oscillators.push(osc);
            return osc;
        }
    }
    return { FakeAudioContext, oscillators, instancias };
}

describe('alert sound', () => {
    const store = new Map<string, string>();

    beforeEach(() => {
        store.clear();
        __resetAlertSoundForTests();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => { store.set(key, value); }
        });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('is on by default and persists the preference locally', () => {
        expect(isSomAtivo()).toBe(true);
        definirSomAtivo(false);
        expect(store.get('eduassets_alert_sound')).toBe('off');
        expect(isSomAtivo()).toBe(false);
        definirSomAtivo(true);
        expect(isSomAtivo()).toBe(true);
    });

    it('stays usable when localStorage throws', () => {
        vi.stubGlobal('localStorage', {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); }
        });
        expect(isSomAtivo()).toBe(true);
        expect(() => definirSomAtivo(false)).not.toThrow();
    });

    it('plays a three-tone Web Audio alert when enabled', () => {
        const { FakeAudioContext, oscillators } = criarAudioContextFalso();
        vi.stubGlobal('AudioContext', FakeAudioContext);
        expect(tocarAlerta()).toBe(true);
        expect(oscillators).toHaveLength(3);
        oscillators.forEach((osc) => expect(osc.start).toHaveBeenCalledTimes(1));
        expect(oscillators.map((osc) => osc.frequency.value)).toEqual([880, 1174.66, 1760]);
    });

    it('does not play (nor even create an AudioContext) when the preference is off', () => {
        const { FakeAudioContext, oscillators, instancias } = criarAudioContextFalso();
        vi.stubGlobal('AudioContext', FakeAudioContext);
        definirSomAtivo(false);
        expect(tocarAlerta()).toBe(false);
        expect(oscillators).toHaveLength(0);
        expect(instancias).toHaveLength(0);
    });

    it('stays silent while the context is still locked (no user gesture yet)', () => {
        const { FakeAudioContext, oscillators } = criarAudioContextFalso('suspended');
        vi.stubGlobal('AudioContext', FakeAudioContext);
        expect(tocarAlerta()).toBe(false);
        expect(oscillators).toHaveLength(0);
    });

    it('unlocks (resumes) the context from a user gesture', () => {
        const { FakeAudioContext, instancias } = criarAudioContextFalso('suspended');
        vi.stubGlobal('AudioContext', FakeAudioContext);
        desbloquearAudio();
        expect(instancias).toHaveLength(1);
        expect((instancias[0] as { resume: ReturnType<typeof vi.fn> }).resume).toHaveBeenCalled();
    });

    it('returns false when Web Audio is unavailable', () => {
        vi.stubGlobal('AudioContext', undefined);
        expect(tocarAlerta()).toBe(false);
    });
});
