import { html } from '../../core/utils/html.js';

/**
 * Peças do kit visual (public/assets/kit). As ilustrações são decorativas (alt vazio): o texto ao lado
 * delas já diz o que aconteceu. Cores fixas, legíveis no tema claro e no escuro.
 */
const BASE = '/assets/kit';

export const ILUSTRACOES = {
    semEmprestimos: 'sem-emprestimos',
    tudoDevolvido: 'tudo-devolvido',
    semEquipamentos: 'sem-equipamentos',
    semOcorrencias: 'sem-ocorrencias',
    tudoCerto: 'tudo-certo',
    buscaSemResultados: 'busca-sem-resultados',
    erroConexao: 'erro-conexao',
    paginaNaoEncontrada: 'pagina-nao-encontrada',
    acessoRestrito: 'acesso-restrito'
} as const;

export type NomeIlustracao = keyof typeof ILUSTRACOES;

export function caminhoIlustracao(nome: NomeIlustracao): string {
    return `${BASE}/ilustracoes/${ILUSTRACOES[nome]}.svg`;
}

/** `<img>` decorativo de ilustração; `pequena` para listas e modais com pouco espaço. */
export function renderIlustracao(nome: NomeIlustracao, pequena = false): string {
    const classe = pequena ? 'estado-ilustracao estado-ilustracao--sm' : 'estado-ilustracao';
    return html`<img src="${caminhoIlustracao(nome)}" alt="" class="${classe}" width="240" height="180" loading="lazy" decoding="async">`;
}

/**
 * Ícone duotom de equipamento pela categoria (nome livre, cadastrado pelo administrador).
 * A ordem importa: termos mais específicos antes dos genéricos ("webcam" antes de "câmera").
 */
const ICONES_EQUIPAMENTO: Array<[string[], string]> = [
    [['notebook', 'laptop', 'chromebook', 'netbook'], 'notebook'],
    [['tablet', 'ipad'], 'tablet'],
    [['celular', 'smartphone', 'telefone'], 'smartphone'],
    [['projetor', 'datashow', 'data show'], 'projetor'],
    [['monitor', 'televis', 'tv '], 'monitor'],
    [['fone', 'headset', 'headphone'], 'fone'],
    [['microfone'], 'microfone'],
    [['caixa de som', 'caixa acustica', 'alto-falante', 'alto falante', 'speaker'], 'caixa-de-som'],
    [['webcam'], 'webcam'],
    [['camera', 'filmadora'], 'camera'],
    [['mouse'], 'mouse'],
    [['teclado'], 'teclado'],
    [['carregador', 'fonte', 'usb-c', 'usb c'], 'carregador'],
    [['cabo', 'hdmi', 'adaptador'], 'cabo'],
    [['extensao', 'filtro de linha', 'regua'], 'extensao'],
    [['roteador', 'modem', 'wi-fi', 'wifi', 'access point'], 'roteador']
];

function normalizar(texto: string): string {
    return ` ${texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()} `;
}

export function caminhoIconeEquipamento(categoria: string | null | undefined): string | null {
    const alvo = normalizar(String(categoria ?? ''));
    if (!alvo.trim()) return null;
    const achado = ICONES_EQUIPAMENTO.find(([termos]) => termos.some((termo) => alvo.includes(termo)));
    return achado ? `${BASE}/equipamentos/${achado[1]}.svg` : null;
}

/** `<img>` decorativo do ícone da categoria, ou '' quando a categoria não tem ícone correspondente. */
export function renderIconeEquipamento(categoria: string | null | undefined, classe: string): string {
    const src = caminhoIconeEquipamento(categoria);
    return src ? html`<img src="${src}" alt="" class="${classe}" width="32" height="32" loading="lazy" decoding="async">` : '';
}
