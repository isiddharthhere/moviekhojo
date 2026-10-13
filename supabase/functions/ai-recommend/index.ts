const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// MovieKhojo AI Recommendation Engine v3

const SYSTEM_PROMPT = `You are the core intelligence engine for "MovieKhojo", a zero-hallucination, high-accuracy movie and show discovery platform. Your job is to power both structured discovery and a "Lazy Mode" chat for users who want direct, rich recommendations.

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

CASCADING GENRE ONTOLOGY:
Map queries against these content types: Movie, Web Series, TV Show, Anime, Cartoon, Documentary, Kids Show, Short Drama.
Core genres and sub-genres:
- Action: Martial Arts, Military/War, Spy/Espionage, Heist, Survival, Superhero, Sci-Fi Action, Car Chases, Cyberpunk
- Thriller: Psychological, Crime, Sci-Fi, Mystery, Techno, Political, Erotic, Suspense
- Horror: Supernatural, Psychological, Slasher, Monster, Zombie, Found Footage, Gore, Cosmic, Folk
- Crime: Gangster/Mafia, Detective/Neo-Noir, True Crime, Police Procedural, Legal/Courtroom, White Collar, Whodunit
- Sci-Fi & Fantasy: Space Opera, Time Travel, Dystopian, Dark Fantasy, High Fantasy, Urban Fantasy, Isekai, Steampunk, Post-Apocalyptic
- Comedy: Sitcom, Dark Comedy, Satire, Slapstick, Rom-Com, Parody, Black Humor
- Drama: Period/Historical, Melodrama, Coming-of-Age, Biographical, Family, Sports, Medical
- Romance: Slice-of-Life, Slow-Burn, Forbidden Love, Melodramatic, Workplace
- Documentaries: Nature/Wildlife, Historical, Science/Space, Investigative, Biographies, True Crime

LANGUAGE PRIORITY: English (Original), Hindi (Original), Hindi Dubbed (separate from original), Korean, Japanese, Spanish, French, Tamil, Telugu, Malayalam, Kannada, Bengali.

SORTING: Evaluate if intent is "Popular/Trending" or "New/Latest Releases".

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

async function callGemini(apiKey: string, userQuery: string, systemPrompt: string, isJson: boolean): Promise<{ text: string; status: number; error?: string }> {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];

  for (const model of models) {
    const url = buildGeminiUrl(apiKey, model);
    const payload: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 4096,
        ...(isJson ? { responseMimeType: "application/json" } : {}),
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        return { text: "", status: res.status, error: `Gemini API error: ${res.status} — ${errText.substring(0, 200)}` };
      }

      const data = await res.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        return { text: "", status: 502, error: "Empty response from Gemini" };
      }
      return { text: textContent, status: 200 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("not found")) continue;
      return { text: "", status: 502, error: msg };
    }
  }

  return { text: "", status: 404, error: "FALLBACK" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY not configured. Set it as a Supabase edge function secret named GEMINI_API_KEY. Get a free key from Google AI Studio (aistudio.google.com).",
          search_metadata: null,
          recommendations: [],
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: { query?: string; context?: string; mode?: string; title?: string };
    try {
      body = await req.json();
    } catch {
      const url = new URL(req.url);
      body = { query: url.searchParams.get("query") || "", mode: url.searchParams.get("mode") || "recommend" };
    }

    const userQuery = body.query?.trim() || "";
    if (!userQuery) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mode = body.mode || "recommend";

    // Chat mode — for "Ask About This Movie" feature
    if (mode === "chat") {
      const context = body.context || body.title || "";
      const chatQuery = context ? `Regarding "${context}": ${userQuery}` : userQuery;
      const result = await callGemini(apiKey, chatQuery, CHAT_SYSTEM_PROMPT, false);
      if (result.error) {
        return new Response(
          JSON.stringify({ error: result.error, response: "" }),
          { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ response: result.text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Recommend mode (default)
    const result = await callGemini(apiKey, userQuery, SYSTEM_PROMPT, true);
    if (result.error) {
      // Graceful fallback — return formatted response instead of crashing
      const fallbackRecs = [
        { tmdb_id: 278, title: "The Shawshank Redemption", type: "Movie", runtime_duration: "2h 22m", languages: { original: "English", hindi_audio_available: "Hindi Dubbed" }, ratings: { rotten_tomatoes_critics: "98%", audience_score: "98%" }, streaming_platforms_india: ["Netflix"], matched_genres: ["Drama"], text_trailer: "A banker convicted of murder finds hope and friendship in prison.", shortcoming: "", vibe_match_percentage: 80, why_this_matches: "Popular fallback recommendation" },
        { tmdb_id: 299536, title: "Avengers: Infinity War", type: "Movie", runtime_duration: "2h 29m", languages: { original: "English", hindi_audio_available: "Hindi Dubbed" }, ratings: { rotten_tomatoes_critics: "85%", audience_score: "92%" }, streaming_platforms_india: ["Disney+ Hotstar"], matched_genres: ["Action", "Sci-Fi"], text_trailer: "Heroes unite to stop a cosmic threat.", shortcoming: "", vibe_match_percentage: 75, why_this_matches: "Popular fallback recommendation" },
      ];
      return new Response(
        JSON.stringify({
          search_metadata: {
            lazy_mode_active: true,
            user_vibe_decoded: "AI service temporarily unavailable — showing popular suggestions",
            applied_global_filters: { language_preference: "English", sort_by: "Popular" },
          },
          recommendations: fallbackRecs,
          error: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          return new Response(
            JSON.stringify({
              error: "Failed to parse Gemini response as JSON",
              raw: result.text.substring(0, 1000),
              search_metadata: null,
              recommendations: [],
            }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        return new Response(
          JSON.stringify({
            error: "Failed to parse Gemini response as JSON",
            raw: result.text.substring(0, 1000),
            search_metadata: null,
            recommendations: [],
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message || "Internal error",
        search_metadata: null,
        recommendations: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
