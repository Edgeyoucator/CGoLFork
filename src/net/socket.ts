import { C2S, S2C } from "./protocol.ts";
import type { RoomInfo, RoomState, SeedDeltaChange, SeedDeltaRejected } from "./protocol.ts";

// Generate or retrieve persistent client ID
function getClientId(): string {
  let baseId = localStorage.getItem("conway-duel-clientId");
  if (!baseId) {
    baseId = crypto.randomUUID();
    localStorage.setItem("conway-duel-clientId", baseId);
  }
  let tabId = sessionStorage.getItem("conway-duel-tabId");
  if (!tabId) {
    tabId = crypto.randomUUID();
    sessionStorage.setItem("conway-duel-tabId", tabId);
  }
  return `${baseId}:${tabId}`;
}

export interface SocketCallbacks {
  onRoomList?: (rooms: RoomInfo[]) => void;
  onRoomJoined?: (roomId: number, role: number | "spectator", roomState: RoomState) => void;
  onRoomState?: (roomState: RoomState) => void;
  onSeedState?: (seedVersion: number, alive: number[], owner: number[]) => void;
  onSeedDeltaApplied?: (seedVersion: number, changes: SeedDeltaChange[], appliedBy: string) => void;
  onSeedDeltaRejected?: (payload: SeedDeltaRejected) => void;
  onPhaseChanged?: (phase: string, tick: number, running: boolean) => void;
  onPlayTick?: (tick: number, alive: number[], owner: number[], p1Live: number, p2Live: number) => void;
  onPlayEnd?: (tick: number, alive: number[], owner: number[], p1Live: number, p2Live: number, winner: string) => void;
  onError?: (message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private callbacks: SocketCallbacks = {};
  private url: string;
  private clientId: string;
  private currentRoomId: number | null = null;

  constructor(url: string) {
    this.url = url;
    this.clientId = getClientId();
  }

  setCallbacks(cb: SocketCallbacks) {
    this.callbacks = cb;
  }

  connect(name: string) {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.send({ type: C2S.HELLO, name, clientId: this.clientId });
      this.callbacks.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case S2C.ROOM_LIST:
          this.callbacks.onRoomList?.(msg.rooms as RoomInfo[]);
          break;
        case S2C.ROOM_JOINED:
          this.currentRoomId = msg.roomId as number;
          this.callbacks.onRoomJoined?.(
            msg.roomId as number,
            msg.role as number | "spectator",
            msg.roomState as RoomState,
          );
          break;
        case S2C.ROOM_STATE:
          this.callbacks.onRoomState?.(msg.roomState as RoomState);
          break;
        case S2C.SEED_STATE:
          this.callbacks.onSeedState?.(
            msg.seedVersion as number,
            msg.alive as number[],
            msg.owner as number[],
          );
          break;
        case S2C.SEED_DELTA_APPLIED:
          this.callbacks.onSeedDeltaApplied?.(
            msg.seedVersion as number,
            msg.changes as SeedDeltaChange[],
            msg.appliedBy as string,
          );
          break;
        case S2C.SEED_DELTA_REJECTED:
          this.callbacks.onSeedDeltaRejected?.(msg as unknown as SeedDeltaRejected);
          break;
        case S2C.PHASE_CHANGED:
          this.callbacks.onPhaseChanged?.(
            msg.phase as string,
            msg.tick as number,
            msg.running as boolean,
          );
          break;
        case S2C.PLAY_TICK:
          this.callbacks.onPlayTick?.(
            msg.tick as number,
            msg.alive as number[],
            msg.owner as number[],
            msg.p1Live as number,
            msg.p2Live as number,
          );
          break;
        case S2C.PLAY_END:
          this.callbacks.onPlayEnd?.(
            msg.tick as number,
            msg.alive as number[],
            msg.owner as number[],
            msg.p1Live as number,
            msg.p2Live as number,
            msg.winner as string,
          );
          break;
        case S2C.ERROR:
          this.callbacks.onError?.(msg.message as string);
          break;
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onClose?.();
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  requestRooms() {
    this.send({ type: C2S.LIST_ROOMS });
  }

  joinRoom(roomId: number, spectate = false) {
    this.send({ type: C2S.JOIN_ROOM, roomId, spectate });
  }

  leaveRoom() {
    this.send({ type: C2S.LEAVE_ROOM });
    this.currentRoomId = null;
  }

  sendSeedDelta(changes: { i: number; alive: 0 | 1 }[], baseSeedVersion: number) {
    this.send({
      type: C2S.SEED_DELTA,
      roomId: this.currentRoomId,
      clientId: this.clientId,
      baseSeedVersion,
      changes,
    });
  }

  sendClearSeed() {
    this.send({ type: C2S.CLEAR_SEED });
  }

  sendReady(ready: boolean) {
    this.send({ type: C2S.SET_READY, ready });
  }

  sendPlayAgain(ready: boolean) {
    this.send({ type: C2S.PLAY_AGAIN, ready });
  }

  sendWatchReplay() {
    this.send({ type: C2S.WATCH_REPLAY });
  }

  private send(msg: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

