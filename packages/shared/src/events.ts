import type { z } from "zod";
import type {
  facilitatorTransferSchema,
  gameJoinSchema,
  gameRenameSchema,
  gameUpdateSettingsSchema,
  issueAddSchema,
  issueDeleteSchema,
  issueReorderSchema,
  issueSelectSchema,
  issueSetEstimateSchema,
  issueUpdateSchema,
  playerRenameSchema,
  playerSetRoleSchema,
  voteCastSchema,
} from "./schemas.js";
import type { ErrorCode, GameSnapshot } from "./types.js";

export type GameJoinPayload = z.infer<typeof gameJoinSchema>;
export type VoteCastPayload = z.infer<typeof voteCastSchema>;
export type IssueAddPayload = z.infer<typeof issueAddSchema>;
export type IssueUpdatePayload = z.infer<typeof issueUpdateSchema>;
export type IssueDeletePayload = z.infer<typeof issueDeleteSchema>;
export type IssueReorderPayload = z.infer<typeof issueReorderSchema>;
export type IssueSelectPayload = z.infer<typeof issueSelectSchema>;
export type IssueSetEstimatePayload = z.infer<typeof issueSetEstimateSchema>;
export type PlayerRenamePayload = z.infer<typeof playerRenameSchema>;
export type PlayerSetRolePayload = z.infer<typeof playerSetRoleSchema>;
export type GameUpdateSettingsPayload = z.infer<typeof gameUpdateSettingsSchema>;
export type GameRenamePayload = z.infer<typeof gameRenameSchema>;
export type FacilitatorTransferPayload = z.infer<typeof facilitatorTransferSchema>;

export type GameJoinAck =
  | { ok: true; playerId: string; playerToken: string }
  | { ok: false; error: ErrorCode };

export interface ClientToServerEvents {
  "game:join": (payload: GameJoinPayload, ack: (result: GameJoinAck) => void) => void;
  "vote:cast": (payload: VoteCastPayload) => void;
  "round:reveal": () => void;
  "round:reset": () => void;
  "issue:add": (payload: IssueAddPayload) => void;
  "issue:update": (payload: IssueUpdatePayload) => void;
  "issue:delete": (payload: IssueDeletePayload) => void;
  "issue:reorder": (payload: IssueReorderPayload) => void;
  "issue:select": (payload: IssueSelectPayload) => void;
  "issue:setEstimate": (payload: IssueSetEstimatePayload) => void;
  "player:rename": (payload: PlayerRenamePayload) => void;
  "player:setRole": (payload: PlayerSetRolePayload) => void;
  "game:updateSettings": (payload: GameUpdateSettingsPayload) => void;
  "game:rename": (payload: GameRenamePayload) => void;
  "facilitator:transfer": (payload: FacilitatorTransferPayload) => void;
}

export interface ServerToClientEvents {
  "game:state": (snapshot: GameSnapshot) => void;
  error: (error: { code: ErrorCode; message: string }) => void;
}
