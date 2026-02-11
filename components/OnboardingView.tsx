
import React, { useState } from 'react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Capture every reflection",
    description: "Found a beautiful dua online? Simply upload a screenshot and let the vault preserve it."
  },
  {
    title: "AI Illumination",
    description: "Our AI extracts the script and provides poetic translations automatically."
  },
  {
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
    <div className="h-full w-full bg-white flex flex-col relative overflow-hidden text-[#1a1a1a]">
      {/* Progress Indicators - Top Left */}
      <div className="pt-8 px-8 flex justify-start gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentStep === i ? 'w-8 bg-[#006B3F]' : 'w-1.5 bg-[#e0e0e0]'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center px-8 gap-6 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-normal leading-[1.1] tracking-tight font-header">
            {steps[currentStep].title}
          </h1>
          <p className="text-lg text-[#666666] leading-relaxed font-sans max-w-xs">
            {steps[currentStep].description}
          </p>
        </div>
      </div>

      <div className="p-8 pb-12 w-full max-w-md mx-auto">
        <button
          onClick={next}
          className="w-full bg-[#006B3F] text-[#fcfbf9] py-4 rounded-lg font-sans font-medium text-base hover:bg-[#005a35] transition-all active:scale-[0.99]"
        >
          {currentStep === steps.length - 1 ? "Start your vault" : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
