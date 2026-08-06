interface FlatpickrInstance {
    selectedDates: Date[];
    setDate: (date: Date, triggerChange?: boolean) => void;
}

interface FlatpickrOptions {
    enableTime?: boolean;
    time_24hr?: boolean;
    dateFormat?: string;
    locale?: string;
    defaultDate?: Date;
    onChange?: () => void;
}

declare function flatpickr(input: HTMLElement, options: FlatpickrOptions): FlatpickrInstance;

export function criarDataAutoPicker(input: HTMLElement): FlatpickrInstance {
    return flatpickr(input, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'd/m/Y à\\s H:i',
        locale: 'pt',
        defaultDate: new Date(),
        onChange: () => input.classList.remove('input-auto')
    });
}