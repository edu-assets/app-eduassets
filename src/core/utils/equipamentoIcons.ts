import { getEquipamentos } from '../state/equipamentoStore.js';

const ICONES_POR_CATEGORIA: Record<string, string> = {
    'notebook': 'laptop',
    'tablet': 'tablet',
    'fone de ouvido': 'headphones',
    'fonte de carregamento': 'bolt',
    'carregador usb': 'usb'
};

export function getEquipamentoIcon(equipamentoId: string | number): string {
    const equipamento = getEquipamentos().find((eq) => String(eq.id) === String(equipamentoId));
    const categoria = String(equipamento?.categoria?.nome ?? '').trim().toLowerCase();
    return ICONES_POR_CATEGORIA[categoria] || 'devices_other';
}