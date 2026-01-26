
import React, { useState } from 'react';
import { signInWithGoogle } from '../services/supabase';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface AuthViewProps {
  onSkip: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onSkip }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Supabase handles the redirect automatically for Web/PWA
    } catch (error) {
      console.error('Google Sign In failed:', error);
      alert('Authentication failed. Please try again.');
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
          Sign in to sync your spiritual treasures across all your devices and never lose a reflection.
        </p>

        <div className="w-full mt-8 flex flex-col gap-4">
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-emerald-900 py-6 rounded-3xl font-black flex items-center justify-center gap-4 shadow-xl shadow-black/20 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                Continue with Google
              </>
            )}
          </button>

          <button 
            onClick={onSkip}
            className="w-full bg-emerald-800/50 text-emerald-100/80 py-6 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all"
          >
            Continue as Guest
            <ArrowRight size={18} />
          </button>
        </div>
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
