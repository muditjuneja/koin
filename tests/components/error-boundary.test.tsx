// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/UI/ErrorBoundary';

function FaultyChild({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('WebGL context was lost');
    }
    return <div data-testid="child-healthy">Game Running Smoothly</div>;
}

describe('ErrorBoundary Component', () => {
    it('renders child components cleanly when no error occurs', () => {
        render(
            <ErrorBoundary>
                <FaultyChild shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('child-healthy')).toBeDefined();
        expect(screen.getByText('Game Running Smoothly')).toBeDefined();
    });

    it('catches thrown error, invokes onError, and displays CRT recovery UI', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onError = vi.fn();
        const onExit = vi.fn();

        render(
            <ErrorBoundary onError={onError} onExit={onExit}>
                <FaultyChild shouldThrow={true} />
            </ErrorBoundary>
        );

        // Header and message rendered
        expect(screen.getByText('Emulation Fault')).toBeDefined();
        expect(screen.getByText('WebGL context was lost')).toBeDefined();

        // onError callback invoked
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0].message).toBe('WebGL context was lost');

        // Buttons exist
        expect(screen.getByText('Restart Player')).toBeDefined();
        expect(screen.getByText('Exit')).toBeDefined();

        // Clicking Exit
        fireEvent.click(screen.getByText('Exit'));
        expect(onExit).toHaveBeenCalledTimes(1);

        consoleErrorSpy.mockRestore();
    });

    it('allows toggling technical details stack trace', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <FaultyChild shouldThrow={true} />
            </ErrorBoundary>
        );

        const detailsButton = screen.getByText('Technical Details');
        expect(detailsButton).toBeDefined();

        // Initially details are collapsed
        expect(screen.queryByRole('textbox')).toBeNull();

        // Click to expand
        fireEvent.click(detailsButton);
        // Error stack or pre tag should now be in the document
        expect(document.querySelector('pre')).not.toBeNull();

        consoleErrorSpy.mockRestore();
    });

    it('recovers and calls onReset when Restart Player is clicked', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const onReset = vi.fn();

        function TestContainer() {
            const [hasThrown, setHasThrown] = useState(true);
            return (
                <ErrorBoundary onReset={() => { setHasThrown(false); onReset(); }}>
                    <FaultyChild shouldThrow={hasThrown} />
                </ErrorBoundary>
            );
        }

        render(<TestContainer />);

        expect(screen.getByText('Emulation Fault')).toBeDefined();

        // Click Restart Player
        fireEvent.click(screen.getByText('Restart Player'));

        expect(onReset).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('child-healthy')).toBeDefined();

        consoleErrorSpy.mockRestore();
    });
});
