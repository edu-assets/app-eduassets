/**
 * In-app alert sound generated with Web Audio (no audio files).
 * Browsers only allow audio after a user gesture, so the context is unlocked on the first interaction.
 * Whether the sound plays is a local, per-device preference.
 */
const STORAGE_KEY = 'eduassets_alert_sound';

// Three rising notes (A5, D6, A6): short but hard to miss.
const NOTAS: ReadonlyArray<{ freq: number; inicio: number; duracao: number }> = [
    { freq: 880, inicio: 0, duracao: 0.16 },
    { freq: 1174.66, inicio: 0.18, duracao: 0.16 },
    { freq: 1760, inicio: 0.36, duracao: 0.3 }
];
const VOLUME = 0.25;

type AudioContextCtor = typeof AudioContext;

let contexto: AudioContext | null = null;
let desbloqueioRegistrado = false;

export function isSomAtivo(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
        return true;
    }
}

export function definirSomAtivo(ativo: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, ativo ? 'on' : 'off');
    } catch {
        /* storage unavailable: the preference only lasts until reload */
    }
}

function obterConstrutor(): AudioContextCtor | null {
    const g = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextCtor };
    return g.AudioContext ?? g.webkitAudioContext ?? null;
}

function obterContexto(): AudioContext | null {
    if (contexto) return contexto;
    const Ctor = obterConstrutor();
    if (!Ctor) return null;
    try {
        contexto = new Ctor();
    } catch {
        contexto = null;
    }
    return contexto;
}

/** Creates/resumes the AudioContext. Must run inside a user gesture the first time. */
export function desbloquearAudio(): void {
    const ctx = obterContexto();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/** Registers one-shot listeners that unlock audio on the first user gesture. Idempotent. */
export function registrarDesbloqueioDeAudio(alvo: Pick<Document, 'addEventListener' | 'removeEventListener'> = document): void {
    if (desbloqueioRegistrado) return;
    desbloqueioRegistrado = true;
    const eventos = ['pointerdown', 'keydown', 'touchstart'] as const;
    const desbloquear = (): void => {
        desbloquearAudio();
        eventos.forEach((evento) => alvo.removeEventListener(evento, desbloquear));
    };
    eventos.forEach((evento) => alvo.addEventListener(evento, desbloquear, { passive: true }));
}

/** Plays the alert unless the user turned the sound off. Returns true when a sound was scheduled. */
export function tocarAlerta(): boolean {
    if (!isSomAtivo()) return false;
    const ctx = obterContexto();
    if (!ctx) return false;
    // Without a prior gesture the context stays suspended: stay silent instead of queueing a late sound.
    if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
        if (ctx.state === 'suspended') return false;
    }

    const base = ctx.currentTime + 0.02;
    NOTAS.forEach(({ freq, inicio, duracao }) => {
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();
        oscilador.type = 'triangle';
        oscilador.frequency.value = freq;
        const t0 = base + inicio;
        ganho.gain.setValueAtTime(0.0001, t0);
        ganho.gain.exponentialRampToValueAtTime(VOLUME, t0 + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
        oscilador.connect(ganho);
        ganho.connect(ctx.destination);
        oscilador.start(t0);
        oscilador.stop(t0 + duracao + 0.05);
    });
    return true;
}

/** Test hook: forgets the cached context and unlock listeners. */
export function __resetAlertSoundForTests(): void {
    contexto = null;
    desbloqueioRegistrado = false;
}
