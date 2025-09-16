export type RunHistory = {
  ts: number;
  length: number;
  count: number;
  ms: number;
  topWords: string[];
};

const KEY = "aimai__runHistory";
const MAX = 5;

export function loadHistory(): RunHistory[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunHistory[]) : [];
  } catch {
    return [];
  }
}

export function pushHistory(item: RunHistory) {
  const list = loadHistory();
  const next = [item, ...list].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
