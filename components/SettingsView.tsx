import React, { useState, useEffect } from "react";
import { Dua } from "../types";
import {
  ArrowLeft,
  ArrowRight2,
  Logout,
  Shield,
  DocumentText,
  Trash,
  Sms,
  Profile,
  Heart,
} from "iconsax-react";
import { User as LucideUser } from "lucide-react";

interface SettingsViewProps {
  user: any;
  duas: Dua[];
  onBack: () => void;
  onOpenAuth: () => void;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSelectDua: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  duas,
  onBack,
  onOpenAuth,
  onSignOut,
  onDeleteAccount,
  onSelectDua,
}) => {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const favoriteDuas = duas.filter((d) => d.isFavorite);

  useEffect(() => {
    if (!showFavorites) return;
    window.history.pushState({ favourites: true }, "");
    const handlePop = () => setShowFavorites(false);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [showFavorites]);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await onSignOut();
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "This will remove your saved duas and sign you out. Continue?",
      )
    )
      return;
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const MenuItem = ({
    iconNode,
    label,
    sublabel,
    onClick,
    textColor = "#1a1a1a",
    danger = false,
    showArrow = true,
  }: {
    iconNode: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    textColor?: string;
    danger?: boolean;
    showArrow?: boolean;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 group hover:bg-[#f9fafb] -mx-4 px-4 transition-colors rounded-lg"
    >
      <div className="flex items-center gap-4">
        {iconNode}
        <div className="text-left">
          <p
            className={`font-sans text-base ${danger ? "text-rose-600" : "text-[#1a1a1a]"}`}
            style={!danger ? { color: textColor } : undefined}
          >
            {label}
          </p>
          {sublabel && (
            <p className="text-xs text-[#9ca3af] mt-0.5 font-sans">
              {sublabel}
            </p>
          )}
        </div>
      </div>
      {showArrow && <ArrowRight2 size={16} color="#d1d5db" variant="Linear" />}
    </button>
  );

  /* ── Favourites sub-view ─────────────────────────────── */
  if (showFavorites) {
    return (
      <div className="min-h-dvh bg-white flex flex-col">
        <header className="px-6 pt-4 pb-6 bg-white sticky top-0 z-30">
          <div className="max-w-3xl mx-auto w-full">
            <button
              onClick={() => setShowFavorites(false)}
              className="p-2 -ml-2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors"
            >
              <ArrowLeft size={24} variant="Linear" color="currentColor" />
            </button>
          </div>
        </header>
        <div className="px-6 flex-1 max-w-3xl mx-auto w-full pb-32">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-4xl font-header text-[#1a1a1a]">Favourites</h1>
            <p className="text-[#666666] font-sans text-base">
              {favoriteDuas.length} duas saved
            </p>
          </div>

          {favoriteDuas.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
              <span className="text-5xl">🤩</span>
              <div>
                <p className="font-header text-2xl text-[#1a1a1a]">
                  No favourites yet
                </p>
                <p className="text-sm text-[#9ca3af] font-sans mt-1">
                  Tap the heart on any dua to save it here.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#f3f4f6]">
              {favoriteDuas.map((dua) => (
                <button
                  key={dua.id}
                  onClick={() => onSelectDua(dua.id)}
                  className="w-full text-left py-4 flex flex-col gap-1.5 hover:bg-[#f9fafb] -mx-6 px-6 transition-colors"
                >
                  <p
                    className="font-arabic text-lg leading-relaxed text-right text-[#1a1a1a]"
                    dir="rtl"
                  >
                    {dua.arabic.length > 70
                      ? dua.arabic.substring(0, 70) + "..."
                      : dua.arabic}
                  </p>
                  <p className="text-sm text-[#9ca3af] font-sans line-clamp-1">
                    {dua.translation || "No translation"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Main profile view ───────────────────────────────── */
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="px-6 pt-4 pb-6 bg-white sticky top-0 z-30">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors"
          >
            <ArrowLeft size={24} variant="Linear" color="currentColor" />
          </button>
          <div className="w-8" />
        </div>
      </header>

      <div className="px-6 flex-1 flex flex-col pb-10 max-w-3xl mx-auto w-full">
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-4xl font-header text-[#1a1a1a]">Profile</h1>
          <p className="text-[#666666] font-sans text-base">
            Manage your account and preferences.
          </p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 mb-10 p-4 bg-[#f9fafb] rounded-xl">
          <div className="w-12 h-12 bg-[#e5e7eb] rounded-full flex items-center justify-center text-[#666666] shrink-0">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <LucideUser size={24} />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-sans font-medium text-lg text-[#1a1a1a] truncate">
              {user?.email || "Guest Explorer"}
            </h3>
            <p className="text-sm text-[#666666] font-sans">
              {user ? "Signed in" : "Guest session"}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Library section */}
          <div>
            <h4 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2 px-1">
              Library
            </h4>
            <div className="flex flex-col">
              <MenuItem
                iconNode={<Heart size={20} variant="Linear" color="#e11d48" />}
                label="Favourite Duas"
                sublabel={`${favoriteDuas.length} saved`}
                onClick={() => setShowFavorites(true)}
              />
            </div>
          </div>

          {/* Account section */}
          <div>
            <h4 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2 px-1">
              Account
            </h4>
            <div className="flex flex-col">
              {user ? (
                <MenuItem
                  iconNode={
                    <Logout size={20} variant="Linear" color="#666666" />
                  }
                  label="Sign Out"
                  onClick={() => {
                    void handleLogout();
                  }}
                  textColor="#666666"
                  showArrow={false}
                />
              ) : (
                <MenuItem
                  iconNode={
                    <Profile size={20} variant="Linear" color="#006B3F" />
                  }
                  label="Sign In to Sync"
                  sublabel="Save your duas to the cloud"
                  onClick={onOpenAuth}
                />
              )}
            </div>
          </div>

          {/* Support section */}
          <div>
            <h4 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2 px-1">
              Support
            </h4>
            <div className="flex flex-col">
              <MenuItem
                iconNode={<Shield size={20} variant="Linear" color="#1a1a1a" />}
                label="Privacy Policy"
                onClick={() => openExternal("https://duavault.app/privacy")}
              />
              <MenuItem
                iconNode={
                  <DocumentText size={20} variant="Linear" color="#1a1a1a" />
                }
                label="Terms of Service"
                onClick={() => openExternal("https://duavault.app/terms")}
              />
              <MenuItem
                iconNode={<Sms size={20} variant="Linear" color="#1a1a1a" />}
                label="Contact Support"
                onClick={() => {
                  window.location.href =
                    "mailto:support@duavault.app?subject=DuaVault%20Support";
                }}
              />
            </div>
          </div>

          {/* Danger zone */}
          {user && (
            <div className="border-t border-[#f3f4f6] pt-2">
              <MenuItem
                iconNode={<Trash size={20} variant="Linear" color="#e11d48" />}
                label={
                  isDeletingAccount
                    ? "Deleting account data..."
                    : "Delete Account"
                }
                onClick={() => {
                  void handleDelete();
                }}
                danger={true}
                showArrow={false}
              />
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[10px] text-[#d1d5db] uppercase tracking-widest font-bold">
            DuaVault v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
