import React, { useState } from "react";
import { signInWithGoogle } from "../services/supabase";

interface AuthViewProps {
  onAuthenticated: () => void;
}

const AuthView: React.FC<AuthViewProps> = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className="min-h-dvh w-full bg-white flex flex-col items-center justify-center px-8 py-12 text-[#1a1a1a]">
      <div className="w-full max-w-sm flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-header leading-[1.1]">DuaVault</h1>
          <p className="text-lg text-[#666666] font-sans leading-relaxed">
            Your personal collection of duas and supplications.
          </p>
        </div>

        {error && (
          <div className="text-rose-600 text-sm font-medium bg-rose-50 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          className="w-full bg-white border border-[#e5e7eb] text-[#1a1a1a] py-4 rounded-xl font-sans font-medium text-base hover:bg-[#f9fafb] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
        >
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
      </div>
    </div>
  );
};

export default AuthView;
