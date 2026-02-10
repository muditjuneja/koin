import { useState, useEffect } from 'react';
import { Move, Hand, Zap, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'koin-controls-hint-shown';

interface ControlsHintProps {
    isVisible: boolean;
    systemColor?: string;
}

/**
 * Premium compact hint overlay that teaches users about controls
 */
export default function ControlsHint({ isVisible, systemColor = '#00FF41' }: ControlsHintProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isVisible) return;

        try {
            const wasShown = sessionStorage.getItem(STORAGE_KEY);
            if (!wasShown) {
                const timer = setTimeout(() => setShow(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch { }
    }, [isVisible]);

    const handleDismiss = () => {
        setShow(false);
        try {
            sessionStorage.setItem(STORAGE_KEY, 'true');
        } catch { }
    };

    if (!show) return null;

    const items = [
        {
            icon: Move,
            title: 'Reposition',
            desc: 'Unlock at top to drag controls.',
        },
        {
            icon: Hand,
            title: 'Hold Mode',
            desc: 'Keep any button pressed down.',
        },
        {
            icon: Zap,
            title: 'Turbo Mode',
            desc: 'Continuous rapid-fire input.',
        },
        {
            icon: Smartphone,
            title: 'Auto-Save',
            desc: 'Layouts saved per orientation.',
        },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={handleDismiss}
        >
            <div
                className="w-full max-w-[350px] bg-zinc-950/90 border border-white/10 rounded-[32px] shadow-2xl pointer-events-auto max-h-[96vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-5 pb-3 text-center flex-shrink-0">
                    <h3 className="text-white text-base font-black uppercase tracking-tight">
                        Controller Tips
                    </h3>
                </div>

                {/* Grid - Scrollable area (as fallback) */}
                <div className="grid grid-cols-2 gap-px bg-white/5 border-y border-white/5 overflow-y-auto scrollbar-hide min-h-0">
                    {items.map((item, i) => (
                        <div key={i} className="p-4 flex flex-col items-center text-center bg-zinc-950/40">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform active:scale-95"
                                style={{
                                    backgroundColor: `${systemColor}15`,
                                    border: `1px solid ${systemColor}30`,
                                    boxShadow: `0 0 15px ${systemColor}10`
                                }}
                            >
                                <item.icon size={20} style={{ color: systemColor }} />
                            </div>
                            <h4 className="text-white text-[10px] font-bold uppercase mb-1 tracking-wide">{item.title}</h4>
                            <p className="text-white/40 text-[9px] leading-tight font-medium px-1">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="w-full py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 hover:brightness-110 shadow-lg"
                        style={{
                            backgroundColor: systemColor,
                            color: '#000',
                            boxShadow: `0 4px 15px ${systemColor}40`
                        }}
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
}
