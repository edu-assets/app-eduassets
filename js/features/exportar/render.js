export function definirEstadoCarregando(els, carregando) {
    els.btnSubmit.disabled = carregando;
    els.btnSubmit.textContent = carregando ? 'Gerando arquivo...' : els.textoOriginalBtn;
}