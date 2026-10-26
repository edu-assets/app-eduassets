import { describe, expect, it } from 'vitest';
import {
    APP_ROUTE_HASH,
    LOGIN_ROUTE_HASH,
    resolveEntryDestination,
} from '../core/layout/entryRoute.js';

describe('entry route', () => {
    it('uses #login for a fresh visitor unless a guest choice was persisted', () => {
        expect(resolveEntryDestination('', false, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true, false)).toBe('app');
    });

    it('keeps an explicitly requested login screen separate from the app route', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, true, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true, false)).toBe('app');
    });

    it('keeps a valid login in the app and returns rejected sessions to #login', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, true, false, true)).toBe('app');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true, true)).toBe('login');
        expect(resolveEntryDestination('', false, false, true)).toBe('login');
    });
});
