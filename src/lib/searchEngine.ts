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

const SUPABASE_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  ''
).trim();
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const TMDB_API_KEY = (
  import.meta.env.VITE_TMDB_API_KEY ||
  import.meta.env.TMDB_API_KEY ||
  ''
).trim();
const HAS_EDGE_SEARCH = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function localFallback(options: FuzzySearchOptions = {}): CatalogItem[] {
  return fuzzySearchCatalog('', options).length > 0 ? fuzzySearchCatalog('', options) : LOCAL_CATALOG;
}

function endpoint(action: string, params = ''): string | null {
  if (HAS_EDGE_SEARCH && SUPABASE_URL) {
    return `${SUPABASE_URL}/functions/v1/tmdb-search?action=${action}${params}`;
  }
  if (TMDB_API_KEY) return `tmdb://${action}${params}`;
  return null;
}

function tmdbPath(action: string): string {
  switch (action) {
    case 'trending': return '/trending/all/week';
    case 'popular-movies': return '/movie/popular';
    case 'popular-tv': return '/tv/popular';
    case 'top-rated': return '/movie/top_rated';
    case 'popular-anime': return '/discover/tv?with_genres=16&with_original_language=ja';
    case 'new-releases': return '/movie/now_playing';
    case 'hindi-dubbed': return '/discover/movie?with_original_language=hi';
    default: return '/search/multi';
  }
}

function mapDirectTMDBResult(item: any): TMDBResult {
  const isTV = item.media_type === 'tv' || Boolean(item.first_air_date);
  return {
    tmdbId: Number(item.id) || 0,
    title: item.title || item.name || 'Untitled',
    type: isTV ? 'web_series' : 'movie',
    year: Number((item.release_date || item.first_air_date || '').slice(0, 4)) || 0,
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    overview: item.overview || 'No overview available.',
    rating: Number(item.vote_average) || 0,
    genres: [],
    offers: [],
    trailerKey: null,
    cast: [],
  };
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
  const controller = new AbortController();
  const isDirectTMDB = url.startsWith('tmdb://');
  let requestUrl = url;
  let headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (isDirectTMDB) {
    const separator = url.indexOf('?');
    const action = url.slice('tmdb://'.length, separator === -1 ? undefined : separator);
    const params = separator === -1 ? '' : url.slice(separator);
    const tmdbParams = new URLSearchParams(params);
    if (action === 'search') tmdbParams.set('query', tmdbParams.get('query') || '');
    tmdbParams.set('api_key', TMDB_API_KEY);
    requestUrl = `https://api.themoviedb.org/3${tmdbPath(action)}${tmdbPath(action).includes('?') ? '&' : '?'}${tmdbParams.toString()}`;
    headers = { 'Content-Type': 'application/json' };
  } else if (!HAS_EDGE_SEARCH) {
    throw new Error('Movie API is not configured');
  } else {
    headers = {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(requestUrl, { signal: controller.signal, headers });
    clearTimeout(timeout);
    if (!isDirectTMDB) return res;
    if (!res.ok) return res;
    const raw = await res.json();
    const results = (raw.results || []).map(mapDirectTMDBResult);
    return new Response(JSON.stringify({ results, latencyMs: 0, source: 'tmdb' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

async function fetchCatalogAction(action: string): Promise<CatalogItem[]> {
  const url = endpoint(action);
  if (!url) return localFallback();

  try {
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return localFallback();
    const data: TMDBResponse = await res.json();
    const items = (data.results || []).map(tmdbToCatalogItem);
    return items.length > 0 ? items : localFallback();
  } catch (err) {
    console.warn(`[${action}] error:`, err);
    return localFallback();
  }
}

export function fetchTrending(): Promise<CatalogItem[]> {
  return fetchCatalogAction('trending');
}

export function fetchPopularMovies(): Promise<CatalogItem[]> {
  return fetchCatalogAction('popular-movies');
}

export function fetchPopularTV(): Promise<CatalogItem[]> {
  return fetchCatalogAction('popular-tv');
}

export function fetchTopRated(): Promise<CatalogItem[]> {
  return fetchCatalogAction('top-rated');
}

export function fetchPopularAnime(): Promise<CatalogItem[]> {
  return fetchCatalogAction('popular-anime');
}

export function fetchNewReleases(): Promise<CatalogItem[]> {
  return fetchCatalogAction('new-releases');
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
    if (!HAS_EDGE_SEARCH) {
      const fallbackAction = params.contentType === 'web_series_tv' ? 'popular-tv' : params.sort === 'top_rated' ? 'top-rated' : 'popular-movies';
      return fetchCatalogAction(fallbackAction);
    }
    const url = `${SUPABASE_URL}/functions/v1/tmdb-search?${sp.toString()}`;
    const res = await edgeFetch(url, 8000);
    if (!res.ok) return fetchCatalogAction(params.contentType === 'web_series_tv' ? 'popular-tv' : 'popular-movies');
    const data: TMDBResponse = await res.json();
    const items = (data.results || []).map(tmdbToCatalogItem);
    return items.length > 0 ? items : fetchCatalogAction(params.contentType === 'web_series_tv' ? 'popular-tv' : 'popular-movies');
  } catch (err) {
    console.warn('[discover] error:', err);
    return fetchCatalogAction(params.contentType === 'web_series_tv' ? 'popular-tv' : 'popular-movies');
  }
}

export function fetchHindiDubbed(): Promise<CatalogItem[]> {
  return fetchCatalogAction('hindi-dubbed');
}

export async function webSearch(query: string): Promise<WebResult[]> {
  try {
    if (!HAS_EDGE_SEARCH) return [];
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
    if (!HAS_EDGE_SEARCH) return [];
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


