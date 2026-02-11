
import React, { useState } from 'react';
import { Dua, Category } from '../types';
import { ArrowLeft, Share2, Heart, Edit3, Trash2, Check } from 'lucide-react';

interface DuaDetailViewProps {
  dua: Dua;
  onBack: () => void;
  onUpdate: (dua: Dua) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const DuaDetailView: React.FC<DuaDetailViewProps> = ({ dua, onBack, onUpdate, onDelete, onToggleFavorite }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedArabic, setEditedArabic] = useState(dua.arabic);
  const [editedTranslation, setEditedTranslation] = useState(dua.translation);
  const [editedCategory, setEditedCategory] = useState(dua.category);

  const handleSave = () => {
    onUpdate({ ...dua, arabic: editedArabic, translation: editedTranslation, category: editedCategory });
    setIsEditing(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dua from DuaVault',
          text: `${dua.arabic}\n\n"${dua.translation}"`,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <button onClick={onBack} className="p-3 bg-gray-50 rounded-2xl text-gray-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <button onClick={() => onToggleFavorite(dua.id)} className="p-3 bg-gray-50 rounded-2xl active:scale-90 transition-all">
            <Heart size={20} className={dua.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-300'} />
          </button>
          <button onClick={handleNativeShare} className="p-3 bg-gray-50 rounded-2xl text-gray-300 active:scale-90 transition-all">
            <Share2 size={20} />
          </button>
        </div>
      </header>

      <div className="px-8 pt-4 pb-20 flex flex-col flex-1 animate-slide-up">
        <div className="mb-10 text-center">
          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
            {dua.category}
          </span>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-emerald-100">
              <textarea 
                value={editedArabic}
                onChange={(e) => setEditedArabic(e.target.value)}
                dir="rtl"
                className="w-full bg-transparent p-8 font-arabic text-3xl leading-relaxed outline-none border-none text-gray-900 h-64"
              />
            </div>
            <textarea 
              value={editedTranslation}
              onChange={(e) => setEditedTranslation(e.target.value)}
              className="w-full bg-gray-50 rounded-[2rem] p-6 text-gray-700 italic font-medium leading-relaxed outline-none h-40"
            />
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-400 text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                <Check size={18}/> Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            <div className="flex flex-col items-center">
              <p className="font-arabic text-4xl leading-loose text-center text-gray-900 selection:bg-emerald-50 max-w-sm mx-auto" dir="rtl">
                {dua.arabic}
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="w-12 h-1 bg-gray-50 mx-auto rounded-full" />
              <p className="text-gray-600 text-xl leading-relaxed italic font-medium text-center px-4">
                {dua.translation ? `“${dua.translation}”` : 'No translation yet. Use AI Illumination to generate one.'}
              </p>
            </div>

            <div className="mt-12 flex flex-col gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-98"
              >
                <Edit3 size={18} />
                Edit reflection
              </button>
              <button 
                onClick={() => window.confirm('Permanently remove from vault?') && onDelete(dua.id)}
                className="w-full py-4 bg-white border-2 border-rose-50 text-rose-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 hover:text-rose-400 transition-all"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuaDetailView;
