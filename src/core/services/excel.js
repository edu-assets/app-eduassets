export function gerarArquivoXlsx(cabecalho, linhas, nomeAba = 'Dados', linhasExtras = []) {
    const worksheet = XLSX.utils.aoa_to_sheet([...linhasExtras, cabecalho, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
    return workbook;
}

export function baixarArquivoXlsx(workbook, nomeArquivo) {
    XLSX.writeFile(workbook, nomeArquivo);
}