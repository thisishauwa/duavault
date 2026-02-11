
import React, { useState, useMemo } from 'react';
import { Dua, Category } from '../types';
import { Search, Heart, Sparkles } from 'lucide-react';

interface LibraryViewProps {
  duas: Dua[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

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
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <header className="px-6 pt-12 pb-6 bg-white sticky top-0 z-40 flex flex-col gap-6 border-b border-[#f3f4f6]">
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
            className="w-full bg-[#f3f4f6] border border-transparent focus:bg-white focus:border-[#006B3F] rounded-lg py-3.5 pl-11 pr-4 transition-all outline-none text-base font-sans placeholder:text-[#9ca3af]"
          />
        </div>

        {/* Horizontal Filter Bar */}
        <div className="-mx-6 px-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {['All', ...Object.values(Category)].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-4 py-2 rounded-lg text-sm font-sans font-medium whitespace-nowrap transition-all duration-200 border ${
                  selectedCategory === cat 
                    ? 'bg-[#006B3F] text-white border-[#006B3F]' 
                    : 'bg-white text-[#666666] border-[#e0e0e0] hover:border-[#006B3F] hover:text-[#006B3F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* List / Grid */}
      <div className="px-6 py-6 pb-32 grid gap-4">
        {filteredDuas.length > 0 ? (
          filteredDuas.map((dua, idx) => (
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
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 bg-[#f3f4f6] rounded-full flex items-center justify-center">
              <Sparkles size={24} className="text-[#9ca3af]" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-header text-4xl text-[#1a1a1a]">Empty Vault</p>
              <p className="text-sm text-[#666666] font-sans">Add your first treasure to begin.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;
