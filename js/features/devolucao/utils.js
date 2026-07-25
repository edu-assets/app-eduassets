export function gerarIniciais(nome) {
    if (!nome) return '';
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function formatarHora(date) {
    const hoje = new Date();
    const mesmoDia = date.toDateString() === hoje.toDateString();
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return mesmoDia ? `Hoje às ${hora}` : `${date.toLocaleDateString('pt-BR')} às ${hora}`;
}

export function formatarDataCard(date) {
    const dataStr = date.toLocaleDateString('pt-BR');
    const horaStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dataStr} às ${horaStr}`;
}

export function ehLayoutEmpilhado(breakpoint) {
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}