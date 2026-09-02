export function setButtonLoading(button: HTMLButtonElement | null | undefined, loading: boolean): void {
    if (!button) return;

    let label = button.querySelector<HTMLElement>(':scope > .btn-label');
    if (!label) {
        label = document.createElement('span');
        label.className = 'btn-label';
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
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        return;
    }

    spinnerExistente?.remove();
    button.disabled = false;
    button.removeAttribute('aria-busy');
}