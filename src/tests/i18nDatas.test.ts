// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } });
});
import { definirIdioma, getLocale, formatarDataHora } from '../core/state/i18nStore.js';

describe('formatarDataHora / getLocale', () => {
  beforeEach(() => definirIdioma('pt'));
  it('getLocale segue o idioma', () => {
    expect(getLocale()).toBe('pt-BR');
    definirIdioma('en');
    expect(getLocale()).toBe('en-US');
  });
  it('troca de idioma reformata a mesma data ISO', () => {
    const iso = '2026-03-25T15:30:00.000Z';
    const pt = formatarDataHora(iso);
    definirIdioma('en');
    const en = formatarDataHora(iso);
    expect(pt).not.toBe(en);
    expect(en).toBe(new Date(iso).toLocaleString('en-US'));
  });
  it('vazio e inválido', () => {
    expect(formatarDataHora(null)).toBe('');
    expect(formatarDataHora('abc')).toBe('abc');
  });
});
