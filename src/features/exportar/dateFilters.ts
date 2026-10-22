export function filtrarPorPeriodo<T>(
    itens: T[],
    dataInicial: string,
    dataFinal: string,
    obterData: (item: T) => Date
): T[] {
    if (!dataInicial && !dataFinal) return itens;

    const inicio = dataInicial ? dataLimiteLocal(dataInicial, false) : null;
    const fim = dataFinal ? dataLimiteLocal(dataFinal, true) : null;
    if ((inicio && Number.isNaN(inicio.getTime())) || (fim && Number.isNaN(fim.getTime()))) return [];

    return itens.filter((item) => {
        const data = obterData(item);
        if (inicio && data < inicio) return false;
        if (fim && data > fim) return false;
        return true;
    });
}


function dataLimiteLocal(valor: string, fimDoDia: boolean): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (!match) return new Date(Number.NaN);
    const [, ano, mes, dia] = match;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia), fimDoDia ? 23 : 0, fimDoDia ? 59 : 0, fimDoDia ? 59 : 0, fimDoDia ? 999 : 0);
    if (data.getFullYear() !== Number(ano) || data.getMonth() !== Number(mes) - 1 || data.getDate() !== Number(dia)) return new Date(Number.NaN);
    return data;
}
