import { describe, expect, it } from 'vitest';
import { gerarLinhasCsv } from '../core/services/csv.js';
describe('gerarLinhasCsv', () => {
  it('inclui BOM e escapa delimitadores, aspas e quebras de linha', () => {
    expect(gerarLinhasCsv([['Nome', 'Nota'], ['João; Silva', 'disse "olá"\ne confirmou']]))
      .toBe('\ufeffNome;Nota\r\n"João; Silva";"disse ""olá""\ne confirmou"');
  });
  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '  =1+1'])('neutraliza fórmula %s', (valor) => {
    expect(gerarLinhasCsv([[valor]])).toContain(`’${valor}`);
  });
});
