export function ehLayoutEmpilhado(breakpoint: number): boolean {
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}