/**
 * koin.js/netplay — online co-op for up to 4 players.
 *
 * The host runs the game in <GamePlayer coop={session}> and streams it to
 * guests over WebRTC; guests need no ROM or emulator, just a browser. A
 * separate entry so single-player apps never download any of this.
 *
 *   // host
 *   const { session } = useCoopHost({ signaling: SIGNALING_URL, core: 'fceumm' });
 *   <GamePlayer coop={session ?? undefined} ... />
 *   <CoopHostPanel session={session} isOpen onClose={...} joinUrl={...} />
 *
 *   // guest
 *   const { session } = useCoopGuest({ signaling: SIGNALING_URL, roomCode });
 *   <CoopGuestScreen session={session} system="NES" />
 */

// Sessions
export { CoopHostSession } from './netplay/session/host-session';
export type { CoopHostOptions, CoopHostState, CoopHostPeer, CoopEmulatorHandle } from './netplay/session/host-session';
export { CoopGuestSession } from './netplay/session/guest-session';
export type { CoopGuestOptions, CoopGuestState, CoopGuestStatus } from './netplay/session/guest-session';
export type { SlotView, SlotStatus } from './netplay/session/room-manager';
export type { ConnectionQuality } from './netplay/session/connection-quality';
export { generateRoomCode, normalizeRoomCode } from './netplay/session/room-code';
export { coopMaxPlayers } from './lib/controls/coop';

// React
export { useCoopHost, useCoopGuest, useSessionState } from './netplay/react/hooks';
export { default as CoopHostPanel } from './netplay/components/CoopHostPanel';
export type { CoopHostPanelProps } from './netplay/components/CoopHostPanel';
export { default as CoopGuestScreen } from './netplay/components/CoopGuestScreen';
export type { CoopGuestScreenProps } from './netplay/components/CoopGuestScreen';
export { default as CoopPanel } from './netplay/components/CoopPanel';
export type { CoopPanelProps, CoopSlotView, CoopSpectatorView } from './netplay/components/CoopPanel';
export { default as ConnectionIndicator } from './netplay/components/ConnectionIndicator';
export type { ConnectionIndicatorProps } from './netplay/components/ConnectionIndicator';

// Signaling transports
export { createWebSocketSignaling, createCallbackSignaling, createMemorySignalingHub, buildSignalingUrl } from './netplay/transport/signaling';
export type { SignalingTransport, SignalingMessage, SignalingState, WebSocketSignalingOptions, CallbackSignalingOptions } from './netplay/transport/signaling';

// Guest input
export { GuestInputController } from './netplay/input/guest-input';
export type { GuestInputOptions } from './netplay/input/guest-input';
export type { ControllerState, HostEvent, SignalPayload } from './netplay/transport/protocol';
