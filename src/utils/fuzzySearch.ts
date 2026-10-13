import type { CatalogItem, ContentType } from '@/types';
import { LOCAL_CATALOG } from '@/data/catalog';

const HINGLISH_MAP: Record<string, string[]> = {
  'jail': ['jail', 'kaid', 'qaid', 'prison', 'lockup', 'bandhan'],
  'bhagne': ['bhagne', 'bhagna', 'bhag', 'escape', 'run', 'flee', 'bhaag'],
  'wali': ['wali', 'wala', 'vali', 'vala'],
  'wale': ['wale', 'wala', 'vale', 'vala'],
  'lootne': ['lootne', 'loot', 'rob', 'heist', 'chori', 'chor'],
  'chori': ['chori', 'chor', 'theft', 'rob', 'loot', 'steal'],
  'dimag': ['dimag', 'dimaag', 'brain', 'mind', 'smart', 'clever'],
  'ghumane': ['ghumane', 'ghumana', 'twist', 'confuse', 'bend', 'spin'],
  'bank': ['bank', 'banka', 'tezabi', 'finance'],
  'series': ['series', 'show', 'serial', 'drama'],
  'movie': ['movie', 'film', 'picture', 'cinema', 'chitra'],
  'se': ['se', 'se', 'from', 'out of'],
  'group': ['group', 'team', 'squad', 'gang', 'tol'],
  'mastermind': ['mastermind', 'genius', 'dimag', 'smart'],
  'revenge': ['revenge', 'badla', 'pratishodh', 'vendetta'],
  'hindi': ['hindi', 'hindustani', 'desi'],
  'dubbed': ['dubbed', 'dub', 'voice', 'awaz'],
  'action': ['action', 'fight', 'ladai', 'jung', 'combat'],
  'crime': ['crime', 'juram', 'apradh', 'criminal'],
  'thriller': ['thriller', 'suspense', 'rahasya'],
  'comedy': ['comedy', 'hasna', 'funny', 'mazak'],
  'horror': ['horror', 'darawna', 'bhoot', 'scary'],
  'superhero': ['superhero', 'hero', 'super', 'marvel', 'dc'],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(query: string, target: string, threshold = 0.65): boolean {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return false;
  if (t.includes(q)) return true;
  if (q.includes(t)) return true;
  const maxLen = Math.max(q.length, t.length);
  const distance = levenshtein(q, t);
  const similarity = 1 - distance / maxLen;
  return similarity >= threshold;
}

function expandHinglish(query: string): string[] {
  const words = normalize(query).split(' ');
  const expanded: string[] = [];
  for (const word of words) {
    expanded.push(word);
    for (const [key, synonyms] of Object.entries(HINGLISH_MAP)) {
      if (fuzzyMatch(word, key, 0.7) || synonyms.some((s) => fuzzyMatch(word, s, 0.7))) {
        expanded.push(key, ...synonyms);
      }
    }
  }
  return [...new Set(expanded)];
}

export interface FuzzySearchOptions {
  categories?: ContentType[];
  hubs?: string[];
  audio?: string[];
}

export function fuzzySearchCatalog(
  query: string,
  options: FuzzySearchOptions = {},
): CatalogItem[] {
  const expandedTerms = expandHinglish(query);
  const normalizedQuery = normalize(query);

  let results = LOCAL_CATALOG;

  if (options.categories && options.categories.length > 0) {
    results = results.filter((item) => options.categories!.includes(item.type));
  }

  if (options.hubs && options.hubs.length > 0) {
    results = results.filter((item) =>
      item.offers.some((offer) => options.hubs!.includes(offer.platform)),
    );
  }

  if (options.audio && options.audio.length > 0) {
    results = results.filter((item) => {
      if (options.audio!.includes('hindi_dubbed')) {
        return item.audioStatus !== 'unverified';
      }
      return true;
    });
  }

  if (!normalizedQuery) return results;

  const scored = results.map((item) => {
    let score = 0;
    const titleNorm = normalize(item.title);
    if (titleNorm.includes(normalizedQuery)) score += 100;
    if (fuzzyMatch(normalizedQuery, item.title, 0.5)) score += 50;

    for (const tag of item.tags) {
      const tagNorm = normalize(tag);
      if (tagNorm.includes(normalizedQuery)) score += 30;
      if (fuzzyMatch(normalizedQuery, tag, 0.5)) score += 20;
      for (const term of expandedTerms) {
        if (tagNorm.includes(term) && term.length > 2) score += 15;
        if (fuzzyMatch(term, tag, 0.6) && term.length > 2) score += 10;
      }
    }

    for (const genre of item.genres) {
      if (normalize(genre).includes(normalizedQuery)) score += 25;
      for (const term of expandedTerms) {
        if (normalize(genre).includes(term) && term.length > 2) score += 10;
      }
    }

    if (item.cast) {
      for (const member of item.cast) {
        if (normalize(member).includes(normalizedQuery)) score += 20;
      }
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

export function parseTagsFromQuery(query: string): string[] {
  const normalized = normalize(query);
  const phrases = [
    'jail se bhagne wali',
    'jail se bhagne wale',
    'bank lootne wali',
    'bank lootne wale',
    'chori wali movie',
    'chori wali series',
    'dimag ghumane wali',
    'dimag ghumane wale',
    'prison break wali',
    'prison break wale',
  ];

  const tags: string[] = [];
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      tags.push(phrase);
    }
  }

  const words = normalized.split(' ');
  for (const word of words) {
    if (word.length > 2 && HINGLISH_MAP[word]) {
      tags.push(word);
    }
  }

  return [...new Set(tags)];
}
