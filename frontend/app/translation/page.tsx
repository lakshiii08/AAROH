"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { VoiceTranslator } from "@/components/translation/voice-translator";
import { useLanguage } from "@/components/providers/language-provider";

function TranslationContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  return (
    <div className="min-h-screen md:flex">
      {role === "teacher" ? <TeacherSideNav /> : <StudentSideNav />}
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

export default function TranslationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <TranslationContent />
    </Suspense>
  );
}
