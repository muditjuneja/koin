export interface KoinTranslations {
    controls: {
        play: string;
        pause: string;
        reset: string;
        rewind: string;
        save: string;
        load: string;
        snap: string;
        rec: string;
        stopRec: string;
        startRecord: string;
        stopRecord: string;
        mute: string;
        unmute: string;
        help: string;
        full: string;
        keys: string;
        menuOpen: string;
        menuClose: string;
        gamepadConnected: string;
        noGamepad: string;
        press: string;
        startBtn: string;
        selectBtn: string;
    };
    common: {
        disabledInHardcore: string;
        notSupported: string;
        playToEnableRewind: string;
    };
    settings: {
        title: string;
        general: string;
        audio: string;
        video: string;
        input: string;
        advanced: string;
        fullscreen: string;
        controls: string;
        gamepad: string;
        cheats: string;
        retroAchievements: string;
        shortcuts: string;
        exit: string;
        language: string;
        selectLanguage: string;
    };
    overlay: {
        play: string;
        systemFirmware: string;
        loading: string;
        initializing: string;
        loadingSave: string;
        preparingSlot: string;
        systemError: string;
        failedInit: string;
        retry: string;
        slotReady: string;
        paused: string;
    };
    notifications: {
        saved: string;
        loaded: string;
        error: string;
        recordingStarted: string;
        recordingSaved: string;
        downloaded: string;
        loadedFile: string;
        savedSlot: string;
        loadedSlot: string;
        deletedSlot: string;
        emptySlot: string;
        noSaveFound: string;
        failedSave: string;
        failedLoad: string;
        failedDelete: string;
        failedFetch: string;
        controllerConnected: string;
        controllerDisconnected: string;
        controllerReady: string;
        insertCoin: string;
        insertCoinTitle: string;
        controlsSaved: string;
        controlsReset: string;
    };
    // Modals
    modals: {
        shortcuts: {
            title: string;
            playerShortcuts: string;
            overlays: string;
            recording: string;
            showHelp: string;
            perfOverlay: string;
            inputDisplay: string;
            toggleRec: string;
            toggleMute: string;
            pressEsc: string;
        };
        controls: {
            title: string;
            keyboard: string;
            description: string;
            pressKey: string;
            reset: string;
            save: string;
        },
        gamepad: {
            title: string;
            noGamepad: string;
            connected: string;
            none: string;
            player: string;
            noController: string;
            pressAny: string;
            waiting: string;
            pressButton: string;
            pressEsc: string;
            reset: string;
            save: string;
        },
        cheats: {
            title: string;
            addCheat: string;
            available: string;
            emptyTitle: string;
            emptyDesc: string;
            copy: string;
            active: string;
            toggleHint: string;
        },
        saveSlots: {
            title: string;
            saveTitle: string;
            loadTitle: string;
            emptySlot: string;
            subtitleSave: string;
            subtitleLoad: string;
            loading: string;
            locked: string;
            upgrade: string;
            autoSave: string;
            autoSaveDesc: string;
            noData: string;
            slot: string;
            footerSave: string;
            footerLoad: string;
        },
        bios: {
            title: string;
            description: string;
            warningTitle: string;
            warning: string;
            systemDefault: string;
            active: string;
            defaultDesc: string;
            emptyTitle: string;
            emptyDesc: string;
            footer: string;
        };
    };
    retroAchievements: {
        title: string;
        login: string;
        logout: string;
        username: string;
        password: string;
        hardcore: string;
        achievements: string;
        locked: string;
        unlocked: string;
        mastered: string;
        identifying: string;
        achievementsAvailable: string;
        gameNotSupported: string;
        connect: string;
        connected: string;
        createAccount: string;
        privacy: string;
        privacyText: string;
        connecting: string;
        connectAccount: string;
        poweredBy: string;
        connectedStatus: string;
        yourUsername: string;
        yourPassword: string;
        usernameRequired: string;
        noGame: string;
        loadGame: string;
        noAchievements: string;
        notSupported: string;
        ptsRemaining: string;
        filters: {
            all: string;
            locked: string;
            unlocked: string;
        };
    };
    overlays: {
        performance: {
            title: string;
            fps: string;
            frameTime: string;
            memory: string;
            core: string;
            input: string;
            active: string;
        };
        toast: {
            saved: string;
            loaded: string;
            error: string;
        };
        recording: {
            started: string;
            stopped: string;
            saved: string;
            paused: string;
            recording: string;
            resume: string;
            pause: string;
            stop: string;
            hover: string;
        };
    };
}

// Utility type for deep partials, useful for overriding only specific strings
export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};
