import { X } from 'lucide-react';

interface TrailerModalProps {
  videoKey: string;
  onClose: () => void;
}

function toEmbedUrl(key: string): string {
  // If it's already just a key, use it directly
  if (!key.includes('/') && !key.includes('=')) {
    return `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;
  }
  // If it's a watch URL, extract the video ID
  const watchMatch = key.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }
  // If it's a youtu.be short URL
  const shortMatch = key.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`;
  }
  return `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;
}

export function TrailerModal({ videoKey, onClose }: TrailerModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-ink-950/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 rounded-full bg-ink-800/80 hover:bg-ink-700 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="relative aspect-video rounded-xl2 overflow-hidden shadow-2xl border border-white/10">
          <iframe
            src={toEmbedUrl(videoKey)}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
