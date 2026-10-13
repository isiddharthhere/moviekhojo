import type { UserBehavior } from '@/types';

const STORAGE_KEY = 'moviekhojo_behavior';

const DEFAULT_BEHAVIOR: UserBehavior = {
  clicks: [],
  searches: [],
  opened: [],
  preferences: {
    categories: [],
    hubs: [],
    audio: [],
  },
};

export function getBehavior(): UserBehavior {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BEHAVIOR;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BEHAVIOR, ...parsed };
  } catch {
    return DEFAULT_BEHAVIOR;
  }
}

export function saveBehavior(behavior: UserBehavior): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(behavior));
  } catch { /* ignore */ }
}

export function trackClick(itemId: string): void {
  const behavior = getBehavior();
  behavior.clicks.unshift(itemId);
  behavior.clicks = behavior.clicks.slice(0, 100);
  saveBehavior(behavior);
}

export function trackSearch(query: string): void {
  if (!query.trim()) return;
  const behavior = getBehavior();
  behavior.searches.unshift(query);
  behavior.searches = behavior.searches.slice(0, 50);
  saveBehavior(behavior);
}

export function trackOpen(itemId: string): void {
  const behavior = getBehavior();
  behavior.opened.unshift(itemId);
  behavior.opened = behavior.opened.slice(0, 100);
  saveBehavior(behavior);
}

export function updatePreferences(prefs: Partial<UserBehavior['preferences']>): void {
  const behavior = getBehavior();
  behavior.preferences = { ...behavior.preferences, ...prefs };
  saveBehavior(behavior);
}

export function getRecommendedIds(allIds: string[]): string[] {
  const behavior = getBehavior();
  const clickScores = new Map<string, number>();
  for (const id of behavior.clicks) {
    clickScores.set(id, (clickScores.get(id) || 0) + 3);
  }
  for (const id of behavior.opened) {
    clickScores.set(id, (clickScores.get(id) || 0) + 2);
  }
  return allIds
    .map((id) => ({ id, score: clickScores.get(id) || 0 }))
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0)
    .map((s) => s.id);
}
