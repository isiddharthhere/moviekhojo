import { Film } from 'lucide-react';

interface PosterFallbackProps {
  title: string;
  variant?: 'portrait' | 'landscape';
  iconSize?: string;
  showTitle?: boolean;
}

const GRADIENTS = [
  'from-primary-600/30 via-primary-800/20 to-ink-900',
  'from-accent-500/25 via-accent-600/15 to-ink-900',
  'from-primary-500/25 via-primary-700/15 to-ink-850',
  'from-success-500/20 via-success-600/10 to-ink-900',
  'from-primary-400/20 via-primary-600/10 to-ink-850',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function PosterFallback({ title, variant = 'portrait', iconSize = 'w-10 h-10', showTitle = true }: PosterFallbackProps) {
  const gradient = GRADIENTS[hashString(title) % GRADIENTS.length];
  const aspectClass = variant === 'portrait' ? 'aspect-[2/3]' : 'aspect-video';

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${gradient} ${aspectClass}`}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary-500/10 blur-xl" />
        <Film className={`${iconSize} text-primary-400/50 relative z-10`} />
      </div>
      {showTitle && (
        <span className="text-xs text-gray-400 px-3 text-center line-clamp-2 mt-2 font-medium">
          {title}
        </span>
      )}
    </div>
  );
}
