export function criarDataAutoPicker(input) {
    return flatpickr(input, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'd/m/Y à\\s H:i',
        locale: 'pt',
        defaultDate: new Date(),
        onChange: () => input.classList.remove('input-auto')
    });
}