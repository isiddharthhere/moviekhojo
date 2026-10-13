import { useState } from 'react';
import { Home, TrendingUp, Compass, Bookmark, Settings, Film, Heart } from 'lucide-react';

type SidebarPage = 'home' | 'trending' | 'explore' | 'watchlist' | 'mytaste' | 'settings';

interface LeftSidebarProps {
  active: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  watchlistCount?: number;
}

const NAV_ITEMS: { id: SidebarPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
  { id: 'mytaste', label: 'My Taste', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function LeftSidebar({ active, onNavigate, watchlistCount = 0 }: LeftSidebarProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Desktop sidebar — left side, vertically centered */}
      <div
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center transition-all duration-300"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: hovered ? '180px' : '64px' }}
      >
        <div
          className="flex flex-col items-center gap-2 glass-strong rounded-r-2xl py-6 transition-all duration-300"
          style={{ width: hovered ? '180px' : '64px' }}
        >
          {/* Logo */}
          <div className="mb-4 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex-shrink-0">
              <Film className="w-5 h-5 text-white" />
            </div>
            {hovered && (
              <span className="text-sm font-bold text-white font-display whitespace-nowrap animate-fade-in">
                Movie<span className="text-gradient">Khojo</span>
              </span>
            )}
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full justify-center ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-ink-800/60'
                }`}
                style={{ width: hovered ? '160px' : '44px' }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {hovered && (
                  <span className="text-sm font-medium whitespace-nowrap animate-fade-in">
                    {item.label}
                    {item.id === 'watchlist' && watchlistCount > 0 && (
                      <span className="ml-1.5 text-xs text-primary-400">({watchlistCount})</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-white/5">
        <div className="flex items-center justify-around py-2 px-2 safe-area-inset-bottom">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                  isActive ? 'text-primary-400' : 'text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.id === 'watchlist' && watchlistCount > 0 && (
                  <span className="absolute -mt-5 ml-4 text-[9px] bg-primary-500 text-white rounded-full px-1.5 py-0.5">
                    {watchlistCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export type { SidebarPage };
