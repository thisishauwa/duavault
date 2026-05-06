import React, { useState } from "react";
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithGoogle,
} from "../services/supabase";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface AuthViewProps {
  onAuthenticated: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const getReadableAuthError = (error: unknown) => {
    if (!(error instanceof Error)) {
      return "Authentication failed. Please try again.";
    }

    if (error.message.includes("Failed to fetch")) {
      return "Could not reach Supabase. Check `VITE_PUBLIC_SUPABASE_URL` in `.env.local` and make sure it exactly matches your Supabase project URL.";
    }

    return error.message;
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password should be at least 6 characters.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { session } = await signUpWithEmailPassword(
          email.trim(),
          password,
        );
        if (session) {
          onAuthenticated();
          return;
        }

        setInfoMessage(
          "Account created. Check your email to confirm, then sign in.",
        );
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
        return;
      }

      await signInWithEmailPassword(email.trim(), password);
      onAuthenticated();
    } catch (error) {
      console.error("Email auth failed:", error);
      setErrorMessage(getReadableAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-white flex flex-col justify-center px-8 py-12 relative overflow-hidden text-[#1a1a1a]">
      <div className="w-full max-w-md mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-normal leading-[1.1] tracking-tight font-header">
            {isSignUp ? "Create account" : "Welcome back"}
          </h1>
          <p className="text-lg text-[#666666] leading-relaxed font-sans max-w-xs">
            {isSignUp
              ? "Start your journey of reflection and preservation."
              : "Sign in to access your personal vault."}
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
              className="w-full bg-[#f9fafb] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg"
              autoComplete="email"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f9fafb] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg pr-12"
                autoComplete={isSignUp ? "new-password" : "current-password"}
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
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#f9fafb] border border-transparent focus:border-[#006B3F] focus:bg-white px-5 py-4 text-lg font-sans placeholder:text-[#9ca3af] focus:outline-none transition-all rounded-lg"
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
              className="w-full bg-[#006B3F] text-white py-4 rounded-lg font-sans font-medium text-base hover:bg-emerald-700 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : isSignUp ? (
                "Sign Up"
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e5e7eb]" />
              <span className="text-[#9ca3af] text-sm font-sans">or</span>
              <div className="flex-1 h-px bg-[#e5e7eb]" />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setErrorMessage("Google sign-in failed. Please try again.");
                }
              }}
              className="w-full bg-white border border-[#e5e7eb] text-[#1a1a1a] py-4 rounded-lg font-sans font-medium text-base hover:bg-[#f9fafb] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {/* Google G logo */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp((prev) => !prev);
                resetMessages();
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-[#666666] hover:text-[#006B3F] transition-colors font-sans text-base py-2"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthView;
