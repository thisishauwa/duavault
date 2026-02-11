
import React, { useState, useEffect, useMemo } from 'react';
import { View, Dua } from './types';
import LibraryView from './components/LibraryView';
import DuaDetailView from './components/DuaDetailView';
import AddDuaView from './components/AddDuaView';
import OnboardingView from './components/OnboardingView';
import PaywallView from './components/PaywallView';
import AuthView from './components/AuthView';
import SettingsView from './components/SettingsView';
import {
  supabase,
  signOut,
  ensureUserProfile,
  fetchUserDuas,
  createUserDua,
  updateUserDua,
  deleteUserDua,
  upsertUserDuas,
  fetchUserPreferences,
  setUserOnboardingCompleted,
  fetchIsPremium,
} from './services/supabase';
import { LayoutGrid, Plus, User as UserIcon } from 'lucide-react';

const FREE_LIMIT = 5;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('onboarding');
  const [duas, setDuas] = useState<Dua[]>([]);
  const [selectedDuaId, setSelectedDuaId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isGuestSession, setIsGuestSession] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAppHydrated, setIsAppHydrated] = useState(false);
  const [isCloudDataReady, setIsCloudDataReady] = useState(false);

  useEffect(() => {
    const savedDuas = localStorage.getItem('duaVault_duas');
    if (savedDuas) setDuas(JSON.parse(savedDuas));

    const premiumStatus = localStorage.getItem('duaVault_premium');
    if (premiumStatus) setIsPremium(JSON.parse(premiumStatus));

    const onboardingStatus = localStorage.getItem('duaVault_onboarding');
    setHasCompletedOnboarding(Boolean(onboardingStatus));

    const guestStatus = localStorage.getItem('duaVault_guest');
    setIsGuestSession(guestStatus === 'true');

    setIsAppHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAppHydrated || !isAuthReady) return;

    if (!user) {
      setIsCloudDataReady(true);
      return;
    }

    let cancelled = false;
    const loadCloudData = async () => {
      setIsCloudDataReady(false);
      try {
        await ensureUserProfile({ id: user.id, email: user.email });

        const [duasResult, onboardingResult, premiumResult] = await Promise.allSettled([
          fetchUserDuas(user.id),
          fetchUserPreferences(user.id),
          fetchIsPremium(user.id),
        ]);

        if (cancelled) return;

        const cloudDuas = duasResult.status === 'fulfilled' ? duasResult.value : [];
        const cloudOnboardingComplete = onboardingResult.status === 'fulfilled' ? onboardingResult.value : false;
        const cloudPremium = premiumResult.status === 'fulfilled' ? premiumResult.value : false;

        if (duasResult.status === 'rejected') {
          console.error('Failed to fetch cloud duas:', duasResult.reason);
        }
        if (onboardingResult.status === 'rejected') {
          console.error('Failed to fetch user preferences:', onboardingResult.reason);
        }
        if (premiumResult.status === 'rejected') {
          console.error('Failed to fetch subscription status:', premiumResult.reason);
        }

        const localDuasRaw = localStorage.getItem('duaVault_duas');
        const localDuas = localDuasRaw ? (JSON.parse(localDuasRaw) as Dua[]) : [];
        const migrationKey = `duaVault_migrated_${user.id}`;
        const alreadyMigrated = localStorage.getItem(migrationKey) === 'true';

        let nextDuas = cloudDuas;

        if (!alreadyMigrated && localDuas.length > 0 && cloudDuas.length === 0) {
          const migrated = await upsertUserDuas(
            user.id,
            localDuas.map((dua) => ({
              arabic: dua.arabic,
              translation: dua.translation,
              category: dua.category,
              source: dua.source,
              userId: user.id,
            }))
          );
          if (cancelled) return;
          localStorage.setItem(migrationKey, 'true');
          nextDuas = migrated;
        }

        const localOnboarding = localStorage.getItem('duaVault_onboarding') === 'true';
        const onboardingComplete = cloudOnboardingComplete || localOnboarding;

        setDuas(nextDuas);
        setHasCompletedOnboarding(onboardingComplete);
        setIsPremium(cloudPremium);

        if (onboardingComplete && !cloudOnboardingComplete) {
          await setUserOnboardingCompleted(user.id, true);
        }

        // User account is now source of truth for data/state.
        localStorage.removeItem('duaVault_guest');
        localStorage.removeItem('duaVault_premium');
      } catch (error) {
        console.error('Failed to load cloud data:', error);
      } finally {
        if (!cancelled) setIsCloudDataReady(true);
      }
    };

    void loadCloudData();

    return () => {
      cancelled = true;
    };
  }, [isAppHydrated, isAuthReady, user]);

  useEffect(() => {
    if (!isAppHydrated || !isAuthReady || !isCloudDataReady) return;

    if (!hasCompletedOnboarding) {
      if (currentView !== 'onboarding') setCurrentView('onboarding');
      return;
    }

    if (user) {
      if (currentView === 'onboarding' || currentView === 'auth') {
        setCurrentView('library');
      }
      return;
    }

    if (isGuestSession) {
      if (currentView === 'onboarding' || currentView === 'auth') {
        setCurrentView('library');
      }
      return;
    }

    if (currentView !== 'auth') {
      setCurrentView('auth');
    }
  }, [isAppHydrated, isAuthReady, isCloudDataReady, hasCompletedOnboarding, user, isGuestSession, currentView]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('duaVault_duas', JSON.stringify(duas));
    }
  }, [duas]);

  const addDua = async (newDua: Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>) => {
    if (!isPremium && !user && duas.length >= FREE_LIMIT) {
      setCurrentView('paywall');
      return;
    }

    try {
      if (user) {
        const created = await createUserDua(user.id, newDua);
        setDuas((prev) => [created, ...prev]);
      } else {
        const dua: Dua = {
          ...newDua,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: Date.now(),
          isFavorite: false,
          userId: user?.id,
        };
        setDuas((prev) => [dua, ...prev]);
      }
      setCurrentView('library');
    } catch (error) {
      console.error('Failed to add dua:', error);
    }
  };

  const updateDua = async (updatedDua: Dua) => {
    try {
      if (user) {
        const saved = await updateUserDua(user.id, updatedDua);
        setDuas((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        return;
      }
      setDuas((prev) => prev.map((d) => (d.id === updatedDua.id ? updatedDua : d)));
    } catch (error) {
      console.error('Failed to update dua:', error);
    }
  };

  const deleteDua = async (id: string) => {
    try {
      if (user) {
        await deleteUserDua(user.id, id);
      }
      setDuas((prev) => prev.filter((d) => d.id !== id));
      setCurrentView('library');
    } catch (error) {
      console.error('Failed to delete dua:', error);
    }
  };

  const toggleFavorite = async (id: string) => {
    const target = duas.find((d) => d.id === id);
    if (!target) return;

    const next = { ...target, isFavorite: !target.isFavorite };

    try {
      if (user) {
        const saved = await updateUserDua(user.id, next);
        setDuas((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        return;
      }
      setDuas((prev) => prev.map((d) => (d.id === id ? next : d)));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleOnboardingComplete = async () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('duaVault_onboarding', 'true');
    if (user) {
      try {
        await setUserOnboardingCompleted(user.id, true);
      } catch (error) {
        console.error('Failed to update onboarding status:', error);
      }
    }
    if (user || isGuestSession) {
      setCurrentView('library');
      return;
    }
    setCurrentView('auth');
  };

  const handleContinueAsGuest = () => {
    localStorage.setItem('duaVault_guest', 'true');
    setIsGuestSession(true);
    setCurrentView('library');
  };

  const handleAuthenticated = () => {
    localStorage.removeItem('duaVault_guest');
    setIsGuestSession(false);
    setCurrentView('library');
  };

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('duaVault_guest');
    setIsGuestSession(false);
    setCurrentView('auth');
  };

  const handleUpgrade = () => {
    if (user) {
      // Billing integration should update public.subscriptions server-side.
      setCurrentView('library');
      return;
    }
    setIsPremium(true);
    localStorage.setItem('duaVault_premium', 'true');
    setCurrentView('library');
  };

  const selectedDua = useMemo(() => duas.find(d => d.id === selectedDuaId), [duas, selectedDuaId]);

  if (!isAppHydrated || !isAuthReady || !isCloudDataReady) {
    return <div className="h-dvh w-screen bg-white" />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'onboarding': return <OnboardingView onComplete={handleOnboardingComplete} />;
      case 'auth': return <AuthView onSkip={handleContinueAsGuest} onAuthenticated={handleAuthenticated} />;
      case 'library': return <LibraryView duas={duas} onSelect={(id) => { setSelectedDuaId(id); setCurrentView('detail'); }} onToggleFavorite={(id) => { void toggleFavorite(id); }} />;
      case 'detail': return selectedDua ? <DuaDetailView dua={selectedDua} onBack={() => setCurrentView('library')} onUpdate={(dua) => { void updateDua(dua); }} onDelete={(id) => { void deleteDua(id); }} onToggleFavorite={(id) => { void toggleFavorite(id); }} /> : null;
      case 'add': return <AddDuaView onSave={(dua) => { void addDua(dua); }} onBack={() => setCurrentView('library')} />;
      case 'paywall': return <PaywallView onUpgrade={handleUpgrade} onBack={() => setCurrentView('library')} />;
      case 'settings': return <SettingsView user={user} isPremium={isPremium} onBack={() => setCurrentView('library')} onOpenPaywall={() => setCurrentView('paywall')} onOpenAuth={() => setCurrentView('auth')} onSignOut={handleSignOut} />;
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
