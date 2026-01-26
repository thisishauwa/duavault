
import React from 'react';
import { ArrowLeft, Check, Sparkles, Star } from 'lucide-react';

interface PaywallViewProps {
  onUpgrade: () => void;
  onBack: () => void;
}

const PaywallView: React.FC<PaywallViewProps> = ({ onUpgrade, onBack }) => {
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
        <h2 className="text-4xl font-black tracking-tight leading-none">Elevate Your Reflection</h2>
        <p className="text-emerald-200/60 text-sm mt-2 max-w-[280px]">Preserve every spiritual treasure with DuaVault Premium.</p>

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
        <button 
          onClick={onUpgrade}
          className="w-full bg-emerald-400 text-[#063026] py-6 rounded-3xl font-black text-lg shadow-2xl shadow-emerald-400/20 active:scale-[0.98] transition-all hover:bg-emerald-300"
        >
          $14.99 / Lifetime Access
        </button>
        <p className="text-[10px] text-emerald-400/40 text-center uppercase tracking-[0.3em] font-black">
          Ramadan Special • One-time Purchase
        </p>
      </div>
    </div>
  );
};

export default PaywallView;
