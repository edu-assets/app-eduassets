// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../core/ui/toast';

describe('toast', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

    it('uses polite status and assertive alert regions', () => {
        showToast('ok', 'success');
        showToast('bad', 'error');
        const status = document.querySelector('[role="status"]')!;
        const alert = document.querySelector('[role="alert"]')!;
        expect(status.getAttribute('aria-live')).toBe('polite');
        expect(alert.getAttribute('aria-live')).toBe('assertive');
        expect(status.querySelector('.toast-success')).not.toBeNull();
        expect(alert.querySelector('.toast-error')).not.toBeNull();
    });

    it('keeps info toasts working in the polite region', () => {
        showToast('novo', 'info');
        expect(document.querySelector('[role="status"] .toast-info')).not.toBeNull();
    });

    it('error toasts persist; success toasts dismiss', () => {
        showToast('bad', 'error');
        showToast('ok', 'success');
        vi.advanceTimersByTime(60000);
        expect(document.querySelector('.toast-error:not(.toast-leaving)')).not.toBeNull();
        expect(document.querySelector('.toast-success')).toBeNull();
    });

    it('close button dismisses with a label', () => {
        showToast('bad', 'error');
        const btn = document.querySelector<HTMLButtonElement>('.toast-close')!;
        expect(btn.getAttribute('aria-label')).toBeTruthy();
        btn.click();
        vi.advanceTimersByTime(500);
        expect(document.querySelector('.toast')).toBeNull();
    });

    it('pauses on hover and resumes after', () => {
        showToast('ok', 'success');
        const toast = document.querySelector('.toast')!;
        vi.advanceTimersByTime(1000);
        toast.dispatchEvent(new Event('mouseenter'));
        vi.advanceTimersByTime(10000);
        expect(toast.classList.contains('toast-leaving')).toBe(false);
        toast.dispatchEvent(new Event('mouseleave'));
        vi.advanceTimersByTime(2400);
        expect(toast.classList.contains('toast-leaving')).toBe(false);
        vi.advanceTimersByTime(200);
        expect(toast.classList.contains('toast-leaving')).toBe(true);
    });

    it('limits the stack to 4', () => {
        for (let i = 0; i < 7; i++) showToast('m' + i, 'warning');
        expect(document.querySelectorAll('.toast').length).toBe(4);
    });
});
