import { useState } from 'react';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: () => void;
}

export function AuthModal({ onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        setError('Authentication is unavailable in this preview.');
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 animate-fade-in">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-xl3 p-8 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-ink-700/60 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl2 bg-primary-500/10 border border-primary-500/20 mb-3">
            <UserIcon className="w-6 h-6 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-white font-display">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'signin' ? 'Sign in to save your watchlist' : 'Sign up to start tracking your favorites'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Email</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-800/60 border border-white/5 focus-within:border-primary-500/30 transition-colors">
              <Mail className="w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Password</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-ink-800/60 border border-white/5 focus-within:border-primary-500/30 transition-colors">
              <Lock className="w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-primary-400 hover:text-primary-300 font-medium"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-gray-500">
            Guest access is unlimited — sign in only to save your watchlist
          </p>
        </div>
      </div>
    </div>
  );
}
