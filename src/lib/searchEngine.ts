import type { CatalogItem, SearchSource } from '@/types';
import { fuzzySearchCatalog, type FuzzySearchOptions } from '@/utils/fuzzySearch';
import { LOCAL_CATALOG } from '@/data/catalog';

interface TMDBResult {
  tmdbId: number;
  title: string;
  type: string;
  year: number;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  genres: string[];
  offers: { platform: string; type: string; quality: string; url: string }[];
  trailerKey: string | null;
  cast: string[];
  isExplicit?: boolean;
  externalUrl?: string;
}

interface TMDBResponse {
  results: TMDBResult[];
  latencyMs: number;
  source: string;
  error?: string;
}

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const HAS_EDGE_SEARCH = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function localFallback(options: FuzzySearchOptions = {}): CatalogItem[] {
  return fuzzySearchCatalog('', options).length > 0 ? fuzzySearchCatalog('', options) : LOCAL_CATALOG;
}

function endpoint(action: string, params = ''): string | null {
  if (!HAS_EDGE_SEARCH || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/functions/v1/tmdb-search?action=${action}${params}`;
}

function mapContentType(tmdbType: string): CatalogItem['type'] {
  if (tmdbType === 'web_series') return 'web_series';
  if (tmdbType === 'anime') return 'anime';
  if (tmdbType === 'documentary') return 'documentary';
  return 'movie';
}

function mapOfferType(type: string): 'stream' | 'rent' | 'buy' | 'free' {
  if (type === 'stream') return 'stream';
  if (type === 'rent') return 'rent';
  if (type === 'buy') return 'buy';
  if (type === 'free') return 'free';
  return 'stream';
}

function mapQuality(quality: string): '4K' | 'HD' | 'SD' {
  if (quality === '4K') return '4K';
  if (quality === 'HD') return 'HD';
  return 'SD';
}

function tmdbToCatalogItem(r: TMDBResult): CatalogItem {
  return {
    id: r.tmdbId > 0 ? `tmdb-${r.tmdbId}` : `web-${r.title.slice(0, 20)}-${r.tmdbId}`,
    title: r.title,
    type: mapContentType(r.type),
    year: r.year,
    poster: r.poster,
    backdrop: r.backdrop,
    overview: r.overview,
    genres: r.genres,
    tags: [],
    cast: r.cast,
    ratings: r.rating > 0 ? [{ source: 'TMDB', score: r.rating, maxScore: 10 }] : [],
    offers: r.offers.map((o) => ({
      platform: o.platform,
      type: mapOfferType(o.type),
      quality: mapQuality(o.quality),
      url: o.url,
    })),
    audioStatus: 'unverified',
    tmdbId: r.tmdbId > 0 ? r.tmdbId : undefined,
    trailerKey: r.trailerKey || undefined,
    isExplicit: r.isExplicit || false,
    externalUrl: r.externalUrl,
  };
}

async function edgeFetch(url: string, timeoutMs = 8000): Promise<Response> {
  if (!HAS_EDGE_SEARCH) throw new Error('Supabase movie search is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export interface WaterfallSearchResult {
  results: CatalogItem[];
  sources: SearchSource[];
  totalTimeMs: number;
}

export async function waterfallSearch(
  query: string,
  options: FuzzySearchOptions = {},
): Promise<WaterfallSearchResult> {
  const sources: SearchSource[] = [];
  const startTime = Date.now();

  // Layer 1: TMDB via edge function (includes scraper fallback server-side)
  try {
    const tmdbUrl = endpoint('search', `&query=${encodeURIComponent(query)}`);
    if (!tmdbUrl) throw new Error('Movie API unavailable');
    const res = await edgeFetch(tmdbUrl, 8000);
    if (res.ok) {
      const data: TMDBResponse = await res.json();
      if (data.results && data.results.length > 0) {
        sources.push({
          layer: data.source === 'scraper' ? 'scraper' : 'tmdb',
          latencyMs: data.latencyMs,
          resultsCount: data.results.length,
        });
        const items = data.results.map(tmdbToCatalogItem);
        const localMatches = fuzzySearchCatalog(query, options);
        const merged = mergeResults(items, localMatches);
        return {
          results: applyFilters(merged, options),
          sources,
          totalTimeMs: Date.now() - startTime,
        };
      }
    } else {
      console.warn('[search] edge function returned:', res.status);
    }
    sources.push({ layer: 'tmdb', latencyMs: Date.now() - startTime, resultsCount: 0 });
  } catch (err) {
    console.warn('[search] TMDB edge function error:', err);
    sources.push({ layer: 'tmdb', latencyMs: Date.now() - startTime, resultsCount: 0 });
  }

  // Layer 2: Local fuzzy catalog
  const localStart = Date.now();
  const localResults = fuzzySearchCatalog(query, options);
  const localLatency = Date.now() - localStart;
  sources.push({
    layer: 'local',
    latencyMs: localLatency,
    resultsCount: localResults.length,
  });

  if (localResults.length > 0) {
    return {
      results: localResults,
      sources,
      totalTimeMs: Date.now() - startTime,
    };
  }

  return {
    results: [],
    sources,
    totalTimeMs: Date.now() - startTime,
  };
}

function mergeResults(tmdb: CatalogItem[], local: CatalogItem[]): CatalogItem[] {
  const seen = new Set<string>();
  const merged: CatalogItem[] = [];
  for (const item of tmdb) {
    const key = item.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  for (const item of local) {
    const key = item.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function applyFilters(items: CatalogItem[], options: FuzzySearchOptions): CatalogItem[] {
  let filtered = items;
  if (options.categories && options.categories.length > 0) {
    filtered = filtered.filter((item) => options.categories!.includes(item.type));
  }
  if (options.hubs && options.hubs.length > 0) {
    filtered = filtered.filter((item) =>
      item.offers.some((offer) => options.hubs!.includes(offer.platform)),
    );
  }
  return filtered;
}

export async function fetchTrending(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=trending`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) {
      console.warn('[trending] edge function returned:', res.status);
      return [];
    }
    const data: TMDBResponse = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results.map(tmdbToCatalogItem);
    }
  } catch (err) {
    console.warn('[trending] error:', err);
  }
  return [];
}

export async function fetchPopularMovies(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=popular-movies`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[popularMovies] error:', err);
    return [];
  }
}

export async function fetchPopularTV(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=popular-tv`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[popularTV] error:', err);
    return [];
  }
}

export async function fetchTopRated(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=top-rated`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[topRated] error:', err);
    return [];
  }
}

export async function fetchPopularAnime(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=popular-anime`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[popularAnime] error:', err);
    return [];
  }
}

export async function fetchNewReleases(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=new-releases`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[newReleases] error:', err);
    return [];
  }
}

export interface DiscoverParams {
  contentType: string;
  industry: string;
  genre: string;
  subGenre: string;
  platform: string;
  language: string;
  region: string;
  sort: string;
}

export async function discoverContent(params: DiscoverParams): Promise<CatalogItem[]> {
  try {
    const sp = new URLSearchParams({
      action: 'discover',
      content_type: params.contentType,
      industry: params.industry,
      genre: params.genre,
      sub_genre: params.subGenre,
      platform: params.platform,
      language: params.language,
      region: params.region,
      sort: params.sort,
    });
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?${sp.toString()}`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[discover] error:', err);
    return [];
  }
}

export async function fetchHindiDubbed(): Promise<CatalogItem[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=hindi-dubbed`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return [];
    const data: TMDBResponse = await res.json();
    return (data.results || []).map(tmdbToCatalogItem);
  } catch (err) {
    console.warn('[hindiDubbed] error:', err);
    return [];
  }
}

export async function webSearch(query: string): Promise<WebResult[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=web-search&query=${encodeURIComponent(query)}`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) {
      console.warn('[webSearch] edge function returned:', res.status);
      return [];
    }
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
    }));
  } catch (err) {
    console.warn('[webSearch] error:', err);
    return [];
  }
}

export interface YouTubeVideoResult {
  title: string;
  url: string;
  snippet: string;
  videoId: string;
  embedUrl: string;
}

export async function fetchYouTubeVideos(query: string): Promise<YouTubeVideoResult[]> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?action=youtube-search&query=${encodeURIComponent(query)}`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) {
      console.warn('[youtubeSearch] edge function returned:', res.status);
      return [];
    }
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      videoId: r.videoId || '',
      embedUrl: r.embedUrl || '',
    }));
  } catch (err) {
    console.warn('[youtubeSearch] error:', err);
    return [];
  }
}


