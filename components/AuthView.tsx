
import React, { useState } from 'react';
import { signInWithEmailPassword, signUpWithEmailPassword } from '../services/supabase';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
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
    <div className="h-full w-full bg-white flex flex-col justify-center px-8 relative overflow-hidden text-[#1a1a1a]">
      <div className="w-full max-w-md mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-normal leading-[1.1] tracking-tight font-header">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-lg text-[#666666] leading-relaxed font-sans max-w-xs">
            {isSignUp
              ? 'Start your journey of reflection and preservation.'
              : 'Sign in to access your personal vault.'}
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#f3f4f6] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg"
              autoComplete="email"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f3f4f6] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg pr-12"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#006B3F] transition-colors p-2"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {isSignUp && (
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#f3f4f6] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg"
                autoComplete="new-password"
              />
            )}
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="text-rose-600 text-sm font-medium bg-rose-50 px-3 py-2 rounded-md">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="text-emerald-700 text-sm font-medium bg-emerald-50 px-3 py-2 rounded-md">
              {infoMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#006B3F] text-white py-4 rounded-lg font-sans font-medium text-base hover:bg-[#005a35] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp((prev) => !prev);
                resetMessages();
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-[#666666] hover:text-[#006B3F] transition-colors font-sans text-base py-2"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthView;
