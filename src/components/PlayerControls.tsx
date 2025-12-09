'use client';

import React, { memo } from 'react';
import { PlayerControlsProps } from './types';
import { PlaybackControls } from './PlayerControls/PlaybackControls';
import { SaveLoadControls } from './PlayerControls/SaveLoadControls';
import { SettingsControls } from './PlayerControls/SettingsControls';
import MobileControlDrawer from './PlayerControls/MobileControlDrawer';

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
    onShowShortcuts,
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
    onRecordToggle,
    isRecording = false,
    currentShader,
    onShaderChange,
}: PlayerControlsProps & { loadDisabled?: boolean; saveDisabled?: boolean }) {

    // Shared controls content
    const controlsContent = (
        <>
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

            <SaveLoadControls
                onSave={onSave}
                onLoad={onLoad}
                onScreenshot={onScreenshot}
                onRecordToggle={onRecordToggle}
                isRecording={isRecording}
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

            <SettingsControls
                onFullscreen={onFullscreen}
                onControls={onControls}
                onGamepadSettings={onGamepadSettings}
                onCheats={onCheats}
                onRetroAchievements={onRetroAchievements}
                onShowShortcuts={onShowShortcuts}
                onExit={onExit}
                currentShader={currentShader}
                onShaderChange={onShaderChange}
                isRunning={isRunning}
                disabled={disabled}
                systemColor={systemColor}
                gamepadCount={gamepadCount}
                hardcoreRestrictions={hardcoreRestrictions}
                raConnected={raConnected}
                raGameFound={raGameFound}
                raAchievementCount={raAchievementCount}
                raIsIdentifying={raIsIdentifying}
            />
        </>
    );

    return (
        <>
            {/* Mobile: FAB + Drawer */}
            <MobileControlDrawer systemColor={systemColor}>
                {controlsContent}
            </MobileControlDrawer>

            {/* Desktop: Static bar */}
            <div className="hidden sm:flex w-full items-center justify-between gap-4 px-6 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10 shrink-0">
                {controlsContent}
            </div>
        </>
    );
});

export default PlayerControls;
