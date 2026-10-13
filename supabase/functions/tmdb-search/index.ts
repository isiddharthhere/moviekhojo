const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// MovieKhojo TMDB Search Engine v2

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genre_ids?: number[];
  media_type?: string;
}

interface FormattedResult {
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
}

const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 62: "Sci-Fi & Fantasy", 10765: "Sci-Fi & Fantasy",
};

function getYear(dateStr?: string): number {
  if (!dateStr) return 0;
  return parseInt(dateStr.substring(0, 4), 10) || 0;
}

function getMediaType(item: TMDBResult): string {
  if (item.media_type === "tv" || item.first_air_date) return "web_series";
  if (item.media_type === "movie" || item.release_date) return "movie";
  return "movie";
}

function getImageUrl(path: string | null, size = "w500"): string {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

async function fetchJSON(url: string, timeoutMs = 4000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function basicResult(item: TMDBResult): FormattedResult {
  return {
    tmdbId: item.id,
    title: item.title || item.name || "Unknown",
    type: getMediaType(item),
    year: getYear(item.release_date || item.first_air_date),
    poster: getImageUrl(item.poster_path),
    backdrop: getImageUrl(item.backdrop_path, "w780"),
    overview: item.overview || "",
    rating: item.vote_average || 0,
    genres: (item.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
    offers: [],
    trailerKey: null,
    cast: [],
  };
}

async function enrichResult(item: TMDBResult, apiKey: string): Promise<FormattedResult> {
  const base = basicResult(item);
  const detailType = base.type === "web_series" ? "tv" : "movie";

  const [providersData, videoData, creditsData] = await Promise.allSettled([
    fetchJSON(`${TMDB_BASE}/${detailType}/${item.id}/watch/providers?api_key=${apiKey}&watch_region=IN`, 2000),
    fetchJSON(`${TMDB_BASE}/${detailType}/${item.id}/videos?api_key=${apiKey}&language=en-IN`, 2000),
    fetchJSON(`${TMDB_BASE}/${detailType}/${item.id}/credits?api_key=${apiKey}&language=en-IN`, 2000),
  ]);

  if (providersData.status === "fulfilled") {
    const inProviders = providersData.value?.results?.IN;
    if (inProviders) {
      if (inProviders.flatrate) {
        base.offers.push(...inProviders.flatrate.map((p: any) => ({
          platform: p.provider_name, type: "stream", quality: "HD", url: "https://www.themoviedb.org",
        })));
      }
      if (inProviders.rent) {
        base.offers.push(...inProviders.rent.map((p: any) => ({
          platform: p.provider_name, type: "rent", quality: "HD", url: "https://www.themoviedb.org",
        })));
      }
      if (inProviders.buy) {
        base.offers.push(...inProviders.buy.map((p: any) => ({
          platform: p.provider_name, type: "buy", quality: "HD", url: "https://www.themoviedb.org",
        })));
      }
      if (inProviders.free) {
        base.offers.push(...inProviders.free.map((p: any) => ({
          platform: p.provider_name, type: "free", quality: "HD", url: "https://www.themoviedb.org",
        })));
      }
    }
  }

  if (videoData.status === "fulfilled") {
    const trailer = (videoData.value?.results || []).find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube",
    );
    if (trailer) base.trailerKey = trailer.key;
  }

  if (creditsData.status === "fulfilled") {
    base.cast = (creditsData.value?.cast || []).slice(0, 5).map((c: any) => c.name);
  }

  return base;
}

async function searchTMDB(query: string, apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query.trim())}&language=en-IN&region=IN&include_adult=true&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || [])
    .filter((r: TMDBResult) => r.media_type !== "person" && (r.poster_path || r.backdrop_path))
    .slice(0, 20);

  if (results.length === 0) return [];

  // Enrich only top 5 in parallel — rest get basic data
  const top5 = results.slice(0, 5);
  const rest = results.slice(5);

  const enrichedTop = await Promise.all(top5.map((r) => enrichResult(r, apiKey).catch(() => basicResult(r))));
  const basicRest = rest.map(basicResult);

  return [...enrichedTop, ...basicRest];
}

async function getTrending(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/trending/all/week?api_key=${apiKey}&language=en-IN&region=IN`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map(basicResult);
}

async function scraperSearch(query: string): Promise<any[]> {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " movie watch online")}&kp=-2`;
  try {
    const res = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: any[] = [];
    const resultRegex = new RegExp('class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<', 'g');
    const snippetRegex = new RegExp('class="result__snippet"[^>]*>([\s\S]*?)<', 'g');
    const links: { url: string; title: string }[] = [];
    let match;
    while ((match = resultRegex.exec(html)) !== null && links.length < 10) {
      const rawUrl = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      let cleanUrl = rawUrl;
      const ddgRedirect = rawUrl.match(/uddg=([^&]+)/);
      if (ddgRedirect) {
        try { cleanUrl = decodeURIComponent(ddgRedirect[1]); } catch { /* keep raw */ }
      }
      links.push({ url: cleanUrl, title });
    }
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 10) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    for (let i = 0; i < links.length; i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || "",
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function getPopularMovies(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/movie/popular?api_key=${apiKey}&language=en-IN&region=IN&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map(basicResult);
}

async function getPopularTV(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/tv/popular?api_key=${apiKey}&language=en-IN&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map((r: TMDBResult) => {
    const base = basicResult(r);
    base.type = "web_series";
    return base;
  });
}

async function getTopRated(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/movie/top_rated?api_key=${apiKey}&language=en-IN&region=IN&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map(basicResult);
}

async function getPopularAnime(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/discover/tv?api_key=${apiKey}&language=en-IN&with_genres=16&sort_by=popularity.desc&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map((r: TMDBResult) => {
    const base = basicResult(r);
    base.type = "anime";
    return base;
  });
}

async function getNewReleases(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/movie/now_playing?api_key=${apiKey}&language=en-IN&region=IN&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map(basicResult);
}

async function getHindiDubbed(apiKey: string): Promise<FormattedResult[]> {
  const url = `${TMDB_BASE}/discover/movie?api_key=${apiKey}&language=en-IN&with_original_language=hi|en&sort_by=popularity.desc&page=1`;
  const data = await fetchJSON(url, 4000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  return results.slice(0, 20).map(basicResult);
}

// Industry → TMDB language/region mapping
const INDUSTRY_LANG_MAP: Record<string, string[]> = {
  hollywood: ["en"],
  bollywood: ["hi"],
  south_indian: ["te", "ta", "ml", "kn"],
  asian_cinema: ["ko", "ja", "zh", "th"],
  european_latin: ["es", "fr", "de", "it", "pt"],
};

// Genre label → TMDB genre ID map (movie + TV genres)
const GENRE_ID_MAP: Record<string, number> = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
  documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
  horror: 27, music: 10402, mystery: 9648, romance: 10749, scifi: 878,
  thriller: 53, war: 10752, western: 37,
  "action & adventure": 10759, "sci-fi & fantasy": 10765,
  // Sub-genres mapped to parent
  "martial-arts": 28, "military-war": 10752, "spy-espionage": 53, heist: 80,
  "survival-action": 28, superhero: 28, "action-comedy": 35, vigilante: 80,
  vehicular: 28, "cyberpunk-action": 878, disaster: 18,
  psychological: 9648, "crime-thriller": 80, political: 18, "tech-cyber": 878,
  erotic: 18, "mystery-thriller": 9648, "survival-thriller": 53, "legal-medical": 18,
  supernatural: 27, slasher: 27, "psychological-horror": 27, monster: 27,
  zombie: 27, "sci-fi-horror": 27, "found-footage": 27, "comedy-horror": 27,
  "folk-cult": 27, "body-horror": 27,
  whodunit: 9648, "mob-mafia": 80, detective: 80, "true-crime": 80,
  "prison-escape": 80, "drug-cartel": 80, "neo-noir": 80, cybercrime: 80,
  "space-opera": 878, "time-travel": 878, dystopian: 878, cyberpunk: 878,
  "high-fantasy": 14, "urban-fantasy": 14, "dark-fantasy": 14, steampunk: 14,
  "alien-invasion": 878,
  "rom-com": 35, "romantic-drama": 18, "forbidden-love": 10749, "historical-romance": 10749,
  "tragic-romance": 18, "erotic-romance": 18,
  satire: 35, slapstick: 35, "dark-comedy": 35, "buddy-comedy": 35,
  "coming-of-age-comedy": 35, absurdist: 35, sitcom: 35,
  "family-drama": 18, melodrama: 18, biopic: 18, period: 36, courtroom: 18,
  "medical-drama": 18, "sports-drama": 18, "social-issue": 18,
  "treasure-hunt": 12, "road-trip": 12, "survival-adventure": 12,
  "historical-warfare": 10752, "modern-warfare": 10752,
  shonen: 16, "slice-of-life": 18, mecha: 16, "kids-family": 10751,
};

// Platform name → TMDB watch provider ID (India region)
const PROVIDER_ID_MAP: Record<string, number> = {
  netflix: 8, "prime video": 119, jiocinema: 230, "disney+ hotstar": 122, hotstar: 122,
  zee5: 232, sonyliv: 234, "apple tv": 350,
};

async function discoverContent(
  apiKey: string,
  params: {
    contentType: string; // movie | tv | anime | drama | web_series_tv | all
    industry: string;
    genre: string;
    subGenre: string;
    platform: string;
    language: string;
    region: string;
    sort: string;
  },
): Promise<{ results: FormattedResult[]; source: string }> {
  const isTV = params.contentType === "tv" || params.contentType === "web_series_tv" || params.contentType === "anime";
  const endpoint = isTV ? "tv" : "movie";
  const tmdbParams = new URLSearchParams({
    api_key: apiKey,
    language: "en-IN",
    sort_by: params.sort === "new" ? "release_date.desc" : params.sort === "top_rated" ? "vote_average.desc" : "popularity.desc",
    page: "1",
    "vote_count.gte": "50",
  });

  // Genre filter
  if (params.genre && params.genre !== "all") {
    const genreId = GENRE_ID_MAP[params.genre] || GENRE_ID_MAP[params.subGenre];
    if (genreId) tmdbParams.set(isTV ? "with_genres" : "with_genres", String(genreId));
  }
  if (params.subGenre && !tmdbParams.has("with_genres")) {
    const subId = GENRE_ID_MAP[params.subGenre];
    if (subId) tmdbParams.set("with_genres", String(subId));
  }

  // Industry → language filter
  if (params.industry && params.industry !== "all") {
    const langs = INDUSTRY_LANG_MAP[params.industry];
    if (langs && langs.length > 0) {
      tmdbParams.set("with_original_language", langs.join("|"));
    }
  }

  // Language filter (separate from industry)
  if (params.language && params.language !== "all") {
    if (params.language === "hindi") tmdbParams.set("with_original_language", "hi");
    else if (params.language === "english") tmdbParams.set("with_original_language", "en");
    else if (params.language === "korean") tmdbParams.set("with_original_language", "ko");
    else if (params.language === "japanese") tmdbParams.set("with_original_language", "ja");
    else if (params.language === "spanish") tmdbParams.set("with_original_language", "es");
    else if (params.language === "tamil") tmdbParams.set("with_original_language", "ta");
    else if (params.language === "telugu") tmdbParams.set("with_original_language", "te");
    else if (params.language === "malayalam") tmdbParams.set("with_original_language", "ml");
    // hindi_dubbed: no direct TMDB filter, keep popular
  }

  // Platform → watch provider filter (India)
  if (params.platform && params.platform !== "all") {
    const providerId = PROVIDER_ID_MAP[params.platform.toLowerCase()];
    if (providerId) {
      tmdbParams.set("with_watch_providers", String(providerId));
      tmdbParams.set("watch_region", "IN");
    }
  }

  // Anime: animation genre (16) on TV endpoint
  if (params.contentType === "anime") {
    tmdbParams.set("with_genres", "16");
  }

  // Region filter
  if (params.region && params.region !== "global") {
    if (endpoint === "movie") tmdbParams.set("region", params.region.toUpperCase());
  }

  const url = `${TMDB_BASE}/discover/${endpoint}?${tmdbParams.toString()}`;
  const data = await fetchJSON(url, 5000);
  const results: TMDBResult[] = (data.results || []).filter((r: TMDBResult) => r.poster_path);
  const formatted = results.slice(0, 20).map((r: TMDBResult) => {
    const base = basicResult(r);
    if (isTV) base.type = params.contentType === "anime" ? "anime" : "web_series";
    return base;
  });
  return { results: formatted, source: "tmdb" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  // v2: added new-releases and hindi-dubbed endpoints

  try {
    const apiKey = Deno.env.get("TMDB_API_KEY");
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "search";
    const query = url.searchParams.get("query") || "";
    const startTime = Date.now();

    if (action === "web-search") {
      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "Query required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const webResults = await scraperSearch(query);
      return new Response(JSON.stringify({ results: webResults, latencyMs: Date.now() - startTime }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "youtube-search") {
      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "Query required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use DuckDuckGo to find YouTube videos related to the query
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " site:youtube.com")}&kp=-2`;
      try {
        const res = await fetch(ddgUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        if (!res.ok) {
          return new Response(JSON.stringify({ results: [], latencyMs: Date.now() - startTime }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const html = await res.text();
        const results: any[] = [];
        const resultRegex = new RegExp('class="result__a"[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<', 'g');
        const snippetRegex = new RegExp('class="result__snippet"[^>]*>([\\s\\S]*?)<', 'g');
        const links: { url: string; title: string }[] = [];
        let match;
        while ((match = resultRegex.exec(html)) !== null && links.length < 10) {
          const rawUrl = match[1];
          const title = match[2].replace(/<[^>]*>/g, '').trim();
          let cleanUrl = rawUrl;
          const ddgRedirect = rawUrl.match(/uddg=([^&]+)/);
          if (ddgRedirect) {
            try { cleanUrl = decodeURIComponent(ddgRedirect[1]); } catch { /* keep raw */ }
          }
          if (cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be")) {
            links.push({ url: cleanUrl, title });
          }
        }
        const snippets: string[] = [];
        while ((match = snippetRegex.exec(html)) !== null && snippets.length < 10) {
          snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
        }
        for (let i = 0; i < links.length; i++) {
          // Extract YouTube video ID for embed
          let videoId = "";
          const watchMatch = links[i].url.match(/[?&]v=([^&]+)/);
          const shortMatch = links[i].url.match(/youtu\.be\/([^?&]+)/);
          const embedMatch = links[i].url.match(/embed\/([^?&/]+)/);
          if (watchMatch) videoId = watchMatch[1];
          else if (shortMatch) videoId = shortMatch[1];
          else if (embedMatch) videoId = embedMatch[1];
          results.push({
            title: links[i].title,
            url: links[i].url,
            snippet: snippets[i] || "",
            videoId,
            embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : "",
          });
        }
        return new Response(JSON.stringify({ results, latencyMs: Date.now() - startTime }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ results: [], latencyMs: Date.now() - startTime }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "details") {
      const tmdbId = parseInt(url.searchParams.get("tmdb_id") || "0", 10);
      const typeParam = url.searchParams.get("type") || "movie";
      if (!tmdbId || tmdbId <= 0) {
        return new Response(JSON.stringify({ error: "Valid tmdb_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const detailType = typeParam === "web_series" || typeParam === "tv_show" ? "tv" : "movie";
      try {
        const [detailData, videoData, creditsData] = await Promise.allSettled([
          fetchJSON(`${TMDB_BASE}/${detailType}/${tmdbId}?api_key=${apiKey}&language=en-IN`, 3000),
          fetchJSON(`${TMDB_BASE}/${detailType}/${tmdbId}/videos?api_key=${apiKey}&language=en-IN`, 2000),
          fetchJSON(`${TMDB_BASE}/${detailType}/${tmdbId}/credits?api_key=${apiKey}&language=en-IN`, 2000),
        ]);
        const result: any = { tmdbId, poster: "", backdrop: "", year: 0, runtime: 0, overview: "", trailerKey: null, cast: [] };
        if (detailData.status === "fulfilled") {
          const d = detailData.value;
          result.poster = getImageUrl(d.poster_path);
          result.backdrop = getImageUrl(d.backdrop_path, "w780");
          result.year = getYear(d.release_date || d.first_air_date);
          result.runtime = d.runtime || (d.episode_run_time?.[0]) || 0;
          result.overview = d.overview || "";
        }
        if (videoData.status === "fulfilled") {
          const trailer = (videoData.value?.results || []).find((v: any) => v.type === "Trailer" && v.site === "YouTube");
          if (trailer) result.trailerKey = trailer.key;
        }
        if (creditsData.status === "fulfilled") {
          result.cast = (creditsData.value?.cast || []).slice(0, 5).map((c: any) => c.name);
        }
        return new Response(JSON.stringify({ result, latencyMs: Date.now() - startTime }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ result: null, error: "Failed to fetch details" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "trending") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getTrending(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "popular-movies") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getPopularMovies(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "popular-tv") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getPopularTV(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "top-rated") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getTopRated(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "popular-anime") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getPopularAnime(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "new-releases") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getNewReleases(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "hindi-dubbed") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await getHindiDubbed(apiKey);
      return new Response(JSON.stringify({ results: data, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "discover") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const discoverParams = {
        contentType: url.searchParams.get("content_type") || "all",
        industry: url.searchParams.get("industry") || "all",
        genre: url.searchParams.get("genre") || "all",
        subGenre: url.searchParams.get("sub_genre") || "",
        platform: url.searchParams.get("platform") || "all",
        language: url.searchParams.get("language") || "all",
        region: url.searchParams.get("region") || "global",
        sort: url.searchParams.get("sort") || "popular",
      };
      try {
        const { results: discResults, source: discSource } = await discoverContent(apiKey, discoverParams);
        return new Response(JSON.stringify({ results: discResults, latencyMs: Date.now() - startTime, source: discSource }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ results: [], latencyMs: Date.now() - startTime, source: "tmdb", error: err.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // action === "search"
    if (!query.trim()) {
      return new Response(JSON.stringify({ error: "Query parameter required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "TMDB_API_KEY not set" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let tmdbResults: FormattedResult[] = [];
    try {
      tmdbResults = await searchTMDB(query, apiKey);
    } catch (err) {
      // TMDB failed — fall through to scraper
    }

    if (tmdbResults.length > 0) {
      return new Response(JSON.stringify({ results: tmdbResults, latencyMs: Date.now() - startTime, source: "tmdb" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scraper fallback
    const webResults = await scraperSearch(query);
    const scraperFormatted = webResults.map((r: any, i: number) => ({
      tmdbId: -1,
      title: r.title,
      type: "movie",
      year: new Date().getFullYear(),
      poster: "",
      backdrop: "",
      overview: r.snippet || "Web result",
      rating: 0,
      genres: [],
      offers: [],
      trailerKey: null,
      cast: [],
      isExplicit: true,
      externalUrl: r.url,
    }));

    return new Response(JSON.stringify({ results: scraperFormatted, latencyMs: Date.now() - startTime, source: "scraper" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
