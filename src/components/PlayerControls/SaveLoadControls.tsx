import { memo } from 'react';
import { Save, Download, Camera, Video, Circle } from 'lucide-react';
import { ControlButton } from './ControlButton';
import AutoSaveIndicator, { AutoSaveState } from '../UI/AutoSaveIndicator';
import HardcoreTooltip from '../UI/HardcoreTooltip';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface SaveLoadControlsProps {
    onSave: () => void;
    onLoad: () => void;
    onScreenshot: () => void;
    onRecordToggle?: () => void;
    isRecording?: boolean;
    disabled?: boolean;
    loadDisabled?: boolean;
    saveDisabled?: boolean;
    systemColor?: string;
    hardcoreRestrictions?: {
        canUseSaveStates?: boolean;
        isHardcore?: boolean;
    };
    autoSaveEnabled?: boolean;
    autoSaveProgress?: number;
    autoSaveState?: string;
    autoSavePaused?: boolean;
    onAutoSaveToggle?: () => void;
}

export const SaveLoadControls = memo(function SaveLoadControls({
    onSave,
    onLoad,
    onScreenshot,
    onRecordToggle,
    isRecording = false,
    disabled = false,
    loadDisabled = false,
    saveDisabled = false,
    systemColor = '#00FF41',
    hardcoreRestrictions,
    autoSaveEnabled = false,
    autoSaveProgress = 0,
    autoSaveState = 'idle',
    autoSavePaused = false,
    onAutoSaveToggle,
}: SaveLoadControlsProps) {
    const t = useKoinTranslation();

    return (
        <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto sm:flex-nowrap sm:gap-3 px-3 sm:px-4 sm:border-x sm:border-white/10 flex-shrink-0">
            {/* Auto-save indicator - clickable to toggle, always visible when enabled */}
            {autoSaveEnabled && (
                <div className="flex-shrink-0">
                    <AutoSaveIndicator
                        progress={autoSaveProgress}
                        state={autoSavePaused ? 'idle' : autoSaveState as AutoSaveState}
                        intervalSeconds={20}
                        isPaused={autoSavePaused}
                        onClick={onAutoSaveToggle}
                    />
                </div>
            )}
            <div className="relative group flex-shrink-0">
                <ControlButton
                    onClick={hardcoreRestrictions?.canUseSaveStates === false ? undefined : onSave}
                    icon={Save}
                    label={t.controls.save}
                    disabled={disabled || saveDisabled || hardcoreRestrictions?.canUseSaveStates === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip
                    show={hardcoreRestrictions?.canUseSaveStates === false}
                    message={hardcoreRestrictions?.isHardcore ? t.common.disabledInHardcore : t.common.notSupported}
                />
            </div>
            <div className="relative group flex-shrink-0">
                <ControlButton
                    onClick={hardcoreRestrictions?.canUseSaveStates === false ? undefined : onLoad}
                    icon={Download}
                    label={t.controls.load}
                    disabled={disabled || loadDisabled || hardcoreRestrictions?.canUseSaveStates === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip
                    show={hardcoreRestrictions?.canUseSaveStates === false}
                    message={hardcoreRestrictions?.isHardcore ? t.common.disabledInHardcore : t.common.notSupported}
                />
            </div>
            <div className="flex-shrink-0">
                <ControlButton
                    onClick={onScreenshot}
                    icon={Camera}
                    label={t.controls.snap}
                    disabled={disabled || saveDisabled}
                    systemColor={systemColor}
                />
            </div>

            {/* Recording button */}
            {onRecordToggle && (
                <div className="flex-shrink-0">
                    <button
                        onClick={onRecordToggle}
                        disabled={disabled}
                        className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isRecording ? t.controls.stopRecord : t.controls.startRecord}
                    >
                        <div className="relative">
                            {isRecording ? (
                                <>
                                    <Video size={20} className="text-red-500" />
                                    <Circle size={8} fill="#FF3333" className="absolute -top-0.5 -right-0.5 animate-pulse text-red-500" />
                                </>
                            ) : (
                                <Video size={20} style={{ color: systemColor }} />
                            )}
                        </div>
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: isRecording ? '#FF3333' : undefined }}
                        >
                            {t.controls.rec}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
});
