interface JsPdfDoc {
    setFontSize: (size: number) => void;
    text: (texto: string | string[], x: number, y: number) => void;
    splitTextToSize: (texto: string, largura: number) => string[];
    autoTable: (opcoes: {
        head: string[][];
        body: Array<Array<string | number>>;
        startY: number;
        styles: { fontSize: number };
        headStyles: { fillColor: [number, number, number] };
    }) => void;
    save: (nomeArquivo: string) => void;
}

declare global {
    interface Window {
        jspdf: {
            jsPDF: new () => JsPdfDoc;
        };
    }
}

export function gerarBaixarPdf(
    titulo: string,
    cabecalho: string[],
    linhas: Array<Array<string | number>>,
    nomeArquivo: string,
    observacao: string = ''
): void {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(titulo, 14, 16);

    let startY = 22;

    if (observacao) {
        doc.setFontSize(10);
        const linhasObs = doc.splitTextToSize(`Observação: ${observacao}`, 180);
        doc.text(linhasObs, 14, startY);
        startY += linhasObs.length * 5 + 4;
    }

    doc.autoTable({
        head: [cabecalho],
        body: linhas,
        startY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(nomeArquivo);
}