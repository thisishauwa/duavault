import React, { useState, useEffect, useMemo } from "react";
import { View, Dua } from "./types";
import LibraryView from "./components/LibraryView";
import DuaDetailView from "./components/DuaDetailView";
import AddDuaView from "./components/AddDuaView";
import AuthView from "./components/AuthView";
import SettingsView from "./components/SettingsView";
import {
  supabase,
  signOut,
  ensureUserProfile,
  fetchUserDuas,
  createUserDua,
  updateUserDua,
  deleteUserDua,
  upsertUserDuas,
} from "./services/supabase";
import { Home2, Profile, AddCircle } from "iconsax-react";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>("auth");
  const [duas, setDuas] = useState<Dua[]>([]);
  const [selectedDuaId, setSelectedDuaId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<View>("library");
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAppHydrated, setIsAppHydrated] = useState(false);
  const [isCloudDataReady, setIsCloudDataReady] = useState(false);

  useEffect(() => {
    setIsAppHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setIsAuthReady(true);
      })
      .catch((err) => {
        console.error("Failed to get session:", err);
        if (!mounted) return;
        setIsAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

        const [duasResult] = await Promise.allSettled([fetchUserDuas(user.id)]);

        if (cancelled) return;

        const cloudDuas =
          duasResult.status === "fulfilled" ? duasResult.value : [];

        if (duasResult.status === "rejected") {
          console.error("Failed to fetch cloud duas:", duasResult.reason);
        }
        const localDuasRaw = localStorage.getItem("duaVault_duas");
        const localDuas = localDuasRaw
          ? (JSON.parse(localDuasRaw) as Dua[])
          : [];
        const migrationKey = `duaVault_migrated_${user.id}`;
        const alreadyMigrated = localStorage.getItem(migrationKey) === "true";

        let nextDuas = cloudDuas;

        if (
          !alreadyMigrated &&
          localDuas.length > 0 &&
          cloudDuas.length === 0
        ) {
          const migrated = await upsertUserDuas(
            user.id,
            localDuas.map((dua) => ({
              arabic: dua.arabic,
              translation: dua.translation,
              category: dua.category,
              source: dua.source,
              userId: user.id,
            })),
          );
          if (cancelled) return;
          localStorage.setItem(migrationKey, "true");
          nextDuas = migrated;
        }

        setDuas(nextDuas);

        // User account is now source of truth for app data/state.
        localStorage.removeItem("duaVault_duas");
      } catch (error) {
        console.error("Failed to load cloud data:", error);
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

    if (user) {
      if (currentView === "auth") {
        setCurrentView("library");
      }
      return;
    }

    if (currentView !== "auth") {
      setCurrentView("auth");
    }
  }, [isAppHydrated, isAuthReady, isCloudDataReady, user, currentView]);

  const addDua = async (
    newDua: Omit<Dua, "id" | "createdAt" | "isFavorite">,
  ) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
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
      setCurrentView("library");
    } catch (error) {
      console.error("Failed to add dua:", error);
      alert("Could not save to cloud right now. Please try again.");
    }
  };

  const updateDua = async (updatedDua: Dua) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        const saved = await updateUserDua(activeUserId, updatedDua);
        setDuas((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        return;
      }
      setDuas((prev) =>
        prev.map((d) => (d.id === updatedDua.id ? updatedDua : d)),
      );
    } catch (error) {
      console.error("Failed to update dua:", error);
      alert("Could not update in cloud right now. Please try again.");
    }
  };

  const deleteDua = async (id: string) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        await deleteUserDua(activeUserId, id);
      }
      setDuas((prev) => prev.filter((d) => d.id !== id));
      setCurrentView("library");
    } catch (error) {
      console.error("Failed to delete dua:", error);
      alert("Could not delete from cloud right now. Please try again.");
    }
  };

  const toggleFavorite = async (id: string) => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
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
      console.error("Failed to toggle favorite:", error);
      alert("Could not update favorite in cloud right now. Please try again.");
    }
  };

  const handleAuthenticated = () => {
    localStorage.removeItem("duaVault_duas");
    setCurrentView("library");
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView("auth");
  };

  const handleDeleteAccount = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    const activeUserId = user?.id ?? authUser?.id;

    try {
      if (activeUserId) {
        const { error: duasError } = await supabase
          .from("duas")
          .delete()
          .eq("user_id", activeUserId);
        if (duasError) throw duasError;

        const { error: prefsError } = await supabase
          .from("user_preferences")
          .delete()
          .eq("user_id", activeUserId);
        if (prefsError && prefsError.code !== "42P01") throw prefsError;

        const { error: usageError } = await supabase
          .from("translation_usage")
          .delete()
          .eq("user_id", activeUserId);
        if (usageError && usageError.code !== "42P01") throw usageError;

        const { error: subscriptionsError } = await supabase
          .from("subscriptions")
          .delete()
          .eq("user_id", activeUserId);
        if (subscriptionsError && subscriptionsError.code !== "42P01")
          throw subscriptionsError;
      }

      setDuas([]);
      localStorage.removeItem("duaVault_duas");

      await handleSignOut();
      alert("Your data has been deleted.");
    } catch (error) {
      console.error("Failed to delete account data:", error);
      alert("Could not delete your data right now. Please try again.");
    }
  };

  const selectedDua = useMemo(
    () => duas.find((d) => d.id === selectedDuaId),
    [duas, selectedDuaId],
  );

  if (!isAppHydrated || !isAuthReady || !isCloudDataReady) {
    return (
      <div className="min-h-dvh w-full bg-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#d1d5db] border-t-[#006B3F] animate-spin" />
          <p className="text-sm text-[#4b5563] font-sans">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case "auth":
        return <AuthView onAuthenticated={handleAuthenticated} />;
      case "library":
        return (
          <LibraryView
            duas={duas}
            onSelect={(id) => {
              setSelectedDuaId(id);
              setPreviousView("library");
              setCurrentView("detail");
            }}
            onToggleFavorite={(id) => {
              void toggleFavorite(id);
            }}
            onDelete={(id) => {
              void deleteDua(id);
            }}
          />
        );
      case "detail":
        return selectedDua ? (
          <DuaDetailView
            dua={selectedDua}
            onBack={() => setCurrentView(previousView)}
            onUpdate={(dua) => {
              void updateDua(dua);
            }}
            onDelete={(id) => {
              void deleteDua(id);
            }}
            onToggleFavorite={(id) => {
              void toggleFavorite(id);
            }}
          />
        ) : null;
      case "add":
        return (
          <AddDuaView
            onSave={(dua) => {
              void addDua(dua);
            }}
            onBack={() => setCurrentView("library")}
          />
        );
      case "settings":
        return (
          <SettingsView
            user={user}
            duas={duas}
            onBack={() => setCurrentView("library")}
            onOpenAuth={() => setCurrentView("auth")}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
            onSelectDua={(id) => {
              setSelectedDuaId(id);
              setPreviousView("settings");
              setCurrentView("detail");
            }}
            onToggleFavorite={(id) => {
              void toggleFavorite(id);
            }}
          />
        );
      default:
        return (
          <LibraryView
            duas={duas}
            onSelect={(id) => {
              setSelectedDuaId(id);
              setCurrentView("detail");
            }}
            onToggleFavorite={(id) => {
              void toggleFavorite(id);
            }}
            onDelete={(id) => {
              void deleteDua(id);
            }}
          />
        );
    }
  };

  const isFullScreen = ["auth", "add"].includes(currentView);

  return (
    <div className="min-h-dvh w-full bg-white flex flex-col relative text-gray-900">
      <main
        className={`flex-1 safe-top ${!isFullScreen ? "pb-28 lg:pb-10" : ""}`}
      >
        {renderContent()}
      </main>

      {!isFullScreen && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4 lg:bottom-8">
          <nav className="bg-[#1a1a1a] px-3 py-3 rounded-[28px] shadow-2xl flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setCurrentView("library")}
              className={`p-3 rounded-2xl transition-all active:scale-90 ${
                currentView === "library"
                  ? "bg-white/15"
                  : "opacity-40 hover:opacity-70"
              }`}
            >
              <Home2
                size={24}
                variant={currentView === "library" ? "Bold" : "Linear"}
                color="white"
              />
            </button>

            <button
              onClick={() => setCurrentView("add")}
              className="p-3 rounded-2xl bg-[#006B3F] hover:bg-emerald-700 active:scale-90 transition-all"
            >
              <AddCircle size={24} variant="Bold" color="white" />
            </button>

            <button
              onClick={() => setCurrentView("settings")}
              className={`p-3 rounded-2xl transition-all active:scale-90 ${
                currentView === "settings"
                  ? "bg-white/15"
                  : "opacity-40 hover:opacity-70"
              }`}
            >
              <Profile
                size={24}
                variant={currentView === "settings" ? "Bold" : "Linear"}
                color="white"
              />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
