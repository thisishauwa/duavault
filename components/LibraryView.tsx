
import React, { useState, useMemo } from 'react';
import { Dua, Category } from '../types';
import { Search, Heart, Sparkles, Filter } from 'lucide-react';

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
      <header className="px-6 pt-10 pb-6 bg-white sticky top-0 z-40">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Your Vault</h1>
            <p className="text-sm font-medium text-gray-400">{duas.length} reflections</p>
          </div>
          <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-emerald-600 transition-colors">
            <Filter size={20} />
          </button>
        </div>

        {/* Minimal Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search meaning or script..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-emerald-100 rounded-2xl py-4 pl-12 pr-4 transition-all outline-none text-sm font-medium placeholder:text-gray-400"
          />
        </div>
      </header>

      {/* Horizontal Filter Bar */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {['All', ...Object.values(Category)].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-5 py-2.5 rounded-2xl text-[13px] font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                  : 'bg-white text-gray-500 border-2 border-gray-100 hover:border-emerald-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List / Grid */}
      <div className="px-6 pb-24 grid gap-4">
        {filteredDuas.length > 0 ? (
          filteredDuas.map((dua, idx) => (
            <div 
              key={dua.id} 
              onClick={() => onSelect(dua.id)}
              className="animate-slide-up bg-white p-6 rounded-[2rem] dua-card cursor-pointer group relative overflow-hidden"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                  {dua.category}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(dua.id);
                  }}
                  className="p-1 active:scale-125 transition-transform"
                >
                  <Heart size={18} className={dua.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-200 group-hover:text-gray-300'} />
                </button>
              </div>

              <p className="font-arabic text-2xl mb-3 text-right leading-relaxed text-gray-900" dir="rtl">
                {dua.arabic.length > 70 ? dua.arabic.substring(0, 70) + '...' : dua.arabic}
              </p>
              
              <p className="text-gray-500 text-sm italic font-medium line-clamp-2">
                {dua.translation || 'No translation yet. Tap to add one later.'}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-900">Your vault is quiet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first treasure to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;
