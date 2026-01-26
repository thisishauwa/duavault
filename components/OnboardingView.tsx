
import React, { useState } from 'react';
import { Camera, Languages, Bookmark, ChevronRight } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: <Camera size={40} strokeWidth={2.5} className="text-emerald-600" />,
    title: "Capture every reflection",
    description: "Found a beautiful dua online? Simply upload a screenshot and let the vault preserve it."
  },
  {
    icon: <Languages size={40} strokeWidth={2.5} className="text-emerald-600" />,
    title: "AI Illumination",
    description: "Our AI extracts the script and provides poetic translations automatically."
  },
  {
    icon: <Bookmark size={40} strokeWidth={2.5} className="text-emerald-600" />,
    title: "Your spiritual library",
    description: "Organize by category and search through your collections whenever you need focus."
  }
];

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col p-8 relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-10">
        <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center animate-in zoom-in duration-500">
          {steps[currentStep].icon}
        </div>
        
        <div className="flex flex-col gap-3 px-4">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {steps[currentStep].title}
          </h1>
          <p className="text-gray-400 font-medium leading-relaxed max-w-xs mx-auto text-sm">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      <div className="py-10 flex flex-col items-center gap-10">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${currentStep === i ? 'w-10 bg-emerald-600' : 'w-2 bg-gray-100'}`}
            />
          ))}
        </div>

        <button 
          onClick={next}
          className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-98"
        >
          {currentStep === steps.length - 1 ? "Start your vault" : "Next"}
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
