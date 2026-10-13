import { useState, useRef, useEffect } from 'react';
import { X, Play, ExternalLink, Star, Clock, Calendar, User, ChevronDown, ChevronUp, Film, Video, Send, Loader2, Bot, MessageSquare, AlertTriangle, ThumbsUp, TrendingUp, Youtube } from 'lucide-react';
import type { CatalogItem, OfferType } from '@/types';
import { fetchYouTubeVideos, type YouTubeVideoResult } from '@/lib/searchEngine';
import { fetchMovieChat } from '@/lib/aiClient';
import { PosterFallback } from '@/components/PosterFallback';

interface MovieDetailPanelProps {
  item: CatalogItem;
  onClose: () => void;
  onWatchTrailer: (key: string) => void;
}

const OFFER_TABS: { id: OfferType; label: string }[] = [
  { id: 'stream', label: 'Stream' },
  { id: 'rent', label: 'Rent' },
  { id: 'buy', label: 'Buy' },
  { id: 'free', label: 'Free / Ads' },
];

type DetailTab = 'overview' | 'videos';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function QualityBadge({ quality }: { quality: string }) {
  const color =
    quality === '4K' ? 'bg-primary-500/20 text-primary-300 border-primary-500/30' :
    quality === 'HD' ? 'bg-success-500/20 text-success-300 border-success-500/30' :
    'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>{quality}</span>;
}

export function MovieDetailPanel({ item, onClose, onWatchTrailer }: MovieDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [offerTab, setOfferTab] = useState<OfferType>('stream');
  const [expanded, setExpanded] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeVideoResult[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const tabOffers = item.offers.filter((o) => o.type === offerTab);
  const hasAnyOffers = item.offers.length > 0;
  const availableTabs = OFFER_TABS.filter((tab) => item.offers.some((o) => o.type === tab.id));

  const rt = item.ratings.find((r) => r.source.toLowerCase().includes('rotten') && !r.source.toLowerCase().includes('audience'));
  const rtAud = item.ratings.find((r) => r.source.toLowerCase().includes('audience'));
  const imdb = item.ratings.find((r) => r.source.toLowerCase().includes('imdb'));
  const tmdb = item.ratings.find((r) => r.source.toLowerCase().includes('tmdb'));

  useEffect(() => {
    if (activeTab === 'videos' && youtubeResults.length === 0 && !videoLoading) {
      setVideoLoading(true);
      const searchQuery = `${item.title} ${item.year > 0 ? item.year : ''} movie trailer review explained`;
      fetchYouTubeVideos(searchQuery).then((results) => {
        setYoutubeResults(results);
        setVideoLoading(false);
      }).catch(() => setVideoLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  const handleChatSend = async (msg?: string) => {
    const userMsg = (msg || chatInput).trim();
    if (!userMsg || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    const response = await fetchMovieChat(userMsg, `${item.title} ${item.year}`);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    setChatLoading(false);
  };

  const suggestedQuestions = [
    'Explain the ending',
    'Is it worth watching?',
    'What is the plot?',
    'Similar movies?',
  ];

  const hasAIFields = item.textTrailer || item.shortcoming || item.vibeMatchPercentage || item.whyThisMatches;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 md:p-6 overflow-y-auto animate-fade-in">
      <div className="fixed inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-6xl glass-strong rounded-xl3 overflow-hidden animate-slide-up my-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-ink-800/80 hover:bg-ink-700 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Backdrop */}
        <div className="relative">
          <div className="relative h-56 md:h-80 overflow-hidden">
            {item.backdrop || item.poster ? (
              <img
                src={item.backdrop || item.poster}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const fb = (e.target as HTMLImageElement).nextElementSibling; if (fb) fb.classList.remove('hidden'); }}
              />
            ) : null}
            <div className={`w-full h-full ${item.backdrop || item.poster ? 'hidden' : ''}`}>
              <PosterFallback title={item.title} variant="landscape" iconSize="w-20 h-20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
          </div>

          {/* Vibe match badge */}
          {item.vibeMatchPercentage && item.vibeMatchPercentage > 0 && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30 backdrop-blur-sm">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-bold text-primary-300">{item.vibeMatchPercentage}% Match</span>
            </div>
          )}

          {/* Poster + Title */}
          <div className="relative -mt-24 md:-mt-32 px-6 md:px-8">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="flex-shrink-0 w-28 md:w-40 -mt-4 md:-mt-8">
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full rounded-xl2 shadow-2xl border border-white/10"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const fb = img.nextElementSibling;
                      if (fb) fb.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`aspect-[2/3] rounded-xl2 shadow-2xl border border-white/10 overflow-hidden ${item.poster ? 'hidden' : ''}`}>
                  <PosterFallback title={item.title} variant="portrait" iconSize="w-12 h-12" />
                </div>
              </div>

              <div className="flex-1 space-y-3 pt-2 md:pt-0">
                <h2 className="text-2xl md:text-4xl font-bold text-white font-display">{item.title}</h2>
                <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400">
                  {item.year > 0 && (
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{item.year}</span>
                  )}
                  {item.runtimeDuration ? (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.runtimeDuration}</span>
                  ) : item.runtime ? (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{item.runtime} min</span>
                  ) : null}
                  <span className="capitalize px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 text-xs font-medium">
                    {item.type.replace('_', ' ')}
                  </span>
                  {item.isExplicit && (
                    <span className="px-2 py-0.5 rounded-full bg-error-500/20 text-error-400 text-xs font-bold">18+</span>
                  )}
                </div>

                {/* Language info */}
                {item.languages && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-ink-700/50 text-gray-300 border border-white/5">
                      Original: {item.languages.original}
                    </span>
                    {item.languages.hindiAudioAvailable !== 'None' && (
                      <span className={`px-2.5 py-1 rounded-full border ${
                        item.languages.hindiAudioAvailable === 'Hindi Original'
                          ? 'bg-success-500/15 text-success-300 border-success-500/20'
                          : 'bg-warning-500/15 text-warning-300 border-warning-500/20'
                      }`}>
                        {item.languages.hindiAudioAvailable}
                      </span>
                    )}
                  </div>
                )}
                {item.audioStatus && item.audioStatus !== 'unverified' && !item.languages && (
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={`px-2.5 py-1 rounded-full border ${
                      item.audioStatus === 'verified'
                        ? 'bg-success-500/15 text-success-300 border-success-500/20'
                        : 'bg-warning-500/15 text-warning-300 border-warning-500/20'
                    }`}>
                      {item.audioStatus === 'verified' ? 'Hindi Audio Verified' : 'Hindi Dubbed Available'}
                    </span>
                  </div>
                )}

                {/* Ratings */}
                <div className="flex items-center gap-3 flex-wrap">
                  {imdb && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-500/10 border border-accent-500/20">
                      <Star className="w-4 h-4 text-accent-400 fill-accent-400" />
                      <span className="font-bold text-accent-400">{imdb.score}</span>
                      <span className="text-xs text-gray-500">IMDb</span>
                    </div>
                  )}
                  {(rt || item.rtCritics) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error-500/10 border border-error-500/20">
                      <span className="text-lg">🍅</span>
                      <span className="font-bold text-error-400">{(item.rtCritics || rt?.score || 0)}%</span>
                      <span className="text-xs text-gray-500">Critics</span>
                    </div>
                  )}
                  {(rtAud || item.rtAudience) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-500/10 border border-success-500/20">
                      <ThumbsUp className="w-4 h-4 text-success-400" />
                      <span className="font-bold text-success-400">{(item.rtAudience || rtAud?.score || 0)}%</span>
                      <span className="text-xs text-gray-500">Audience</span>
                    </div>
                  )}
                  {tmdb && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/10 border border-primary-500/20">
                      <Star className="w-4 h-4 text-primary-400" />
                      <span className="font-bold text-primary-400">{tmdb.score}</span>
                      <span className="text-xs text-gray-500">TMDB</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {item.genres.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {item.genres.map((g) => (
                      <span key={g} className="px-2.5 py-1 rounded-full bg-ink-700/50 text-xs text-gray-300 border border-white/5">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Watch Actions */}
                <div className="flex gap-3 flex-wrap pt-1">
                  {item.isExplicit ? (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl2 bg-accent-500 hover:bg-accent-600 text-white font-semibold transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Watch on Source Website
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        if (item.trailerKey) {
                          onWatchTrailer(item.trailerKey);
                        } else {
                          setActiveTab('videos');
                          fetchYouTubeVideos(`${item.title} ${item.year > 0 ? item.year : ''} official trailer`).then((results) => {
                            if (results.length > 0 && results[0].videoId) {
                              setPlayingVideoId(results[0].videoId);
                            }
                          });
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl2 bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Watch Trailer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Fields */}
        {hasAIFields && (
          <div className="px-6 md:px-8 pt-4">
            {item.textTrailer && (
              <div className="glass-card rounded-xl2 p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Film className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-semibold text-white">Spoiler-Free Teaser</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed italic">{item.textTrailer}</p>
              </div>
            )}
            {item.shortcoming && (
              <div className="glass-card rounded-xl2 p-4 mb-3 border border-error-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-error-400" />
                  <h3 className="text-sm font-semibold text-error-300">Known Shortcoming</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{item.shortcoming}</p>
              </div>
            )}
            {item.whyThisMatches && (
              <div className="glass-card rounded-xl2 p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-semibold text-white">Why This Matches Your Vibe</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{item.whyThisMatches}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs + Sidebar */}
        <div className="px-6 md:px-8 pb-8 pt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'overview' ? 'bg-primary-500 text-white' : 'glass text-gray-300 hover:text-white'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'videos' ? 'bg-primary-500 text-white' : 'glass text-gray-300 hover:text-white'
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  Web & YouTube Videos
                </button>
              </div>

              {activeTab === 'overview' ? (
                <div className="space-y-5">
                  {item.overview && !item.textTrailer && (
                    <div>
                      <p className={`text-sm text-gray-300 leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
                        {item.overview}
                      </p>
                      {item.overview.length > 200 && (
                        <button
                          onClick={() => setExpanded(!expanded)}
                          className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 mt-1"
                        >
                          {expanded ? <><ChevronUp className="w-4 h-4" />Read Less</> : <><ChevronDown className="w-4 h-4" />Read More</>}
                        </button>
                      )}
                    </div>
                  )}

                  {item.cast && item.cast.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">Cast & Crew</h3>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                        {item.cast.map((member, i) => (
                          <div key={i} className="flex-shrink-0 w-20 text-center">
                            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 flex items-center justify-center mb-1">
                              <User className="w-6 h-6 text-primary-400" />
                            </div>
                            <p className="text-xs text-gray-300 line-clamp-2">{member}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasAnyOffers && (
                    <div className="glass-card p-4 rounded-xl2 space-y-3">
                      <h3 className="text-sm font-semibold text-white">Where to Watch</h3>
                      <div className="flex gap-2 flex-wrap">
                        {availableTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setOfferTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              offerTab === tab.id
                                ? 'bg-primary-500 text-white'
                                : 'glass text-gray-300 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {tabOffers.length > 0 ? (
                          tabOffers.map((offer, i) => (
                            <a
                              key={i}
                              href={offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-ink-800/60 hover:bg-ink-750/60 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-ink-700 flex items-center justify-center text-xs font-bold text-white">
                                  {offer.platform.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{offer.platform}</p>
                                  {offer.plan && <p className="text-xs text-gray-500">{offer.plan}</p>}
                                  {offer.price && <p className="text-xs text-accent-400 font-semibold">{offer.price}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <QualityBadge quality={offer.quality} />
                                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                              </div>
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 py-2">No {offerTab} options available in India</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {videoLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
                      <span className="ml-2 text-sm text-gray-400">Fetching YouTube videos...</span>
                    </div>
                  ) : playingVideoId ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setPlayingVideoId(null)}
                        className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                      >
                        <ChevronUp className="w-4 h-4" /> Back to video list
                      </button>
                      <div className="relative aspect-video rounded-xl2 overflow-hidden border border-white/10">
                        <iframe
                          src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1&rel=0`}
                          title="YouTube Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  ) : youtubeResults.length > 0 ? (
                    youtubeResults.map((result, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 rounded-xl glass-card hover:bg-ink-750/40 transition-colors group cursor-pointer"
                        onClick={() => result.videoId && setPlayingVideoId(result.videoId)}
                      >
                        <div className="flex-shrink-0 w-24 h-16 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center overflow-hidden">
                          {result.videoId ? (
                            <img
                              src={`https://img.youtube.com/vi/${result.videoId}/mqdefault.jpg`}
                              alt={result.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Youtube className="w-6 h-6 text-primary-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors line-clamp-1">{result.title}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{result.snippet}</p>
                          {result.videoId && (
                            <span className="text-[10px] text-primary-400 mt-1 inline-block">Click to play</span>
                          )}
                        </div>
                        {result.videoId ? (
                          <Play className="w-5 h-5 text-primary-400 group-hover:text-white transition-colors flex-shrink-0 mt-1" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors flex-shrink-0 mt-1" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 py-8 text-center">No YouTube videos found. Try searching from the top search bar.</p>
                  )}
                </div>
              )}
            </div>

            {/* AI Chatbox — now powered by Gemini */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="glass-card rounded-xl2 flex flex-col h-[420px]">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                  <div className="p-1.5 rounded-lg bg-primary-500/15 border border-primary-500/20">
                    <Bot className="w-4 h-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ask About This Movie</h3>
                    <p className="text-[10px] text-gray-500">Powered by Gemini AI</p>
                  </div>
                </div>

                <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-xs text-gray-500 mb-3">Ask me anything about {item.title}</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {suggestedQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleChatSend(q)}
                            className="px-3 py-1.5 rounded-full glass text-xs text-gray-300 hover:text-white hover:bg-ink-700/60 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-xl2 text-xs ${
                          msg.role === 'user'
                            ? 'bg-primary-500/20 text-primary-200 border border-primary-500/20'
                            : 'glass text-gray-300'
                        }`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="glass px-3 py-2 rounded-xl2 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-primary-400 animate-spin" />
                        <span className="text-xs text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
                      placeholder="Ask about the ending, plot..."
                      className="flex-1 bg-ink-800/60 text-white text-xs placeholder-gray-600 rounded-xl px-3 py-2 outline-none border border-white/5 focus:border-primary-500/30 transition-colors"
                    />
                    <button
                      onClick={() => handleChatSend()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="p-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-30 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
