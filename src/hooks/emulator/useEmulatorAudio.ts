import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';

interface UseEmulatorAudioProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
    initialVolume?: number;
    /**
     * Called once, the moment RetroArch's AudioContext first connects to the
     * speakers and koin's monkey-patched GainNode is created. The GainNode
     * does not exist at emulator start — only after the game emits its
     * first sample — so netplay's audio tap (getAudioStream) uses this to
     * know exactly when it becomes available instead of polling.
     */
    onGainNodeReady?: (gainNode: GainNode) => void;
}

interface UseEmulatorAudioReturn {
    volume: number;
    isMuted: boolean;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    /**
     * A live MediaStream of the emulator's audio output, tapped off the same
     * GainNode the volume slider controls. Returns null until that GainNode
     * exists (see onGainNodeReady) — the game must have made its first sound.
     */
    getAudioStream: () => MediaStream | null;
}

export function useEmulatorAudio({ nostalgistRef, initialVolume = 100, onGainNodeReady }: UseEmulatorAudioProps): UseEmulatorAudioReturn {
    const [volume, setVolume] = useState(initialVolume);
    const [isMuted, setIsMuted] = useState(false);

    // Volume control - Intercept Web Audio API
    // We monkey-patch AudioNode.connect to inject a GainNode before the destination
    const gainNodeRef = useRef<GainNode | null>(null);
    const lastVolumeRef = useRef(initialVolume);
    const audioStreamRef = useRef<MediaStream | null>(null);

    // Read via ref rather than an effect dependency so the connect() patch
    // below (installed once on mount) always calls the *latest* callback
    // without needing to reinstall the monkey-patch when it changes identity.
    const onGainNodeReadyRef = useRef(onGainNodeReady);
    useEffect(() => {
        onGainNodeReadyRef.current = onGainNodeReady;
    }, [onGainNodeReady]);

    useEffect(() => {
        // Guard: AudioNode only exists in browser — skip in SSR / Cloudflare Workers
        if (typeof AudioNode === 'undefined') return;

        // Store original connect method
        const originalConnect = AudioNode.prototype.connect;

        // WeakMap to store GainNodes for each AudioContext to avoid creating duplicates
        const contextGainMap = new WeakMap<BaseAudioContext, GainNode>();

        // Patch connect
        (AudioNode.prototype as any).connect = function (destination: AudioNode | AudioParam, output?: number, input?: number) {
            // Check if we are connecting to the destination (speakers)
            if (destination instanceof AudioNode && destination === this.context.destination) {
                try {
                    // Get or create GainNode for this context
                    let gainNode = contextGainMap.get(this.context);
                    if (!gainNode) {
                        const newGainNode = this.context.createGain();
                        // Initialize volume
                        newGainNode.gain.value = lastVolumeRef.current / 100;
                        // Connect GainNode to destination
                        // Use apply to handle variable arguments correctly
                        (originalConnect as Function).apply(newGainNode, [destination]);
                        contextGainMap.set(this.context, newGainNode);

                        // Store in ref if this is likely our context (heuristic)
                        gainNodeRef.current = newGainNode;
                        gainNode = newGainNode;
                        console.log('[Nostalgist] AudioContext intercepted and GainNode injected');
                        onGainNodeReadyRef.current?.(newGainNode);
                    }

                    // Connect this node to the GainNode instead of destination
                    // We cast gainNode to any to avoid strict type checks on the overloaded connect method
                    return (originalConnect as Function).call(this, gainNode!, output, input);
                } catch (err) {
                    console.error('[Nostalgist] Audio interception error:', err);
                    return (originalConnect as Function).apply(this, [destination, output, input]);
                }
            }

            // Default behavior for other connections
            return (originalConnect as Function).apply(this, [destination, output, input]);
        };

        return () => {
            // Restore original connect on cleanup
            AudioNode.prototype.connect = originalConnect;
        };
    }, []);


    const setVolumeLevel = useCallback((newVolume: number) => {
        // Clamp to 0-100 range
        const clampedVolume = Math.max(0, Math.min(100, newVolume));
        const volumeValue = clampedVolume / 100; // Convert to 0.0-1.0

        try {
            // Update the GainNode if we have one
            if (gainNodeRef.current) {
                // Smooth transition to avoid clicks
                const currentTime = gainNodeRef.current.context.currentTime;
                gainNodeRef.current.gain.setValueAtTime(volumeValue, currentTime);
            } else {
                // Fallback: Try to find audio elements (for some cores that might use them)
                const audioElements = document.querySelectorAll('audio, video');
                audioElements.forEach((element) => {
                    if (element instanceof HTMLMediaElement) {
                        element.volume = volumeValue;
                    }
                });
            }

            // Update state
            setVolume(clampedVolume);
            lastVolumeRef.current = clampedVolume;
        } catch (err) {
            console.error('[Nostalgist] Volume change error:', err);
        }
    }, []);

    // Simple mute toggle using keyboard simulation (F9 key)
    const toggleMute = useCallback(() => {
        if (!nostalgistRef.current) return;

        try {
            // Fire keyboard event directly to Emscripten's event handlers
            const emscripten = nostalgistRef.current.getEmscripten();
            if (emscripten?.JSEvents) {
                const canvas = nostalgistRef.current.getCanvas?.();
                // Create fake events with required methods
                const createFakeEvent = (code: string) => ({
                    code,
                    target: canvas,
                    preventDefault: () => { },
                    stopPropagation: () => { },
                    stopImmediatePropagation: () => { },
                });

                for (const handler of emscripten.JSEvents.eventHandlers) {
                    if (handler.eventTypeString === 'keydown') {
                        handler.eventListenerFunc(createFakeEvent('F9'));
                    }
                }
                setTimeout(() => {
                    for (const handler of emscripten.JSEvents.eventHandlers) {
                        if (handler.eventTypeString === 'keyup') {
                            handler.eventListenerFunc(createFakeEvent('F9'));
                        }
                    }
                }, 50);
            }
            setIsMuted(prev => !prev);
        } catch (err) {
            console.error('[Nostalgist] Mute error:', err);
        }
    }, [nostalgistRef]);

    // A second destination downstream of the same GainNode the slider
    // already controls. This doesn't disturb the speaker path above — the
    // patched connect() only special-cases connections to ctx.destination
    // itself, so this extra fan-out is invisible to it. Implemented inline
    // (rather than imported from netplay/media/audio-tap.ts, which documents
    // the same few lines) so this core hook — part of the main bundle —
    // never pulls in netplay code merely because this feature exists.
    const getAudioStream = useCallback((): MediaStream | null => {
        const gainNode = gainNodeRef.current;
        if (!gainNode) return null;
        if (!audioStreamRef.current) {
            // createMediaStreamDestination is AudioContext-only (not on the
            // BaseAudioContext supertype, which also covers OfflineAudioContext)
            // — the emulator's context is always a live AudioContext.
            const destination = (gainNode.context as AudioContext).createMediaStreamDestination();
            gainNode.connect(destination);
            audioStreamRef.current = destination.stream;
        }
        return audioStreamRef.current;
    }, []);

    return {
        volume,
        isMuted,
        setVolume: setVolumeLevel,
        toggleMute,
        getAudioStream,
    };
}
