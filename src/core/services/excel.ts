declare const XLSX: {
    utils: {
        aoa_to_sheet: (data: unknown[][]) => unknown;
        book_new: () => unknown;
        book_append_sheet: (workbook: unknown, worksheet: unknown, nome: string) => void;
    };
    writeFile: (workbook: unknown, nomeArquivo: string) => void;
};

export function gerarArquivoXlsx(
    cabecalho: string[],
    linhas: Array<Array<string | number>>,
    nomeAba: string = 'Dados',
    linhasExtras: Array<Array<string | number>> = []
): unknown {
    const worksheet = XLSX.utils.aoa_to_sheet([...linhasExtras, cabecalho, ...linhas]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
    return workbook;
}

export function baixarArquivoXlsx(workbook: unknown, nomeArquivo: string): void {
    XLSX.writeFile(workbook, nomeArquivo);
}