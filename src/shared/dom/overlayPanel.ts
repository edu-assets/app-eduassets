export interface OverlayPanelEls {
    painel: HTMLElement | null;
    backdrop: HTMLElement | null;
}

export function abrirPainelOverlay(els: OverlayPanelEls, painelClasse: string = 'mobile-aberto', backdropClasse: string = 'active'): void {
    if (!els.painel || !els.backdrop) return;
    els.painel.classList.add(painelClasse);
    els.backdrop.classList.add(backdropClasse);
}

export function fecharPainelOverlay(els: OverlayPanelEls, painelClasse: string = 'mobile-aberto', backdropClasse: string = 'active'): void {
    if (!els.painel || !els.backdrop) return;
    els.painel.classList.remove(painelClasse);
    els.backdrop.classList.remove(backdropClasse);
}