import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { APP_VERSION } from '../core/version.js';

describe('APP_VERSION', () => {
    it('equals the version in package.json (single source of truth)', () => {
        expect(APP_VERSION).toBe(pkg.version);
    });

    it('is a plain x.y.z version', () => {
        expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
});
