import { TrendingUp, TrendingDown, DollarSign, Trophy, Globe } from 'lucide-react';
import { BOX_OFFICE_DATA } from '@/data/catalog';
import type { BoxOfficeEntry } from '@/types';

const VERDICT_STYLES: Record<BoxOfficeEntry['verdict'], string> = {
  'Blockbuster': 'bg-success-500/20 text-success-400 border-success-500/30',
  'Super Hit': 'bg-success-500/15 text-success-300 border-success-500/25',
  'Hit': 'bg-primary-500/15 text-primary-300 border-primary-500/25',
  'Average': 'bg-warning-500/15 text-warning-400 border-warning-500/25',
  'Flop': 'bg-error-500/15 text-error-400 border-error-500/25',
  'Disaster': 'bg-error-500/20 text-error-500 border-error-500/30',
};

export function BoxOfficeMatrix() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl2 bg-accent-500/10 border border-accent-500/20">
          <Trophy className="w-6 h-6 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">Box Office Matrix</h1>
          <p className="text-sm text-gray-400">Financial tracking — budget, worldwide gross & final verdict</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-white">{BOX_OFFICE_DATA.length}</p>
        </div>
        <div className="glass-card p-4 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4 text-success-400" />
            <span className="text-xs">Blockbusters</span>
          </div>
          <p className="text-2xl font-bold text-success-400">
            {BOX_OFFICE_DATA.filter((e) => e.verdict === 'Blockbuster').length}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className="text-xs">Top Worldwide Gross</span>
          </div>
          <p className="text-lg font-bold text-primary-300">
            {BOX_OFFICE_DATA.sort((a, b) => b.grossWorldwide.length - a.grossWorldwide.length)[0]?.grossWorldwide}
          </p>
        </div>
        <div className="glass-card p-4 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingDown className="w-4 h-4 text-error-400" />
            <span className="text-xs">Lowest Verdict</span>
          </div>
          <p className="text-lg font-bold text-error-400">
            {BOX_OFFICE_DATA.sort((a, b) => a.verdict.localeCompare(b.verdict))[0]?.verdict}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-strong rounded-xl3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-ink-800/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Year</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Budget</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Opening Weekend</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">India</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Overseas</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Worldwide Gross</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-400">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {BOX_OFFICE_DATA.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-white/[0.04] hover:bg-ink-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{entry.title}</td>
                  <td className="px-4 py-3 text-gray-400">{entry.year}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.budget}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.openingWeekend || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.indiaCollection || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{entry.overseasCollection || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-primary-300">{entry.grossWorldwide}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${VERDICT_STYLES[entry.verdict]}`}>
                      {entry.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
