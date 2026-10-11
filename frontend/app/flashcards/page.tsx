"use client";

import { StudentSideNav } from "@/components/layout/student-side-nav";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";
import { useLanguage } from "@/components/providers/language-provider";

export default function FlashcardsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />
      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t("flashcards_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("flashcards_subtitle")}
          </p>
        </div>
        <FlashcardDeck />
      </main>
    </div>
  );
}
