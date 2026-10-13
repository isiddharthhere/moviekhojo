import { Check } from 'lucide-react';

interface FilterCapsulesProps {
  title: string;
  items: { id: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  multi?: boolean;
}

export function FilterCapsules({ title, items, selected, onToggle }: FilterCapsulesProps) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {items.map((item) => {
          const isSelected = selected.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 scale-105'
                  : 'glass text-gray-300 hover:text-white hover:bg-ink-750/60'
              }`}
            >
              {item.icon === 'check' && isSelected && <Check className="w-3.5 h-3.5 text-success-400" />}
              {item.icon === 'check' && !isSelected && <Check className="w-3.5 h-3.5 text-gray-500" />}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
