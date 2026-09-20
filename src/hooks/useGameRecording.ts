'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseGameRecordingProps {
    getCanvasElement: () => HTMLCanvasElement | null;
}

interface UseGameRecordingReturn {
    isRecording: boolean;
    isPaused: boolean;
    recordingDuration: number; // in seconds
    startRecording: () => void;
    stopRecording: () => Promise<Blob | null>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    isSupported: boolean;
}

/**
 * Gameplay Recording Hook
 * -----------------------
 * Uses MediaRecorder API to capture canvas gameplay as WebM video.
 * 
 * Features:
 * - Start/stop recording
 * - Pause/resume
 * - Duration tracking
 * - Returns Blob for download
 */
export function useGameRecording({
    getCanvasElement,
}: UseGameRecordingProps): UseGameRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);
    const pauseStartTimeRef = useRef<number>(0);
    const totalPausedTimeRef = useRef<number>(0);
    const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Ref mirror so the duration interval always reads the live paused state
    const isPausedRef = useRef(false);

    // Keep the ref in sync
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const getCanvasElementRef = useRef(getCanvasElement);
    useEffect(() => {
        getCanvasElementRef.current = getCanvasElement;
    }, [getCanvasElement]);

    // Check browser support
    const isSupported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm');

    // Start recording
    const startRecording = useCallback(() => {
        const canvas = getCanvasElementRef.current?.();
        if (!canvas || !isSupported) {
            console.warn('[Recording] Canvas not found or MediaRecorder not supported');
            return;
        }

        try {
            // Capture canvas stream at 30fps
            const stream = canvas.captureStream(30);

            // Try to use VP9 for better quality, fallback to VP8
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : 'video/webm;codecs=vp8';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 5000000, // 5 Mbps for good quality
            });

            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(1000); // Capture every second
            mediaRecorderRef.current = mediaRecorder;

            startTimeRef.current = Date.now();
            pauseStartTimeRef.current = 0;
            totalPausedTimeRef.current = 0;
            setIsRecording(true);
            setIsPaused(false);
            isPausedRef.current = false;
            setRecordingDuration(0);

            // Update duration every second — read isPausedRef (not isPaused) to avoid stale closure
            durationIntervalRef.current = setInterval(() => {
                if (!isPausedRef.current) {
                    const elapsed = (Date.now() - startTimeRef.current - totalPausedTimeRef.current) / 1000;
                    setRecordingDuration(Math.max(0, Math.floor(elapsed)));
                }
            }, 1000);

            console.log('[Recording] Started');
        } catch (err) {
            console.error('[Recording] Failed to start:', err);
        }
    }, [isSupported]);


    // Stop recording and return blob
    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                chunksRef.current = [];

                setIsRecording(false);
                setIsPaused(false);
                setRecordingDuration(0);
                pauseStartTimeRef.current = 0;
                totalPausedTimeRef.current = 0;

                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                }

                console.log('[Recording] Stopped, size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
                resolve(blob);
            };

            mediaRecorder.stop();
        });
    }, []);

    // Pause recording
    const pauseRecording = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            setIsPaused(true);
            pauseStartTimeRef.current = Date.now();
            console.log('[Recording] Paused');
        }
    }, []);

    // Resume recording
    const resumeRecording = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            // Account for paused time
            if (pauseStartTimeRef.current > 0) {
                totalPausedTimeRef.current += (Date.now() - pauseStartTimeRef.current);
                pauseStartTimeRef.current = 0;
            }
            mediaRecorder.resume();
            setIsPaused(false);
            console.log('[Recording] Resumed');
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, []);

    return {
        isRecording,
        isPaused,
        recordingDuration,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        isSupported,
    };
}
