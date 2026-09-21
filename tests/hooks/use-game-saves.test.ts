// @vitest-environment jsdom
/**
 * tests/hooks/use-game-saves.test.ts
 *
 * Tests for the `useGameSaves` hook, in particular `handleSlotDelete`'s
 * confirmation guard: deleting a save is a destructive action and must
 * never proceed without a confirmed "yes", including when window.confirm
 * itself is unavailable (SSR-safety guard should fail closed, not open).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameSaves } from '../../src/hooks/useGameSaves';

function makeMockNostalgist() {
    return {
        status: 'running' as const,
        saveStateWithBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']) }),
        loadState: vi.fn().mockResolvedValue(undefined),
        screenshot: vi.fn().mockResolvedValue(undefined),
    };
}

function makeProps(overrides?: Partial<Parameters<typeof useGameSaves>[0]>) {
    const nostalgist = makeMockNostalgist();
    return {
        nostalgist,
        props: {
            nostalgist: nostalgist as any,
            showToast: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
            onGetSaveSlots: vi.fn().mockResolvedValue([]),
            onSaveState: vi.fn().mockResolvedValue(undefined),
            onLoadState: vi.fn().mockResolvedValue(new Blob(['saved'])),
            onDeleteSaveState: vi.fn().mockResolvedValue(undefined),
            ...overrides,
        },
    };
}

describe('useGameSaves hook', () => {
    let confirmSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // handleSlotDelete: confirmation guard
    // -----------------------------------------------------------------------
    it('deletes the slot when the user confirms', async () => {
        const { props } = makeProps();
        confirmSpy.mockReturnValue(true);

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleSlotDelete(2);
        });

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this save?');
        expect(props.onDeleteSaveState).toHaveBeenCalledWith(2);
    });

    it('does not delete the slot when the user cancels the confirmation', async () => {
        const { props } = makeProps();
        confirmSpy.mockReturnValue(false);

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleSlotDelete(3);
        });

        expect(props.onDeleteSaveState).not.toHaveBeenCalled();
    });

    it('does not delete the slot when window.confirm is unavailable (fails closed, not open)', async () => {
        const { props } = makeProps();
        confirmSpy.mockRestore();
        const originalConfirm = window.confirm;
        // @ts-expect-error - simulating a host/environment without window.confirm
        delete window.confirm;

        try {
            const { result } = renderHook(() => useGameSaves(props));

            await act(async () => {
                await result.current.handleSlotDelete(1);
            });

            expect(props.onDeleteSaveState).not.toHaveBeenCalled();
        } finally {
            window.confirm = originalConfirm;
        }
    });

    it('does nothing when onDeleteSaveState is not provided, without prompting', async () => {
        const { props } = makeProps({ onDeleteSaveState: undefined });

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleSlotDelete(0);
        });

        expect(confirmSpy).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // handleSave / handleLoad / handleSlotSelect: basic coverage
    // (previously untested despite a 78-line diff in this PR)
    // -----------------------------------------------------------------------
    it('handleSave opens the slot-selection modal and pauses when a slot system is configured', async () => {
        const { props } = makeProps();

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleSave();
        });

        expect(props.pause).toHaveBeenCalledTimes(1);
        expect(result.current.saveModalOpen).toBe(true);
        expect(result.current.saveModalMode).toBe('save');
        expect(props.onGetSaveSlots).toHaveBeenCalledTimes(1);
    });

    it('handleLoad opens the slot-selection modal in load mode', async () => {
        const { props } = makeProps();

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleLoad();
        });

        expect(result.current.saveModalOpen).toBe(true);
        expect(result.current.saveModalMode).toBe('load');
    });

    it('handleSlotSelect in save mode saves to the chosen slot and resumes', async () => {
        const { props } = makeProps();

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleSave(); // sets saveModalMode to 'save'
        });

        await act(async () => {
            await result.current.handleSlotSelect(5);
        });

        expect(props.onSaveState).toHaveBeenCalledWith(5, expect.any(Blob), undefined);
        expect(props.resume).toHaveBeenCalled();
        expect(result.current.saveModalOpen).toBe(false);
    });

    it('handleSlotSelect in load mode loads the chosen slot and resumes', async () => {
        const { props } = makeProps();

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleLoad();
        });

        await act(async () => {
            await result.current.handleSlotSelect(5);
        });

        expect(props.onLoadState).toHaveBeenCalledWith(5);
        expect(props.resume).toHaveBeenCalled();
        expect(result.current.saveModalOpen).toBe(false);
    });

    it('handleSlotSelect in load mode shows an error toast when the slot is empty', async () => {
        const { props } = makeProps({ onLoadState: vi.fn().mockResolvedValue(null) });

        const { result } = renderHook(() => useGameSaves(props));

        await act(async () => {
            await result.current.handleLoad();
        });

        await act(async () => {
            await result.current.handleSlotSelect(9);
        });

        expect(props.showToast).toHaveBeenCalledWith(
            expect.any(String),
            'error',
            expect.objectContaining({ title: expect.any(String) })
        );
        // Modal stays open since nothing was loaded
        expect(result.current.saveModalOpen).toBe(true);
    });
});
