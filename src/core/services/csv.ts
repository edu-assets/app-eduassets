export function gerarLinhasCsv(matriz: Array<Array<string | number>>): string {
    const protegerFormula = (valor: string): string => /^[\s\u0000-\u001f]*[=+\-@\t\r]/.test(valor) ? `’${valor}` : valor;
    const escapar = (valor: string | number): string => {
        const seguro = protegerFormula(String(valor));
        return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
    };
    return '\ufeff' + matriz.map((linha) => linha.map(escapar).join(';')).join('\r\n');
}
export function baixarArquivoCsv(csv: string, nomeArquivo: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
}
