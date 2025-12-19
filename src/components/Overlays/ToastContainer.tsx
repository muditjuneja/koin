'use client';

import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  Gamepad2,
  X
} from 'lucide-react';
import { Toast, ToastType } from '../../hooks/useToast';
import { useAnimatedVisibility } from '../../hooks/useAnimatedVisibility';

interface ToastItemProps {
  toast: Toast;
  onDismiss?: (id: string) => void;
}

// Neo-brutalist color schemes - flat colors, no gradients
const TOAST_CONFIGS: Record<ToastType, {
  icon: any; // LucideIcon type causes issues with React.ComponentType
  bgColor: string;
  borderColor: string;
  accentColor: string;
  iconClass: string;
  shadowColor: string;
}> = {
  success: {
    icon: CheckCircle,
    bgColor: '#0a0a0a',
    borderColor: '#eab308', // Golden yellow like RA badge
    accentColor: '#eab308',
    iconClass: 'text-yellow-500',
    shadowColor: '#ca8a04',
  },
  error: {
    icon: XCircle,
    bgColor: '#0a0a0a',
    borderColor: '#ef4444',
    accentColor: '#ef4444',
    iconClass: 'text-red-400',
    shadowColor: '#dc2626',
  },
  info: {
    icon: Info,
    bgColor: '#0a0a0a',
    borderColor: '#3b82f6',
    accentColor: '#3b82f6',
    iconClass: 'text-blue-400',
    shadowColor: '#2563eb',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: '#0a0a0a',
    borderColor: '#f59e0b',
    accentColor: '#f59e0b',
    iconClass: 'text-amber-400',
    shadowColor: '#d97706',
  },
  gamepad: {
    icon: Gamepad2,
    bgColor: '#0a0a0a',
    borderColor: '#a855f7',
    accentColor: '#a855f7',
    iconClass: 'text-purple-400',
    shadowColor: '#9333ea',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { slideInRightClasses, triggerExit } = useAnimatedVisibility({
    exitDuration: 200,
    onExit: () => onDismiss?.(toast.id),
  });

  const config = TOAST_CONFIGS[toast.type];
  const IconComponent = config.icon;

  return (
    <div
      className={`relative transition-all duration-300 ease-out ${slideInRightClasses}`}
    >
      {/* Neo-brutalist card - flat color, hard shadow, bold border */}
      <div
        className="relative w-[320px] pointer-events-auto"
        style={{
          backgroundColor: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          boxShadow: `3px 3px 0px ${config.shadowColor}`,
        }}
      >
        <div className="px-3 py-2.5 flex items-center gap-2.5">
          {/* Icon - compact */}
          <div
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
            style={{
              backgroundColor: `${config.accentColor}20`,
              border: `2px solid ${config.borderColor}`,
            }}
          >
            {toast.icon ? (
              <span className="text-base">{toast.icon}</span>
            ) : (
              <IconComponent size={16} className={config.iconClass} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p
                className="text-[10px] font-black uppercase tracking-wider leading-none mb-1"
                style={{ color: config.accentColor }}
              >
                {toast.title}
              </p>
            )}
            <p className="text-xs text-gray-200 font-medium leading-snug">
              {toast.message}
            </p>
          </div>

          {/* Action button - inline right side */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                triggerExit();
              }}
              className="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-1 transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{
                color: config.bgColor,
                backgroundColor: config.accentColor,
                border: `2px solid ${config.borderColor}`,
              }}
            >
              {toast.action.label}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={triggerExit}
            className="flex-shrink-0 p-0.5 text-gray-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar - solid color */}
        {toast.duration && toast.duration > 0 && (
          <div className="h-0.5 bg-white/10">
            <div
              className="h-full"
              style={{
                backgroundColor: config.accentColor,
                animation: `shrink ${toast.duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss?: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}
