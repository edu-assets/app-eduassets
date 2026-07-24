const EQUIPAMENTO_ICONS = {
    eq1: 'laptop',
    eq2: 'tablet',
    eq3: 'headphones',
    eq4: 'bolt',
    eq5: 'usb'
};

export function getEquipamentoIcon(equipamentoId) {
    return EQUIPAMENTO_ICONS[equipamentoId] || 'devices_other';
}