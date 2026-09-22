// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGamepad, detectControllerBrand } from '../../src/hooks/useGamepad';

describe('detectControllerBrand', () => {
    it('identifies Xbox controllers and XInput devices', () => {
        expect(detectControllerBrand('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
        expect(detectControllerBrand('Xbox Wireless Controller')).toBe('xbox');
        expect(detectControllerBrand('Microsoft Controller')).toBe('xbox');
    });

    it('identifies PlayStation, Sony, DualSense, and DualShock controllers', () => {
        expect(detectControllerBrand('DualSense Wireless Controller')).toBe('playstation');
        expect(detectControllerBrand('Sony DualShock 4')).toBe('playstation');
        expect(detectControllerBrand('PlayStation 5 Controller')).toBe('playstation');
    });

    it('identifies Nintendo, Switch Pro, and Joy-Con controllers', () => {
        expect(detectControllerBrand('Nintendo Switch Pro Controller')).toBe('nintendo');
        expect(detectControllerBrand('Joy-Con (L/R)')).toBe('nintendo');
    });

    it('falls back to generic for unknown gamepads', () => {
        expect(detectControllerBrand('8BitDo Ultimate Wireless')).toBe('generic');
        expect(detectControllerBrand('USB Gamepad 123')).toBe('generic');
    });
});

describe('useGamepad Hook', () => {
    beforeEach(() => {
        vi.stubGlobal('navigator', {
            getGamepads: () => [],
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('initializes with empty gamepads and zero connected count', () => {
        const { result } = renderHook(() => useGamepad());
        expect(result.current.gamepads).toEqual([]);
        expect(result.current.connectedCount).toBe(0);
    });

    it('handles gamepad connected and disconnected window events', () => {
        const mockGamepad = {
            index: 0,
            id: 'Xbox 360 Controller',
            connected: true,
            buttons: [],
            axes: [],
        };

        vi.stubGlobal('navigator', {
            getGamepads: () => [mockGamepad],
        });

        const { result } = renderHook(() => useGamepad());

        // Dispatch gamepadconnected event
        act(() => {
            const event = new Event('gamepadconnected');
            (event as any).gamepad = mockGamepad;
            window.dispatchEvent(event);
        });

        expect(result.current.connectedCount).toBe(1);
        expect(result.current.gamepads[0].id).toBe('Xbox 360 Controller');
        expect(result.current.gamepads[0].name).toBe('Xbox 360 Controller');
        expect(detectControllerBrand(result.current.gamepads[0].id)).toBe('xbox');

        // Dispatch gamepaddisconnected event
        vi.stubGlobal('navigator', {
            getGamepads: () => [],
        });

        act(() => {
            const event = new Event('gamepaddisconnected');
            (event as any).gamepad = mockGamepad;
            window.dispatchEvent(event);
        });

        expect(result.current.connectedCount).toBe(0);
    });
});
