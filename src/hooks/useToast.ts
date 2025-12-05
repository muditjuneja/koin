'use client';

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'gamepad';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
    icon?: string; // Emoji or icon name
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface ShowToastOptions {
    title?: string;
    icon?: string;
    duration?: number;
    action?: Toast['action'];
}

export interface UseToastReturn {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, options?: ShowToastOptions) => void;
    dismissToast: (id: string) => void;
    clearToasts: () => void;
}

/**
 * Hook for managing toast notifications
 * @param defaultDuration - Default duration for toasts (default 3000ms)
 */
export function useToast(defaultDuration: number = 3000): UseToastReturn {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((
        message: string,
        type: ToastType = 'info',
        options?: ShowToastOptions
    ) => {
        const id = crypto.randomUUID();
        const duration = options?.duration ?? defaultDuration;

        const newToast: Toast = {
            id,
            message,
            type,
            title: options?.title,
            icon: options?.icon,
            duration,
            action: options?.action,
        };

        setToasts((prev) => [...prev, newToast]);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, [defaultDuration]);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return {
        toasts,
        showToast,
        dismissToast,
        clearToasts,
    };
}
