import { describe, expect, it } from 'vitest';
import { filtrarPorPeriodo } from '../features/exportar/dateFilters.js';

describe('filtrarPorPeriodo', () => {
  it('includes the complete local calendar day and excludes adjacent days', () => {
    const records = [
      { id: 'previous', date: new Date(2025, 0, 1, 23, 59, 59, 999) },
      { id: 'start', date: new Date(2025, 0, 2, 0, 0, 0, 0) },
      { id: 'end', date: new Date(2025, 0, 2, 23, 59, 59, 999) },
      { id: 'next', date: new Date(2025, 0, 3, 0, 0, 0, 0) },
    ];
    expect(filtrarPorPeriodo(records, '2025-01-02', '2025-01-02', (item) => item.date).map((item) => item.id))
      .toEqual(['start', 'end']);
  });

  it('rejects malformed date-only filters instead of silently including every record', () => {
    const records = [{ date: new Date() }];
    expect(filtrarPorPeriodo(records, '2025-02-31', '', (item) => item.date)).toEqual([]);
  });
});
