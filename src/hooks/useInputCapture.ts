/**
 * Hook for capturing input in mapper modals
 * Manages the listening state and Escape key handling for control/gamepad mappers
 */

import { useState, useCallback, useEffect } from 'react';

export interface UseInputCaptureOptions<T> {
    /** Whether the modal is currently open */
    isOpen: boolean;
    /** Callback to close the modal (called on Escape when not listening) */
    onClose: () => void;
}

export interface UseInputCaptureReturn<T> {
    /** The button/key we're currently listening for input on */
    listeningFor: T | null;
    /** Start listening for input on the given target */
    startListening: (target: T) => void;
    /** Stop listening without capturing */
    stopListening: () => void;
    /** Whether we're currently in listening mode */
    isListening: boolean;
}

/**
 * Hook for managing input capture state in mapper modals
 * Handles Escape key: cancels listening if active, otherwise closes modal
 */
export function useInputCapture<T>({
    isOpen,
    onClose,
}: UseInputCaptureOptions<T>): UseInputCaptureReturn<T> {
    const [listeningFor, setListeningFor] = useState<T | null>(null);

    const startListening = useCallback((target: T) => {
        setListeningFor(target);
    }, []);

    const stopListening = useCallback(() => {
        setListeningFor(null);
    }, []);

    // Reset listening state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setListeningFor(null);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                if (listeningFor !== null) {
                    // Cancel listening mode
                    e.preventDefault();
                    e.stopPropagation();
                    setListeningFor(null);
                } else {
                    // Close the modal
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, listeningFor, onClose]);

    return {
        listeningFor,
        startListening,
        stopListening,
        isListening: listeningFor !== null,
    };
}
