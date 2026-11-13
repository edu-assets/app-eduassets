/**
 * Acessibilidade de abas (WAI-ARIA tabs): sincroniza aria-selected/tabindex
 * (roving tabindex) com a classe `.active` e adiciona navegação por teclado.
 */

export function sincronizarAbasAria(tabs: Iterable<Element>): void {
    for (const tab of tabs) {
        const ativa = tab.classList.contains('active');
        tab.setAttribute('aria-selected', String(ativa));
        tab.setAttribute('tabindex', ativa ? '0' : '-1');
    }
}

export function attachTablistKeyboard(tablist: HTMLElement, tabSelector: string): void {
    tablist.addEventListener('keydown', (e) => {
        const tabs = Array.from(tablist.querySelectorAll<HTMLElement>(tabSelector));
        const atual = (e.target as HTMLElement).closest<HTMLElement>(tabSelector);
        const indice = atual ? tabs.indexOf(atual) : -1;
        if (indice < 0) return;

        let proximo = -1;
        if (e.key === 'ArrowRight') proximo = (indice + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') proximo = (indice - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') proximo = 0;
        else if (e.key === 'End') proximo = tabs.length - 1;
        if (proximo < 0) return;

        e.preventDefault();
        // click() reaproveita a lógica de ativação existente (ativação automática).
        tabs[proximo].click();
        tabs[proximo].focus();
    });
}
