
import React, { useState, useRef } from 'react';
import { Category, Dua } from '../types';
import { processDuaFromImage, processDuaFromText } from '../services/geminiService';
import { ArrowLeft, Camera, Type, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';

interface AddDuaViewProps {
  onSave: (dua: Omit<Dua, 'id' | 'createdAt' | 'isFavorite'>) => void;
  onBack: () => void;
  onRequestTranslation: () => Promise<boolean>;
  translationUsageLabel?: string | null;
}

const AddDuaView: React.FC<AddDuaViewProps> = ({
  onSave,
  onBack,
  onRequestTranslation,
  translationUsageLabel,
}) => {
  const [inputMode, setInputMode] = useState<'options' | 'manual'>('options');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [arabic, setArabic] = useState('');
  const [translation, setTranslation] = useState('');
  const [category, setCategory] = useState<Category>(Category.General);
  const [source, setSource] = useState<Dua['source']>('manual');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImageFile = async (file: File): Promise<string> => {
    const imageBitmap = await createImageBitmap(file);
    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
    const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing unavailable.');
    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.72);
    imageBitmap.close();
    return jpegDataUrl;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    try {
      const compressed = await compressImageFile(file);
      const result = await processDuaFromImage(compressed, false);
      setArabic(result.arabic);
      setTranslation('');
      setCategory(result.category as Category);
      setSource('screenshot');
      setInputMode('manual');
    } catch (err) {
      setError("Text illumination failed. Let's try typing it.");
      setInputMode('manual');
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
    } catch (err) {
      setError("AI is resting. Please add the meaning manually.");
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
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Processing Reflection...</h3>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-[240px]">
          Our AI is reading the script and crafting a faithful translation for you.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white z-30">
        <button onClick={onBack} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-extrabold text-gray-900">Add Reflection</h2>
        <div className="w-10" />
      </header>

      <div className="px-6 flex-1 flex flex-col pb-10">
        {translationUsageLabel && (
          <div className="mt-2 mb-2">
            <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 inline-block">
              {translationUsageLabel}
            </p>
          </div>
        )}

        {inputMode === 'options' ? (
          <div className="flex flex-col gap-4 mt-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-5 p-6 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-emerald-100 transition-all text-left"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Camera size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Upload Image</h4>
                <p className="text-gray-400 text-xs mt-0.5">AI reads text from gallery</p>
              </div>
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

            <button 
              onClick={() => setInputMode('manual')}
              className="flex items-center gap-5 p-6 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-emerald-100 transition-all text-left"
            >
              <div className="w-14 h-14 bg-gray-50 text-gray-500 rounded-2xl flex items-center justify-center">
                <Type size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Manual Entry</h4>
                <p className="text-gray-400 text-xs mt-0.5">Type text directly</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mt-6 animate-slide-up">
            {/* Arabic Input */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arabic Script</label>
                {arabic && <button onClick={() => setArabic('')} className="text-gray-300 hover:text-rose-500"><Trash2 size={16}/></button>}
              </div>
              <div className="bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-transparent focus-within:bg-white focus-within:border-emerald-100 transition-all">
                <textarea 
                  value={arabic}
                  onChange={(e) => setArabic(e.target.value)}
                  placeholder="أدخل النص هنا..."
                  dir="rtl"
                  className="w-full bg-transparent border-none p-6 font-arabic text-3xl leading-relaxed focus:ring-0 outline-none min-h-[180px] text-gray-900"
                />
              </div>
              {arabic && !translation && (
                <button 
                  onClick={handleGenerateAI}
                  className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-emerald-100"
                >
                  <Sparkles size={14} />
                  AI Illumination
                </button>
              )}
            </div>

            {/* Translation Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">English Meaning</label>
              <textarea 
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="What is the meaning of this reflection?"
                className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-100 rounded-[2rem] p-6 text-gray-700 font-medium italic leading-relaxed outline-none transition-all min-h-[120px] text-sm"
              />
            </div>

            {/* Category and Save */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Category</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-gray-700 font-bold text-sm appearance-none focus:bg-white focus:border-emerald-100 outline-none transition-all"
                >
                  {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <button 
                onClick={handleSubmit}
                className="w-full py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 mt-4"
              >
                <Save size={18} />
                Preserve Reflection
              </button>
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 p-4 rounded-2xl">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddDuaView;
