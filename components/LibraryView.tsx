
import React, { useState, useMemo } from 'react';
import { Dua, Category } from '../types';
import { Search, Heart } from 'lucide-react';

interface LibraryViewProps {
  duas: Dua[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const CATEGORY_TABS: Array<{ value: Category | 'All'; label: string; emoji: string }> = [
  { value: 'All', label: 'All', emoji: '✨' },
  { value: Category.MorningEvening, label: 'Morning/Evening', emoji: '☀️' },
  { value: Category.Travel, label: 'Travel', emoji: '✈️' },
  { value: Category.Food, label: 'Food', emoji: '🍔' },
  { value: Category.Sleep, label: 'Sleep', emoji: '🌙' },
  { value: Category.Protection, label: 'Protection', emoji: '🛡️' },
  { value: Category.Gratitude, label: 'Gratitude', emoji: '🤲' },
  { value: Category.General, label: 'General', emoji: '📿' },
  { value: Category.Other, label: 'Other', emoji: '💫' },
];

const LibraryView: React.FC<LibraryViewProps> = ({ duas, onSelect, onToggleFavorite }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  const filteredDuas = useMemo(() => {
    return duas.filter(d => {
      const matchesSearch = d.arabic.toLowerCase().includes(search.toLowerCase()) || 
                            d.translation.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [duas, search, selectedCategory]);

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header Section */}
      <header className="px-6 pt-12 pb-0 bg-white sticky top-0 z-40 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-normal leading-[1.1] tracking-tight font-header text-[#1a1a1a]">Salam, friend</h1>
          <p className="text-base text-[#666666] font-sans">{duas.length} duas saved</p>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#006B3F] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search meaning or script..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f9fafb] border border-transparent focus:bg-white focus:border-[#006B3F] rounded-lg py-3.5 pl-11 pr-4 transition-all outline-none text-base font-sans placeholder:text-[#9ca3af]"
          />
        </div>

        {/* Horizontal Filter Bar */}
        <div className="-mx-6 px-6 border-b border-[#e5e7eb]">
          <div className="flex gap-8 overflow-x-auto no-scrollbar pt-2">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.value;
              return (
              <button
                key={tab.value}
                onClick={() => setSelectedCategory(tab.value)}
                className={`shrink-0 flex flex-col items-center gap-2 pb-3 border-b-2 transition-all min-w-[60px] ${
                  isActive
                    ? 'border-[#1a1a1a] text-[#1a1a1a] opacity-100'
                    : 'border-transparent text-[#9ca3af] hover:text-[#666666] opacity-60 hover:opacity-100 hover:border-[#e5e7eb]'
                }`}
              >
                <span className="text-[24px] leading-normal transform transition-transform group-active:scale-95 py-1">
                  {tab.emoji}
                </span>
                <span className="text-[12px] font-sans font-medium whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* List / Grid */}
      {filteredDuas.length > 0 ? (
        <div className="px-6 py-6 pb-32 grid gap-4">
          {filteredDuas.map((dua, idx) => (
            <div 
              key={dua.id} 
              onClick={() => onSelect(dua.id)}
              className="animate-in fade-in slide-in-from-bottom-2 duration-500 bg-[#f9f9f9] p-5 rounded-xl cursor-pointer group relative transition-colors hover:bg-[#f0f0f0]"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs uppercase font-bold tracking-wider text-[#666666] bg-[#eaeaea] px-2 py-1 rounded-md font-sans">
                  {dua.category}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(dua.id);
                  }}
                  className="p-1 active:scale-125 transition-transform"
                >
                  <Heart size={20} className={dua.isFavorite ? 'fill-[#e11d48] text-[#e11d48]' : 'text-[#d1d5db] group-hover:text-[#9ca3af]'} strokeWidth={2} />
                </button>
              </div>

              <p className="font-arabic text-2xl mb-4 text-right leading-loose text-[#1a1a1a]" dir="rtl">
                {dua.arabic.length > 80 ? dua.arabic.substring(0, 80) + '...' : dua.arabic}
              </p>
              
              <p className="text-[#666666] text-sm leading-relaxed font-sans line-clamp-2">
                {dua.translation || 'No translation available.'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-32">
          <div className="flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-500">
            <span className="text-5xl mb-1">🌱</span>
            <div className="flex flex-col gap-1">
              <p className="font-header text-[32px] leading-tight text-[#1a1a1a]">Nothing to see here...</p>
              <p className="text-sm text-[#666666] font-sans">Add your first dua to begin.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
