import { useState, useEffect, useRef } from 'react';
import { Play, Plus, Star, Clock, Calendar } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { PosterFallback } from '@/components/PosterFallback';

interface HeroCarouselProps {
  items: CatalogItem[];
  onWatchTrailer: (item: CatalogItem) => void;
  onAddToWatchlist: (item: CatalogItem) => void;
  onItemClick: (item: CatalogItem) => void;
}

export function HeroCarousel({ items, onWatchTrailer, onAddToWatchlist, onItemClick }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 7000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[current];
  const imdb = item.ratings.find((r) => r.source.toLowerCase().includes('imdb'));
  const rt = item.ratings.find((r) => r.source.toLowerCase().includes('rotten') && !r.source.toLowerCase().includes('audience'));
  const tmdb = item.ratings.find((r) => r.source.toLowerCase().includes('tmdb'));

  return (
    <div className="relative w-full h-[55vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
      {/* Background slides */}
      {items.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          {slide.backdrop || slide.poster ? (
            <img
              src={slide.backdrop || slide.poster}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              onLoad={() => setImageLoaded((prev) => ({ ...prev, [i]: true }))}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; const fb = (e.target as HTMLImageElement).nextElementSibling; if (fb) fb.classList.remove('hidden'); }}
            />
          ) : null}
          <div className={`w-full h-full ${slide.backdrop || slide.poster ? 'hidden' : ''}`}>
            <PosterFallback title={slide.title} variant="landscape" iconSize="w-20 h-20" />
          </div>
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/30 to-transparent" />

      {/* Content */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 md:px-12 lg:px-16 pb-10 md:pb-16 cursor-pointer"
        onClick={() => onItemClick(item)}
      >
        <div className="max-w-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-semibold uppercase tracking-wider">
              {item.type.replace('_', ' ')}
            </span>
            {item.isExplicit && (
              <span className="px-3 py-1 rounded-full bg-error-500/20 border border-error-500/30 text-error-400 text-xs font-bold">
                18+
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white font-display leading-tight hover:text-primary-200 transition-colors"
            onClick={() => onItemClick(item)}
          >
            {item.title}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-300">
            {item.year > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                {item.year}
              </span>
            )}
            {item.runtimeDuration ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                {item.runtimeDuration}
              </span>
            ) : item.runtime ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                {item.runtime}m
              </span>
            ) : null}
            {item.genres.length > 0 && (
              <span className="text-gray-400">{item.genres.slice(0, 3).join('  •  ')}</span>
            )}
          </div>

          {/* Ratings */}
          <div className="flex items-center gap-3 flex-wrap">
            {imdb && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-500/15 border border-accent-500/25 backdrop-blur-sm">
                <Star className="w-4 h-4 text-accent-400 fill-accent-400" />
                <span className="font-bold text-accent-400 text-sm">{imdb.score}</span>
                <span className="text-xs text-gray-500">IMDb</span>
              </div>
            )}
            {(rt || item.rtCritics) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error-500/15 border border-error-500/25 backdrop-blur-sm">
                <span className="text-sm">🍅</span>
                <span className="font-bold text-error-400 text-sm">{item.rtCritics || rt?.score || 0}%</span>
                <span className="text-xs text-gray-500">Critics</span>
              </div>
            )}
            {tmdb && !imdb && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/15 border border-primary-500/25 backdrop-blur-sm">
                <Star className="w-4 h-4 text-primary-400 fill-primary-400" />
                <span className="font-bold text-primary-400 text-sm">{tmdb.score}</span>
                <span className="text-xs text-gray-500">TMDB</span>
              </div>
            )}
          </div>

          {/* Overview */}
          {item.overview && (
            <p className="text-sm md:text-base text-gray-400 line-clamp-2 max-w-xl leading-relaxed">
              {item.overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onWatchTrailer(item)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl2 bg-white text-ink-950 font-semibold text-sm md:text-base hover:bg-gray-200 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 fill-ink-950" />
              Watch Trailer
            </button>
            <button
              onClick={() => onAddToWatchlist(item)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl2 glass-strong text-white font-semibold text-sm md:text-base hover:bg-ink-700/80 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add to Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="absolute bottom-6 md:bottom-8 right-6 md:right-12 flex items-center gap-2">
        {items.slice(0, 6).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all duration-300 rounded-full font-bold text-xs flex items-center justify-center ${
              i === current
                ? 'w-10 h-10 bg-primary-500 text-white shadow-lg shadow-primary-500/40 scale-110'
                : 'w-8 h-8 glass text-gray-400 hover:text-white hover:bg-ink-700/60'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
