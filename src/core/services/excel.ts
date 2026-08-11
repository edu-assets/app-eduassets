import ExcelJS from 'exceljs';

export async function gerarArquivoXlsx(matriz: Array<Array<string | number>>, nomeAba: string = 'Dados'): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(nomeAba);

    worksheet.addRows(matriz);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

export function baixarArquivoXlsx(buffer: ExcelJS.Buffer, nomeArquivo: string): void {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    
    document.body.appendChild(a); 
    a.click();
    
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url); 
}