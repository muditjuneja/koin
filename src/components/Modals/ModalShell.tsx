'use client';

import { X } from 'lucide-react';
import React from 'react';

interface ModalShellProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when modal should close (backdrop click or X button) */
    onClose: () => void;
    /** Modal title */
    title: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Icon element (already rendered, e.g. <Code size={24} />) */
    icon: React.ReactNode;
    /** Modal content */
    children: React.ReactNode;
    /** Optional footer content */
    footer?: React.ReactNode;
    /** Max width variant */
    maxWidth?: 'sm' | 'md' | 'lg';
    /** System color for theming */
    systemColor?: string;
    /** Whether clicking backdrop should close (default: true, set false when in listening mode) */
    closeOnBackdrop?: boolean;
}

const MAX_WIDTH_CLASSES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
} as const;

/**
 * Shared modal shell component
 * Provides consistent structure: backdrop, header with icon/title/close, scrollable content, optional footer
 */
export default function ModalShell({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    maxWidth = 'lg',
    systemColor,
    closeOnBackdrop = true,
}: ModalShellProps) {
    if (!isOpen) return null;

    const handleBackdropClick = () => {
        if (closeOnBackdrop) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* Modal */}
            <div
                className={`relative bg-gray-900 border border-retro-primary/30 rounded-xl shadow-2xl w-full ${MAX_WIDTH_CLASSES[maxWidth]} max-h-full flex flex-col overflow-hidden`}
                style={systemColor ? { borderColor: `${systemColor}30` } : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-black/50 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0" style={systemColor ? { color: systemColor } : undefined}>
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
                            {subtitle && (
                                <p className="text-xs text-gray-400 truncate">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content — scrollable within viewport-constrained modal */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-black/30 border-t border-white/10 flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
