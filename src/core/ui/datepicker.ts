/// <reference types="flatpickr" />

import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import 'flatpickr/dist/flatpickr.min.css';

export type FlatpickrInstance = flatpickr.Instance;

export function criarDataAutoPicker(input: HTMLElement): FlatpickrInstance {
    return flatpickr(input, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'd/m/Y à\\s H:i',
        locale: Portuguese,
        defaultDate: new Date(),
        onChange: () => input.classList.remove('input-auto')
    });
}