/** localStorage keys and helpers, per PLAN.md §9.1. Safe to call during SSR (no-ops). */

const NAME_KEY = "pp:name";
const THEME_KEY = "pp:theme";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getStoredName(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(NAME_KEY);
}

export function setStoredName(name: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(NAME_KEY, name);
}

export function getPlayerToken(gameId: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(`pp:token:${gameId}`);
}

export function setPlayerToken(gameId: string, token: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(`pp:token:${gameId}`, token);
}

export function getCreatorSecret(gameId: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(`pp:creator:${gameId}`);
}

export function setCreatorSecret(gameId: string, secret: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(`pp:creator:${gameId}`, secret);
}

export function clearCreatorSecret(gameId: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(`pp:creator:${gameId}`);
}

export type ThemePreference = "light" | "dark" | "system";

export function getStoredTheme(): ThemePreference | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(THEME_KEY) as ThemePreference | null;
}

export function setStoredTheme(theme: ThemePreference): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(THEME_KEY, theme);
}
