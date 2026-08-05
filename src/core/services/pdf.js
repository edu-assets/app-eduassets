export function gerarBaixarPdf(titulo, cabecalho, linhas, nomeArquivo, observacao = '') {
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