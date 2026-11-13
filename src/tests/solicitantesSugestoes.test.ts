// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanUI } from '../types/index.js';

const estado = vi.hoisted(() => ({
    autenticado: true,
    abertos: [] as unknown[],
    historico: { items: [] as unknown[] },
    listenersAbertos: [] as Array<() => void>,
    listenersHistorico: [] as Array<() => void>,
    aoTrocar: null as null | (() => void)
}));

vi.mock('../core/state/authStore.js', () => ({
    isAutenticado: () => estado.autenticado
}));
vi.mock('../core/state/loanStore.js', () => ({
    getLoansAbertos: () => estado.abertos,
    getHistorico: () => estado.historico,
    subscribe: (cb: () => void) => { estado.listenersAbertos.push(cb); return () => undefined; },
    subscribeHistorico: (cb: () => void) => { estado.listenersHistorico.push(cb); return () => undefined; }
}));
vi.mock('../core/state/sessionChange.js', () => ({
    aoTrocarSessao: (cb: () => void) => { estado.aoTrocar = cb; return () => undefined; }
}));

import {
    coletarSolicitantes,
    iniciarSugestoesSolicitante,
    LIMITE_SOLICITANTES
} from '../features/emprestimo/solicitantes.js';

function loan(aluno: string, criado = 0): LoanUI {
    return { aluno, createdAt: new Date(criado) } as unknown as LoanUI;
}

function opcoes(list: HTMLDataListElement): string[] {
    return Array.from(list.options).map((option) => option.value);
}

describe('coletarSolicitantes', () => {
    it('remove duplicados ignorando espaços e maiúsculas, mantendo a grafia mais recente', () => {
        const nomes = coletarSolicitantes([
            loan('  Ana Silva ', 1),
            loan('ana silva', 3),
            loan('ANA SILVA', 2),
            loan('Bruno', 1)
        ]);
        expect(nomes).toEqual(['ana silva', 'Bruno'].sort((a, b) => a.localeCompare(b)));
    });

    it('ignora nomes vazios e ordena alfabeticamente', () => {
        expect(coletarSolicitantes([loan('Zeca'), loan('   '), loan('Ana'), loan('bia')]))
            .toEqual(['Ana', 'bia', 'Zeca']);
    });

    it('limita a 200 nomes, após ordenar', () => {
        const loans = Array.from({ length: 250 }, (_, i) => loan(`Aluno ${String(i).padStart(3, '0')}`));
        const nomes = coletarSolicitantes(loans);
        expect(nomes).toHaveLength(LIMITE_SOLICITANTES);
        expect(nomes[0]).toBe('Aluno 000');
        expect(nomes[199]).toBe('Aluno 199');
    });
});

describe('iniciarSugestoesSolicitante', () => {
    let list: HTMLDataListElement;

    beforeEach(() => {
        document.body.innerHTML = '<input id="solicitante" list="solicitantes-sugestoes"><datalist id="solicitantes-sugestoes"></datalist>';
        list = document.getElementById('solicitantes-sugestoes') as HTMLDataListElement;
        estado.autenticado = true;
        estado.abertos = [loan('Carla', 1), loan('Ana', 2)];
        estado.historico = { items: [loan('carla', 3), loan('Diego', 4)] };
        estado.listenersAbertos = [];
        estado.listenersHistorico = [];
        estado.aoTrocar = null;
    });

    it('preenche com nomes distintos de abertos e histórico para usuário autenticado', () => {
        iniciarSugestoesSolicitante(list);
        expect(opcoes(list)).toEqual(['Ana', 'carla', 'Diego'].sort((a, b) => a.localeCompare(b)));
    });

    it('convidado nunca recebe sugestões', () => {
        estado.autenticado = false;
        iniciarSugestoesSolicitante(list);
        expect(list.options).toHaveLength(0);
    });

    it('repopula quando os stores notificam', () => {
        iniciarSugestoesSolicitante(list);
        estado.abertos = [loan('Eva', 5)];
        estado.listenersAbertos.forEach((cb) => cb());
        expect(opcoes(list)).toContain('Eva');
        expect(opcoes(list)).not.toContain('Ana');
    });

    it('esvazia o datalist ao trocar de sessão', () => {
        iniciarSugestoesSolicitante(list);
        expect(list.options.length).toBeGreaterThan(0);
        estado.aoTrocar?.();
        expect(list.options).toHaveLength(0);
    });
});
