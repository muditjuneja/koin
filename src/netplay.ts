/**
 * koin.js netplay — 4-player host-authoritative co-op streaming.
 *
 * A separate entry (`import ... from 'koin.js/netplay'`) so the
 * single-player bundle (`koin.js`) never pays for WebRTC transport, media
 * capture, or the co-op UI. See the netplay plan's §8 (Packaging) for why:
 * this is a deliberate split, not an oversight.
 *
 * Use: import { RoomManager, CoopPanel, CoopGuest, ... } from 'koin.js/netplay'
 */

// Media capture (host)
export { startVideoCapture } from './netplay/media/video-capture';
export type { VideoCaptureHandle, VideoCaptureStrategy, VideoCaptureOptions } from './netplay/media/video-capture';
export { tapAudio } from './netplay/media/audio-tap';
export type { AudioTapHandle } from './netplay/media/audio-tap';

// Transport
export { createSignalingClient } from './netplay/transport/signaling';
export type { SignalingClient, SignalingMessage, SignalingState, CreateSignalingClientOptions } from './netplay/transport/signaling';
export { CoopPeerConnection } from './netplay/transport/peer';
export type { PeerRole, PeerSignal, CoopPeerConnectionOptions } from './netplay/transport/peer';
export {
    encodeInputState,
    decodeInputState,
    encodeControlMessage,
    decodeControlMessage,
    INPUT_MESSAGE_BYTE_LENGTH,
} from './netplay/transport/protocol';
export type { InputState, ControlMessage } from './netplay/transport/protocol';

// Session & slot lifecycle
export { RoomManager, GUEST_SLOTS } from './netplay/session/room-manager';
export type {
    SlotStatus,
    SlotState,
    JoinPlayerResult,
    JoinSpectatorResult,
    RoomManagerEvents,
    RoomManagerOptions,
} from './netplay/session/room-manager';
export { HeldButtonsTracker } from './netplay/session/held-buttons-tracker';
export { generateRoomCode, generateSessionToken, ROOM_CODE_LENGTH } from './netplay/session/room-code';
export { getCoopRestrictions } from './netplay/session/coop-restrictions';
export type { CoopRestrictions } from './netplay/session/coop-restrictions';

// Latency & quality tuning
export {
    reorderCodecsByPriority,
    getPreferredVideoCodecOrder,
    pickMaxBitrate,
    isRelayedCandidateType,
    decideDegradationPreference,
    adaptJitterBufferTarget,
    VIDEO_CODEC_PRIORITY_DEFAULT,
    VIDEO_CODEC_PRIORITY_WITH_AV1,
    DIRECT_MAX_BITRATE_BPS,
    RELAYED_MAX_BITRATE_BPS,
    LOW_FPS_THRESHOLD,
    MIN_JITTER_BUFFER_TARGET_MS,
    MAX_JITTER_BUFFER_TARGET_MS,
} from './netplay/quality/heuristics';
export type { CodecLike, DegradationPreference } from './netplay/quality/heuristics';
export { applyVideoCodecPreferences, applyContentHint, applySenderEncodingParameters } from './netplay/quality/sender-tuning';
export type { SenderEncodingOptions } from './netplay/quality/sender-tuning';
export { applyJitterBufferTarget, pollAndAdaptJitterBufferTarget, observeVideoFrames } from './netplay/quality/receiver-tuning';
export type { VideoFrameSample } from './netplay/quality/receiver-tuning';

// Run-Ahead / CPU budget degradation ladder
export {
    CpuPressureDegradationLadder,
    getDegradationConfig,
    DEGRADATION_STEP_NAMES,
    DEFAULT_PRESSURE_THRESHOLDS,
    MIN_DEGRADATION_STEP,
    MAX_DEGRADATION_STEP,
} from './netplay/quality/degradation-ladder';
export type { DegradationStep, DegradationConfig, PressureThresholds } from './netplay/quality/degradation-ladder';

// UI components
export { default as CoopPanel } from './netplay/components/CoopPanel';
export type { CoopPanelProps, CoopSlotView, CoopSpectatorView, CoopSlotStatus } from './netplay/components/CoopPanel';
export { default as CoopGuest } from './netplay/components/CoopGuest';
export type { CoopGuestProps, CoopGuestConnectionState } from './netplay/components/CoopGuest';
export { default as ConnectionIndicator, classifyConnectionQuality } from './netplay/components/ConnectionIndicator';
export type { ConnectionIndicatorProps, ConnectionQuality } from './netplay/components/ConnectionIndicator';
