export { gerarIniciais } from '../../core/utils/iniciais.js';
import { getIdioma } from '../../core/state/i18nStore.js';

function getLocale(): string {
    return getIdioma() === 'en' ? 'en-US' : 'pt-BR';
}

export function formatarHora(date: Date): string {
    const hoje = new Date();
    const mesmoDia = date.toDateString() === hoje.toDateString();
    const locale = getLocale();
    const hora = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return mesmoDia ? hora : `${date.toLocaleDateString(locale)} ${hora}`;
}

export function formatarDataCard(date: Date): string {
    return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
