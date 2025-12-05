import ControlMapper from './Modals/ControlMapper';
import GamepadMapper from './Modals/GamepadMapper';
import CheatModal from './Modals/CheatModal';
import SaveSlotModal from './Modals/SaveSlotModal';
import { KeyboardMapping } from '../lib/controls';
import { SaveSlot } from './types';

interface GameModalsProps {
    controlsModalOpen: boolean;
    setControlsModalOpen: (open: boolean) => void;
    controls: KeyboardMapping;
    saveControls: (newControls: KeyboardMapping) => void;
    system: string;
    onResume: () => void;

    gamepadModalOpen: boolean;
    setGamepadModalOpen: (open: boolean) => void;
    gamepads: any[]; // Using any[] for now as Gamepad type might be complex or standard
    systemColor: string;

    cheatsModalOpen: boolean;
    setCheatsModalOpen: (open: boolean) => void;
    cheats: any[]; // Using any[] for Cheat type
    activeCheats: Set<number>;
    onToggleCheat: (cheatId: number) => void;

    // Save Slot Modal
    saveModalOpen: boolean;
    setSaveModalOpen: (open: boolean) => void;
    saveModalMode: 'save' | 'load';
    saveSlots: SaveSlot[];
    isSlotLoading: boolean;
    actioningSlot: number | null;
    onSlotSelect: (slot: number) => void;
    onSlotDelete: (slot: number) => void;
    maxSlots?: number;
    currentTier?: string;
    onUpgrade?: () => void;
}

export default function GameModals({
    controlsModalOpen,
    setControlsModalOpen,
    controls,
    saveControls,
    system,
    onResume,

    gamepadModalOpen,
    setGamepadModalOpen,
    gamepads,
    systemColor,

    cheatsModalOpen,
    setCheatsModalOpen,
    cheats,
    activeCheats,
    onToggleCheat,

    saveModalOpen,
    setSaveModalOpen,
    saveModalMode,
    saveSlots,
    isSlotLoading,
    actioningSlot,
    onSlotSelect,
    onSlotDelete,
    maxSlots,
    currentTier,
    onUpgrade,
}: GameModalsProps) {
    return (
        <>
            <ControlMapper
                isOpen={controlsModalOpen}
                controls={controls}
                onSave={saveControls}
                onClose={() => {
                    setControlsModalOpen(false);
                    onResume();
                }}
                system={system}
            />

            <GamepadMapper
                isOpen={gamepadModalOpen}
                gamepads={gamepads}
                onClose={() => {
                    setGamepadModalOpen(false);
                    onResume();
                }}
                systemColor={systemColor}
            />

            <CheatModal
                isOpen={cheatsModalOpen}
                cheats={cheats}
                activeCheats={activeCheats}
                onToggle={onToggleCheat}
                onClose={() => {
                    setCheatsModalOpen(false);
                    onResume();
                }}
            />

            <SaveSlotModal
                isOpen={saveModalOpen}
                mode={saveModalMode}
                slots={saveSlots}
                isLoading={isSlotLoading}
                actioningSlot={actioningSlot}
                onSelect={onSlotSelect}
                onDelete={onSlotDelete}
                onClose={() => {
                    setSaveModalOpen(false);
                    onResume();
                }}
                maxSlots={maxSlots}
                currentTier={currentTier}
                onUpgrade={onUpgrade}
            />
        </>
    );
}
