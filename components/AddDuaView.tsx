
import React, { useEffect, useState, useRef } from 'react';
import { Category, Dua } from '../types';
import { cleanupArabicOcrText, processDuaFromText } from '../services/geminiService';
import { extractArabicFromImage } from '../services/ocrService';
import { ArrowLeft, Camera, Type, Loader2, Sparkles, Trash2 } from 'lucide-react';

interface AddDuaViewProps {
  onSave: (dua: Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>) => void;
  onBack: () => void;
  onRequestTranslation: () => Promise<boolean>;
  onTranslationSuccess: () => Promise<void>;
  translationUsageLabel?: string | null;
}

const AddDuaView: React.FC<AddDuaViewProps> = ({
  onSave,
  onBack,
  onRequestTranslation,
  onTranslationSuccess,
  translationUsageLabel,
}) => {
  const [inputMode, setInputMode] = useState<'options' | 'manual'>('options');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [arabic, setArabic] = useState('');
  const [translation, setTranslation] = useState('');
  const [category, setCategory] = useState<Category>(Category.General);
  const [source, setSource] = useState<Dua['source']>('manual');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fileToDataUrl = async (file: File): Promise<string> => {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Could not read image.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const original = await fileToDataUrl(file);
      const extracted = await extractArabicFromImage(original);
      let finalizedArabic = extracted.arabic;
      try {
        const corrected = await cleanupArabicOcrText(extracted.arabic);
        if (corrected && corrected.length >= 6) {
          finalizedArabic = corrected;
        }
      } catch {
        // Keep raw OCR if cleanup request is unavailable/rate-limited.
      }

      setArabic(finalizedArabic);
      setTranslation('');
      setCategory(Category.General);
      setSource('screenshot');
      setInputMode('manual');
    } catch (err) {
      setError(null);
      setInputMode('options');
      showToast('Upload a clearer image to extract text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!arabic) return;
    const canTranslate = await onRequestTranslation();
    if (!canTranslate) {
      setError('You have reached your free monthly translation limit.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await processDuaFromText(arabic);
      setTranslation(result.translation);
      setCategory(result.category as Category);
      await onTranslationSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('429') || message.toLowerCase().includes('too many requests')) {
        setError('Translation service is busy right now. Please wait a moment and try again.');
      } else {
        setError('Could not translate right now. Please add the meaning manually.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (!arabic) {
      setError("Arabic script is required.");
      return;
    }
    onSave({ arabic, translation, category, source });
  };

  if (isProcessing) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-[#f9fafb] rounded-full flex items-center justify-center mb-6">
          <Loader2 className="animate-spin text-[#006B3F]" size={28} />
        </div>
        <h3 className="text-3xl font-header text-[#1a1a1a]">Processing...</h3>
        <p className="text-[#666666] mt-2 text-sm font-sans leading-relaxed max-w-[240px]">
          We are reading the script and preparing it for your vault.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-4">
          <div className="bg-[#1a1a1a] text-white text-sm font-sans px-4 py-2 rounded-lg">
            {toastMessage}
          </div>
        </div>
      )}

      <header className="px-6 pt-12 pb-6 bg-white sticky top-0 z-30 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-[#9ca3af] hover:text-[#1a1a1a] transition-colors">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="px-6 flex-1 flex flex-col pb-10 max-w-md mx-auto w-full">
        <div className="flex flex-col gap-2 mb-8">
          <h2 className="text-4xl font-header text-[#1a1a1a]">Add reflection</h2>
          <p className="text-[#666666] font-sans text-base">Capture a new treasure for your vault.</p>
        </div>

        {translationUsageLabel && (
          <div className="mb-6">
            <p className="text-[12px] font-medium text-[#006B3F] bg-[#e6f0eb] rounded-lg px-3 py-2 inline-block font-sans">
              {translationUsageLabel}
            </p>
          </div>
        )}

        {inputMode === 'options' ? (
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-5 p-6 bg-[#f9fafb] rounded-xl hover:bg-[#f3f4f6] transition-all text-left group"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] shadow-sm group-hover:scale-105 transition-transform">
                <Camera size={20} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-sans font-medium text-lg text-[#1a1a1a]">Upload Image</h4>
                <p className="text-[#666666] text-sm font-sans">AI reads text from gallery</p>
              </div>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

            <button 
              onClick={() => setInputMode('manual')}
              className="flex items-center gap-5 p-6 bg-[#f9fafb] rounded-xl hover:bg-[#f3f4f6] transition-all text-left group"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1a1a1a] shadow-sm group-hover:scale-105 transition-transform">
                <Type size={20} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-sans font-medium text-lg text-[#1a1a1a]">Manual Entry</h4>
                <p className="text-[#666666] text-sm font-sans">Type text directly</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            {/* Main Content Area - Scrollable */}
            <div className="flex-1 flex flex-col gap-8">
              
              {/* Arabic Input - The Hero */}
              <div className="relative group">
                <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  {arabic && (
                    <button 
                      onClick={() => setArabic('')} 
                      className="text-[#d1d5db] hover:text-rose-500 transition-colors p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
                
                <textarea 
                  value={arabic}
                  onChange={(e) => setArabic(e.target.value)}
                  placeholder="Paste or type Arabic script..."
                  dir="rtl"
                  className="w-full bg-transparent border-none p-0 font-arabic text-4xl leading-[1.8] text-[#1a1a1a] placeholder:text-[#d1d5db] focus:ring-0 outline-none resize-none min-h-[120px] pt-2"
                />
                
                {arabic && !translation && (
                  <button 
                    onClick={handleGenerateAI}
                    className="mt-4 flex items-center gap-2 text-[#006B3F] font-medium text-sm hover:text-[#005a35] transition-colors"
                  >
                    <Sparkles size={16} />
                    <span>Get translation</span>
                  </button>
                )}
              </div>

              {/* Translation - The Support */}
              <div className="border-t border-[#f3f4f6] pt-8">
                <textarea 
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="Write the translation here..."
                  className="w-full bg-transparent border-none p-0 font-sans text-xl leading-relaxed text-[#666666] placeholder:text-[#d1d5db] focus:ring-0 outline-none resize-none min-h-[100px]"
                />
              </div>

              {/* Category - Minimal Select */}
              <div className="border-t border-[#f3f4f6] pt-8 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af] font-sans text-sm">Category</span>
                  <div className="relative">
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="appearance-none bg-transparent font-sans text-[#1a1a1a] font-medium text-base pr-8 outline-none cursor-pointer text-right"
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#1a1a1a]">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Action */}
            <div className="pt-4 pb-8 bg-white/95 backdrop-blur-sm sticky bottom-0">
              <button 
                onClick={handleSubmit}
                className="w-full py-4 bg-[#006B3F] text-white font-medium rounded-lg hover:bg-[#005a35] transition-all active:scale-[0.99] flex items-center justify-center gap-2 font-sans text-base"
              >
                Add Dua
              </button>
              
              {error && <p className="mt-4 text-rose-600 text-sm text-center font-medium">{error}</p>}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default AddDuaView;
