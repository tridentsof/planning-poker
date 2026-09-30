const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export type CreateGameInput = {
  name?: string;
  deckType: string;
  customDeck?: string;
};

export type CreateGameResult = { id: string; creatorSecret: string };

/** POST /games (PLAN.md §8.1, §9.2). */
export async function createGame(input: CreateGameInput): Promise<CreateGameResult> {
  const res = await fetch(`${SOCKET_URL}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to create game (${res.status})`);
  }
  return res.json();
}

export function getSocketUrl(): string {
  return SOCKET_URL;
}
