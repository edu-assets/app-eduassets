export function gerarLinhasCsv(matriz: Array<Array<string | number>>): string {
    return matriz.map((linha) => linha.join(';')).join('\n');
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