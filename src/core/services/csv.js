export function gerarLinhasCsv(cabecalho, linhas, linhasExtras = []) {
    return [...linhasExtras, cabecalho, ...linhas].map((linha) => linha.join(';')).join('\n');
}

export function baixarArquivoCsv(csv, nomeArquivo) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(url);
}