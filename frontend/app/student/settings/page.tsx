"use client";

import { useEffect, useState } from "react";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { UserProfile } from "@/lib/db";
import { Check, CheckCircle2, RotateCcw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentSettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>({
    id: "s1",
    name: "Sona Murmu",
    role: "student",
    rollNo: "24",
    grade: "Grade 4",
    school: "Rajkiya Prathmik Vidyalaya, Dumka",
    pin: "",
    language: "en",
    badges: 6,
    accuracy: 82,
    weakConcepts: ["Photosynthesis"],
    seenCardIds: [],
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/preference")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          // If no stored preference in localStorage, sync from profile
          const savedInStorage = typeof window !== "undefined" ? localStorage.getItem("aaroh_language") : null;
          if (!savedInStorage && data.profile.language) {
            setLanguage(data.profile.language);
          }
        }
      })
      .catch(() => {});
  }, [setLanguage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Backend only allows language update for students
      const res = await fetch("/api/user/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetFlashcardHistory = async () => {
    if (confirm(t("settings_reset_flashcard") + "?")) {
      await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      setProfile((prev) => ({ ...prev, seenCardIds: [] }));
      alert(t("settings_saved"));
    }
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />

      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t("settings_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("settings_subtitle")}
          </p>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200/70 rounded-lg flex items-center gap-2 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
            <span>{t("settings_saved")}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Language Selection: The ONLY setting editable by students */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-ink">
                  {t("settings_language_heading")}
                </h2>
                <Badge tone="emerald" className="text-[10px] py-0 px-1.5 font-normal">
                  {t("settings_editable_badge")}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("settings_language_desc")}
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { code: "en", label: "English", desc: "Default Interface" },
                { code: "hi", label: "हिंदी", desc: "Hindi Interface" },
                { code: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ", desc: "Santali (Ol Chiki)" },
              ].map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code as any)}
                    className={cn(
                      "p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "border-emerald bg-emerald-50/60 ring-1 ring-emerald"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-ink">{item.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald" />}
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Student Profile Information: STRICTLY READ-ONLY */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-ink">
                  {t("settings_profile_heading")}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3 text-gray-400" /> {t("settings_read_only")}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("settings_managed_by_teacher")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">
                  {t("settings_name")}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile.name}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 cursor-not-allowed select-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">
                  {t("settings_roll")}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile.rollNo || ""}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-gray-700 cursor-not-allowed select-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">
                  {t("settings_grade")}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile.grade || "Grade 4"}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 cursor-not-allowed select-none outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">
                  {t("settings_school")}
                </label>
                <input
                  type="text"
                  readOnly
                  value={profile.school || "Rajkiya Prathmik Vidyalaya, Dumka"}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 cursor-not-allowed select-none outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block">
                  {t("settings_pin_password")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={profile.pin ? `•••• (${profile.pin})` : "•••• (Secret PIN)"}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-gray-700 cursor-not-allowed select-none outline-none"
                  />
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {t("settings_managed_by_teacher")}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge tone="emerald">{profile.accuracy}% {t("dashboard_accuracy")}</Badge>
                <Badge tone="amber">{profile.badges} {t("dashboard_badges")}</Badge>
              </div>

              <button
                type="button"
                onClick={handleResetFlashcardHistory}
                className="text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 text-xs font-medium underline cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t("settings_reset_flashcard")}</span>
              </button>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? t("saving") : t("settings_save_btn")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
