export { gerarIniciais } from '../../core/utils/iniciais.js';

export function formatarHora(date: Date): string {
    const hoje = new Date();
    const mesmoDia = date.toDateString() === hoje.toDateString();
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return mesmoDia ? `Hoje às ${hora}` : `${date.toLocaleDateString('pt-BR')} às ${hora}`;
}

export function formatarDataCard(date: Date): string {
    const dataStr = date.toLocaleDateString('pt-BR');
    const horaStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dataStr} às ${horaStr}`;
}