import { AlertTriangle, Loader2, Save, Play } from 'lucide-react';
import { EmulatorStatus } from '../../hooks/useNostalgist';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface GameOverlayProps {
  status: EmulatorStatus;
  system?: string;
  error?: string | null;
  isPaused: boolean;
  onStart: () => void;
  systemColor?: string;
  pendingSlot?: number; // If set, indicates a save will be loaded on start
  isLoadingSave?: boolean; // If true, shows loading indicator for save
  onSelectBios?: () => void;
}

// Unified loading spinner component
function LoadingSpinner({ color, size = 'lg' }: { color: string; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return <Loader2 className={`${sizeClass} animate-spin`} style={{ color }} />;
}

export default function GameOverlay({
  status,
  system,
  error,
  isPaused,
  onStart,
  systemColor = '#00FF41',
  pendingSlot,
  isLoadingSave,
  onSelectBios,
}: GameOverlayProps) {
  const t = useKoinTranslation();

  // Unified Loading Overlay - covers both emulator init and save fetching
  const isLoading = status === 'loading' || (status === 'ready' && isLoadingSave);

  if (isLoading) {
    const message = status === 'loading'
      ? { title: t.overlay.loading.replace('{{system}}', system || ''), subtitle: t.overlay.initializing }
      : { title: t.overlay.loadingSave, subtitle: t.overlay.preparingSlot.replace('{{num}}', String(pendingSlot || '')) };

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner color={systemColor} size="lg" />
          <div className="text-center">
            <p className="font-mono uppercase tracking-widest text-sm" style={{ color: systemColor }}>
              {message.title}
            </p>
            <p className="text-xs mt-1 text-gray-500">{message.subtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  // Ready - Press to Start Overlay
  if (status === 'ready') {
    const hasPendingSave = Boolean(pendingSlot);

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20">
        <button
          onClick={onStart}
          className="group flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all cursor-pointer hover:scale-105"
          style={{
            backgroundColor: `${systemColor}10`,
            borderColor: `${systemColor}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = systemColor;
            e.currentTarget.style.backgroundColor = `${systemColor}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${systemColor}40`;
            e.currentTarget.style.backgroundColor = `${systemColor}10`;
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${systemColor}20` }}
          >
            <Play className="w-8 h-8 ml-1" style={{ color: systemColor }} fill={systemColor} />
          </div>
          <span className="font-mono text-lg uppercase tracking-wider" style={{ color: systemColor }}>
            {t.overlay.play}
          </span>
          {hasPendingSave && (
            <span className="text-gray-400 text-xs flex items-center gap-1">
              <Save size={12} /> {t.overlay.slotReady.replace('{{num}}', String(pendingSlot))}
            </span>
          )}
        </button>

        {onSelectBios && (
          <button
            onClick={onSelectBios}
            className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: systemColor }} />
            <span className="font-mono uppercase tracking-wider text-xs">
              {t.overlay.systemFirmware}
            </span>
          </button>
        )}
      </div>
    );
  }

  // Error Overlay
  if (status === 'error') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <p className="text-red-400 font-mono uppercase tracking-widest text-sm">
              {t.overlay.systemError}
            </p>
            <p className="text-gray-500 text-xs mt-1 max-w-xs">
              {error || t.overlay.failedInit}
            </p>
          </div>
          <button
            onClick={onStart}
            className="mt-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors"
            style={{ backgroundColor: systemColor, color: '#000' }}
          >
            {t.overlay.retry}
          </button>
        </div>
      </div>
    );
  }

  // Paused Overlay
  if (isPaused && status === 'paused') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full border-3 flex items-center justify-center"
            style={{ borderColor: systemColor }}
          >
            <div className="flex gap-1.5">
              <div className="w-2.5 h-8 rounded-sm" style={{ backgroundColor: systemColor }} />
              <div className="w-2.5 h-8 rounded-sm" style={{ backgroundColor: systemColor }} />
            </div>
          </div>
          <p className="font-mono uppercase tracking-wider text-sm" style={{ color: systemColor }}>
            {t.overlay.paused}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

