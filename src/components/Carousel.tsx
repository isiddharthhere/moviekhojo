import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CatalogItem } from '@/types';
import { MovieCard } from './MovieCard';

interface CarouselProps {
  title: string;
  items: CatalogItem[];
  onItemClick: (item: CatalogItem) => void;
}

export function Carousel({ title, items, onItemClick }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

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
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
      >
        {items.map((item) => (
          <div key={item.id} className="flex-shrink-0 w-36 md:w-44">
            <MovieCard item={item} onClick={onItemClick} />
          </div>
        ))}
      </div>
    </div>
  );
}
