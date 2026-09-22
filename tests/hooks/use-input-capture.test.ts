// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInputCapture } from '../../src/hooks/useInputCapture';

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
}

describe('useInputCapture', () => {
    let onClose: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onClose = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // 1. Initial state
    it('initializes with isListening = false and listeningFor = null', () => {
        const { result } = renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        expect(result.current.isListening).toBe(false);
        expect(result.current.listeningFor).toBeNull();
    });

    // 2. startListening
    it('startListening(target) sets listeningFor to the target and isListening to true', () => {
        const { result } = renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        act(() => {
            result.current.startListening('ButtonA');
        });
        expect(result.current.listeningFor).toBe('ButtonA');
        expect(result.current.isListening).toBe(true);
    });

    // 3. stopListening
    it('stopListening() resets listeningFor to null and isListening to false', () => {
        const { result } = renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        act(() => {
            result.current.startListening('ButtonB');
        });
        expect(result.current.isListening).toBe(true);
        act(() => {
            result.current.stopListening();
        });
        expect(result.current.listeningFor).toBeNull();
        expect(result.current.isListening).toBe(false);
    });

    // 4. Escape while listening -> cancel listening, no onClose
    it('Escape while isListening = true cancels listening and does NOT call onClose', () => {
        const { result } = renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        act(() => {
            result.current.startListening('ButtonC');
        });
        expect(result.current.isListening).toBe(true);
        act(() => {
            pressEscape();
        });
        expect(result.current.listeningFor).toBeNull();
        expect(result.current.isListening).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
    });

    // 5. Escape while not listening -> onClose
    it('Escape while isListening = false calls onClose', () => {
        renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        act(() => {
            pressEscape();
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    // 6. listeningFor resets when isOpen flips to false
    it('listeningFor resets to null when isOpen changes from true to false', () => {
        const { result, rerender } = renderHook(
            ({ isOpen }: { isOpen: boolean }) =>
                useInputCapture<string>({ isOpen, onClose }),
            { initialProps: { isOpen: true } }
        );
        act(() => {
            result.current.startListening('ButtonD');
        });
        expect(result.current.listeningFor).toBe('ButtonD');
        rerender({ isOpen: false });
        expect(result.current.listeningFor).toBeNull();
        expect(result.current.isListening).toBe(false);
    });

    // 7. No keydown listener when modal is closed
    it('no Escape listener is attached when isOpen is false', () => {
        const addEventSpy = vi.spyOn(window, 'addEventListener');
        renderHook(() =>
            useInputCapture<string>({ isOpen: false, onClose })
        );
        const keydownCalls = addEventSpy.mock.calls.filter(([type]) => type === 'keydown');
        expect(keydownCalls).toHaveLength(0);
        act(() => {
            pressEscape();
        });
        expect(onClose).not.toHaveBeenCalled();
    });

    // bonus: cleanup on unmount
    it('removes the keydown listener when the hook unmounts', () => {
        const removeEventSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() =>
            useInputCapture<string>({ isOpen: true, onClose })
        );
        unmount();
        expect(
            removeEventSpy.mock.calls.some(([type]) => type === 'keydown')
        ).toBe(true);
    });
});
