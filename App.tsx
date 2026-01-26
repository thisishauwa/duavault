
import React, { useState, useEffect, useMemo } from 'react';
import { View, Dua } from './types';
import LibraryView from './components/LibraryView';
import DuaDetailView from './components/DuaDetailView';
import AddDuaView from './components/AddDuaView';
import OnboardingView from './components/OnboardingView';
import PaywallView from './components/PaywallView';
import AuthView from './components/AuthView';
import SettingsView from './components/SettingsView';
import { supabase } from './services/supabase';
import { LayoutGrid, Plus, Sparkles, User as UserIcon } from 'lucide-react';

const FREE_LIMIT = 5;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('onboarding');
  const [duas, setDuas] = useState<Dua[]>([]);
  const [selectedDuaId, setSelectedDuaId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && currentView === 'onboarding') {
        setCurrentView('library');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [currentView]);

  useEffect(() => {
    const savedDuas = localStorage.getItem('duaVault_duas');
    if (savedDuas) setDuas(JSON.parse(savedDuas));
    const premiumStatus = localStorage.getItem('duaVault_premium');
    if (premiumStatus) setIsPremium(JSON.parse(premiumStatus));
    const onboardingStatus = localStorage.getItem('duaVault_onboarding');
    if (onboardingStatus) {
      setHasCompletedOnboarding(true);
      if (currentView === 'onboarding') setCurrentView('library');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('duaVault_duas', JSON.stringify(duas));
  }, [duas]);

  const addDua = (newDua: Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>) => {
    if (!isPremium && !user && duas.length >= FREE_LIMIT) {
      setCurrentView('paywall');
      return;
    }
    const dua: Dua = {
      ...newDua,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isFavorite: false,
      userId: user?.id
    };
    setDuas(prev => [dua, ...prev]);
    setCurrentView('library');
  };

  const updateDua = (updatedDua: Dua) => {
    setDuas(prev => prev.map(d => (d.id === updatedDua.id ? updatedDua : d)));
  };

  const deleteDua = (id: string) => {
    setDuas(prev => prev.filter(d => d.id !== id));
    setCurrentView('library');
  };

  const toggleFavorite = (id: string) => {
    setDuas(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
  };

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('duaVault_onboarding', 'true');
    setCurrentView('auth');
  };

  const handleUpgrade = () => {
    setIsPremium(true);
    localStorage.setItem('duaVault_premium', 'true');
    setCurrentView('library');
  };

  const selectedDua = useMemo(() => duas.find(d => d.id === selectedDuaId), [duas, selectedDuaId]);

  const renderContent = () => {
    switch (currentView) {
      case 'onboarding': return <OnboardingView onComplete={handleOnboardingComplete} />;
      case 'auth': return <AuthView onSkip={() => setCurrentView('library')} />;
      case 'library': return <LibraryView duas={duas} onSelect={(id) => { setSelectedDuaId(id); setCurrentView('detail'); }} onToggleFavorite={toggleFavorite} />;
      case 'detail': return selectedDua ? <DuaDetailView dua={selectedDua} onBack={() => setCurrentView('library')} onUpdate={updateDua} onDelete={deleteDua} onToggleFavorite={toggleFavorite} /> : null;
      case 'add': return <AddDuaView onSave={addDua} onBack={() => setCurrentView('library')} />;
      case 'paywall': return <PaywallView onUpgrade={handleUpgrade} onBack={() => setCurrentView('library')} />;
      case 'settings': return <SettingsView user={user} isPremium={isPremium} onBack={() => setCurrentView('library')} onOpenPaywall={() => setCurrentView('paywall')} />;
      default: return <LibraryView duas={duas} onSelect={(id) => { setSelectedDuaId(id); setCurrentView('detail'); }} onToggleFavorite={toggleFavorite} />;
    }
  };

  const isFullScreen = ['onboarding', 'paywall', 'auth'].includes(currentView);

  return (
    <div className="h-dvh w-screen bg-white overflow-hidden flex flex-col relative text-gray-900">
      <main className={`flex-1 overflow-y-auto no-scrollbar safe-top ${!isFullScreen ? 'pb-24' : ''}`}>
        {renderContent()}
      </main>

      {!isFullScreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-2 flex justify-between items-center z-50 safe-bottom w-full">
          <button 
            onClick={() => setCurrentView('library')} 
            className={`p-4 rounded-xl transition-all flex flex-col items-center gap-1 ${currentView === 'library' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <LayoutGrid size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">Library</span>
          </button>
          
          <div className="relative -top-6">
            <button 
              onClick={() => setCurrentView('add')}
              className="bg-emerald-600 text-white p-4 rounded-full shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all outline-4 outline-white"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>

          <button 
            onClick={() => setCurrentView('settings')}
            className={`p-4 rounded-xl transition-all flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <UserIcon size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
