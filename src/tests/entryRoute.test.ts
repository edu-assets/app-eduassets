import { describe, expect, it } from 'vitest';
import {
    APP_ROUTE_HASH,
    LOGIN_ROUTE_HASH,
    resolveEntryDestination,
} from '../core/layout/entryRoute.js';

describe('entry route', () => {
    it('requires a validated cookie session or an explicit guest choice before opening #app', () => {
        expect(resolveEntryDestination('', false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true)).toBe('app');
    });

    it('keeps an explicit #login request even if guest access was granted earlier in this tab', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, true)).toBe('login');
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, false)).toBe('login');
    });

    it('keeps validated cookie sessions in the app and rejected sessions at #login', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, true, false)).toBe('app');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true)).toBe('app');
        expect(resolveEntryDestination('', false, false)).toBe('login');
    });
});
