import { Star, Play, ExternalLink, Clock } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { PosterFallback } from '@/components/PosterFallback';

interface MovieCardProps {
  item: CatalogItem;
  onClick: (item: CatalogItem) => void;
}

function getRottenTomatoesScore(item: CatalogItem): { critics: number | null; audience: number | null } {
  const rtAudience = item.ratings.find((r) => r.source.toLowerCase().includes('audience'));
  const rt = item.ratings.find((r) => r.source.toLowerCase().includes('rotten') && !r.source.toLowerCase().includes('audience'));
  if (rt || item.rtCritics) return { critics: item.rtCritics || rt?.score || null, audience: item.rtAudience || rtAudience?.score || null };
  return { critics: null, audience: null };
}

function getImdbScore(item: CatalogItem): number | null {
  const imdb = item.ratings.find((r) => r.source.toLowerCase().includes('imdb'));
  return imdb ? imdb.score : null;
}

function getTmdbScore(item: CatalogItem): number | null {
  const tmdb = item.ratings.find((r) => r.source.toLowerCase().includes('tmdb'));
  return tmdb ? tmdb.score : null;
}

export function MovieCard({ item, onClick }: MovieCardProps) {
  const rt = getRottenTomatoesScore(item);
  const imdb = getImdbScore(item);
  const tmdb = getTmdbScore(item);

  return (
    <div
      onClick={() => onClick(item)}
      className="group relative cursor-pointer animate-scale-in"
    >
      <div className="relative overflow-hidden rounded-xl2 glass-card transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:shadow-primary-500/20 group-hover:border-primary-500/20">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden bg-ink-800">
          {item.poster ? (
            <img
              src={item.poster}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const fallback = img.nextElementSibling;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${item.poster ? 'hidden' : ''}`}>
            <PosterFallback title={item.title} variant="portrait" iconSize="w-10 h-10" />
          </div>

          {/* Bottom gradient with ratings overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Vibe match badge */}
          {item.vibeMatchPercentage && item.vibeMatchPercentage > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/80 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-white">{item.vibeMatchPercentage}%</span>
            </div>
          )}

          {/* Explicit badge */}
          {item.isExplicit && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-error-500/80 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-white">18+</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/90 text-white text-sm font-semibold">
              {item.isExplicit ? <ExternalLink className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {item.isExplicit ? 'Go to Source' : 'View Details'}
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">{item.title}</h3>
            <span className="text-xs text-gray-500 flex-shrink-0">{item.year || '—'}</span>
          </div>

          {/* Ratings row */}
          <div className="flex items-center gap-2 flex-wrap">
            {rt.critics && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-error-500/10 border border-error-500/20">
                <span className="text-[10px] font-bold text-error-400">🍅 {rt.critics}%</span>
              </div>
            )}
            {imdb && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent-500/10 border border-accent-500/20">
                <Star className="w-2.5 h-2.5 text-accent-400 fill-accent-400" />
                <span className="text-[10px] font-bold text-accent-400">{imdb}</span>
              </div>
            )}
            {tmdb && !imdb && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
                <Star className="w-2.5 h-2.5 text-primary-400 fill-primary-400" />
                <span className="text-[10px] font-bold text-primary-400">{tmdb}</span>
              </div>
            )}
            {item.runtimeDuration ? (
              <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
                <Clock className="w-2.5 h-2.5" />
                <span>{item.runtimeDuration}</span>
              </div>
            ) : item.runtime ? (
              <div className="flex items-center gap-0.5 text-[10px] text-gray-500">
                <Clock className="w-2.5 h-2.5" />
                <span>{item.runtime}m</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
