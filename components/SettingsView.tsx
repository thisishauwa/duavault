
import React from 'react';
import { signOut } from '../services/supabase';
import { ArrowLeft, LogOut, Shield, FileText, Trash2, Sparkles, ChevronRight, User as UserIcon } from 'lucide-react';

interface SettingsViewProps {
  user: any;
  isPremium: boolean;
  onBack: () => void;
  onOpenPaywall: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, isPremium, onBack, onOpenPaywall }) => {
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <button onClick={onBack} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-extrabold text-gray-900">Profile</h2>
        <div className="w-10" />
      </header>

      <div className="px-6 pb-20 space-y-8 animate-slide-up">
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-4">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mb-4 border-4 border-white shadow-sm">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-[2.5rem] object-cover" />
            ) : (
              <UserIcon size={40} className="text-emerald-600" />
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{user?.email || 'Guest Explorer'}</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">
            {isPremium ? 'Premium Vault Member' : 'Free Tier'}
          </p>
        </div>

        {/* Upgrade Card */}
        {!isPremium && (
          <button 
            onClick={onOpenPaywall}
            className="w-full p-6 bg-emerald-600 text-white rounded-[2rem] flex items-center justify-between shadow-lg shadow-emerald-100 group overflow-hidden relative"
          >
            <div className="relative z-10 text-left">
              <h4 className="font-bold text-lg leading-tight">Go Premium</h4>
              <p className="text-emerald-100 text-xs mt-1">Unlimited storage & AI features</p>
            </div>
            <div className="relative z-10 bg-white/20 p-3 rounded-2xl">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          </button>
        )}

        {/* Settings Sections */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Account</h5>
            <div className="bg-gray-50 rounded-[2rem] overflow-hidden">
              {user ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors border-b border-gray-100/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                      <LogOut size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">Sign Out</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ) : (
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors border-b border-gray-100/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600">
                      <Sparkles size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">Sign In to Sync</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              )}
              
              <button 
                onClick={() => window.confirm('This will permanently delete your local and cloud vault. Proceed?')}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-300">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-sm font-bold text-rose-500">Delete Account</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Legal & Support</h5>
            <div className="bg-gray-50 rounded-[2rem] overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors border-b border-gray-100/50 text-left">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                    <Shield size={18} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Privacy Policy</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
              <button className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors text-left">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                    <FileText size={18} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Terms of Service</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 pb-4">
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">DuaVault v1.0.0</p>
          <p className="text-[10px] text-gray-200 mt-1">Crafted for your spiritual journey</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
