import React, { useState, useMemo, useRef, useCallback } from "react";
import { Dua, Category } from "../types";
import { Search, Heart, Copy, Check, Trash2 } from "lucide-react";

interface LibraryViewProps {
  duas: Dua[];
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_TABS: Array<{
  value: Category | "All";
  label: string;
  emoji: string;
}> = [
  { value: "All", label: "All", emoji: "✨" },
  { value: Category.MorningEvening, label: "Morning/Evening", emoji: "☀️" },
  { value: Category.Travel, label: "Travel", emoji: "✈️" },
  { value: Category.Food, label: "Food", emoji: "🍔" },
  { value: Category.Sleep, label: "Sleep", emoji: "🌙" },
  { value: Category.Protection, label: "Protection", emoji: "💪🏼" },
  { value: Category.Gratitude, label: "Gratitude", emoji: "🤲" },
  { value: Category.General, label: "General", emoji: "📿" },
  { value: Category.Other, label: "Other", emoji: "💫" },
];

const LibraryView: React.FC<LibraryViewProps> = ({
  duas,
  onSelect,
  onToggleFavorite,
  onDelete,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">(
    "All",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [heartPopId, setHeartPopId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredDuas = useMemo(() => {
    const q = search.toLowerCase().trim();
    return duas.filter((d) => {
      const matchesSearch =
        !q ||
        (d.arabic || "").toLowerCase().includes(q) ||
        (d.translation || "").toLowerCase().includes(q) ||
        (d.category || "").toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "All" || d.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [duas, search, selectedCategory]);

  const startLongPress = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => {
      setShakingId(id);
      setContextMenuId(id);
      setTimeout(() => setShakingId(null), 500);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCopy = async (e: React.MouseEvent, dua: Dua) => {
    e.stopPropagation();
    const textToCopy = `${dua.arabic}\n\n"${dua.translation}"`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: "Dua from DuaVault", text: textToCopy });
      } else {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedId(dua.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy or share", err);
    }
  };

  const handleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHeartPopId(id);
    onToggleFavorite(id);
    setTimeout(() => setHeartPopId(null), 400);
  };

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Header Section */}
      <header className="pt-6 lg:pt-10 pb-0 bg-white sticky top-0 z-40">
        {/* Single shared container — everything in here shares one left edge */}
        <div className="max-w-5xl mx-auto px-6 lg:px-10 xl:px-12 flex flex-col gap-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl lg:text-6xl font-normal leading-[1.1] tracking-tight font-header text-[#1a1a1a]">
              Salam, friend
            </h1>
            <p className="text-base text-[#666666] font-sans">
              {duas.length} duas saved
            </p>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#006B3F] transition-colors"
              size={20}
            />
            <input
              type="text"
              placeholder="Search meaning or script..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f9fafb] border border-transparent focus:bg-white focus:border-[#006B3F] rounded-lg py-3.5 pl-11 pr-4 transition-all outline-none text-base font-sans placeholder:text-[#9ca3af]"
            />
          </div>

          {/* Category Tabs — border and tabs both within content width */}
          <div className="overflow-x-auto no-scrollbar border-b border-[#e5e7eb]">
            <div className="flex justify-between pt-2">
              {CATEGORY_TABS.map((tab) => {
                const isActive = selectedCategory === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setSelectedCategory(tab.value)}
                    className={`shrink-0 flex flex-col items-center gap-2 pb-3 border-b-2 transition-all min-w-[56px] ${
                      isActive
                        ? "border-[#1a1a1a] text-[#1a1a1a] opacity-100"
                        : "border-transparent text-[#9ca3af] hover:text-[#666666] opacity-60 hover:opacity-100 hover:border-[#e5e7eb]"
                    }`}
                  >
                    <span className="text-[22px] leading-normal py-1">
                      {tab.emoji}
                    </span>
                    <span className="text-[11px] font-sans font-medium whitespace-nowrap">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Dismiss context menu on outside click */}
      {contextMenuId && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setContextMenuId(null)}
        />
      )}

      {/* List / Grid — same max-w-5xl container, same padding */}
      {filteredDuas.length > 0 ? (
        <div className="max-w-5xl mx-auto px-6 lg:px-10 xl:px-12 py-8 pb-32 grid gap-4 lg:grid-cols-2 w-full">
          {filteredDuas.map((dua, idx) => (
            <div
              key={dua.id}
              onClick={() => {
                if (!contextMenuId) onSelect(dua.id);
              }}
              onPointerDown={() => startLongPress(dua.id)}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              className={`animate-in fade-in slide-in-from-bottom-2 duration-500 bg-[#f9f9f9] p-6 rounded-2xl cursor-pointer group relative transition-colors hover:bg-[#f0f0f0] select-none ${
                shakingId === dua.id ? "animate-card-shake" : ""
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Long-press context menu */}
              {contextMenuId === dua.id && (
                <div className="absolute top-2 right-2 z-40 bg-white rounded-2xl shadow-xl border border-[#f0f0f0] overflow-hidden flex flex-col min-w-[160px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCopy(e, dua);
                      setContextMenuId(null);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-[#1a1a1a] hover:bg-[#f9fafb] transition-colors"
                  >
                    <Copy size={16} /> Copy dua
                  </button>
                  <div className="h-px bg-[#f3f4f6]" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(dua.id);
                      setContextMenuId(null);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-[#666666] bg-[#eaeaea] px-2.5 py-1 rounded-md font-sans">
                  {dua.category}
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Copy button with burst */}
                  <button
                    onClick={(e) => handleCopy(e, dua)}
                    className="relative p-1.5 transition-transform text-[#d1d5db] hover:text-[#9ca3af]"
                    title="Copy to clipboard"
                  >
                    {copiedId === dua.id ? (
                      <>
                        <span className="absolute inset-0 rounded-full bg-emerald-100 animate-ring-ping" />
                        <Check
                          size={20}
                          strokeWidth={2}
                          className="text-[#006B3F] animate-copy-burst relative z-10"
                        />
                      </>
                    ) : (
                      <Copy size={20} strokeWidth={2} />
                    )}
                  </button>
                  {/* Heart button with pop */}
                  <button
                    onClick={(e) => handleFavorite(e, dua.id)}
                    className="p-1.5 transition-transform"
                  >
                    <Heart
                      size={20}
                      className={`transition-colors ${
                        heartPopId === dua.id ? "animate-heart-pop" : ""
                      } ${dua.isFavorite ? "fill-[#e11d48] text-[#e11d48]" : "text-[#d1d5db] group-hover:text-[#9ca3af]"}`}
                      strokeWidth={2}
                    />
                  </button>
                </div>
              </div>

              <p
                className="font-arabic text-2xl mb-4 text-right leading-loose text-[#1a1a1a]"
                dir="rtl"
              >
                {dua.arabic.length > 80
                  ? dua.arabic.substring(0, 80) + "..."
                  : dua.arabic}
              </p>

              <p className="text-[#666666] text-sm leading-relaxed font-sans line-clamp-2">
                {dua.translation || "No translation available."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[50vh]">
          <div className="flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in duration-500">
            <span className="text-5xl mb-1">🌱</span>
            <div className="flex flex-col gap-1">
              <p className="font-header text-[32px] leading-tight text-[#1a1a1a]">
                Nothing to see here...
              </p>
              <p className="text-sm text-[#666666] font-sans">
                Add your first dua to begin.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
