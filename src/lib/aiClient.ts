import type { AIRecommendationResponse, AIRecommendation, CatalogItem } from '@/types';
import { LOCAL_CATALOG } from '@/data/catalog';

const GEMINI_API_KEY = (
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.GEMINI_API_KEY ||
  ''
).trim();
const GEMINI_MODEL = 'gemini-2.0-flash';

export interface LazyModeResult {
  vibeDecoded: string;
  languagePreference: string;
  sortBy: string;
  items: CatalogItem[];
  error?: string;
}

const SYSTEM_PROMPT = `You are the core intelligence engine for "MovieKhojo", a zero-hallucination, high-accuracy movie and show discovery platform. Your job is to power a "Lazy Mode" chat for users who want direct, rich recommendations.

CRITICAL RULE: MANDATORY METADATA TAGGING
For every recommended item, you MUST include:
1. Exact TMDB ID
2. Rotten Tomatoes Tomatometer (Critics) and Audience Score
3. Precise Runtime (e.g., "1h 45m" or "8 Episodes")
4. Streaming providers for India (IN)
5. Audio tracks status (Original Hindi vs Hindi Dubbed)

USER EXPERIENCE:
- Keep responses to 4-5 hyper-focused matches. No filler text.
- Write spoiler-free text trailers (3-5 sentences capturing vibe/hook without plot twists).
- Include "shortcoming" field if there's a known major flaw, empty string if universally solid.

OUTPUT FORMAT: Respond ONLY with a valid JSON object. No pleasantries, no markdown, no conversational text. The JSON must match:
{
  "search_metadata": {
    "lazy_mode_active": true,
    "user_vibe_decoded": "Clear analysis of user's mood or scenario",
    "applied_global_filters": {
      "language_preference": "English/Hindi/Hindi Dubbed/etc",
      "sort_by": "Popular / New Releases / Vibe Match"
    }
  },
  "recommendations": [
    {
      "tmdb_id": 278,
      "title": "The Shawshank Redemption",
      "type": "Movie",
      "runtime_duration": "2h 22m",
      "languages": {
        "original": "English",
        "hindi_audio_available": "Hindi Dubbed"
      },
      "ratings": {
        "rotten_tomatoes_critics": "98%",
        "audience_score": "98%"
      },
      "streaming_platforms_india": ["Netflix", "Prime Video"],
      "matched_genres": ["Drama - Historical", "Crime - Legal/Courtroom"],
      "text_trailer": "3-5 sentence spoiler-free teaser",
      "shortcoming": "",
      "vibe_match_percentage": 99,
      "why_this_matches": "Brief explanation"
    }
  ]
}`;

const CHAT_SYSTEM_PROMPT = `You are MovieKhojo's AI assistant, specialized in answering questions about movies, TV shows, web series, and anime. When a user asks about a specific movie or show, provide accurate, helpful, spoiler-aware (with warnings) answers. Keep responses concise (2-4 sentences). If you don't know something, say so honestly. Respond in plain text, no markdown.`;

function buildGeminiUrl(apiKey: string, model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function callGemini(userQuery: string, systemPrompt: string, isJson: boolean): Promise<{ text: string; ok: boolean }> {
  if (!GEMINI_API_KEY) return { text: '', ok: false };

  const url = buildGeminiUrl(GEMINI_API_KEY, GEMINI_MODEL);
  const payload: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 4096,
      ...(isJson ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { text: '', ok: false };

    const data = await res.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return { text: '', ok: false };
    return { text: textContent, ok: true };
  } catch {
    clearTimeout(timeout);
    return { text: '', ok: false };
  }
}

function aiRecToCatalogItem(rec: AIRecommendation): CatalogItem {
  const typeMap: Record<string, CatalogItem['type']> = {
    'Movie': 'movie',
    'Web Series': 'web_series',
    'TV Show': 'tv_show',
    'Anime': 'anime',
    'Cartoon': 'cartoon',
    'Documentary': 'documentary',
    'Kids Show': 'kids_show',
    'Short Drama': 'short_drama',
  };

  const rtCritics = parseInt(rec.ratings?.rotten_tomatoes_critics?.replace('%', '') || '0', 10) || 0;
  const rtAudience = parseInt(rec.ratings?.audience_score?.replace('%', '') || '0', 10) || 0;

  const ratings: CatalogItem['ratings'] = [];
  if (rtCritics > 0) ratings.push({ source: 'Rotten Tomatoes', score: rtCritics, maxScore: 100 });
  if (rtAudience > 0) ratings.push({ source: 'RT Audience', score: rtAudience, maxScore: 100 });

  const hindiAudio = rec.languages?.hindi_audio_available || '';
  const audioStatus: CatalogItem['audioStatus'] =
    hindiAudio === 'Hindi Original' ? 'verified' :
    hindiAudio === 'Hindi Dubbed' ? 'user_confirmed' :
    'unverified';

  return {
    id: `ai-${rec.tmdb_id}`,
    title: rec.title,
    type: typeMap[rec.type] || 'movie',
    year: 0,
    poster: '',
    overview: rec.text_trailer || '',
    genres: rec.matched_genres || [],
    tags: [],
    runtimeDuration: rec.runtime_duration,
    ratings,
    offers: (rec.streaming_platforms_india || []).map((p) => ({
      platform: p,
      type: 'stream' as const,
      quality: 'HD' as const,
      url: `https://www.google.com/search?q=${encodeURIComponent(rec.title + ' ' + p)}`,
    })),
    audioStatus,
    tmdbId: rec.tmdb_id,
    textTrailer: rec.text_trailer,
    shortcoming: rec.shortcoming,
    vibeMatchPercentage: rec.vibe_match_percentage,
    whyThisMatches: rec.why_this_matches,
    languages: {
      original: rec.languages?.original || 'Unknown',
      hindiAudioAvailable: hindiAudio === 'Hindi Original' ? 'Hindi Original' : hindiAudio === 'Hindi Dubbed' ? 'Hindi Dubbed' : 'None',
    },
    rtCritics,
    rtAudience,
  };
}

const FALLBACK_RECS: AIRecommendation[] = [
  { tmdb_id: 278, title: 'The Shawshank Redemption', type: 'Movie', runtime_duration: '2h 22m', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '91%', audience_score: '98%' }, streaming_platforms_india: ['Prime Video', 'JioCinema'], matched_genres: ['Drama', 'Crime'], text_trailer: 'Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.', shortcoming: '', vibe_match_percentage: 85, why_this_matches: 'A timeless classic that resonates with most moods' },
  { tmdb_id: 76341, title: 'Breaking Bad', type: 'Web Series', runtime_duration: '5 Seasons', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '96%', audience_score: '97%' }, streaming_platforms_india: ['Netflix'], matched_genres: ['Crime', 'Drama', 'Thriller'], text_trailer: 'A chemistry teacher turned meth manufacturer builds a drug empire while battling his inner demons.', shortcoming: 'Slow start in Season 1', vibe_match_percentage: 82, why_this_matches: 'Gripping character transformation story' },
  { tmdb_id: 71712, title: 'Money Heist', type: 'Web Series', runtime_duration: '5 Parts', languages: { original: 'Spanish', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '97%', audience_score: '85%' }, streaming_platforms_india: ['Netflix'], matched_genres: ['Crime', 'Thriller'], text_trailer: 'A group of robbers led by a mastermind attempt the most perfect heist in recorded history.', shortcoming: 'Later parts feel stretched', vibe_match_percentage: 80, why_this_matches: 'High-stakes heist with emotional depth' },
  { tmdb_id: 1399, title: 'Breaking Bad', type: 'Web Series', runtime_duration: '5 Seasons', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '96%', audience_score: '97%' }, streaming_platforms_india: ['Netflix'], matched_genres: ['Crime', 'Drama'], text_trailer: 'A high school chemistry teacher turns to crime to secure his family\'s future.', shortcoming: '', vibe_match_percentage: 78, why_this_matches: 'Masterclass in storytelling' },
  { tmdb_id: 60625, title: 'Stranger Things', type: 'Web Series', runtime_duration: '4 Seasons', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '91%', audience_score: '90%' }, streaming_platforms_india: ['Netflix'], matched_genres: ['Sci-Fi', 'Horror', 'Drama'], text_trailer: 'When a boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.', shortcoming: '', vibe_match_percentage: 77, why_this_matches: 'Nostalgic sci-fi with great characters' },
  { tmdb_id: 1429, title: 'Attack on Titan', type: 'Anime', runtime_duration: '4 Seasons', languages: { original: 'Japanese', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '95%', audience_score: '95%' }, streaming_platforms_india: ['Prime Video', 'Netflix'], matched_genres: ['Anime', 'Action', 'Drama'], text_trailer: 'Humanity fights for survival against giant humanoid Titans that have brought civilization to the brink.', shortcoming: 'Complex later seasons', vibe_match_percentage: 76, why_this_matches: 'Epic survival story with deep themes' },
  { tmdb_id: 319017, title: 'Spider-Man: No Way Home', type: 'Movie', runtime_duration: '2h 28m', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '93%', audience_score: '98%' }, streaming_platforms_india: ['Prime Video', 'SonyLIV'], matched_genres: ['Action', 'Adventure', 'Sci-Fi'], text_trailer: 'With his identity revealed, Spider-Man seeks help from Doctor Strange as dangerous foes appear.', shortcoming: '', vibe_match_percentage: 75, why_this_matches: 'Crowd-pleasing superhero adventure' },
  { tmdb_id: 299536, title: 'Avengers: Infinity War', type: 'Movie', runtime_duration: '2h 29m', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '85%', audience_score: '92%' }, streaming_platforms_india: ['Disney+ Hotstar'], matched_genres: ['Action', 'Sci-Fi'], text_trailer: 'The Avengers assemble to stop Thanos from collecting all Infinity Stones and destroying half the universe.', shortcoming: 'Cliffhanger ending', vibe_match_percentage: 74, why_this_matches: 'Epic crossover event' },
  { tmdb_id: 602229, title: 'Demon Slayer', type: 'Anime', runtime_duration: '4 Seasons', languages: { original: 'Japanese', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '96%', audience_score: '95%' }, streaming_platforms_india: ['Netflix', 'Prime Video'], matched_genres: ['Anime', 'Action', 'Fantasy'], text_trailer: 'A young swordsman joins the Demon Slayer Corps to avenge his family and cure his sister.', shortcoming: '', vibe_match_percentage: 73, why_this_matches: 'Visually stunning action anime' },
  { tmdb_id: 76341, title: 'Peaky Blinders', type: 'Web Series', runtime_duration: '6 Seasons', languages: { original: 'English', hindi_audio_available: 'Hindi Dubbed' }, ratings: { rotten_tomatoes_critics: '93%', audience_score: '92%' }, streaming_platforms_india: ['Netflix'], matched_genres: ['Crime', 'Drama'], text_trailer: 'A gangster family in 1900s England builds an empire through cunning and brutality.', shortcoming: '', vibe_match_percentage: 72, why_this_matches: 'Stylish period crime drama' },
];

function buildFallbackResult(query: string): LazyModeResult {
  const items = FALLBACK_RECS.map(aiRecToCatalogItem);
  return {
    vibeDecoded: `Showing popular trending picks for "${query}"`,
    languagePreference: 'English',
    sortBy: 'Popular',
    items,
  };
}

export async function fetchAIRecommendations(query: string): Promise<LazyModeResult> {
  const result = await callGemini(query, SYSTEM_PROMPT, true);

  if (!result.ok || !result.text) {
    return buildFallbackResult(query);
  }

  let parsed: AIRecommendationResponse | null = null;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[1].trim()); } catch { /* fall through */ }
    }
  }

  if (!parsed || !parsed.recommendations || parsed.recommendations.length === 0) {
    return buildFallbackResult(query);
  }

  const items = parsed.recommendations.map(aiRecToCatalogItem);

  const enriched = await Promise.all(
    items.map(async (item) => {
      if (item.tmdbId && item.tmdbId > 0) {
        try {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const tmdbRes = await fetch(
            `${SUPABASE_URL}/functions/v1/tmdb-search?action=details&tmdb_id=${item.tmdbId}&type=${item.type}`,
            { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
          );
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            if (tmdbData.result) {
              item.poster = tmdbData.result.poster || '';
              item.backdrop = tmdbData.result.backdrop || '';
              item.year = tmdbData.result.year || 0;
              item.runtime = tmdbData.result.runtime;
              item.trailerKey = tmdbData.result.trailerKey || undefined;
              item.cast = tmdbData.result.cast || [];
              item.overview = item.overview || tmdbData.result.overview || '';
            }
          }
        } catch { /* enrichment failed — keep AI data */ }
      }
      return item;
    }),
  );

  return {
    vibeDecoded: parsed.search_metadata?.user_vibe_decoded || '',
    languagePreference: parsed.search_metadata?.applied_global_filters?.language_preference || '',
    sortBy: parsed.search_metadata?.applied_global_filters?.sort_by || '',
    items: enriched,
  };
}

export async function fetchMovieChat(query: string, context: string): Promise<string> {
  const chatQuery = context ? `Regarding "${context}": ${query}` : query;
  const result = await callGemini(chatQuery, CHAT_SYSTEM_PROMPT, false);

  if (!result.ok || !result.text) {
    const localItem = LOCAL_CATALOG.find((i) =>
      context.toLowerCase().includes(i.title.toLowerCase()) ||
      i.title.toLowerCase().includes(context.toLowerCase().split(' ')[0] || '')
    );
    if (localItem) {
      return `${localItem.title} (${localItem.year}) — ${localItem.overview}`;
    }
    return 'I couldn\'t reach the AI service right now, but I can tell you this is a popular title. Try asking again in a moment.';
  }

  return result.text;
}
