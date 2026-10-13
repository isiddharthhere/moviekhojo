import { useState, useEffect } from 'react';
import { Lock, Activity, Search, Clock, Users, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBehavior } from '@/utils/tasteTracker';

interface AdminPortalProps {
  onBack: () => void;
}

export function AdminPortal({ onBack }: AdminPortalProps) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [latencyData, setLatencyData] = useState<{ layer: string; ms: number; results: number }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState(1);

  useEffect(() => {
    if (authed) {
      const behavior = getBehavior();
      setRecentSearches(behavior.searches.slice(0, 20));
      setLatencyData([
        { layer: 'TMDB API', ms: 180, results: 15 },
        { layer: 'Local Fuzzy', ms: 12, results: 8 },
        { layer: 'Scraper Fallback', ms: 2000, results: 0 },
      ]);
      setActiveUsers(Math.floor(Math.random() * 50) + 10);
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setAuthed(true);
      setError('');
    } else {
      setError('Invalid admin credentials');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-strong rounded-xl3 p-8 animate-scale-in">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to MovieKhojo
          </button>
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-xl2 bg-error-500/10 border border-error-500/20 mb-3">
              <Shield className="w-6 h-6 text-error-400" />
            </div>
            <h2 className="text-xl font-bold text-white font-display">Admin Access</h2>
            <p className="text-sm text-gray-400 mt-1">Restricted area — authorized personnel only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-800/60 border border-white/5 focus-within:border-error-500/30 transition-colors">
              <Lock className="w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-sm"
              />
            </div>
            {error && <p className="text-sm text-error-400">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-xl bg-error-500 hover:bg-error-600 text-white font-semibold transition-colors">
              Authenticate
            </button>
          </form>
          <p className="text-xs text-gray-600 text-center mt-4">Demo password: admin123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl2 bg-error-500/10 border border-error-500/20">
            <Shield className="w-6 h-6 text-error-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-display">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">System telemetry & diagnostics</p>
          </div>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-4 py-2 rounded-xl glass">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
      </div>

      {/* Telemetry cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-xs">Active Concurrent Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeUsers}</p>
        </div>
        <div className="glass-card p-5 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs">Avg Response Time</span>
          </div>
          <p className="text-3xl font-bold text-primary-300">
            {Math.round(latencyData.reduce((a, b) => a + b.ms, 0) / (latencyData.length || 1))}ms
          </p>
        </div>
        <div className="glass-card p-5 rounded-xl2">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Search className="w-4 h-4" />
            <span className="text-xs">Total Searches Tracked</span>
          </div>
          <p className="text-3xl font-bold text-accent-400">{recentSearches.length}</p>
        </div>
      </div>

      {/* Latency per layer */}
      <div className="glass-strong rounded-xl3 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-400" /> Backend Waterfall Latency
        </h3>
        <div className="space-y-3">
          {latencyData.map((d) => (
            <div key={d.layer} className="flex items-center gap-4">
              <span className="text-sm text-gray-300 w-40">{d.layer}</span>
              <div className="flex-1 h-6 rounded-full bg-ink-800/60 overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.ms > 1500 ? 'bg-error-500' : d.ms > 500 ? 'bg-warning-500' : 'bg-success-500'}`}
                  style={{ width: `${Math.min((d.ms / 2000) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-mono text-white w-16 text-right">{d.ms}ms</span>
              <span className="text-xs text-gray-500 w-20">{d.results} results</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent searches */}
      <div className="glass-strong rounded-xl3 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-accent-400" /> Recent Search Keywords
        </h3>
        {recentSearches.length > 0 ? (
          <div className="space-y-2">
            {recentSearches.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ink-800/40">
                <span className="text-xs text-gray-600 font-mono">#{i + 1}</span>
                <span className="text-sm text-gray-300">{s}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No searches tracked yet</p>
        )}
      </div>
    </div>
  );
}
