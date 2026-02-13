
import React from 'react';
import { ArrowLeft, Check, Sparkles, Star } from 'lucide-react';

type PackageOption = {
  id: 'monthly' | 'yearly' | 'lifetime';
  title: string;
  subtitle: string;
};
type PaywallEntryReason = 'default' | 'dua_limit' | 'translation_limit';

interface PaywallViewProps {
  entryReason?: PaywallEntryReason;
  selectedPackageId: 'monthly' | 'yearly' | 'lifetime';
  packageOptions: PackageOption[];
  isPurchasing: boolean;
  onSelectPackage: (id: 'monthly' | 'yearly' | 'lifetime') => void;
  onUpgrade: (id: 'monthly' | 'yearly' | 'lifetime') => void;
  onBack: () => void;
}

const PaywallView: React.FC<PaywallViewProps> = ({
  entryReason = 'default',
  selectedPackageId,
  packageOptions,
  isPurchasing,
  onSelectPackage,
  onUpgrade,
  onBack,
}) => {
  const paywallCopy =
    entryReason === 'dua_limit'
      ? {
          title: 'You reached your free 10 duas',
          subtitle: 'Upgrade to keep saving every reflection without limits.',
        }
      : entryReason === 'translation_limit'
        ? {
            title: 'You reached this month\'s free translations',
            subtitle: 'Upgrade for unlimited translations anytime you need them.',
          }
        : {
            title: 'Elevate Your Reflection',
            subtitle: 'Preserve every spiritual treasure with DuaVault Premium.',
          };

  return (
    <div className="min-h-screen bg-[#063026] text-white p-8 flex flex-col relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-full h-full opacity-20">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-emerald-900 rounded-full blur-[120px]" />
      </div>
      
      <header className="relative flex justify-between items-center mb-10 z-10">
        <button onClick={onBack} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <Star className="text-yellow-500 fill-yellow-500" size={24} />
      </header>

      <div className="relative flex-1 flex flex-col items-center text-center gap-4 z-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-400 to-emerald-600 p-5 rounded-[2rem] shadow-2xl shadow-emerald-400/20 mb-6 flex items-center justify-center">
          <Sparkles size={40} className="text-white" />
        </div>
        <h2 className="text-4xl font-black tracking-tight leading-none">{paywallCopy.title}</h2>
        <p className="text-emerald-200/60 text-sm mt-2 max-w-[320px]">{paywallCopy.subtitle}</p>

        <div className="mt-12 w-full grid gap-5">
          {[
            "Infinite Vault Storage",
            "Advanced OCR Reflection",
            "Golden AI Transcriptions",
            "Multilingual Translations",
            "Ad-Free Spiritual Space"
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="p-1 bg-emerald-500 rounded-full">
                <Check size={14} className="text-[#063026]" />
              </div>
              <span className="text-emerald-50 font-bold text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative py-10 flex flex-col gap-4 z-10">
        <div className="w-full grid gap-3">
          {packageOptions.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => onSelectPackage(pkg.id)}
              className={`w-full p-4 rounded-2xl border text-left transition-all ${
                selectedPackageId === pkg.id
                  ? 'bg-white/15 border-emerald-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="font-bold text-base">{pkg.title}</p>
              <p className="text-xs text-emerald-100/80 mt-1">{pkg.subtitle}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => onUpgrade(selectedPackageId)}
          disabled={isPurchasing}
          className="w-full bg-emerald-400 text-[#063026] py-6 rounded-3xl font-black text-lg shadow-2xl shadow-emerald-400/20 active:scale-[0.98] transition-all hover:bg-emerald-300"
        >
          {isPurchasing ? 'Processing...' : 'Continue'}
        </button>
        <p className="text-[10px] text-emerald-400/40 text-center uppercase tracking-[0.3em] font-black">
          Manage any plan from Profile -&gt; Manage Subscription
        </p>
      </div>
    </div>
  );
};

export default PaywallView;
