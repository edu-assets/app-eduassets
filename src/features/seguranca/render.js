export function renderInfoConta(els, usuario) {
    if (els.email) els.email.textContent = usuario?.login ?? '—';
}

export function alternarFormSenha(els, estado, abrir) {
    estado.formAberto = abrir;
    els.formSenha.style.display = abrir ? 'flex' : 'none';
    els.btnToggleSenha.setAttribute('aria-expanded', String(abrir));

    if (!abrir) {
        els.inputAtual.value = '';
        els.inputNova.value = '';
        els.inputConfirmar.value = '';
        mostrarErro(els, '');
    }
}

export function mostrarErro(els, mensagem) {
    if (!els.erro) return;
    els.erro.textContent = mensagem;
    els.erro.style.display = mensagem ? 'block' : 'none';
}