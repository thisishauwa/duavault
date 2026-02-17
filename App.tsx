
import React, { useState, useEffect, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
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
  upsertUserSubscription,
} from './services/supabase';
import {
  derivePlanFromCustomerInfo,
  getDuaVaultPackages,
  getPackageDisplayPrice,
  getRevenueCatCustomerInfo,
  hasDuaVaultProEntitlement,
  initializeRevenueCat,
  presentDuaVaultPaywall,
  presentRevenueCatCustomerCenter,
  purchaseRevenueCatPackage,
  type RevenueCatPlanId,
  restoreRevenueCatPurchases,
  syncRevenueCatUser,
} from './services/revenuecat';
import { LayoutGrid, Plus, User as UserIcon } from 'lucide-react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

const FREE_DUA_SAVE_LIMIT = 10;
type PaywallEntryReason = 'default' | 'dua_limit' | 'translation_limit';
type PaywallReturnView = 'library' | 'settings';

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
  const [paywallEntryReason, setPaywallEntryReason] = useState<PaywallEntryReason>('default');
  const [paywallReturnView, setPaywallReturnView] = useState<PaywallReturnView>('library');

  useEffect(() => {
    const onboardingStatus = localStorage.getItem('duaVault_onboarding');
    setHasCompletedOnboarding(onboardingStatus === 'true');

    setIsAppHydrated(true);
  }, []);

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

    if (!isPremium && duas.length >= FREE_DUA_SAVE_LIMIT) {
      setPaywallEntryReason('dua_limit');
      setPaywallReturnView('library');
      setCurrentView('paywall');
      alert(`Free plan allows up to ${FREE_DUA_SAVE_LIMIT} saved duas. Upgrade to keep adding more.`);
      return;
    }

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
      if (!info) {
        setPaywallEntryReason('default');
        setCurrentView('paywall');
        return;
      }
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
      // Fallback to in-app paywall if Customer Center is unavailable/misconfigured.
      setPaywallEntryReason('default');
      setPaywallReturnView('settings');
      setCurrentView('paywall');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      // Ensure RevenueCat is attached to the current authenticated user before restore.
      if (user?.id) {
        await syncRevenueCatUser(user.id);
      }
      const info = await restoreRevenueCatPurchases();
      if (!info) {
        alert('Restore Purchases is only available on the mobile app.');
        return;
      }
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
      alert(premiumActive ? 'Purchases restored.' : 'No active purchases found to restore.');
    } catch (error) {
      console.error('Restore purchases failed:', error);
      alert('Could not restore purchases right now.');
    }
  };

  const handleManageSubscriptionFromSettings = async () => {
    if (!isPremium) {
      // Show the same in-app paywall with payment options (not the native RC one).
      setPaywallEntryReason('default');
      setPaywallReturnView('settings');
      setCurrentView('paywall');
      return;
    }
    await handleOpenCustomerCenter();
  };

  const handleOpenPaywallFromSettings = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        setPaywallEntryReason('default');
        setPaywallReturnView('settings');
        setCurrentView('paywall');
        return;
      }

      // Native path: always prefer RevenueCat paywall UI.
      await presentDuaVaultPaywall();

      const info = await getRevenueCatCustomerInfo();
      if (!info) return;

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
      console.error('Failed to open paywall:', error);
      setPaywallEntryReason('default');
      setPaywallReturnView('settings');
      setCurrentView('paywall');
    }
  };

  const handleDeleteAccount = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        const { error: duasError } = await supabase.from('duas').delete().eq('user_id', activeUserId);
        if (duasError) throw duasError;

        const { error: prefsError } = await supabase.from('user_preferences').delete().eq('user_id', activeUserId);
        if (prefsError && prefsError.code !== '42P01') throw prefsError;

        const { error: usageError } = await supabase.from('translation_usage').delete().eq('user_id', activeUserId);
        if (usageError && usageError.code !== '42P01') throw usageError;

        const { error: subscriptionsError } = await supabase.from('subscriptions').delete().eq('user_id', activeUserId);
        if (subscriptionsError && subscriptionsError.code !== '42P01') throw subscriptionsError;
      }

      setDuas([]);
      localStorage.removeItem('duaVault_duas');

      await handleSignOut();
      alert('Your data has been deleted.');
    } catch (error) {
      console.error('Failed to delete account data:', error);
      alert('Could not delete your data right now. Please try again.');
    }
  };

  const selectedDua = useMemo(() => duas.find(d => d.id === selectedDuaId), [duas, selectedDuaId]);
  const duaSaveUsageLabel = useMemo(() => {
    if (isPremium) return 'Unlimited saved duas (Dua Vault Pro)';
    return `Saved duas: ${duas.length}/${FREE_DUA_SAVE_LIMIT}`;
  }, [isPremium, duas.length]);

  if (!isAppHydrated || !isAuthReady || !isCloudDataReady) {
    return (
      <div className="h-dvh w-screen bg-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#d1d5db] border-t-[#006B3F] animate-spin" />
          <p className="text-sm text-[#4b5563] font-sans">Loading your dashboard...</p>
        </div>
      </div>
    );
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
          saveUsageLabel={duaSaveUsageLabel}
        />
      );
      case 'paywall': return (
        <PaywallView
          entryReason={paywallEntryReason}
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
          onBack={() => setCurrentView(paywallReturnView)}
          onRestorePurchases={() => { void handleRestorePurchases(); }}
        />
      );
      case 'settings': return <SettingsView user={user} isPremium={isPremium} onBack={() => setCurrentView('library')} onOpenPaywall={() => { void handleOpenPaywallFromSettings(); }} onOpenAuth={() => setCurrentView('auth')} onSignOut={handleSignOut} onOpenCustomerCenter={handleManageSubscriptionFromSettings} onRestorePurchases={handleRestorePurchases} onDeleteAccount={handleDeleteAccount} />;
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
              onClick={() => {
                if (!isPremium && duas.length >= FREE_DUA_SAVE_LIMIT) {
                  setPaywallEntryReason('dua_limit');
                  setPaywallReturnView('library');
                  setCurrentView('paywall');
                  return;
                }
                setCurrentView('add');
              }}
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
