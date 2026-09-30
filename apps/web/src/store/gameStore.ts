import { create } from "zustand";
import type { ErrorCode, GameSnapshot } from "@planning-poker/shared";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export type GameStoreState = {
  snapshot: GameSnapshot | null;
  connection: ConnectionStatus;
  selfPlayerId: string | null;
  notFound: boolean;
  lastError: { code: ErrorCode; message: string } | null;
  setSnapshot: (snapshot: GameSnapshot) => void;
  setConnection: (status: ConnectionStatus) => void;
  setSelfPlayerId: (id: string) => void;
  setNotFound: (value: boolean) => void;
  setLastError: (error: { code: ErrorCode; message: string } | null) => void;
  reset: () => void;
};

/** Client-side game state, populated from "game:state" broadcasts (PLAN.md §9.2). */
export const useGameStore = create<GameStoreState>((set) => ({
  snapshot: null,
  connection: "connecting",
  selfPlayerId: null,
  notFound: false,
  lastError: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  setConnection: (status) => set({ connection: status }),
  setSelfPlayerId: (id) => set({ selfPlayerId: id }),
  setNotFound: (value) => set({ notFound: value }),
  setLastError: (error) => set({ lastError: error }),
  reset: () =>
    set({ snapshot: null, connection: "connecting", selfPlayerId: null, notFound: false, lastError: null }),
}));
