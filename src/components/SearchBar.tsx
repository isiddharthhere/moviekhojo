import { useState, useEffect } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  tags: string[];
  onRemoveTag: (tag: string) => void;
}

export function SearchBar({ value, onChange, onSearch, tags, onRemoveTag }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim()) onSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="w-full">
      <div
        className={`relative flex items-center gap-3 glass-strong rounded-xl2 px-5 py-4 transition-all duration-300 ${
          isFocused ? 'neon-border scale-[1.01]' : ''
        }`}
      >
        <Search className={`w-5 h-5 transition-colors ${isFocused ? 'text-primary-400' : 'text-gray-400'}`} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search jail se bhagne wali movie, bank lootne wali series..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base md:text-lg"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
          <Sparkles className="w-3.5 h-3.5 text-primary-400" />
          <span className="text-xs font-medium text-primary-300">AI Search</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 animate-slide-down">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onRemoveTag(tag)}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-500/15 border border-accent-500/30 text-sm text-accent-400 hover:bg-accent-500/25 transition-all"
            >
              <span>{tag}</span>
              <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
