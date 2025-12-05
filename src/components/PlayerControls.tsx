'use client';

import { memo } from 'react';
import { PlayerControlsProps } from './types';
import { PlaybackControls } from './PlayerControls/PlaybackControls';
import { SaveLoadControls } from './PlayerControls/SaveLoadControls';
import { SettingsControls } from './PlayerControls/SettingsControls';

const PlayerControls = memo(function PlayerControls({
    isPaused,
    isRunning,
    speed,
    isRewinding,
    rewindBufferSize,
    onPauseToggle,
    onRestart,
    onSave,
    onLoad,
    onSpeedChange,
    onRewindStart,
    onRewindStop,
    onScreenshot,
    onFullscreen,
    onControls,
    onCheats,
    onRetroAchievements,
    onExit,
    disabled = false,
    loadDisabled = false,
    saveDisabled = false,
    hardcoreRestrictions,
    raConnected = false,
    raGameFound = false,
    raAchievementCount = 0,
    raIsIdentifying = false,
    autoSaveEnabled = false,
    autoSaveProgress = 0,
    autoSaveState = 'idle',
    autoSavePaused = false,
    onAutoSaveToggle,
    systemColor = '#00FF41',
    gamepadCount = 0,
    onGamepadSettings,
    volume = 100,
    isMuted = false,
    onVolumeChange,
    onToggleMute,
}: PlayerControlsProps & { loadDisabled?: boolean; saveDisabled?: boolean }) {

    return (
        <div className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-black/80 backdrop-blur-sm border-t border-white/10 shrink-0">
            {/* Left: Playback Controls */}
            <PlaybackControls
                isPaused={isPaused}
                isRunning={isRunning}
                speed={speed}
                isRewinding={isRewinding}
                rewindBufferSize={rewindBufferSize}
                onPauseToggle={onPauseToggle}
                onRestart={onRestart}
                onSpeedChange={onSpeedChange}
                onRewindStart={onRewindStart}
                onRewindStop={onRewindStop}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
                disabled={disabled}
                systemColor={systemColor}
                hardcoreRestrictions={hardcoreRestrictions}
            />

            {/* Center: Save/Load */}
            <SaveLoadControls
                onSave={onSave}
                onLoad={onLoad}
                onScreenshot={onScreenshot}
                disabled={disabled}
                loadDisabled={loadDisabled}
                saveDisabled={saveDisabled}
                systemColor={systemColor}
                hardcoreRestrictions={hardcoreRestrictions}
                autoSaveEnabled={autoSaveEnabled}
                autoSaveProgress={autoSaveProgress}
                autoSaveState={autoSaveState}
                autoSavePaused={autoSavePaused}
                onAutoSaveToggle={onAutoSaveToggle}
            />

            {/* Right: Settings & Exit */}
            <SettingsControls
                onFullscreen={onFullscreen}
                onControls={onControls}
                onGamepadSettings={onGamepadSettings}
                onCheats={onCheats}
                onRetroAchievements={onRetroAchievements}
                onExit={onExit}
                disabled={disabled}
                systemColor={systemColor}
                gamepadCount={gamepadCount}
                hardcoreRestrictions={hardcoreRestrictions}
                raConnected={raConnected}
                raGameFound={raGameFound}
                raAchievementCount={raAchievementCount}
                raIsIdentifying={raIsIdentifying}
            />
        </div>
    );
});

export default PlayerControls;
