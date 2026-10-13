import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { MovieCard } from './MovieCard';

interface PosterGridProps {
  title?: string;
  items: CatalogItem[];
  onItemClick: (item: CatalogItem) => void;
  pageSize?: number;
}

export function PosterGrid({ title, items, onItemClick, pageSize = 24 }: PosterGridProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const visible = items.slice(0, page * pageSize);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg md:text-xl font-bold text-white font-display">{title}</h2>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {visible.map((item) => (
          <MovieCard key={item.id} item={item} onClick={onItemClick} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg glass hover:bg-ink-700/60 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          {Array.from({ length: Math.min(totalPages, 25) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                p === page
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'glass text-gray-400 hover:text-white hover:bg-ink-700/60'
              }`}
            >
              {p}
            </button>
          ))}
          {totalPages > 25 && <span className="text-gray-600 px-1">...</span>}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg glass hover:bg-ink-700/60 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
