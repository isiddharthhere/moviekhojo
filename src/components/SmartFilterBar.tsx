import { useState, useRef, useEffect } from 'react';
import { Globe, Tag, Monitor, Languages, ChevronDown } from 'lucide-react';

export interface FilterState {
  industry: string;
  genre: string;
  subGenre: string;
  platform: string;
  language: string;
}

interface SmartFilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const INDUSTRIES = [
  { id: 'all', label: 'Industries' },
  { id: 'hollywood', label: 'Hollywood' },
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'south_indian', label: 'South Indian Cinema' },
  { id: 'asian_cinema', label: 'Asian Cinema' },
  { id: 'european_latin', label: 'European & Latin Cinema' },
];

const GENRES: { id: string; label: string; subGenres: { id: string; label: string }[] }[] = [
  { id: 'all', label: 'Genres', subGenres: [] },
  {
    id: 'action', label: 'Action',
    subGenres: [
      { id: 'martial-arts', label: 'Martial Arts Action' },
      { id: 'military-war', label: 'Military & War' },
      { id: 'spy-espionage', label: 'Spy & Espionage' },
      { id: 'heist', label: 'Heist & Robbery' },
      { id: 'survival-action', label: 'Survival Action' },
      { id: 'superhero', label: 'Superhero' },
      { id: 'action-comedy', label: 'Action Comedy' },
      { id: 'vigilante', label: 'Vigilante Justice' },
      { id: 'vehicular', label: 'Vehicular Action' },
      { id: 'cyberpunk-action', label: 'Cyberpunk Action' },
      { id: 'disaster', label: 'Disaster Action' },
    ],
  },
  {
    id: 'thriller', label: 'Thriller',
    subGenres: [
      { id: 'psychological', label: 'Psychological Thriller' },
      { id: 'crime-thriller', label: 'Crime Thriller' },
      { id: 'political', label: 'Political Thriller' },
      { id: 'tech-cyber', label: 'Tech & Cyber Thriller' },
      { id: 'erotic', label: 'Erotic Thriller' },
      { id: 'mystery-thriller', label: 'Mystery Thriller' },
      { id: 'survival-thriller', label: 'Survival Thriller' },
      { id: 'legal-medical', label: 'Legal & Medical Thriller' },
    ],
  },
  {
    id: 'horror', label: 'Horror',
    subGenres: [
      { id: 'supernatural', label: 'Supernatural Horror' },
      { id: 'slasher', label: 'Slasher' },
      { id: 'psychological-horror', label: 'Psychological Horror' },
      { id: 'monster', label: 'Monster & Creature Feature' },
      { id: 'zombie', label: 'Zombie & Infection' },
      { id: 'sci-fi-horror', label: 'Sci-Fi Horror' },
      { id: 'found-footage', label: 'Found Footage' },
      { id: 'comedy-horror', label: 'Comedy Horror' },
      { id: 'folk-cult', label: 'Folk & Cult Horror' },
      { id: 'body-horror', label: 'Body Horror' },
    ],
  },
  {
    id: 'crime-mystery', label: 'Crime & Mystery',
    subGenres: [
      { id: 'whodunit', label: 'Whodunit' },
      { id: 'mob-mafia', label: 'Mob & Mafia' },
      { id: 'detective', label: 'Detective & Procedural' },
      { id: 'true-crime', label: 'True Crime Style' },
      { id: 'prison-escape', label: 'Prison & Escape' },
      { id: 'drug-cartel', label: 'Drug Cartel' },
      { id: 'neo-noir', label: 'Neo-Noir' },
      { id: 'cybercrime', label: 'Cybercrime' },
    ],
  },
  {
    id: 'scifi-fantasy', label: 'Sci-Fi & Fantasy',
    subGenres: [
      { id: 'space-opera', label: 'Space Opera' },
      { id: 'time-travel', label: 'Time Travel' },
      { id: 'dystopian', label: 'Dystopian & Post-Apocalyptic' },
      { id: 'cyberpunk', label: 'Cyberpunk' },
      { id: 'high-fantasy', label: 'High Fantasy' },
      { id: 'urban-fantasy', label: 'Urban Fantasy' },
      { id: 'dark-fantasy', label: 'Dark Fantasy' },
      { id: 'steampunk', label: 'Steampunk' },
      { id: 'alien-invasion', label: 'Alien Invasion' },
    ],
  },
  {
    id: 'romance', label: 'Romance',
    subGenres: [
      { id: 'rom-com', label: 'Romantic Comedy (Rom-Com)' },
      { id: 'romantic-drama', label: 'Romantic Drama' },
      { id: 'forbidden-love', label: 'Forbidden Love' },
      { id: 'historical-romance', label: 'Historical Romance' },
      { id: 'tragic-romance', label: 'Tragic Romance' },
      { id: 'erotic-romance', label: 'Erotic Romance' },
    ],
  },
  {
    id: 'comedy', label: 'Comedy',
    subGenres: [
      { id: 'satire', label: 'Satire & Spoof' },
      { id: 'slapstick', label: 'Slapstick' },
      { id: 'dark-comedy', label: 'Dark Comedy' },
      { id: 'buddy-comedy', label: 'Buddy Comedy' },
      { id: 'coming-of-age-comedy', label: 'Coming-of-Age' },
      { id: 'absurdist', label: 'Absurdist / Surreal' },
      { id: 'sitcom', label: 'Sitcom-style' },
    ],
  },
  {
    id: 'drama', label: 'Drama',
    subGenres: [
      { id: 'family-drama', label: 'Family Drama' },
      { id: 'melodrama', label: 'Melodrama' },
      { id: 'biopic', label: 'Biopic / Biographical' },
      { id: 'period', label: 'Historical / Period Piece' },
      { id: 'courtroom', label: 'Courtroom Drama' },
      { id: 'medical-drama', label: 'Medical Drama' },
      { id: 'sports-drama', label: 'Sports Drama' },
      { id: 'social-issue', label: 'Social Issue Drama' },
    ],
  },
  {
    id: 'adventure-war', label: 'Adventure & War',
    subGenres: [
      { id: 'treasure-hunt', label: 'Treasure Hunt' },
      { id: 'road-trip', label: 'Road Trip / Journey' },
      { id: 'survival-adventure', label: 'Survival Adventure' },
      { id: 'historical-warfare', label: 'Historical Warfare' },
      { id: 'modern-warfare', label: 'Modern Warfare' },
    ],
  },
  {
    id: 'animation-anime-kids', label: 'Animation, Anime & Kids',
    subGenres: [
      { id: 'shonen', label: 'Shonen Anime' },
      { id: 'slice-of-life', label: 'Slice of Life' },
      { id: 'mecha', label: 'Mecha Anime' },
      { id: 'kids-family', label: 'Kids & Family Cartoon' },
    ],
  },
];

const PLATFORMS = [
  { id: 'all', label: 'Platforms' },
  { id: 'Netflix', label: 'Netflix' },
  { id: 'Prime Video', label: 'Prime Video' },
  { id: 'JioCinema', label: 'JioCinema' },
  { id: 'Disney+ Hotstar', label: 'Disney+ Hotstar' },
  { id: 'Zee5', label: 'Zee5' },
  { id: 'SonyLIV', label: 'SonyLIV' },
  { id: 'Apple TV', label: 'Apple TV' },
];

const LANGUAGES = [
  { id: 'all', label: 'Languages' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'hindi_dubbed', label: 'Hindi Dubbed' },
  { id: 'english', label: 'English' },
  { id: 'korean', label: 'Korean' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'malayalam', label: 'Malayalam' },
];

interface DropdownProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: { id: string; label: string }[];
  subOptions?: { id: string; label: string }[];
  onSelect: (id: string) => void;
  onSelectSub?: (id: string) => void;
  selectedSub?: string;
}

function Dropdown({ icon, label, value, options, subOptions, onSelect, onSelectSub, selectedSub }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentOption = options.find((o) => o.id === value);
  const currentLabel = currentOption ? currentOption.label : label;
  const hasSub = subOptions && subOptions.length > 0 && value !== 'all' && onSelectSub;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          open ? 'glass-strong text-white' : 'glass text-gray-300 hover:text-white hover:bg-ink-800/60'
        }`}
      >
        {icon}
        <span className="truncate max-w-[100px]">{currentLabel}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 glass-strong rounded-xl2 py-2 min-w-[220px] max-w-[280px] animate-slide-down max-h-[400px] overflow-y-auto scrollbar-hide">
          {options.map((opt) => (
            <div key={opt.id}>
              <button
                onClick={() => { onSelect(opt.id); if (!hasSub) setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                  opt.id === value ? 'text-primary-400 bg-primary-500/10' : 'text-gray-300 hover:text-white hover:bg-ink-800/60'
                }`}
              >
                {opt.label}
              </button>
              {/* Sub-genres — click/tap to expand (works on both desktop and mobile) */}
              {hasSub && opt.id === value && subOptions && (
                <div className="ml-4 border-l border-white/10 pl-2 space-y-0.5 mt-0.5 mb-1">
                  {subOptions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { onSelectSub?.(sub.id); setOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors ${
                        selectedSub === sub.id
                          ? 'bg-primary-500/15 text-primary-300'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-ink-800/40'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmartFilterBar({ filters, onChange }: SmartFilterBarProps) {
  const currentGenre = GENRES.find((g) => g.id === filters.genre) || GENRES[0];

  return (
    <div className="flex items-center gap-1.5 md:gap-2 flex-nowrap overflow-x-auto scrollbar-hide">
      <Dropdown
        icon={<Globe className="w-3.5 h-3.5 text-gray-500" />}
        label="Industries"
        value={filters.industry}
        options={INDUSTRIES}
        onSelect={(id) => onChange({ ...filters, industry: id })}
      />
      <Dropdown
        icon={<Tag className="w-3.5 h-3.5 text-gray-500" />}
        label="Genres"
        value={filters.genre}
        options={GENRES.map((g) => ({ id: g.id, label: g.label }))}
        subOptions={currentGenre.subGenres}
        onSelect={(id) => onChange({ ...filters, genre: id, subGenre: '' })}
        onSelectSub={(id) => onChange({ ...filters, subGenre: id })}
        selectedSub={filters.subGenre}
      />
      <Dropdown
        icon={<Monitor className="w-3.5 h-3.5 text-gray-500" />}
        label="Platforms"
        value={filters.platform}
        options={PLATFORMS}
        onSelect={(id) => onChange({ ...filters, platform: id })}
      />
      <Dropdown
        icon={<Languages className="w-3.5 h-3.5 text-gray-500" />}
        label="Languages"
        value={filters.language}
        options={LANGUAGES}
        onSelect={(id) => onChange({ ...filters, language: id })}
      />
    </div>
  );
}
