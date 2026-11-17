/**
 * Estado de carregamento de um botão sem alterar seu tamanho: o conteúdo é movido para `.btn-label`
 * e fica invisível (mas ocupando espaço) enquanto um spinner centralizado é sobreposto (ver buttons.css).
 */
export function setButtonLoading(button: HTMLButtonElement | null | undefined, loading: boolean): void {
    if (!button) return;

    let label = button.querySelector<HTMLElement>(':scope > .btn-label');
    if (!label) {
        label = document.createElement('span');
        label.className = 'btn-label';
        // O texto passa a ser filho do label: a chave de tradução vai junto, para retraduzir ao trocar de idioma.
        if (button.dataset.i18nKey) {
            label.dataset.i18nKey = button.dataset.i18nKey;
            delete button.dataset.i18nKey;
        }
        while (button.firstChild) {
            label.appendChild(button.firstChild);
        }
        button.appendChild(label);
    }

    const spinnerExistente = button.querySelector<HTMLElement>(':scope > .btn-spinner');

    if (loading) {
        if (!spinnerExistente) {
            const spinner = document.createElement('span');
            spinner.className = 'btn-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            button.insertBefore(spinner, label);
        }
        button.classList.add('is-loading');
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        return;
    }

    spinnerExistente?.remove();
    button.classList.remove('is-loading');
    button.disabled = false;
    button.removeAttribute('aria-busy');
}
