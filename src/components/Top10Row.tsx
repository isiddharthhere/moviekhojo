import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { MovieCard } from './MovieCard';

interface Top10RowProps {
  title: string;
  items: CatalogItem[];
  onItemClick: (item: CatalogItem) => void;
}

export function Top10Row({ title, items, onItemClick }: Top10RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;
  const top10 = items.slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg md:text-xl font-bold text-white font-display">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full glass hover:bg-ink-700/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full glass hover:bg-ink-700/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-4"
      >
        {top10.map((item, i) => (
          <div key={item.id} className="flex items-end flex-shrink-0">
            {/* Giant number */}
            <span
              className="text-[120px] md:text-[160px] lg:text-[200px] font-black leading-none text-transparent select-none -mr-4 md:-mr-6"
              style={{
                WebkitTextStroke: '3px rgba(255,255,255,0.15)',
                textShadow: '0 0 30px rgba(51,156,255,0.1)',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
              }}
            >
              {i + 1}
            </span>
            <div className="w-32 md:w-40 lg:w-44">
              <MovieCard item={item} onClick={onItemClick} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
