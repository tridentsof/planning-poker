export const AVATAR_PRESETS = [
  "🦊", "🐼", "🦁", "🐯", "🐨", "🐸",
  "🐙", "🦉", "🚀", "🤖", "🧙", "🦄",
  "👾", "🐱", "🐶", "🐵", "⚡", "💎",
  "🍕", "☕", "🎸", "🎯", "👑", "🍀",
] as const;

export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

const EMOJI_PREFIX_REGEX = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}(?:\uFE0F)?)\s*(.*)$/u;

export function getDeterministicAvatar(name: string): string {
  if (!name) return AVATAR_PRESETS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PRESETS.length;
  return AVATAR_PRESETS[index]!;
}

export function parsePlayer(rawName: string): { avatar: string; displayName: string } {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { avatar: AVATAR_PRESETS[0], displayName: "Player" };
  }

  const match = trimmed.match(EMOJI_PREFIX_REGEX);
  if (match && match[1]) {
    const avatar = match[1];
    const rest = match[2]?.trim() || "Player";
    return { avatar, displayName: rest };
  }

  return {
    avatar: getDeterministicAvatar(trimmed),
    displayName: trimmed,
  };
}

export function formatPlayer(avatar: string, displayName: string): string {
  const cleanName = displayName.trim();
  if (!cleanName) return avatar;
  return `${avatar} ${cleanName}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", ring: "ring-emerald-500" },
  { bg: "bg-blue-500/20 text-blue-300 border-blue-500/40", ring: "ring-blue-500" },
  { bg: "bg-amber-500/20 text-amber-300 border-amber-500/40", ring: "ring-amber-500" },
  { bg: "bg-rose-500/20 text-rose-300 border-rose-500/40", ring: "ring-rose-500" },
  { bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40", ring: "ring-cyan-500" },
  { bg: "bg-orange-500/20 text-orange-300 border-orange-500/40", ring: "ring-orange-500" },
];

export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx]!;
}
