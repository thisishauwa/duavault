
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
  consumeTranslationQuota,
  fetchTranslationQuota,
  upsertUserSubscription,
  type TranslationQuota,
} from './services/supabase';
import {
  derivePlanFromCustomerInfo,
  getDuaVaultPackages,
  getPackageDisplayPrice,
  getRevenueCatCustomerInfo,
  hasDuaVaultProEntitlement,
  initializeRevenueCat,
  presentRevenueCatCustomerCenter,
  purchaseRevenueCatPackage,
  type RevenueCatPlanId,
  restoreRevenueCatPurchases,
  syncRevenueCatUser,
} from './services/revenuecat';
import { LayoutGrid, Plus, User as UserIcon } from 'lucide-react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

const FREE_TRANSLATION_LIMIT = 3;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('onboarding');
  const [duas, setDuas] = useState<Dua[]>([]);
  const [selectedDuaId, setSelectedDuaId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAppHydrated, setIsAppHydrated] = useState(false);
  const [isCloudDataReady, setIsCloudDataReady] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<RevenueCatPlanId>('monthly');
  const [isPurchasingPlan, setIsPurchasingPlan] = useState(false);
  const [paywallPackages, setPaywallPackages] = useState<{
    monthly?: PurchasesPackage;
    yearly?: PurchasesPackage;
    lifetime?: PurchasesPackage;
  }>({});
  const [translationQuota, setTranslationQuota] = useState<TranslationQuota>({
    allowed: true,
    used: 0,
    remaining: FREE_TRANSLATION_LIMIT,
    periodStart: new Date().toISOString().slice(0, 10),
    limit: FREE_TRANSLATION_LIMIT,
  });

  useEffect(() => {
    const onboardingStatus = localStorage.getItem('duaVault_onboarding');
    setHasCompletedOnboarding(onboardingStatus === 'true');

    setIsAppHydrated(true);
  }, []);

  useEffect(() => {
    if (!isAppHydrated) return;

    if (isPremium) {
      setTranslationQuota({
        allowed: true,
        used: 0,
        remaining: Number.MAX_SAFE_INTEGER,
        periodStart: new Date().toISOString().slice(0, 10),
        limit: Number.MAX_SAFE_INTEGER,
      });
      return;
    }

    if (user) {
      fetchTranslationQuota(user.id, FREE_TRANSLATION_LIMIT)
        .then(setTranslationQuota)
        .catch((error) => {
          console.error('Failed to fetch translation quota:', error);
        });
      return;
    }

    const used = 0;
    const remaining = FREE_TRANSLATION_LIMIT;
    setTranslationQuota({
      allowed: remaining > 0,
      used,
      remaining,
      periodStart: new Date().toISOString().slice(0, 10),
      limit: FREE_TRANSLATION_LIMIT,
    });
  }, [isAppHydrated, user, isPremium]);

  useEffect(() => {
    if (currentView !== 'paywall') return;
    let cancelled = false;

    const loadPaywallPackages = async () => {
      try {
        const pkgs = await getDuaVaultPackages();
        if (cancelled || !pkgs) return;
        setPaywallPackages(pkgs);

        if (pkgs.monthly) setSelectedPlanId('monthly');
        else if (pkgs.yearly) setSelectedPlanId('yearly');
        else if (pkgs.lifetime) setSelectedPlanId('lifetime');
      } catch (error) {
        console.error('Failed to load RevenueCat packages:', error);
      }
    };

    void loadPaywallPackages();

    return () => {
      cancelled = true;
    };
  }, [currentView]);

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

    let cancelled = false;

    const setupRevenueCat = async () => {
      try {
        await initializeRevenueCat(user?.id);
        const info = user?.id ? await syncRevenueCatUser(user.id) : await getRevenueCatCustomerInfo();
        if (!cancelled) {
          const premiumActive = hasDuaVaultProEntitlement(info);
          setIsPremium(premiumActive);
          if (user?.id) {
            const plan = derivePlanFromCustomerInfo(info);
            try {
              await upsertUserSubscription(
                user.id,
                premiumActive ? 'active' : 'inactive',
                plan === 'free' ? 'free' : plan
              );
            } catch (syncError) {
              console.error('Failed to sync subscription state:', syncError);
            }
          }
        }
      } catch (error) {
        console.error('RevenueCat setup failed:', error);
        if (!cancelled) {
          setIsPremium(false);
        }
      }
    };

    void setupRevenueCat();

    return () => {
      cancelled = true;
    };
  }, [isAppHydrated, isAuthReady, user?.id]);

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

        const [duasResult, onboardingResult] = await Promise.allSettled([
          fetchUserDuas(user.id),
          fetchUserPreferences(user.id),
        ]);

        if (cancelled) return;

        const cloudDuas = duasResult.status === 'fulfilled' ? duasResult.value : [];
        const cloudOnboardingComplete = onboardingResult.status === 'fulfilled' ? onboardingResult.value : false;

        if (duasResult.status === 'rejected') {
          console.error('Failed to fetch cloud duas:', duasResult.reason);
        }
        if (onboardingResult.status === 'rejected') {
          console.error('Failed to fetch user preferences:', onboardingResult.reason);
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

        if (onboardingComplete && !cloudOnboardingComplete) {
          await setUserOnboardingCompleted(user.id, true);
        }

        // User account is now source of truth for app data/state.
        localStorage.removeItem('duaVault_duas');
        if (onboardingComplete) {
          localStorage.removeItem('duaVault_onboarding');
        }
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

    if (currentView !== 'auth') {
      setCurrentView('auth');
    }
  }, [isAppHydrated, isAuthReady, isCloudDataReady, hasCompletedOnboarding, user, currentView]);

  const addDua = async (newDua: Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        const created = await createUserDua(activeUserId, newDua);
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
      alert('Could not save to cloud right now. Please try again.');
    }
  };

  const updateDua = async (updatedDua: Dua) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        const saved = await updateUserDua(activeUserId, updatedDua);
        setDuas((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        return;
      }
      setDuas((prev) => prev.map((d) => (d.id === updatedDua.id ? updatedDua : d)));
    } catch (error) {
      console.error('Failed to update dua:', error);
      alert('Could not update in cloud right now. Please try again.');
    }
  };

  const deleteDua = async (id: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        await deleteUserDua(activeUserId, id);
      }
      setDuas((prev) => prev.filter((d) => d.id !== id));
      setCurrentView('library');
    } catch (error) {
      console.error('Failed to delete dua:', error);
      alert('Could not delete from cloud right now. Please try again.');
    }
  };

  const toggleFavorite = async (id: string) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;
    const target = duas.find((d) => d.id === id);
    if (!target) return;

    const next = { ...target, isFavorite: !target.isFavorite };

    try {
      if (activeUserId) {
        const saved = await updateUserDua(activeUserId, next);
        setDuas((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        return;
      }
      setDuas((prev) => prev.map((d) => (d.id === id ? next : d)));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      alert('Could not update favorite in cloud right now. Please try again.');
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
    if (user) {
      setCurrentView('library');
      return;
    }
    setCurrentView('auth');
  };

  const handleAuthenticated = () => {
    localStorage.removeItem('duaVault_duas');
    setCurrentView('library');
  };

  const handleSignOut = async () => {
    await signOut();
    setIsPremium(false);
    try {
      await syncRevenueCatUser();
    } catch (error) {
      console.error('RevenueCat logout failed:', error);
    }
    setCurrentView('auth');
  };

  const handleUpgrade = async (planId: RevenueCatPlanId) => {
    const chosenPackage = paywallPackages[planId];
    if (!chosenPackage) {
      alert('No package available right now. Check RevenueCat offering setup.');
      return;
    }

    setIsPurchasingPlan(true);
    try {
      const info = await purchaseRevenueCatPackage(chosenPackage);
      if (hasDuaVaultProEntitlement(info)) {
        setIsPremium(true);
        if (user?.id) {
          try {
            await upsertUserSubscription(user.id, 'active', planId);
          } catch (syncError) {
            console.error('Failed to sync subscription state:', syncError);
          }
        }
        setCurrentView('library');
      } else {
        alert('Purchase is complete but entitlement is not active yet. Try Restore Purchases.');
      }
    } catch (error) {
      console.error('Purchase flow failed:', error);
      alert('Could not complete purchase right now. Please try again.');
    } finally {
      setIsPurchasingPlan(false);
    }
  };

  const handleOpenCustomerCenter = async () => {
    try {
      await presentRevenueCatCustomerCenter();
      const info = await getRevenueCatCustomerInfo();
      const premiumActive = hasDuaVaultProEntitlement(info);
      setIsPremium(premiumActive);
      if (user?.id) {
        const plan = derivePlanFromCustomerInfo(info);
        try {
          await upsertUserSubscription(user.id, premiumActive ? 'active' : 'inactive', plan === 'free' ? 'free' : plan);
        } catch (syncError) {
          console.error('Failed to sync subscription state:', syncError);
        }
      }
    } catch (error) {
      console.error('Customer Center failed:', error);
      alert('Could not open subscription management right now.');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const info = await restoreRevenueCatPurchases();
      const premiumActive = hasDuaVaultProEntitlement(info);
      setIsPremium(premiumActive);
      if (user?.id) {
        const plan = derivePlanFromCustomerInfo(info);
        try {
          await upsertUserSubscription(user.id, premiumActive ? 'active' : 'inactive', plan === 'free' ? 'free' : plan);
        } catch (syncError) {
          console.error('Failed to sync subscription state:', syncError);
        }
      }
      alert('Purchases restored.');
    } catch (error) {
      console.error('Restore purchases failed:', error);
      alert('Could not restore purchases right now.');
    }
  };

  const requestTranslation = async () => {
    if (isPremium) return true;

    if (user) {
      try {
        const quota = await fetchTranslationQuota(user.id, FREE_TRANSLATION_LIMIT);
        setTranslationQuota(quota);
        if (!quota.allowed) {
          setCurrentView('paywall');
          return false;
        }
        return true;
      } catch (error) {
        console.error('Failed to consume translation quota:', error);
        // Signed-in users should persist usage to Supabase; block translation when quota infra fails.
        alert('Could not verify translation quota right now. Please try again.');
        return false;
      }
    }

    setCurrentView('auth');
    return false;
  };

  const commitSuccessfulTranslation = async () => {
    if (isPremium || !user) return;
    try {
      const quota = await consumeTranslationQuota(FREE_TRANSLATION_LIMIT);
      setTranslationQuota(quota);
    } catch (error) {
      // Translation already succeeded; log usage sync failure without blocking UX.
      console.error('Failed to sync successful translation usage:', error);
    }
  };

  const selectedDua = useMemo(() => duas.find(d => d.id === selectedDuaId), [duas, selectedDuaId]);
  const translationUsageLabel = useMemo(() => {
    if (isPremium) return 'Unlimited translations (Dua Vault Pro)';
    if (!Number.isFinite(translationQuota.limit) || translationQuota.limit <= 0) return null;
    return `Translations this month: ${translationQuota.used}/${translationQuota.limit} used`;
  }, [isPremium, translationQuota.used, translationQuota.limit]);

  if (!isAppHydrated || !isAuthReady || !isCloudDataReady) {
    return <div className="h-dvh w-screen bg-white" />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'onboarding': return <OnboardingView onComplete={handleOnboardingComplete} />;
      case 'auth': return <AuthView onAuthenticated={handleAuthenticated} />;
      case 'library': return <LibraryView duas={duas} onSelect={(id) => { setSelectedDuaId(id); setCurrentView('detail'); }} onToggleFavorite={(id) => { void toggleFavorite(id); }} />;
      case 'detail': return selectedDua ? <DuaDetailView dua={selectedDua} onBack={() => setCurrentView('library')} onUpdate={(dua) => { void updateDua(dua); }} onDelete={(id) => { void deleteDua(id); }} onToggleFavorite={(id) => { void toggleFavorite(id); }} /> : null;
      case 'add': return (
        <AddDuaView
          onSave={(dua) => { void addDua(dua); }}
          onBack={() => setCurrentView('library')}
          onRequestTranslation={requestTranslation}
          onTranslationSuccess={commitSuccessfulTranslation}
          translationUsageLabel={translationUsageLabel}
        />
      );
      case 'paywall': return (
        <PaywallView
          selectedPackageId={selectedPlanId}
          packageOptions={[
            {
              id: 'monthly',
              title: 'Monthly',
              subtitle: getPackageDisplayPrice(paywallPackages.monthly) ?? 'Not available',
            },
            {
              id: 'yearly',
              title: 'Yearly',
              subtitle: getPackageDisplayPrice(paywallPackages.yearly) ?? 'Not available',
            },
            {
              id: 'lifetime',
              title: 'Lifetime',
              subtitle: getPackageDisplayPrice(paywallPackages.lifetime) ?? 'Not available',
            },
          ].filter((pkg) => pkg.subtitle !== 'Not available')}
          isPurchasing={isPurchasingPlan}
          onSelectPackage={setSelectedPlanId}
          onUpgrade={(id) => {
            setSelectedPlanId(id);
            void handleUpgrade(id);
          }}
          onBack={() => setCurrentView('library')}
        />
      );
      case 'settings': return <SettingsView user={user} isPremium={isPremium} onBack={() => setCurrentView('library')} onOpenPaywall={() => setCurrentView('paywall')} onOpenAuth={() => setCurrentView('auth')} onSignOut={handleSignOut} onOpenCustomerCenter={handleOpenCustomerCenter} onRestorePurchases={handleRestorePurchases} />;
      default: return <LibraryView duas={duas} onSelect={(id) => { setSelectedDuaId(id); setCurrentView('detail'); }} onToggleFavorite={toggleFavorite} />;
    }
  };

  const isFullScreen = ['onboarding', 'paywall', 'auth', 'add'].includes(currentView);

  return (
    <div className="h-dvh w-screen bg-white overflow-hidden flex flex-col relative text-gray-900">
      <main className={`flex-1 overflow-y-auto no-scrollbar safe-top ${!isFullScreen ? 'pb-24' : ''}`}>
        {renderContent()}
      </main>

      {!isFullScreen && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <nav className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-8 pointer-events-auto ring-1 ring-white/10">
            <button 
              onClick={() => setCurrentView('library')} 
              className={`p-2 transition-all hover:opacity-80 active:scale-95 ${currentView === 'library' ? 'opacity-100' : 'opacity-50'}`}
            >
              <LayoutGrid size={24} strokeWidth={2.5} />
            </button>
            
            <div className="w-px h-6 bg-white/20" />

            <button 
              onClick={() => setCurrentView('add')}
              className="p-2 transition-all hover:opacity-80 active:scale-95"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>

            <div className="w-px h-6 bg-white/20" />

            <button 
              onClick={() => setCurrentView('settings')}
              className={`p-2 transition-all hover:opacity-80 active:scale-95 ${currentView === 'settings' ? 'opacity-100' : 'opacity-50'}`}
            >
              <UserIcon size={24} strokeWidth={2.5} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
