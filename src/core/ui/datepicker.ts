import type Flatpickr from 'flatpickr';

export type FlatpickrInstance = Flatpickr.Instance;

interface FlatpickrModulo {
    flatpickr: typeof Flatpickr;
    Portuguese: Flatpickr.CustomLocale;
}

let modulePromise: Promise<FlatpickrModulo> | null = null;

function carregarFlatpickr(): Promise<FlatpickrModulo> {
    if (!modulePromise) {
        modulePromise = Promise.all([
            import('flatpickr'),
            import('flatpickr/dist/l10n/pt.js'),
            import('flatpickr/dist/flatpickr.min.css')
        ]).then(([flatpickrMod, l10nMod]) => ({
            flatpickr: flatpickrMod.default,
            Portuguese: l10nMod.Portuguese
        }));
    }
    return modulePromise;
}

export async function criarDataAutoPicker(input: HTMLElement): Promise<FlatpickrInstance> {
    const { flatpickr, Portuguese } = await carregarFlatpickr();

    return flatpickr(input, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'd/m/Y à\\s H:i',
        locale: Portuguese,
        defaultDate: new Date(),
        onChange: () => input.classList.remove('input-auto')
    });
}