import { memo } from 'react';
import { Save, Download, Camera } from 'lucide-react';
import { ControlButton } from './ControlButton';
import AutoSaveIndicator, { AutoSaveState } from '../UI/AutoSaveIndicator';
import HardcoreTooltip from '../UI/HardcoreTooltip';

interface SaveLoadControlsProps {
    onSave: () => void;
    onLoad: () => void;
    onScreenshot: () => void;
    disabled?: boolean;
    loadDisabled?: boolean;
    saveDisabled?: boolean;
    systemColor?: string;
    hardcoreRestrictions?: {
        canUseSaveStates?: boolean;
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
    return (
        <div className="flex items-center gap-3 px-3 sm:px-4 border-x border-white/10 flex-shrink-0">
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
                    label="Save"
                    disabled={disabled || saveDisabled || hardcoreRestrictions?.canUseSaveStates === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip show={hardcoreRestrictions?.canUseSaveStates === false} />
            </div>
            <div className="relative group flex-shrink-0">
                <ControlButton
                    onClick={hardcoreRestrictions?.canUseSaveStates === false ? undefined : onLoad}
                    icon={Download}
                    label="Load"
                    disabled={disabled || loadDisabled || hardcoreRestrictions?.canUseSaveStates === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip show={hardcoreRestrictions?.canUseSaveStates === false} />
            </div>
            <div className="flex-shrink-0">
                <ControlButton
                    onClick={onScreenshot}
                    icon={Camera}
                    label="Snap"
                    disabled={disabled || saveDisabled}
                    systemColor={systemColor}
                />
            </div>
        </div>
    );
});
