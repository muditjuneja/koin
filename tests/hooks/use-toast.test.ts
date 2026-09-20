// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../../src/hooks/useToast';

describe('useToast Hook Lifecycle & Resilience', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('initializes with an empty toast list', () => {
        const { result } = renderHook(() => useToast());
        expect(result.current.toasts).toEqual([]);
    });

    it('adds a toast notification with default duration', () => {
        const { result } = renderHook(() => useToast(3000));

        act(() => {
            result.current.showToast('Save state loaded', 'success');
        });

        expect(result.current.toasts.length).toBe(1);
        const toast = result.current.toasts[0];
        expect(toast.message).toBe('Save state loaded');
        expect(toast.type).toBe('success');
        expect(toast.id).toBeDefined();
        expect(toast.duration).toBe(3000);
    });

    it('auto-dismisses toast after its duration elapses', () => {
        const { result } = renderHook(() => useToast(2000));

        act(() => {
            result.current.showToast('Temporary alert', 'info', { duration: 1500 });
        });

        expect(result.current.toasts.length).toBe(1);

        // Fast forward 1000ms: toast should still exist
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current.toasts.length).toBe(1);

        // Fast forward another 600ms: toast should be auto-dismissed
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(result.current.toasts.length).toBe(0);
    });

    it('supports manual dismissal by ID', () => {
        const { result } = renderHook(() => useToast(5000));

        act(() => {
            result.current.showToast('Toast 1', 'info');
            result.current.showToast('Toast 2', 'warning');
        });

        expect(result.current.toasts.length).toBe(2);
        const firstId = result.current.toasts[0].id;

        act(() => {
            result.current.dismissToast(firstId);
        });

        expect(result.current.toasts.length).toBe(1);
        expect(result.current.toasts[0].message).toBe('Toast 2');
    });

    it('clears all active toasts with clearToasts', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.showToast('Message A', 'info');
            result.current.showToast('Message B', 'error');
            result.current.showToast('Message C', 'gamepad');
        });

        expect(result.current.toasts.length).toBe(3);

        act(() => {
            result.current.clearToasts();
        });

        expect(result.current.toasts.length).toBe(0);
    });

    it('operates safely in non-secure HTTP contexts where crypto.randomUUID is undefined', () => {
        // Simulate non-secure context (e.g. mobile access over local LAN http://192.168.x.x)
        const originalCrypto = globalThis.crypto;
        // @ts-expect-error - simulating incomplete/missing crypto.randomUUID
        delete globalThis.crypto;

        const { result } = renderHook(() => useToast());

        expect(() => {
            act(() => {
                result.current.showToast('Testing mobile HTTP LAN fallback', 'info');
            });
        }).not.toThrow();

        expect(result.current.toasts.length).toBe(1);
        expect(typeof result.current.toasts[0].id).toBe('string');
        expect(result.current.toasts[0].id.length).toBeGreaterThan(0);

        // Restore
        globalThis.crypto = originalCrypto;
    });

    it('attaches optional action handlers and titles', () => {
        const { result } = renderHook(() => useToast());
        const actionSpy = vi.fn();

        act(() => {
            result.current.showToast('Controller connected', 'gamepad', {
                title: 'Gamepad 1',
                icon: 'gamepad',
                action: {
                    label: 'Configure',
                    onClick: actionSpy,
                },
            });
        });

        const toast = result.current.toasts[0];
        expect(toast.title).toBe('Gamepad 1');
        expect(toast.icon).toBe('gamepad');
        expect(toast.action?.label).toBe('Configure');

        toast.action?.onClick();
        expect(actionSpy).toHaveBeenCalledTimes(1);
    });

    it('cleans up auto-dismiss timers on unmount', () => {
        const { result, unmount } = renderHook(() => useToast(3000));

        act(() => {
            result.current.showToast('Unmount test', 'info');
        });

        expect(result.current.toasts.length).toBe(1);
        unmount();

        // Advancing timers after unmount should not throw or cause state update warnings
        expect(() => {
            act(() => {
                vi.advanceTimersByTime(3500);
            });
        }).not.toThrow();
    });

    it('cancels auto-dismiss timer when toast is manually dismissed', () => {
        const { result } = renderHook(() => useToast(3000));

        act(() => {
            result.current.showToast('Dismiss test', 'info');
        });

        const id = result.current.toasts[0].id;

        act(() => {
            result.current.dismissToast(id);
        });
        expect(result.current.toasts.length).toBe(0);

        act(() => {
            vi.advanceTimersByTime(3500);
        });
        expect(result.current.toasts.length).toBe(0);
    });
});

