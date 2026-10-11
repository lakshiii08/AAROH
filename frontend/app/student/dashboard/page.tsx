"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Star,
  Award,
  ArrowRight,
  FileText,
  Clock,
  Layers,
  Mic,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { api } from "@/lib/api";

interface StudentProfile {
  student_id: string;
  name: string;
  roll_number: string;
  grade_level: number;
  school_id: string;
  school_name?: string;
  village?: string;
  overall_mastery: number;
  quizzes_taken: number;
  weak_concepts: string[];
}

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  grade: number;
  language: string;
  difficulty: string;
  total_questions: number;
  total_marks: number;
  created_at: string;
}

export default function StudentDashboardPage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [recentWorksheets, setRecentWorksheets] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profData, progData, wsData] = await Promise.all([
        api.students.getMe().catch(() => null),
        api.students.getProgress().catch(() => null),
        api.assignments.list().catch(() => []),
      ]);

      const currentUser = api.getCurrentUser();

      if (profData || currentUser) {
        setProfile({
          student_id: profData?.student_id || currentUser?.user_id || "s1",
          name: profData?.name || currentUser?.name || "Student",
          roll_number: profData?.roll_number || currentUser?.roll_number || "—",
          grade_level: profData?.grade_level || 4,
          school_id: profData?.school_id || currentUser?.school_id || "SCH_001",
          overall_mastery: progData?.overall_mastery || 0,
          quizzes_taken: progData?.quizzes_taken || 0,
          weak_concepts: (progData?.concept_breakdown || [])
            .filter((c: any) => (c.mastery_pct || 0) < 60)
            .map((c: any) => c.concept_name || c.concept_code || "Concept"),
        });
      }

      setRecentWorksheets(Array.isArray(wsData) ? wsData.slice(0, 4) : []);
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const studentName = profile?.name || "Student";
  const mastery = profile?.overall_mastery || 0;
  const badgesEarned = Math.min(Math.floor((profile?.overall_mastery || 0) / 15) + (profile?.quizzes_taken || 0), 12);

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />

      <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-8">
        {/* Greeting Banner */}
        <section className="bg-white border border-gray-200/80 rounded-xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald uppercase tracking-wider">
              {t("greeting_johar")}, {studentName.split(" ")[0]}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("dashboard_question")}
            </h1>
            <p className="text-sm text-gray-500 max-w-lg">
              {profile?.roll_number ? `${t("settings_roll")}: ${profile.roll_number} · Grade ${profile.grade_level}` : t("portal_student")}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg px-3.5 py-2 text-center">
              <span className="text-xs font-semibold text-amber-800 uppercase block tracking-wider">
                {t("dashboard_badges")}
              </span>
              <span className="font-display font-bold text-xl text-amber-900 flex items-center justify-center gap-1 mt-0.5">
                <Award className="w-4 h-4 text-amber-600 inline" /> {badgesEarned}
              </span>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-lg px-3.5 py-2 text-center">
              <span className="text-xs font-semibold text-emerald-800 uppercase block tracking-wider">
                {t("dashboard_mastery")}
              </span>
              <span className="font-display font-bold text-xl text-emerald-900 flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-4 h-4 text-emerald-600 inline" /> {mastery}%
              </span>
            </div>
          </div>
        </section>

        {/* Primary Learning Sections */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-0.5">
            {t("learning_activities")}
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/flashcards"
              className="group bg-white border border-gray-200/80 hover:border-emerald-300 rounded-xl p-5 transition-all flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald flex items-center justify-center border border-emerald-100">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink group-hover:text-emerald transition-colors">
                    {t("nav_flashcards")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("flashcards_card_desc")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-emerald">
                <span>{t("start_practice")}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/student/worksheets"
              className="group bg-white border border-gray-200/80 hover:border-emerald-300 rounded-xl p-5 transition-all flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink group-hover:text-amber-800 transition-colors">
                    {t("nav_worksheets")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("worksheets_card_desc")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-amber-800">
                <span>{t("view_worksheets")}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/student/translation"
              className="group bg-white border border-gray-200/80 hover:border-emerald-300 rounded-xl p-5 transition-all flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink group-hover:text-slate-900 transition-colors">
                    {t("nav_translate")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {t("translate_card_desc")}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{t("open_voice_tool")}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* Current Worksheets */}
        <section className="bg-white border border-gray-200/80 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-display font-bold text-base text-ink">{t("active_assignments_heading")}</h2>
              <p className="text-xs text-gray-500">{t("active_assignments_sub")}</p>
            </div>
            <Link
              href="/student/worksheets"
              className="text-xs font-semibold text-emerald hover:underline flex items-center gap-1"
            >
              {t("view_worksheets")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">{t("loading")}</div>
          ) : recentWorksheets.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">{t("no_assignments_yet")}</p>
              <p className="text-xs text-gray-400">{t("no_assignments_desc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentWorksheets.map((ws) => (
                <div
                  key={ws.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{ws.subject}</Badge>
                      <h3 className="font-semibold text-sm text-ink">{ws.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {t("due_label")}: {ws.created_at ? new Date(ws.created_at).toLocaleDateString() : "Recent"} · {t("questions_count", { count: ws.total_questions })}
                    </p>
                  </div>

                  <Link
                    href="/student/worksheets"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald hover:text-emerald-dark px-3 py-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 hover:bg-emerald-50 transition-colors self-start sm:self-auto"
                  >
                    {t("solve_worksheet")} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Learning Progress Summary */}
        <section className="bg-white border border-gray-200/80 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-display font-bold text-base text-ink">{t("dashboard_your_progress")}</h2>
            <p className="text-xs text-gray-500">{t("dashboard_needs_practice_sub")}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-gray-500 uppercase">{t("dashboard_mastery")}</span>
                <span className="font-display font-bold text-base text-emerald">{mastery}%</span>
              </div>
              <Progress value={mastery} tone="emerald" />
              <p className="text-[11px] text-gray-400">{t("dashboard_accuracy")}: {mastery}%</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase block">{t("dashboard_badges")}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: Math.max(badgesEarned, 1) }).map((_, i) => (
                  <div
                    key={i}
                    title="Achievement Badge"
                    className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700"
                  >
                    <Award className="w-4 h-4" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">{badgesEarned} {t("dashboard_badges")}</p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase block">{t("dashboard_needs_practice")}</span>
              <div className="flex flex-wrap gap-1.5">
                {!profile?.weak_concepts || profile.weak_concepts.length === 0 ? (
                  <Badge tone="emerald">{t("dashboard_all_caught_up")}</Badge>
                ) : (
                  profile.weak_concepts.map((c) => (
                    <Badge key={c} tone="amber">
                      {c}
                    </Badge>
                  ))
                )}
              </div>
              <p className="text-[11px] text-gray-400">{t("dashboard_needs_practice_sub")}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
