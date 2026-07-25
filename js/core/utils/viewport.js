export function ehLayoutEmpilhado(breakpoint) {
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
}