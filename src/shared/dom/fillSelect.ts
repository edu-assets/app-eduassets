export function renderPlaceholderOption(texto: string): string {
    return `<option value="" disabled selected hidden>${texto}</option>`;
}

export function fillSelect(select: HTMLSelectElement, placeholderHtml: string, optionsHtml: string): void {
    select.innerHTML = placeholderHtml + optionsHtml;
}