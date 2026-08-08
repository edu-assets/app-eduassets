interface AutoTableOptions {
    head: string[][];
    body: Array<Array<string | number>>;
    startY: number;
    margin?: { left?: number; right?: number };
    styles?: { fontSize?: number };
    headStyles?: { fillColor: [number, number, number] };
    alternateRowStyles?: { fillColor: [number, number, number] };
    columnStyles?: Record<number, { cellWidth?: number }>;
}

interface JsPdfDoc {
    setFontSize: (size: number) => void;
    setFont: (fontName: string, fontStyle?: string) => void;
    setTextColor: (r: number, g: number, b: number) => void;
    setFillColor: (r: number, g: number, b: number) => void;
    rect: (x: number, y: number, w: number, h: number, style?: string) => void;
    text: (texto: string | string[], x: number, y: number) => void;
    splitTextToSize: (texto: string, largura: number) => string[];
    autoTable: (opcoes: AutoTableOptions) => void;
    addPage: () => void;
    lastAutoTable?: { finalY: number };
    save: (nomeArquivo: string) => void;
}

declare global {
    interface Window {
        jspdf: {
            jsPDF: new () => JsPdfDoc;
        };
    }
}

export interface PdfTabelaSecao {
    titulo: string;
    corRgb: [number, number, number];
    cabecalho: string[];
    linhas: Array<Array<string | number>>;
}

const COR_PRIMARIA: [number, number, number] = [37, 99, 235];
const COR_INFO_BG: [number, number, number] = [225, 245, 254];
const COR_TEXTO: [number, number, number] = [31, 45, 61];
const LARGURA_PAGINA = 210;
const MARGEM = 14;
const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;

export function gerarBaixarPdf(
    titulo: string,
    cabecalhoPrincipal: string[],
    linhasPrincipal: Array<Array<string | number>>,
    nomeArquivo: string,
    observacao: string = '',
    secoes: PdfTabelaSecao[] = []
): void {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ===== Cabeçalho colorido =====
    doc.setFillColor(...COR_PRIMARIA);
    doc.rect(0, 0, LARGURA_PAGINA, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(titulo, MARGEM, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const geradoEm = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em ${geradoEm}`, MARGEM, 19);

    let cursorY = 32;

    // ===== Callout de observação =====
    if (observacao) {
        const linhasObs = doc.splitTextToSize(observacao, LARGURA_UTIL - 8);
        const alturaBox = linhasObs.length * 4.2 + 9;

        doc.setFillColor(...COR_INFO_BG);
        doc.rect(MARGEM, cursorY, LARGURA_UTIL, alturaBox, 'F');
        doc.setFillColor(2, 119, 189);
        doc.rect(MARGEM, cursorY, 1.2, alturaBox, 'F');

        doc.setTextColor(2, 119, 189);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('OBSERVAÇÃO', MARGEM + 4, cursorY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COR_TEXTO);
        doc.setFontSize(8.5);
        doc.text(linhasObs, MARGEM + 4, cursorY + 10.5);

        cursorY += alturaBox + 7;
    }

    // ===== Tabela principal =====
    doc.autoTable({
        head: [cabecalhoPrincipal],
        body: linhasPrincipal,
        startY: cursorY,
        margin: { left: MARGEM, right: MARGEM },
        styles: { fontSize: 8 },
        headStyles: { fillColor: COR_PRIMARIA },
        alternateRowStyles: { fillColor: [244, 246, 251] }
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 10;

    // ===== Seções detalhadas (Manutenção / Quebrado / Observações abertas) =====
    secoes.forEach((secao) => {
        if (cursorY > 258) {
            doc.addPage();
            cursorY = 20;
        }

        doc.setFillColor(...secao.corRgb);
        doc.rect(MARGEM, cursorY - 3.5, 2.2, 5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...secao.corRgb);
        doc.text(secao.titulo, MARGEM + 5, cursorY);

        cursorY += 4;

        doc.autoTable({
            head: [secao.cabecalho],
            body: secao.linhas,
            startY: cursorY,
            margin: { left: MARGEM, right: MARGEM },
            styles: { fontSize: 7.5 },
            headStyles: { fillColor: secao.corRgb },
            columnStyles: {
                0: { cellWidth: 26 },
                1: { cellWidth: 30 },
                2: { cellWidth: 16 },
                3: { cellWidth: 20 },
                4: { cellWidth: 60 },
                5: { cellWidth: 30 }
            }
        });

        cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 10;
    });

    doc.save(nomeArquivo);
}