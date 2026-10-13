import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, Zap, TrendingUp, Clock, X, ArrowLeft, Film } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { fetchAIRecommendations, type LazyModeResult } from '@/lib/aiClient';
import { MovieCard } from '@/components/MovieCard';

const SUGGESTED_PROMPTS = [
  'Something mind-bending like Inception but shorter',
  'Hindi dubbed action movie for a Friday night',
  'Crime thriller series under 5 episodes',
  'Feel-good comedy to watch with family',
  'Dark Korean thriller with plot twists',
  'Sci-fi movie with time travel, not too long',
];

interface LazyModeProps {
  onItemClick: (item: CatalogItem) => void;
  onExit?: () => void;
}

export function LazyMode({ onItemClick, onExit }: LazyModeProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LazyModeResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [result]);

  const handleSubmit = async (promptText?: string) => {
    const q = (promptText || input).trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);
    const res = await fetchAIRecommendations(q);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Full-screen header */}
      <div className="glass-strong border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl glass hover:bg-ink-700/60 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white font-display">AI Lazy Mode</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Describe your vibe — get perfect matches</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-xs font-medium text-primary-300 hidden sm:inline">Powered by Gemini</span>
        </div>
      </div>

      {/* Main scrollable area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Welcome / Hero */}
          {!result && !loading && (
            <div className="text-center py-8 md:py-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-primary-300">Just tell me your vibe</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white font-display mb-4">
                Skip the browsing.<br />Get <span className="text-gradient">4-5 perfect matches</span>.
              </h2>
              <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto mb-8">
                Powered by Google Gemini AI. Describe your mood, a scenario, or a vague feeling — get hyper-focused recommendations with zero effort.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); handleSubmit(prompt); }}
                    className="px-4 py-2.5 rounded-xl glass text-sm text-gray-300 hover:text-white hover:bg-ink-700/60 hover:border-primary-500/20 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 md:py-24">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
                <Bot className="w-7 h-7 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-gray-400 mt-4">Gemini is decoding your vibe...</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-6 animate-fade-in">
              {/* Metadata bar */}
              <div className="glass-card rounded-xl2 p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-gray-300">{result.vibeDecoded}</span>
                </div>
                {result.languagePreference && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20">
                    <span className="text-xs text-primary-300">{result.languagePreference}</span>
                  </div>
                )}
                {result.sortBy && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20">
                    {result.sortBy === 'Popular' || result.sortBy === 'Popular / Trending' ? <TrendingUp className="w-3 h-3 text-accent-400" /> : <Clock className="w-3 h-3 text-accent-400" />}
                    <span className="text-xs text-accent-300">{result.sortBy}</span>
                  </div>
                )}
              </div>

              {/* Recommendation cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {result.items.map((item) => (
                  <MovieCard key={item.id} item={item} onClick={onItemClick} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom input bar */}
      <div className="glass-strong border-t border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative flex items-center gap-3 glass rounded-xl2 px-5 py-4 transition-all duration-300 focus-within:neon-border">
            <Bot className="w-5 h-5 text-primary-400 flex-shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="e.g. 'exhausted after work, need something light and funny'"
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base md:text-lg"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-30 text-white font-medium transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Ask</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
