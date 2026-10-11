"use client";

import { useEffect, useState } from "react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { TeacherProfile } from "@/lib/db";
import { Check, CheckCircle2, ShieldCheck, Sparkles, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeacherSettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<TeacherProfile>({
    id: "t1",
    name: "Guruji Hemant Soren",
    email: "hemant.soren@aaroh-edu.in",
    role: "teacher",
    employeeId: "EDU-JH-2024-089",
    assignedGrade: "Grade 4 (Sections A & B)",
    schoolName: "Rajkiya Prathmik Vidyalaya, Dumka",
    subjectSpecialization: "Science & Santali Language",
    language: "en",
    autoAiTranslation: true,
    lateSubmissionsAllowed: true,
    notifyOnSubmission: true,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/preference")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
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
      const res = await fetch("/api/teacher/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, language }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save teacher settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />

      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t("teacher_settings_title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("teacher_settings_subtitle")}
          </p>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200/70 rounded-lg flex items-center gap-2 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
            <span>{t("settings_saved")}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Language Selection */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                {t("settings_language_heading")}
              </h2>
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
                    onClick={() => {
                      setLanguage(item.code as any);
                      setProfile({ ...profile, language: item.code as any });
                    }}
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

          {/* Teacher Profile Information */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-base text-ink">
                  {t("teacher_profile_heading")}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("teacher_profile_desc")}
                </p>
              </div>
              <Badge tone="emerald" className="hidden sm:inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {t("teacher_verified_badge")}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">{t("settings_name")}</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">{t("teacher_employee_id")}</label>
                <input
                  type="text"
                  value={profile.employeeId}
                  onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">{t("teacher_assigned_grade")}</label>
                <input
                  type="text"
                  value={profile.assignedGrade}
                  onChange={(e) => setProfile({ ...profile, assignedGrade: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">{t("teacher_specialization")}</label>
                <input
                  type="text"
                  value={profile.subjectSpecialization}
                  onChange={(e) => setProfile({ ...profile, subjectSpecialization: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block">{t("teacher_school_center")}</label>
                <input
                  type="text"
                  value={profile.schoolName}
                  onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 block">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-emerald font-medium text-ink"
                  required
                />
              </div>
            </div>
          </section>

          {/* Workflow & AI Preferences */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                {t("teacher_class_pref")}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t("teacher_settings_subtitle")}
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors bg-cream/30">
                <input
                  type="checkbox"
                  checked={profile.autoAiTranslation}
                  onChange={(e) => setProfile({ ...profile, autoAiTranslation: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald accent-emerald cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      {t("teacher_auto_ai")}
                    </span>
                    <Badge tone="emerald" className="text-[10px] py-0 px-1.5">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5 inline" /> AI Assist
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {t("teacher_auto_ai_desc")}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors bg-cream/30">
                <input
                  type="checkbox"
                  checked={profile.lateSubmissionsAllowed}
                  onChange={(e) => setProfile({ ...profile, lateSubmissionsAllowed: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald accent-emerald cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      {t("teacher_late_submissions")}
                    </span>
                    <Badge tone="amber" className="text-[10px] py-0 px-1.5">
                      <Clock className="w-2.5 h-2.5 mr-0.5 inline" /> Policy
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {t("teacher_late_sub_desc")}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors bg-cream/30">
                <input
                  type="checkbox"
                  checked={profile.notifyOnSubmission}
                  onChange={(e) => setProfile({ ...profile, notifyOnSubmission: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald focus:ring-emerald accent-emerald cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">
                      {t("teacher_notifications")}
                    </span>
                    <Badge tone="slate" className="text-[10px] py-0 px-1.5">
                      <Bell className="w-2.5 h-2.5 mr-0.5 inline" /> Alert
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    {t("teacher_notif_desc")}
                  </p>
                </div>
              </label>
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? t("saving") : t("settings_save_btn")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
