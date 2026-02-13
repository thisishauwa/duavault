import React, { useState } from 'react';
import { ArrowLeft, LogOut, Shield, FileText, Trash2, Sparkles, ChevronRight, User as UserIcon, Crown, RefreshCw, Mail } from 'lucide-react';

interface SettingsViewProps {
  user: any;
  isPremium: boolean;
  onBack: () => void;
  onOpenPaywall: () => void;
  onOpenAuth: () => void;
  onSignOut: () => Promise<void>;
  onOpenCustomerCenter: () => Promise<void>;
  onRestorePurchases: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  isPremium,
  onBack,
  onOpenPaywall,
  onOpenAuth,
  onSignOut,
  onOpenCustomerCenter,
  onRestorePurchases,
  onDeleteAccount,
}) => {
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await onSignOut();
    }
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      await onOpenCustomerCenter();
    } finally {
      setIsManagingSubscription(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoringPurchases(true);
    try {
      await onRestorePurchases();
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('This will remove your saved duas and sign you out. Continue?')) return;
    setIsDeletingAccount(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    sublabel, 
    onClick, 
    textColor = "text-[#1a1a1a]",
    iconColor = "text-[#1a1a1a]",
    showArrow = true
  }: { 
    icon: any, 
    label: string, 
    sublabel?: string, 
    onClick?: () => void,
    textColor?: string,
    iconColor?: string,
    showArrow?: boolean
  }) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 group hover:bg-[#f9fafb] -mx-4 px-4 transition-colors rounded-lg"
    >
      <div className="flex items-center gap-4">
        <Icon size={20} className={iconColor} strokeWidth={1.5} />
        <div className="text-left">
          <p className={`font-sans text-base ${textColor}`}>{label}</p>
          {sublabel && <p className="text-xs text-[#666666] mt-0.5 font-sans">{sublabel}</p>}
        </div>
      </div>
      {showArrow && <ChevronRight size={16} className="text-[#d1d5db] group-hover:text-[#9ca3af] transition-colors" />}
    </button>
  );

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 pt-4 pb-6 bg-white sticky top-0 z-30 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="px-6 flex-1 flex flex-col pb-10 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-4xl font-header text-[#1a1a1a]">Profile</h1>
          <p className="text-[#666666] font-sans text-base">Manage your account and preferences.</p>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 mb-10 p-4 bg-[#f9fafb] rounded-xl">
          <div className="w-12 h-12 bg-[#e5e7eb] rounded-full flex items-center justify-center text-[#666666] shrink-0">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserIcon size={24} />
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-sans font-medium text-lg text-[#1a1a1a] truncate">
              {user?.email || 'Guest Explorer'}
            </h3>
            <p className="text-sm text-[#666666] font-sans">
              {isPremium ? 'Premium Vault Member' : 'Free Tier'}
            </p>
          </div>
        </div>

        {/* Upgrade Banner (if free) */}
        {!isPremium && (
          <div className="mb-10">
            <button 
              onClick={onOpenPaywall}
              className="w-full bg-[#1a1a1a] text-white p-6 rounded-xl text-left hover:bg-black transition-colors group relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-[#4ade80]">
                  <Sparkles size={16} fill="currentColor" />
                  <span className="text-xs font-bold uppercase tracking-wider">Premium</span>
                </div>
                <h3 className="font-header text-2xl mb-1">Upgrade your vault</h3>
                <p className="text-gray-400 font-sans text-sm">Unlock unlimited storage & AI features.</p>
              </div>
            </button>
          </div>
        )}

        {/* Menu Sections */}
        <div className="space-y-8">
          {/* Account Section */}
          <div>
            <h4 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2 px-1">Account</h4>
            <div className="flex flex-col">
              {user ? (
                <>
                  <MenuItem
                    icon={Crown}
                    label={isManagingSubscription ? 'Opening subscription...' : 'Manage Subscription'}
                    onClick={() => { void handleManageSubscription(); }}
                  />
                  <MenuItem 
                    icon={RefreshCw} 
                    label={isRestoringPurchases ? 'Restoring purchases...' : 'Restore Purchases'} 
                    onClick={() => { void handleRestore(); }} 
                  />
                  <MenuItem 
                    icon={LogOut} 
                    label="Sign Out" 
                    onClick={handleLogout}
                    textColor="text-[#666666] hover:text-[#1a1a1a]"
                  />
                </>
              ) : (
                <MenuItem 
                  icon={Sparkles} 
                  label="Sign In to Sync" 
                  sublabel="Save your duas to the cloud"
                  onClick={onOpenAuth}
                  iconColor="text-[#006B3F]"
                />
              )}
            </div>
          </div>

          {/* Support Section */}
          <div>
            <h4 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2 px-1">Support</h4>
            <div className="flex flex-col">
              <MenuItem 
                icon={Shield} 
                label="Privacy Policy" 
                onClick={() => openExternal('https://duavault.app/privacy')}
                showArrow={true}
              />
              <MenuItem 
                icon={FileText} 
                label="Terms of Service" 
                onClick={() => openExternal('https://duavault.app/terms')}
                showArrow={true}
              />
              <MenuItem 
                icon={Mail} 
                label="Contact Support" 
                onClick={() => {
                  window.location.href = 'mailto:support@duavault.app?subject=DuaVault%20Support';
                }}
                showArrow={true}
              />
            </div>
          </div>

          {/* Danger Zone */}
          {user && (
            <div>
              <div className="flex flex-col border-t border-[#f3f4f6] pt-2">
                <MenuItem 
                  icon={Trash2} 
                  label={isDeletingAccount ? 'Deleting account data...' : 'Delete Account'} 
                  onClick={() => { void handleDelete(); }}
                  textColor="text-rose-600"
                  iconColor="text-rose-600"
                  showArrow={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-[#d1d5db] uppercase tracking-widest font-bold">DuaVault v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
