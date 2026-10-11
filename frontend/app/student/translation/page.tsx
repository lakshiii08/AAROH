"use client";

import { StudentSideNav } from "@/components/layout/student-side-nav";
import { VoiceTranslator } from "@/components/translation/voice-translator";
import { useLanguage } from "@/components/providers/language-provider";

export default function StudentTranslationPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen md:flex">
      <StudentSideNav />
      <main className="flex-1 min-w-0 max-w-3xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{t("nav_translate")}</h1>
          <p className="text-ink/55 mt-1">
            Hold the button and speak. AAROH shows what it heard, then plays it back in Santhali.
          </p>
        </div>
        <VoiceTranslator />
      </main>
    </div>
  );
}
