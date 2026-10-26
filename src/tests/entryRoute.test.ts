import { describe, expect, it } from 'vitest';
import {
    APP_ROUTE_HASH,
    LOGIN_ROUTE_HASH,
    resolveEntryDestination,
} from '../core/layout/entryRoute.js';

describe('entry route', () => {
    it('requires authentication or an explicit guest choice before opening #app', () => {
        expect(resolveEntryDestination('', false, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, false, false)).toBe('login');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true, false)).toBe('app');
    });

    it('keeps an explicit #login request even if guest access was granted earlier in this tab', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, true, false)).toBe('login');
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, false, false, false)).toBe('login');
    });

    it('keeps a valid login in the app and returns rejected sessions to #login', () => {
        expect(resolveEntryDestination(LOGIN_ROUTE_HASH, true, false, true)).toBe('app');
        expect(resolveEntryDestination(APP_ROUTE_HASH, false, true, true)).toBe('login');
        expect(resolveEntryDestination('', false, false, true)).toBe('login');
    });
});
