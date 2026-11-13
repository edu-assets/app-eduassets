export function renderPlaceholderOption(texto: string): string {
    return `<option value="" disabled selected hidden>${texto}</option>`;
}

export function fillSelect(select: HTMLSelectElement, placeholderHtml: string, optionsHtml: string): void {
    const selecionado = select.value;
    select.innerHTML = placeholderHtml + optionsHtml;
    // Re-renderizações (ex.: atualização ao vivo) não podem perder a escolha do usuário.
    if (selecionado && Array.from(select.options).some((option) => option.value === selecionado)) {
        select.value = selecionado;
    }
}