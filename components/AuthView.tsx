
import React, { useState } from 'react';
import { signInWithEmailPassword, signUpWithEmailPassword } from '../services/supabase';
import { Sparkles, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onSkip: () => void;
  onAuthenticated: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onSkip, onAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password should be at least 6 characters.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { session } = await signUpWithEmailPassword(email.trim(), password);
        if (session) {
          onAuthenticated();
          return;
        }

        setInfoMessage('Account created. Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
        return;
      }

      await signInWithEmailPassword(email.trim(), password);
      onAuthenticated();
    } catch (error) {
      console.error('Email auth failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-900 flex flex-col p-8 text-white relative overflow-hidden">
      {/* Visual Background Elements */}
      <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-400 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-200 rounded-full blur-[80px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 z-10">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] flex items-center justify-center mb-4">
          <Sparkles size={40} className="text-emerald-300" />
        </div>
        
        <h1 className="text-4xl font-black tracking-tight">Protect Your Vault</h1>
        <p className="text-emerald-100/60 max-w-[280px] leading-relaxed">
          {isSignUp
            ? 'Create an account to sync your spiritual treasures across devices.'
            : 'Sign in to sync your spiritual treasures across all your devices and never lose a reflection.'}
        </p>

        <form onSubmit={handleEmailAuth} className="w-full mt-8 flex flex-col gap-4">
          <label className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Mail size={18} className="text-emerald-200" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent flex-1 outline-none text-white placeholder:text-emerald-200/50"
              autoComplete="email"
            />
          </label>

          <label className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Lock size={18} className="text-emerald-200" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent flex-1 outline-none text-white placeholder:text-emerald-200/50"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-emerald-100/70 hover:text-emerald-50 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {isSignUp && (
            <label className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3 flex items-center gap-3">
              <Lock size={18} className="text-emerald-200" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent flex-1 outline-none text-white placeholder:text-emerald-200/50"
                autoComplete="new-password"
              />
            </label>
          )}

          {errorMessage && (
            <p className="text-rose-200 text-sm font-medium bg-rose-950/30 border border-rose-200/20 rounded-xl px-3 py-2">
              {errorMessage}
            </p>
          )}

          {infoMessage && (
            <p className="text-emerald-100 text-sm font-medium bg-emerald-700/30 border border-emerald-200/20 rounded-xl px-3 py-2">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-emerald-900 py-6 rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl shadow-black/20 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp((prev) => !prev);
              resetMessages();
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full bg-emerald-800/30 text-emerald-100/90 py-4 rounded-2xl font-bold hover:bg-emerald-800/50 transition-all"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="w-full bg-emerald-800/50 text-emerald-100/80 py-6 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all"
          >
            Continue as Guest
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      <div className="py-10 text-center z-10">
        <p className="text-[10px] text-emerald-400/40 uppercase tracking-[0.3em] font-black">
          Cloud Sync • Secure Encryption • Privacy Focused
        </p>
      </div>
    </div>
  );
};

export default AuthView;
