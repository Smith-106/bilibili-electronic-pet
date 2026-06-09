import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '../../src/components/toast.js';

describe('frontend toast component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback();
      return 1;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders an info toast, shows it on animation frame, and removes it by timer', () => {
    showToast('hello');

    const toast = document.getElementById('app-toast');
    expect(toast).not.toBeNull();
    expect(toast?.classList.contains('show')).toBe(true);
    expect(toast?.style.getPropertyValue('--toast-color')).toBe('var(--primary-cta)');
    expect(toast?.querySelector('.toast-message')?.textContent).toBe('hello');

    vi.advanceTimersByTime(4000);
    expect(toast?.classList.contains('show')).toBe(false);

    vi.advanceTimersByTime(300);
    expect(document.getElementById('app-toast')).toBeNull();
  });

  it('replaces existing toasts, clears the prior timer, and supports known and fallback colors', () => {
    showToast('first', 'success');
    const firstToast = document.getElementById('app-toast');
    expect(firstToast?.style.getPropertyValue('--toast-color')).toBe('var(--success-color)');

    showToast('second', 'unknown');
    const secondToast = document.getElementById('app-toast');
    expect(secondToast).not.toBe(firstToast);
    expect(document.querySelectorAll('#app-toast')).toHaveLength(1);
    expect(secondToast?.textContent).toContain('second');
    expect(secondToast?.style.getPropertyValue('--toast-color')).toBe('var(--primary-cta)');

    vi.advanceTimersByTime(3999);
    expect(document.getElementById('app-toast')).toBe(secondToast);

    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(300);
    expect(document.getElementById('app-toast')).toBeNull();
  });

  it('closes a warning toast from the close button', () => {
    showToast('warning', 'warning');

    const toast = document.getElementById('app-toast');
    expect(toast?.style.getPropertyValue('--toast-color')).toBe('var(--warning-color)');

    toast?.querySelector('.toast-close')?.click();
    expect(toast?.classList.contains('show')).toBe(false);

    vi.advanceTimersByTime(300);
    expect(document.getElementById('app-toast')).toBeNull();
  });

  it('uses error styling for error toasts', () => {
    showToast('failed', 'error');

    expect(document.getElementById('app-toast')?.style.getPropertyValue('--toast-color')).toBe('var(--danger-color)');
  });
});
