export type ContentType = 'movie' | 'web_series' | 'anime' | 'documentary' | 'cartoon' | 'tv_show' | 'kids_show' | 'short_drama';

export type AudioStatus = 'verified' | 'user_confirmed' | 'unverified';

export type StreamQuality = '4K' | 'HD' | 'SD';

export type OfferType = 'stream' | 'rent' | 'buy' | 'free';

export interface StreamingOffer {
  platform: string;
  type: OfferType;
  quality: StreamQuality;
  url: string;
  price?: string;
  plan?: string;
}

export interface RatingSource {
  source: string;
  score: number;
  maxScore?: number;
}

export interface LanguageInfo {
  original: string;
  hindiAudioAvailable: 'Hindi Original' | 'Hindi Dubbed' | 'None';
}

export interface CatalogItem {
  id: string;
  title: string;
  type: ContentType;
  year: number;
  poster: string;
  backdrop?: string;
  overview: string;
  genres: string[];
  tags: string[];
  cast?: string[];
  runtime?: number;
  runtimeDuration?: string;
  ratings: RatingSource[];
  offers: StreamingOffer[];
  audioStatus: AudioStatus;
  audioStatusDate?: string;
  tmdbId?: number;
  isExplicit?: boolean;
  externalUrl?: string;
  trailerKey?: string;
  textTrailer?: string;
  shortcoming?: string;
  vibeMatchPercentage?: number;
  whyThisMatches?: string;
  languages?: LanguageInfo;
  rtCritics?: number;
  rtAudience?: number;
}

export interface AIRecommendation {
  tmdb_id: number;
  title: string;
  type: string;
  runtime_duration: string;
  languages: {
    original: string;
    hindi_audio_available: string;
  };
  ratings: {
    rotten_tomatoes_critics: string;
    audience_score: string;
  };
  streaming_platforms_india: string[];
  matched_genres: string[];
  text_trailer: string;
  shortcoming: string;
  vibe_match_percentage: number;
  why_this_matches: string;
}

export interface AIRecommendationResponse {
  search_metadata: {
    lazy_mode_active: boolean;
    user_vibe_decoded: string;
    applied_global_filters: {
      language_preference: string;
      sort_by: string;
    };
  };
  recommendations: AIRecommendation[];
  error?: string;
}

export interface BoxOfficeEntry {
  id: string;
  title: string;
  year: number;
  budget: string;
  grossWorldwide: string;
  verdict: 'Blockbuster' | 'Super Hit' | 'Hit' | 'Average' | 'Flop' | 'Disaster';
  openingWeekend?: string;
  indiaCollection?: string;
  overseasCollection?: string;
}

export interface UserBehavior {
  clicks: string[];
  searches: string[];
  opened: string[];
  preferences: {
    categories: ContentType[];
    hubs: string[];
    audio: string[];
  };
}

export interface SearchSource {
  layer: 'tmdb' | 'local' | 'scraper' | 'ai';
  latencyMs: number;
  resultsCount: number;
}
