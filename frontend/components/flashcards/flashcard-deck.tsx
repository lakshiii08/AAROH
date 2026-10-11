"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Shuffle,
  RefreshCw,
  Rotate3D,
  Sparkles,
  Search,
  BookOpen,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { speak, cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { api } from "@/lib/api";

const CATEGORIES = [
  { id: "All", labelKey: "flashcards_category_all", fallback: "All Categories (10M+)" },
  { id: "Vocabulary", labelKey: "flashcards_category_vocab", fallback: "Vocabulary" },
  { id: "Science", labelKey: "flashcards_category_science", fallback: "Science" },
  { id: "Math", labelKey: "flashcards_category_math", fallback: "Math" },
  { id: "Geography", labelKey: "flashcards_category_social", fallback: "Geography" },
];

export interface FlashcardItem {
  id: string;
  concept: string;
  category: string;
  imageEmoji: string;
  front: {
    santhaliOlChiki: string;
    santhaliRoman: string;
  };
  back: {
    hindi: string;
    english: string;
  };
  exampleSentence?: string;
}

export function FlashcardDeck() {
  const { t } = useLanguage();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [masteredCount, setMasteredCount] = useState(0);
  const [stackPage, setStackPage] = useState(1);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent seen card IDs to prevent any repeating cards
  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("aaroh_seen_flashcard_ids");
        return stored ? new Set(JSON.parse(stored)) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    }
    return new Set<string>();
  });

  // Fetch unique non-repeating cards from the 10 Million+ vocabulary engine
  const fetchCardStack = useCallback(async (cat: string, search: string, pageNum: number, isShuffle = false) => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set("category", cat);
      qParams.set("page", pageNum.toString());
      qParams.set("limit", "15");
      qParams.set("excludeSeen", "true");
      if (isShuffle) qParams.set("random", "true");
      if (search.trim()) qParams.set("search", search.trim());

      const res = await fetch(`/api/flashcards?${qParams.toString()}`);
      const data = await res.json();

      if (data && Array.isArray(data.cards) && data.cards.length > 0) {
        // Double-check client-side deduplication against seenCardIds
        const freshCards = data.cards.filter((c: FlashcardItem) => !seenCardIds.has(c.id));
        setCards(freshCards.length > 0 ? freshCards : data.cards);
        setIndex(0);
        setFlipped(false);
      } else {
        // If all seen in current stack, fetch next batch
        setCards([]);
      }
    } catch (e) {
      console.error("Failed to load 10M+ flashcard deck:", e);
    } finally {
      setLoading(false);
    }
  }, [seenCardIds]);

  useEffect(() => {
    fetchCardStack(category, searchQuery, stackPage, true);
  }, [category, stackPage, fetchCardStack]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastNotice(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotice(null);
    }, 2400);
  };

  const card = cards[index];

  const handleNextCard = () => {
    setFlipped(false);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
    } else {
      // Finished current stack of unique cards! Load next unique stack from 10M+ library
      setStackPage((p) => p + 1);
    }
  };

  const handlePrevCard = () => {
    if (index > 0) {
      setFlipped(false);
      setIndex((i) => i - 1);
    }
  };

  // Grade card & send real learning telemetry to teacher
  const markReview = async (result: "right" | "practice") => {
    if (!card) return;

    // 1. Permanently record as seen to guarantee zero repetition
    const nextSeen = new Set(seenCardIds);
    nextSeen.add(card.id);
    setSeenCardIds(nextSeen);
    try {
      localStorage.setItem("aaroh_seen_flashcard_ids", JSON.stringify(Array.from(nextSeen)));
    } catch {}

    const currentUser = api.getCurrentUser();
    const studentId = currentUser?.user_id || "s1";

    // 2. Send data to teacher & database
    try {
      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: card.id,
          concept: card.concept,
          result,
          studentId,
          category: card.category,
        }),
      });

      // Also record gamification & teacher gap activity on FastAPI backend
      if (result === "right") {
        setMasteredCount((c) => c + 1);
        showToast("✓ Got it right! +10 XP · Concept Mastered");
        api.gamification.recordActivity(studentId, {
          student_name: currentUser?.name || "Student",
          school_id: currentUser?.school_id || "SCH_001",
          grade_level: 4,
          activity_type: "flashcard_mastered",
          concept_code: card.concept,
        }).catch(() => {});
      } else {
        showToast("⚠️ Marked for Teacher Practice Assistance");
        api.gamification.recordActivity(studentId, {
          student_name: currentUser?.name || "Student",
          school_id: currentUser?.school_id || "SCH_001",
          grade_level: 4,
          activity_type: "flashcard_gap_detected",
          concept_code: card.concept,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Telemetry reporting error:", err);
    }

    // Auto advance to next unique card
    setTimeout(handleNextCard, 260);
  };

  // Audio Pronunciation Handlers
  const playSantaliAudio = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!card) return;
    setSpeakingKey("sat");

    const romanPhonetic = card.front.santhaliRoman;
    try {
      const synth = await api.voice.synthesize({
        text: romanPhonetic,
        target_language: "sat",
        target_dialect: "sat",
      });
      if (synth && synth.stream_url) {
        const audio = new Audio(synth.stream_url);
        audio.onended = () => setSpeakingKey(null);
        audio.onerror = () => {
          speak(romanPhonetic, "hi-IN", () => setSpeakingKey(null));
        };
        await audio.play();
      } else {
        speak(romanPhonetic, "hi-IN", () => setSpeakingKey(null));
      }
    } catch {
      speak(romanPhonetic, "hi-IN", () => setSpeakingKey(null));
    }
  };

  const playHindiAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!card) return;
    setSpeakingKey("hi");
    speak(card.back.hindi, "hi-IN", () => setSpeakingKey(null));
  };

  const playEnglishAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!card) return;
    setSpeakingKey("en");
    speak(card.back.english, "en-US", () => setSpeakingKey(null));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCardStack(category, searchQuery, 1, false);
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      {/* Toast Feedback Notice */}
      {toastNotice && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-ink text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-white/20 animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Top Search Bar & Shuffle Button */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("flashcards_search_placeholder") || "Search 10M+ vocabulary..."}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200/90 rounded-lg outline-none focus:border-emerald font-medium text-ink shadow-xs"
          />
        </form>

        <button
          type="button"
          onClick={() => fetchCardStack(category, searchQuery, stackPage, true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200/90 hover:border-gray-300 text-gray-700 text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors shrink-0"
          title="Shuffle cards"
        >
          <Shuffle className="w-3.5 h-3.5 text-emerald" />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Category Pills & Progress Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                setStackPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors border cursor-pointer",
                category === c.id
                  ? "bg-emerald text-white border-emerald shadow-xs"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {t(c.labelKey) || c.fallback}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-gray-500 font-medium shrink-0">
          {masteredCount > 0 && (
            <span className="font-semibold text-emerald-800 mr-1">
              {masteredCount} mastered ·
            </span>
          )}
          {cards.length > 0 ? (
            <span>Card {index + 1} of {cards.length}</span>
          ) : (
            <span>Stack #{stackPage}</span>
          )}
        </div>
      </div>

      {/* MAIN FLASHCARD STACK CONTAINER */}
      {loading ? (
        <div className="aspect-[1.5/1] rounded-2xl bg-[#FCFAF5] border border-[#E2DBD0] flex flex-col items-center justify-center p-8 gap-2 shadow-sm">
          <RefreshCw className="w-6 h-6 text-emerald animate-spin" />
          <p className="text-xs text-gray-500 font-medium">{t("loading")}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="aspect-[1.5/1] rounded-2xl bg-[#FCFAF5] border-2 border-dashed border-[#DCD5C8] flex flex-col items-center justify-center p-8 text-center space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-ink">
            {t("flashcards_empty") || "No new unreviewed cards in this category."}
          </p>
          <Button
            onClick={() => fetchCardStack(category, searchQuery, stackPage + 1, true)}
            variant="primary"
            size="sm"
            className="text-xs gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Next 10M+ Stack</span>
          </Button>
        </div>
      ) : card ? (
        <div style={{ perspective: "1200px" }} className="relative group">
          {/* Stack effect background layers */}
          <div className="absolute inset-0 bg-[#F2EDE2] rounded-2xl transform translate-y-1.5 translate-x-0.5 border border-[#DDD5C5] -z-10" />
          <div className="absolute inset-0 bg-[#E8E2D4] rounded-2xl transform translate-y-3 translate-x-1 border border-[#D5CDC0] -z-20 opacity-80" />

          {/* Active Card Body */}
          <div
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label="Flip flashcard"
            className="relative w-full aspect-[1.48/1] block cursor-pointer select-none focus:outline-none"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 transition-transform duration-500 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* ─────────────────────────────────────────────────────────────
                  FRONT: 1st shown as Santali (Ol Chiki + Roman + Audio)
                  ───────────────────────────────────────────────────────────── */}
              <div
                className="absolute inset-0 rounded-2xl bg-[#FFFDF8] border-2 border-[#DFD6C6] shadow-sm flex flex-col justify-between overflow-hidden"
                style={{ backfaceVisibility: "hidden" }}
              >
                {/* Header: Category and Script Identity */}
                <div className="px-6 pt-4 pb-2 border-b border-[#E8DFD0] flex items-center justify-between bg-[#FAF6EC]/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5DDD0] border border-[#C8BEB0]" />
                    <span className="text-[11px] font-bold tracking-widest text-[#7A6B58] uppercase">
                      {card.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#8C7D6B] tracking-wider uppercase">
                      SANTALI · ᱥᱟᱱᱛᱟᱲᱤ
                    </span>
                    <span className="text-[10px] bg-[#EFE9DC] text-[#6E5F4E] px-2 py-0.5 rounded font-mono font-medium">
                      #{index + 1}
                    </span>
                  </div>
                </div>

                {/* Center: Authentic Ol Chiki Script & Roman Pronunciation */}
                <div className="flex flex-col items-center justify-center text-center my-auto px-6 py-4 space-y-2">
                  <span className="text-3xl select-none" role="img" aria-hidden="true">
                    {card.imageEmoji}
                  </span>

                  <p className="olchiki text-5xl sm:text-6xl font-bold text-[#1E1B15] tracking-wide leading-tight">
                    {card.front.santhaliOlChiki}
                  </p>

                  <p className="text-xl sm:text-2xl font-serif text-[#4D453A] font-medium tracking-normal">
                    {card.front.santhaliRoman}
                  </p>
                </div>

                {/* Footer on Front: Pronounce Santali & Flip Prompt */}
                <div className="px-6 py-3 border-t border-[#EDE5D8] bg-[#FAF6EE]/70 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={playSantaliAudio}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                      speakingKey === "sat"
                        ? "bg-emerald text-white border-emerald ring-2 ring-emerald-200"
                        : "bg-white text-emerald-900 border-[#D8CEC0] hover:bg-[#F4EFE6] active:scale-95"
                    )}
                    title="Pronounce in Santali"
                  >
                    <Volume2 className={cn("w-4 h-4", speakingKey === "sat" && "animate-bounce text-white")} />
                    <span>{speakingKey === "sat" ? t("flashcards_speaking") : t("flashcards_pronounce_sat")}</span>
                  </button>

                  <span className="text-[11px] text-[#8C7D6B] flex items-center gap-1 font-medium">
                    <Rotate3D className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t("flashcards_flip_prompt")}</span>
                  </span>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  BACK: Flipped to reveal English & Hindi with pronunciations
                  ───────────────────────────────────────────────────────────── */}
              <div
                className="absolute inset-0 rounded-2xl bg-[#FFFDF8] border-2 border-[#DFD6C6] shadow-sm flex flex-col justify-between overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                {/* Header on Back */}
                <div className="px-6 pt-4 pb-2 border-b border-[#E8DFD0] flex items-center justify-between bg-[#FAF6EC]/60">
                  <span className="text-[11px] font-bold tracking-widest text-[#7A6B58] uppercase">
                    {t("flashcards_meanings_heading")}
                  </span>
                  <span className="text-[10px] bg-[#EFE9DC] text-[#6E5F4E] px-2 py-0.5 rounded font-mono font-medium">
                    #{index + 1}
                  </span>
                </div>

                {/* Center: English and Hindi with Individual Audio Buttons */}
                <div className="flex flex-col items-center justify-center text-center my-auto px-6 py-4 space-y-3.5">
                  {/* English Translation */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      English Translation
                    </span>
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <p className="text-2xl sm:text-3xl font-bold text-[#1E1B15]">
                        {card.back.english}
                      </p>
                      <button
                        type="button"
                        onClick={playEnglishAudio}
                        className={cn(
                          "p-1.5 rounded-full border text-gray-600 hover:text-emerald cursor-pointer transition-colors",
                          speakingKey === "en" ? "bg-emerald-50 border-emerald-300 text-emerald" : "border-gray-200 bg-white"
                        )}
                        title="Pronounce in English"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Hindi Translation */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Hindi Translation (हिन्दी)
                    </span>
                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <p className="text-xl sm:text-2xl font-semibold text-[#3D352A]">
                        {card.back.hindi}
                      </p>
                      <button
                        type="button"
                        onClick={playHindiAudio}
                        className={cn(
                          "p-1.5 rounded-full border text-gray-600 hover:text-emerald cursor-pointer transition-colors",
                          speakingKey === "hi" ? "bg-emerald-50 border-emerald-300 text-emerald" : "border-gray-200 bg-white"
                        )}
                        title="Pronounce in Hindi"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rural / Contextual sentence */}
                  <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded text-xs text-amber-900 max-w-sm">
                    <strong>Santali:</strong> {card.front.santhaliRoman} · {card.back.english} ({card.back.hindi})
                  </div>
                </div>

                {/* Footer on Back */}
                <div className="px-6 py-3 border-t border-[#EDE5D8] bg-[#FAF6EE]/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8C7D6B] font-medium">
                    Ol Chiki: <strong className="olchiki font-bold">{card.front.santhaliOlChiki}</strong>
                  </span>
                  <span className="text-[11px] text-[#8C7D6B] flex items-center gap-1 font-medium">
                    <Rotate3D className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t("flashcards_flip_back")}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action grading buttons */}
          <div className="flex items-center justify-between gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markReview("practice")}
              className="flex-1 bg-white border-amber-300 text-amber-800 hover:bg-amber-50 text-xs h-9 cursor-pointer gap-1.5 font-semibold"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{t("flashcards_needs_practice")}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => markReview("right")}
              className="flex-1 bg-emerald hover:bg-emerald/90 text-white text-xs h-9 gap-1.5 cursor-pointer font-semibold shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("flashcards_know_this")}</span>
            </Button>
          </div>

          {/* Bottom stack navigation */}
          <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
            <button
              type="button"
              onClick={handlePrevCard}
              disabled={index === 0}
              className="hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-[11px] font-mono text-gray-400">
              Stack #{stackPage} · {seenCardIds.size} reviewed
            </span>

            <button
              type="button"
              onClick={() => setStackPage((p) => p + 1)}
              className="hover:text-emerald flex items-center gap-1 cursor-pointer font-semibold text-emerald"
            >
              <span>Next Stack</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
