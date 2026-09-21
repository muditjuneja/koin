'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface ErrorBoundaryProps {
    children: ReactNode;
    onError?: (error: Error) => void;
    onReset?: () => void;
    onExit?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            showDetails: false,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
            showDetails: false,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[koin.js ErrorBoundary] Uncaught runtime exception:', error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error);
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, showDetails: false });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (this.state.hasError) {
            const { error, showDetails } = this.state;
            const { onExit } = this.props;

            return (
                <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-black/95 text-white p-6 font-mono select-none overflow-hidden">
                    {/* Background CRT scanlines effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ff3333_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />

                    <div className="relative z-10 max-w-lg w-full bg-zinc-900/90 border border-red-500/40 rounded-xl p-6 shadow-2xl backdrop-blur-md">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertTriangle className="w-7 h-7 flex-shrink-0 animate-pulse" />
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-red-400">
                                    Emulation Fault
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    The player encountered an unexpected runtime error.
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        <div className="bg-black/60 border border-zinc-800 rounded-lg p-3 mb-4 text-xs text-zinc-300 break-words leading-relaxed">
                            {error?.message || 'An unknown error occurred inside the emulator.'}
                        </div>

                        {/* Expandable Technical Details */}
                        {error?.stack && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={this.toggleDetails}
                                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                                >
                                    <span>Technical Details</span>
                                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {showDetails && (
                                    <pre className="mt-2 p-2 bg-black/80 border border-zinc-800/80 rounded text-[10px] text-zinc-400 max-h-32 overflow-auto font-mono whitespace-pre-wrap">
                                        {error.stack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <RefreshCw size={14} />
                                <span>Restart Player</span>
                            </button>

                            {onExit && (
                                <button
                                    type="button"
                                    onClick={onExit}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <X size={14} />
                                    <span>Exit</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
