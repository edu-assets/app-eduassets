import { showToast } from '../../core/toast/toast.js';

export function initExportar() {
    const form = document.getElementById('form-exportar');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const tipoSelect = document.getElementById('tipo-dados');
        const formatoSelect = document.getElementById('exportar-formato');
        const tipo = tipoSelect.options[tipoSelect.selectedIndex].text;
        const formato = formatoSelect.options[formatoSelect.selectedIndex].text;

        showToast(`Exportação de "${tipo}" gerada em ${formato}`, 'success');
    });
}