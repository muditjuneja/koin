import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';

interface UseEmulatorAudioProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
    initialVolume?: number;
}

interface UseEmulatorAudioReturn {
    volume: number;
    isMuted: boolean;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

export function useEmulatorAudio({ nostalgistRef, initialVolume = 100 }: UseEmulatorAudioProps): UseEmulatorAudioReturn {
    const [volume, setVolume] = useState(initialVolume);
    const [isMuted, setIsMuted] = useState(false);

    // Volume control - Intercept Web Audio API
    // We monkey-patch AudioNode.connect to inject a GainNode before the destination
    const gainNodeRef = useRef<GainNode | null>(null);
    const lastVolumeRef = useRef(initialVolume);

    useEffect(() => {
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

    return {
        volume,
        isMuted,
        setVolume: setVolumeLevel,
        toggleMute
    };
}
