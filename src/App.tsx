import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search as SearchIcon, User, Bookmark, X, Loader2, Film as FilmIcon, Bot, Sparkles, Flame, Trophy, Heart, Languages, Globe } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { LOCAL_CATALOG } from '@/data/catalog';
import { MovieCard } from '@/components/MovieCard';
import { MovieDetailPanel } from '@/components/MovieDetailPanel';
import { TrailerModal } from '@/components/TrailerModal';
import { Carousel } from '@/components/Carousel';
import { HeroCarousel } from '@/components/HeroCarousel';
import { Top10Row } from '@/components/Top10Row';
import { PosterGrid } from '@/components/PosterGrid';
import { SmartFilterBar, type FilterState } from '@/components/SmartFilterBar';
import { LeftSidebar, type SidebarPage } from '@/components/LeftSidebar';
import { BoxOfficeMatrix } from '@/components/BoxOfficeMatrix';
import { AuthModal } from '@/components/AuthModal';
import { AdminPortal } from '@/components/AdminPortal';
import { LazyMode } from '@/components/LazyMode';
import { waterfallSearch, fetchTrending, fetchPopularMovies, fetchPopularTV, fetchTopRated, fetchPopularAnime, fetchNewReleases, fetchHindiDubbed, discoverContent, type DiscoverParams } from '@/lib/searchEngine';
import { parseTagsFromQuery, fuzzySearchCatalog } from '@/utils/fuzzySearch';
import { trackClick, trackSearch, trackOpen, getRecommendedIds, updatePreferences } from '@/utils/tasteTracker';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type ViewMode = 'finder' | 'boxoffice' | 'lazy';
type AppRoute = 'main' | 'admin';

const CONTENT_TABS: { id: string; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'movie', label: 'Movies' },
  { id: 'web_series_tv', label: 'Web Series & TV Shows' },
  { id: 'anime', label: 'Anime' },
  { id: 'drama', label: 'Drama' },
];

const SORT_TABS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'popular', label: 'Popular Today', icon: Flame },
  { id: 'new', label: 'Newly Launched', icon: Sparkles },
  { id: 'top_rated', label: 'Top Rated All-Time', icon: Trophy },
  { id: 'hindi_dubbed', label: 'Trending Hindi Dubbed', icon: Heart },
  { id: 'top_rotten', label: 'Top Rotten Meter', icon: Trophy },
  { id: 'high_audience', label: 'High Audience Score', icon: Heart },
];

const LANGUAGES = [
  { id: 'hindi', label: 'Hindi', flag: '🇮🇳' },
  { id: 'hinglish', label: 'Hinglish', flag: '🇮🇳' },
  { id: 'en_us', label: 'English US', flag: '🇺🇸' },
  { id: 'en_uk', label: 'English UK', flag: '🇬🇧' },
];

export default function App() {
  const [route, setRoute] = useState<AppRoute>('main');
  const [view, setView] = useState<ViewMode>('finder');
  const [sidebarPage, setSidebarPage] = useState<SidebarPage>('home');
  const [activeContentTab, setActiveContentTab] = useState('home');
  const [activeSortTab, setActiveSortTab] = useState('popular');
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [watchlist, setWatchlist] = useState<CatalogItem[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en_us');
  const [ageRestrictionOn, setAgeRestrictionOn] = useState(false);
  const [contentRegion, setContentRegion] = useState('global');
  const [showMyTaste, setShowMyTaste] = useState(false);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [autocompleteItems, setAutocompleteItems] = useState<CatalogItem[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ minRT: 0, minAudience: 0, minIMDb: 0, maxRuntime: 0 });
  const [discoveredItems, setDiscoveredItems] = useState<CatalogItem[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const [trendingItems, setTrendingItems] = useState<CatalogItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<CatalogItem[]>([]);
  const [popularTV, setPopularTV] = useState<CatalogItem[]>([]);
  const [topRated, setTopRated] = useState<CatalogItem[]>([]);
  const [popularAnime, setPopularAnime] = useState<CatalogItem[]>([]);
  const [newReleases, setNewReleases] = useState<CatalogItem[]>([]);
  const [hindiDubbed, setHindiDubbed] = useState<CatalogItem[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    industry: 'all',
    genre: 'all',
    subGenre: '',
    platform: 'all',
    language: 'all',
  });

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin')) setRoute('admin');
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchTrending().then(setTrendingItems).catch(() => {});
    fetchPopularMovies().then(setPopularMovies).catch(() => {});
    fetchPopularTV().then(setPopularTV).catch(() => {});
    fetchTopRated().then(setTopRated).catch(() => {});
    fetchPopularAnime().then(setPopularAnime).catch(() => {});
    fetchNewReleases().then(setNewReleases).catch(() => {});
    fetchHindiDubbed().then(setHindiDubbed).catch(() => {});
  }, [contentRegion]);

  // TMDB Discover — fires whenever content tab, filters, or region change
  const hasActiveFilters = filters.industry !== 'all' || filters.genre !== 'all' || filters.subGenre !== '' || filters.platform !== 'all' || filters.language !== 'all';
  const isFilteredView = activeContentTab !== 'home' || hasActiveFilters;

  useEffect(() => {
    if (!isFilteredView) { setDiscoveredItems([]); return; }
    setDiscovering(true);
    const params: DiscoverParams = {
      contentType: activeContentTab === 'home' ? 'all' : activeContentTab,
      industry: filters.industry,
      genre: filters.genre,
      subGenre: filters.subGenre,
      platform: filters.platform,
      language: filters.language,
      region: contentRegion,
      sort: activeSortTab === 'new' ? 'new' : activeSortTab === 'top_rated' ? 'top_rated' : 'popular',
    };
    const timer = setTimeout(() => {
      discoverContent(params).then((items) => {
        setDiscoveredItems(items);
        setDiscovering(false);
      }).catch(() => { setDiscoveredItems([]); setDiscovering(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeContentTab, filters.industry, filters.genre, filters.subGenre, filters.platform, filters.language, contentRegion, activeSortTab, isFilteredView]);

  useEffect(() => {
    if (user) {
      try {
        const raw = localStorage.getItem(`moviekhojo_watchlist_${user.id}`);
        if (raw) setWatchlist(JSON.parse(raw));
      } catch { /* ignore */ }
    } else {
      setWatchlist([]);
    }
  }, [user]);

  const saveWatchlist = (items: CatalogItem[]) => {
    if (user) localStorage.setItem(`moviekhojo_watchlist_${user.id}`, JSON.stringify(items));
    setWatchlist(items);
  };

  const toggleWatchlist = (item: CatalogItem) => {
    const exists = watchlist.find((w) => w.id === item.id);
    if (exists) saveWatchlist(watchlist.filter((w) => w.id !== item.id));
    else saveWatchlist([...watchlist, item]);
  };

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    trackSearch(q);
    const parsedTags = parseTagsFromQuery(q);
    if (parsedTags.length > 0) setTags((prev) => [...new Set([...prev, ...parsedTags])]);

    const searchResults = await waterfallSearch(q, {});
    setResults(searchResults.results);
    setLoading(false);
  }, []);

  // Instant autocomplete for fuzzy/partial search
  useEffect(() => {
    if (query.trim().length < 1) { setAutocompleteItems([]); setShowAutocomplete(false); return; }
    const timer = setTimeout(() => {
      const local = fuzzySearchCatalog(query, {});
      setAutocompleteItems(local.slice(0, 6));
      setShowAutocomplete(local.length > 0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const addSearchTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    setSearchTags((prev) => [...new Set([...prev, clean])]);
    setQuery('');
    setShowAutocomplete(false);
    performSearch(clean);
  };

  const removeSearchTag = (tag: string) => {
    setSearchTags((prev) => prev.filter((t) => t !== tag));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 1) {
        performSearch(query);
      } else if (query.trim().length === 0) {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = (item: CatalogItem) => {
    trackClick(item.id);
    trackOpen(item.id);
    setSelectedItem(item);
  };

  const handleSidebarNavigate = (page: SidebarPage) => {
    setSidebarPage(page);
    setView('finder');
    setQuery('');
    if (page === 'home') {
      setActiveContentTab('home');
      setFilters({ industry: 'all', genre: 'all', subGenre: '', platform: 'all', language: 'all' });
      setSearchTags([]);
      setQuery('');
      setAdvancedFilters({ minRT: 0, minAudience: 0, minIMDb: 0, maxRuntime: 0 });
      setActiveSortTab('popular');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (page === 'trending') {
      setActiveSortTab('popular');
      setTimeout(() => {
        const el = document.getElementById('sort-tabs-section');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (page === 'explore') {
      setActiveContentTab('home');
      setTimeout(() => {
        const el = document.getElementById('browse-all-grid');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (page === 'watchlist') {
      setShowWatchlist(true);
    } else if (page === 'mytaste') {
      setShowMyTaste(true);
    } else if (page === 'settings') {
      setShowSettings(true);
    }
  };

  // Master filter function — applies content tab + smart filters to ALL items
  const applyAllFilters = useCallback((items: CatalogItem[]): CatalogItem[] => {
    let filtered = [...items];
    const seen = new Set<string>();
    filtered = filtered.filter((item) => {
      const key = item.id || item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Age restriction — strip explicit content
    if (ageRestrictionOn) {
      filtered = filtered.filter((item) => !item.isExplicit);
    }

    // Content tab filter
    if (activeContentTab !== 'home') {
      if (activeContentTab === 'web_series_tv') {
        filtered = filtered.filter((item) => item.type === 'web_series' || item.type === 'tv_show');
      } else if (activeContentTab === 'drama') {
        filtered = filtered.filter((item) =>
          item.type === 'short_drama' || item.type === 'movie' || item.type === 'web_series' || item.type === 'tv_show'
        );
        filtered = filtered.filter((item) =>
          item.genres.some((g) => g.toLowerCase().includes('drama')) ||
          item.tags.some((t) => t.toLowerCase().includes('drama'))
        );
      } else {
        filtered = filtered.filter((item) => item.type === activeContentTab);
      }
    }

    // Industry filter
    if (filters.industry !== 'all') {
      const industryMap: Record<string, string[]> = {
        hollywood: ['english', 'hollywood'],
        bollywood: ['hindi', 'bollywood'],
        south_indian: ['telugu', 'tamil', 'malayalam', 'kannada', 'south indian'],
        asian_cinema: ['korean', 'japanese', 'chinese', 'thai', 'asian'],
        european_latin: ['spanish', 'french', 'german', 'italian', 'european', 'latin'],
      };
      const keywords = industryMap[filters.industry] || [];
      if (keywords.length > 0) {
        filtered = filtered.filter((item) => {
          const text = `${item.title} ${item.overview} ${item.genres.join(' ')} ${item.tags.join(' ')}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        });
      }
    }

    // Genre filter
    if (filters.genre !== 'all') {
      filtered = filtered.filter((item) =>
        item.genres.some((g) => g.toLowerCase().includes(filters.genre)) ||
        item.tags.some((t) => t.toLowerCase().includes(filters.genre))
      );
    }

    // Sub-genre filter
    if (filters.subGenre) {
      filtered = filtered.filter((item) =>
        item.tags.some((t) => t.toLowerCase().includes(filters.subGenre.replace(/-/g, ' '))) ||
        item.genres.some((g) => g.toLowerCase().includes(filters.subGenre.replace(/-/g, ' ')))
      );
    }

    // Platform filter
    if (filters.platform !== 'all') {
      filtered = filtered.filter((item) =>
        item.offers.some((o) => o.platform === filters.platform)
      );
    }

    // Language filter
    if (filters.language !== 'all') {
      if (filters.language === 'hindi_dubbed') {
        filtered = filtered.filter((item) =>
          item.audioStatus !== 'unverified' || item.tags.some((t) => t.includes('hindi'))
        );
      } else if (filters.language === 'hindi') {
        filtered = filtered.filter((item) => {
          const text = `${item.overview} ${item.tags.join(' ')} ${item.genres.join(' ')}`.toLowerCase();
          return text.includes('hindi');
        });
      } else {
        const langMap: Record<string, string[]> = {
          english: ['english'],
          korean: ['korean'],
          japanese: ['japanese'],
          spanish: ['spanish'],
          tamil: ['tamil'],
          telugu: ['telugu'],
          malayalam: ['malayalam'],
        };
        const keywords = langMap[filters.language] || [];
        if (keywords.length > 0) {
          filtered = filtered.filter((item) => {
            const text = `${item.overview} ${item.tags.join(' ')}`.toLowerCase();
            return keywords.some((kw) => text.includes(kw));
          });
        }
      }
    }

    // Advanced filters: RT, Audience, IMDb, Runtime
    if (advancedFilters.minRT > 0) {
      filtered = filtered.filter((item) => (item.rtCritics || 0) >= advancedFilters.minRT);
    }
    if (advancedFilters.minAudience > 0) {
      filtered = filtered.filter((item) => (item.rtAudience || 0) >= advancedFilters.minAudience);
    }
    if (advancedFilters.minIMDb > 0) {
      filtered = filtered.filter((item) => {
        const imdbScore = item.ratings.find((r) => r.source.toLowerCase().includes('imdb'))?.score || 0;
        return imdbScore >= advancedFilters.minIMDb;
      });
    }
    if (advancedFilters.maxRuntime > 0) {
      filtered = filtered.filter((item) => !item.runtime || item.runtime <= advancedFilters.maxRuntime);
    }

    return filtered;
  }, [activeContentTab, filters, ageRestrictionOn, advancedFilters]);

  // All available items — discovered items take priority when filters are active
  const allItems = useMemo(() => {
    if (isFilteredView && discoveredItems.length > 0) {
      return [...discoveredItems, ...trendingItems, ...popularMovies, ...popularTV, ...topRated, ...popularAnime, ...newReleases, ...hindiDubbed, ...LOCAL_CATALOG];
    }
    return [...trendingItems, ...popularMovies, ...popularTV, ...topRated, ...popularAnime, ...newReleases, ...hindiDubbed, ...LOCAL_CATALOG];
  }, [trendingItems, popularMovies, popularTV, topRated, popularAnime, newReleases, hindiDubbed, discoveredItems, isFilteredView]);

  // Synchronized filtered items — used for hero, carousels, grids
  const filteredItems = useMemo(() => applyAllFilters(allItems), [allItems, applyAllFilters]);

  const recommendedItems = useMemo(() => {
    const recommendedIds = getRecommendedIds(LOCAL_CATALOG.map((i) => i.id));
    const items = recommendedIds.map((id) => LOCAL_CATALOG.find((i) => i.id === id)).filter(Boolean) as CatalogItem[];
    return applyAllFilters(items.length > 0 ? items : topRated.slice(0, 10));
  }, [topRated, applyAllFilters]);

  const continueWatching = useMemo(() => {
    const behavior = JSON.parse(localStorage.getItem('moviekhojo_behavior') || '{"opened":[]}');
    const opened = behavior.opened || [];
    const items = opened.slice(0, 10).map((id: string) => LOCAL_CATALOG.find((i) => i.id === id)).filter(Boolean) as CatalogItem[];
    return applyAllFilters(items);
  }, [user, applyAllFilters]);

  const SORT_TAB_LABELS: Record<string, string> = {
    popular: 'Popular Today',
    new: 'Newly Launched',
    top_rated: 'Top Rated All-Time',
    hindi_dubbed: 'Trending Hindi Dubbed',
    top_rotten: 'Top Rotten Meter',
    high_audience: 'High Audience Score',
  };

  const sortTabItems = useMemo(() => {
    const localByRating = [...LOCAL_CATALOG].sort((a, b) => {
      const aScore = a.ratings[0]?.score || 0;
      const bScore = b.ratings[0]?.score || 0;
      return bScore - aScore;
    });
    const localByRT = [...LOCAL_CATALOG].sort((a, b) => (b.rtCritics || 0) - (a.rtCritics || 0));
    const localByAudience = [...LOCAL_CATALOG].sort((a, b) => (b.rtAudience || 0) - (a.rtAudience || 0));
    let items: CatalogItem[];
    switch (activeSortTab) {
      case 'new':
        items = newReleases.length > 0 ? newReleases : [...LOCAL_CATALOG].sort((a, b) => b.year - a.year).slice(0, 20);
        break;
      case 'top_rated':
        items = topRated.length > 0 ? topRated : localByRating.slice(0, 20);
        break;
      case 'hindi_dubbed':
        items = hindiDubbed.length > 0 ? hindiDubbed : LOCAL_CATALOG.filter((i) => i.audioStatus !== 'unverified').slice(0, 20);
        break;
      case 'top_rotten':
        items = localByRT.slice(0, 20);
        break;
      case 'high_audience':
        items = localByAudience.slice(0, 20);
        break;
      default:
        items = trendingItems.length > 0 ? trendingItems : [...LOCAL_CATALOG].sort((a, b) => {
          const aScore = a.ratings.find(r => r.source.toLowerCase().includes('imdb'))?.score || 0;
          const bScore = b.ratings.find(r => r.source.toLowerCase().includes('imdb'))?.score || 0;
          return bScore - aScore;
        }).slice(0, 20);
    }
    return applyAllFilters(items);
  }, [activeSortTab, newReleases, topRated, hindiDubbed, trendingItems, applyAllFilters]);

  // Hero items — filtered to match current tab + filters
  const heroItems = useMemo(() => filteredItems.slice(0, 5), [filteredItems]);

  // Browse all items — filtered
  const browseAllItems = useMemo(() => filteredItems, [filteredItems]);

  if (route === 'admin') return <AdminPortal onBack={() => { setRoute('main'); window.location.hash = ''; }} />;

  // Full-screen Lazy Mode
  if (view === 'lazy') {
    return (
      <div className="min-h-screen">
        <LazyMode onItemClick={handleCardClick} onExit={() => setView('finder')} />
        {selectedItem && (
          <MovieDetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onWatchTrailer={(key) => { setSelectedItem(null); setTrailerKey(key); }}
          />
        )}
        {trailerKey && <TrailerModal videoKey={trailerKey} onClose={() => setTrailerKey(null)} />}
      </div>
    );
  }

  const currentLang = LANGUAGES.find((l) => l.id === selectedLanguage) || LANGUAGES[0];

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Top Navigation Header */}
      <nav className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 md:gap-4">
            {/* Left: Brand + Content Tabs */}
            <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
              <button onClick={() => {
                setView('finder');
                setActiveContentTab('home');
                setFilters({ industry: 'all', genre: 'all', subGenre: '', platform: 'all', language: 'all' });
                setSearchTags([]);
                setQuery('');
                setAdvancedFilters({ minRT: 0, minAudience: 0, minIMDb: 0, maxRuntime: 0 });
                setActiveSortTab('popular');
                setSidebarPage('home');
              }} className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
                  <FilmIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg md:text-xl font-bold text-white font-display hidden sm:block">
                  Movie<span className="text-gradient">Khojo</span>
                </span>
              </button>

              {/* Content Tabs — desktop */}
              <div className="hidden lg:flex items-center gap-1">
                {CONTENT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveContentTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      activeContentTab === tab.id
                        ? 'text-white bg-primary-500/20 border border-primary-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-ink-800/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Center: Smart Filter Bar */}
            <div className="flex-1 flex justify-center min-w-0">
              <SmartFilterBar filters={filters} onChange={setFilters} />
            </div>

            {/* Right: Search + Language + Lazy Mode + Auth */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {/* Compact Search */}
              <div className="relative hidden md:block">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { addSearchTag(query); } }}
                  onFocus={() => { if (autocompleteItems.length > 0) setShowAutocomplete(true); }}
                  placeholder="Search..."
                  className="w-32 lg:w-48 pl-9 pr-3 py-2 rounded-xl glass text-sm text-white placeholder-gray-500 outline-none focus:w-44 lg:focus:w-64 transition-all focus:neon-border"
                />
                {showAutocomplete && autocompleteItems.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 w-72 glass-strong rounded-xl2 py-2 z-50 max-h-80 overflow-y-auto scrollbar-hide animate-slide-down">
                    {autocompleteItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { handleCardClick(item); setQuery(''); setShowAutocomplete(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-ink-800/60 transition-colors text-left"
                      >
                        {item.poster ? (
                          <img src={item.poster} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-ink-800 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.year > 0 ? String(item.year) : ''} {item.type.replace('_', ' ')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-ink-750/60 transition-colors"
                >
                  <Languages className="w-4 h-4 text-gray-400" />
                  <span className="text-sm hidden md:inline">{currentLang.flag}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 glass-strong rounded-xl2 py-2 animate-slide-down z-50">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => { setSelectedLanguage(lang.id); setShowLangMenu(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-700/60 transition-colors ${lang.id === selectedLanguage ? 'text-primary-400' : 'text-gray-300'}`}
                      >
                        <span>{lang.flag}</span>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Lazy Mode Button */}
              <button
                onClick={() => setView('lazy')}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white text-sm font-semibold transition-all shadow-lg shadow-primary-500/20 animate-pulse-glow"
              >
                <Bot className="w-4 h-4" />
                <span className="hidden lg:inline">AI Lazy Mode</span>
                <span className="lg:hidden">AI</span>
              </button>

              {/* Watchlist */}
              {user && (
                <button onClick={() => setShowWatchlist(!showWatchlist)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-ink-750/60 transition-colors">
                  <Bookmark className="w-4 h-4 text-gray-400" />
                  <span className="hidden md:inline text-sm text-gray-300">{watchlist.length}</span>
                </button>
              )}

              {/* Auth */}
              {user ? (
                <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-ink-750/60 transition-colors">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="hidden md:inline text-sm text-gray-300">Sign Out</span>
                </button>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile search row */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { addSearchTag(query); } }}
                onFocus={() => { if (autocompleteItems.length > 0) setShowAutocomplete(true); }}
                placeholder="Search movies, series..."
                className="w-full pl-9 pr-3 py-2 rounded-xl glass text-sm text-white placeholder-gray-500 outline-none"
              />
              {showAutocomplete && autocompleteItems.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 glass-strong rounded-xl2 py-2 z-50 max-h-80 overflow-y-auto scrollbar-hide animate-slide-down">
                  {autocompleteItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { handleCardClick(item); setQuery(''); setShowAutocomplete(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-ink-800/60 transition-colors text-left"
                    >
                      {item.poster ? (
                        <img src={item.poster} alt="" className="w-10 h-14 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-14 rounded bg-ink-800 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.year > 0 ? String(item.year) : ''} {item.type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile/tablet content tabs — scrollable */}
          <div className="lg:hidden pb-3 flex gap-1 overflow-x-auto scrollbar-hide">
            {CONTENT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveContentTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeContentTab === tab.id
                    ? 'text-white bg-primary-500/20 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Left Sidebar (desktop) / Bottom Nav (mobile) */}
      <LeftSidebar active={sidebarPage} onNavigate={handleSidebarNavigate} watchlistCount={watchlist.length} />

      {/* Main content */}
      {view === 'boxoffice' ? (
        <BoxOfficeMatrix />
      ) : (
        <div className="pl-0 md:pl-16 lg:pl-20">
          {query.trim() || searchTags.length > 0 ? (
            /* Search Results */
            <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-4">
              {/* Search tag chips */}
              {searchTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeSearchTag(tag)}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500/15 border border-accent-500/30 text-sm text-accent-400 hover:bg-accent-500/25 transition-all"
                    >
                      <span>{tag}</span>
                      <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {loading ? 'Searching...' : `${results.length} results${query.trim() ? ` for "${query}"` : ''}`}
                </p>
                {loading && <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />}
              </div>

              {results.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                  {results.map((item) => (
                    <MovieCard key={item.id} item={item} onClick={handleCardClick} />
                  ))}
                </div>
              ) : !loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FilmIcon className="w-12 h-12 text-gray-700 mb-3" />
                  <p className="text-gray-500">No results found. Try a different search term.</p>
                </div>
              ) : null}
            </div>
          ) : (
            /* Homepage with Hero + Content Rows */
            <div className="w-full">
              {/* Discovering loading indicator */}
              {discovering && isFilteredView && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                  <span className="ml-2 text-sm text-gray-400">Fetching filtered content...</span>
                </div>
              )}

              {/* No results from filters */}
              {!discovering && isFilteredView && filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <FilmIcon className="w-12 h-12 text-gray-700 mb-3" />
                  <p className="text-gray-400 text-lg font-medium mb-1">No matches found</p>
                  <p className="text-sm text-gray-600 mb-4">No titles match your current filters. Try adjusting or clearing them.</p>
                  <button
                    onClick={() => {
                      setActiveContentTab('home');
                      setFilters({ industry: 'all', genre: 'all', subGenre: '', platform: 'all', language: 'all' });
                      setAdvancedFilters({ minRT: 0, minAudience: 0, minIMDb: 0, maxRuntime: 0 });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Hero Carousel — filtered */}
              {heroItems.length > 0 && (
                <HeroCarousel
                  items={heroItems}
                  onWatchTrailer={(item) => {
                    if (item.trailerKey) setTrailerKey(item.trailerKey);
                    else handleCardClick(item);
                  }}
                  onAddToWatchlist={toggleWatchlist}
                  onItemClick={handleCardClick}
                />
              )}

              {/* Content Rows Cascade */}
              <div className="px-4 md:px-6 lg:px-8 py-6 space-y-8">
                {/* Row 1: Recommended for You */}
                {recommendedItems.length > 0 && (
                  <>
                    <Carousel title="Recommended for You" items={recommendedItems} onItemClick={handleCardClick} />
                    {/* Advanced Filter Bar */}
                    <div className="glass-card rounded-xl2 p-3 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-gray-500 font-medium">Filter by:</span>
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={advancedFilters.minRT > 0}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, minRT: e.target.checked ? 60 : 0 })}
                          className="accent-primary-500"
                        />
                        RT ≥60%
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={advancedFilters.minAudience > 0}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAudience: e.target.checked ? 70 : 0 })}
                          className="accent-primary-500"
                        />
                        Audience ≥70%
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={advancedFilters.minIMDb > 0}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, minIMDb: e.target.checked ? 7 : 0 })}
                          className="accent-primary-500"
                        />
                        IMDb ≥7.0
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={advancedFilters.maxRuntime > 0}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxRuntime: e.target.checked ? 120 : 0 })}
                          className="accent-primary-500"
                        />
                        Runtime ≤2h
                      </label>
                    </div>
                  </>
                )}

                {/* Row 2: Continue Watching */}
                {continueWatching.length > 0 && (
                  <Carousel title="Continue Watching" items={continueWatching} onItemClick={handleCardClick} />
                )}

                {/* Row 3: Tabbed Sorting Pills */}
                <div id="sort-tabs-section" className="space-y-4 scroll-mt-20">
                  <div className="flex items-center gap-2 flex-wrap">
                    {SORT_TABS.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSortTab(tab.id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeSortTab === tab.id
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                              : 'glass text-gray-400 hover:text-white hover:bg-ink-800/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <Carousel title={SORT_TAB_LABELS[activeSortTab] || 'Popular Today'} items={sortTabItems} onItemClick={handleCardClick} />
                </div>

                {/* Row 4: Top 10 Numbered Cards */}
                <Top10Row title="Top 10 Today" items={applyAllFilters(topRated.length > 0 ? topRated : trendingItems)} onItemClick={handleCardClick} />

                {/* Row 5: Unlimited Responsive Poster Grid */}
                <div id="browse-all-grid" className="scroll-mt-20">
                  <PosterGrid title="Browse All" items={browseAllItems} onItemClick={handleCardClick} pageSize={24} />
                </div>

                {/* Additional Carousels — filtered */}
                {applyAllFilters(popularMovies).length > 0 && (
                  <Carousel title="Popular Movies" items={applyAllFilters(popularMovies)} onItemClick={handleCardClick} />
                )}
                {applyAllFilters(popularTV).length > 0 && (
                  <Carousel title="Popular Web Series & TV Shows" items={applyAllFilters(popularTV)} onItemClick={handleCardClick} />
                )}
                {applyAllFilters(popularAnime).length > 0 && (
                  <Carousel title="Popular Anime" items={applyAllFilters(popularAnime)} onItemClick={handleCardClick} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watchlist drawer */}
      {showWatchlist && user && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div className="fixed inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setShowWatchlist(false)} />
          <div className="relative w-full max-w-md glass-strong h-full overflow-y-auto p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white font-display">My Watchlist</h2>
              <button onClick={() => setShowWatchlist(false)} className="p-2 rounded-full hover:bg-ink-700/60">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            {watchlist.length > 0 ? (
              <div className="space-y-3">
                {watchlist.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 rounded-xl glass-card">
                    {item.poster && <img src={item.poster} alt={item.title} className="w-16 h-24 rounded-lg object-cover" />}
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <p className="text-xs text-gray-500">{item.year} • {item.type.replace('_', ' ')}</p>
                      {item.offers[0] && <p className="text-xs text-primary-400 mt-1">{item.offers[0].platform}</p>}
                      <button onClick={() => toggleWatchlist(item)} className="text-xs text-error-400 hover:text-error-500 mt-1">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Your watchlist is empty. Browse and bookmark titles to save them here.</p>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="fixed inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md glass-strong rounded-xl2 p-6 animate-scale-in m-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white font-display">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-ink-700/60">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-6">
              {/* Age Restriction Toggle */}
              <div className="glass-card rounded-xl2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Age Restriction Mode (18+)</h3>
                    <p className="text-xs text-gray-500 mt-1">When ON, explicit/adult content is filtered out from all searches and recommendations.</p>
                  </div>
                  <button
                    onClick={() => setAgeRestrictionOn(!ageRestrictionOn)}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${ageRestrictionOn ? 'bg-primary-500' : 'bg-ink-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${ageRestrictionOn ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Content Region Selector */}
              <div>
                <p className="text-sm text-gray-400 mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Content Region</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'global', label: 'Global / International' },
                    { id: 'india', label: 'India' },
                    { id: 'us', label: 'United States' },
                    { id: 'uk', label: 'United Kingdom' },
                    { id: 'kr', label: 'South Korea' },
                    { id: 'jp', label: 'Japan' },
                    { id: 'de', label: 'Germany' },
                    { id: 'fr', label: 'France' },
                  ].map((region) => (
                    <button
                      key={region.id}
                      onClick={() => setContentRegion(region.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        region.id === contentRegion ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'glass text-gray-400 hover:text-white'
                      }`}
                    >
                      {region.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600">MovieKhojo v3.0 — AI-Powered Cinematic Discovery Engine</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMyTaste && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="fixed inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setShowMyTaste(false)} />
          <div className="relative w-full max-w-2xl glass-strong rounded-xl2 p-6 animate-scale-in m-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white font-display flex items-center gap-2"><Heart className="w-5 h-5 text-primary-400" /> My Taste Profile</h2>
              <button onClick={() => setShowMyTaste(false)} className="p-2 rounded-full hover:bg-ink-700/60">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Based on your viewing activity, here are personalized recommendations picked just for you.</p>
              {recommendedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recommendedItems.slice(0, 8).map((item) => (
                    <MovieCard key={item.id} item={item} onClick={handleCardClick} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Start watching and clicking titles to build your taste profile. Your recommendations will appear here.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <MovieDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onWatchTrailer={(key) => { setSelectedItem(null); setTrailerKey(key); }}
        />
      )}

      {trailerKey && <TrailerModal videoKey={trailerKey} onClose={() => setTrailerKey(null)} />}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuthSuccess={() => {}} />}

      <footer className="border-t border-white/5 py-6 mt-8 pl-0 md:pl-16 lg:pl-20 pb-20 md:pb-6">
        <div className="px-4 md:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">MovieKhojo — AI-Powered Cinematic Discovery Engine</p>
          <button
            onClick={() => { window.location.hash = 'admin'; setRoute('admin'); }}
            className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
          >
            Admin
          </button>
        </div>
      </footer>
    </div>
  );
}
