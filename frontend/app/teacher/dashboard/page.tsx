"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
  Plus,
  Clock,
  Sparkles,
  RefreshCw,
  FolderPlus,
  Download,
  BookOpen,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { api } from "@/lib/api";

export default function TeacherDashboardPage() {
  const { t, language } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Publish assignment modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Science");
  const [targetGrade, setTargetGrade] = useState(4);
  const [targetLanguage, setTargetLanguage] = useState("sat");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [stuData, asgnData, analyticsData] = await Promise.allSettled([
        api.teachers.listStudents(),
        api.assignments.list(),
        api.teachers.getAnalytics(),
      ]);

      if (stuData.status === "fulfilled") {
        setStudents(stuData.value || []);
      }
      if (asgnData.status === "fulfilled") {
        setAssignments(asgnData.value || []);
      }
      if (analyticsData.status === "fulfilled") {
        setAnalytics(analyticsData.value);
      }
    } catch (e: any) {
      console.error("Error loading teacher dashboard data:", e);
      setErrorMessage("Could not load latest classroom data. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim()) return;

    setPublishing(true);
    setPublishStatus(t("teacher_modal_generating"));

    try {
      const newAsgn = await api.assignments.generate({
        title: assignmentTitle.trim(),
        subject: selectedSubject,
        grade: Number(targetGrade),
        target_language: targetLanguage,
        target_dialect: targetLanguage === "sat" ? "sat" : undefined,
        number_of_questions: Number(questionCount),
        difficulty,
      });

      setAssignments((prev) => [newAsgn, ...prev]);
      setShowPublishModal(false);
      setAssignmentTitle("");
    } catch (err: any) {
      console.error("Failed to generate assignment:", err);
      alert(err.message || "Failed to generate worksheet assignment via AI.");
    } finally {
      setPublishing(false);
      setPublishStatus("");
    }
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />

      <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("teacher_dashboard_title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("teacher_dashboard_subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/teacher/materials">
              <Button variant="outline" size="sm" className="text-xs">
                <BookOpen className="w-3.5 h-3.5 mr-1 text-emerald" />
                <span>{t("teacher_btn_upload_book")}</span>
              </Button>
            </Link>
            <Link href="/teacher/students">
              <Button variant="outline" size="sm" className="text-xs">
                <Users className="w-3.5 h-3.5 mr-1 text-emerald" />
                <span>{t("teacher_add_student")}</span>
              </Button>
            </Link>
            <Button onClick={() => setShowPublishModal(true)} variant="primary" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>{t("teacher_btn_new_assignment")}</span>
            </Button>
          </div>
        </div>

        {/* Real Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              {t("teacher_active_students")}
            </span>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "..." : students.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              {t("teacher_class_average")}
            </span>
            <p className="font-display text-2xl font-bold text-emerald">
              {loading
                ? "..."
                : analytics?.class_average_mastery !== undefined && students.length > 0
                ? `${analytics.class_average_mastery}%`
                : "—"}
            </p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              {t("teacher_needs_intervention")}
            </span>
            <p className="font-display text-2xl font-bold text-amber-700">
              {loading
                ? "..."
                : analytics?.learning_gaps_count !== undefined && students.length > 0
                ? analytics.learning_gaps_count
                : 0}
            </p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              {t("teacher_published_worksheets")}
            </span>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "..." : assignments.length}
            </p>
          </div>
        </section>

        {/* Real Active Worksheets Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-ink">{t("teacher_recent_assignments")}</h2>
            <span className="text-xs text-gray-400">{assignments.length} {t("all")}</span>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white border border-gray-200/80 rounded-xl p-8 text-center text-xs text-gray-500 space-y-2">
              <FileText className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700">{t("no_assignments_yet")}</p>
              <p className="text-gray-400">
                {t("no_assignments_desc")}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3.5">
              {assignments.map((asgn) => (
                <div key={asgn.id} className="bg-white border border-gray-200/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge tone="slate">{asgn.subject}</Badge>
                    <span className="text-[10px] text-emerald font-semibold uppercase">
                      {asgn.language.toUpperCase()} {asgn.dialect ? `(${asgn.dialect})` : ""}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-ink truncate" title={asgn.title}>
                    {asgn.title}
                  </h3>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-gray-400">{asgn.total_questions} {t("questions_count", { count: "" }).trim()} · Grade {asgn.grade}</span>
                    <a
                      href={asgn.pdf_download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald hover:underline font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Real Enrolled Students List Preview */}
        <section className="bg-white border border-gray-200/80 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-ink">{t("teacher_student_roster")}</h2>
            <Link href="/teacher/students" className="text-xs font-semibold text-emerald hover:underline">
              {t("teacher_view_all_students")} ({students.length})
            </Link>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 space-y-1">
              <p className="font-medium text-gray-600">{t("no_assignments_yet")}</p>
              <p>{t("login_student_accounts_note")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50/50">
                    <th className="font-semibold py-2.5 px-4">Student</th>
                    <th className="font-semibold py-2.5 px-3">Roll No (Login ID)</th>
                    <th className="font-semibold py-2.5 px-3">Class / Grade</th>
                    <th className="font-semibold py-2.5 px-3">Village</th>
                    <th className="font-semibold py-2.5 px-4 text-right">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.slice(0, 5).map((s) => (
                    <tr key={s.student_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-ink">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-700">{s.roll_number}</td>
                      <td className="py-2.5 px-3 text-gray-500">Grade {s.grade_level}</td>
                      <td className="py-2.5 px-3 text-gray-400">{s.village || "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/teacher/students?studentId=${s.student_id}`}
                          className="text-xs font-semibold text-emerald hover:underline"
                        >
                          {t("actions")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Generate AI Assignment Modal */}
        {showPublishModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald" />
                  <span>{t("teacher_create_assignment_modal_title")}</span>
                </h3>
                <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <form onSubmit={handleGenerateAssignment} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">{t("teacher_modal_title_label")}</label>
                  <input
                    type="text"
                    required
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g. Sources of Water in Village Ecosystem"
                    className="w-full p-2 border rounded-lg outline-none focus:border-emerald"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">{t("teacher_modal_subject_label")}</label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white outline-none focus:border-emerald"
                    >
                      <option value="Science">Science (EVS)</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Language">Language &amp; Literature</option>
                      <option value="Social Studies">Social Studies</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">{t("teacher_modal_grade_label")}</label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(Number(e.target.value))}
                      className="w-full p-2 border rounded-lg bg-white outline-none focus:border-emerald"
                    >
                      <option value={1}>Class 1</option>
                      <option value={2}>Class 2</option>
                      <option value={3}>Class 3</option>
                      <option value={4}>Class 4</option>
                      <option value={5}>Class 5</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">{t("teacher_modal_lang_label")}</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white outline-none focus:border-emerald"
                    >
                      <option value="sat">Santali (Ol Chiki ᱚᱞ ᱪᱤᱠᱤ)</option>
                      <option value="gon">Gondi (Tribal)</option>
                      <option value="hi">Hindi (Localized)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 block">{t("teacher_modal_difficulty_label")}</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full p-2 border rounded-lg bg-white outline-none focus:border-emerald"
                    >
                      <option value="easy">Easy (Foundational)</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="hard">Hard (Conceptual)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 block">{t("teacher_modal_questions_label")}</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full p-2 border rounded-lg outline-none focus:border-emerald"
                  />
                </div>

                {publishStatus && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>{publishStatus}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPublishModal(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={publishing}>
                    {publishing ? t("teacher_modal_generating") : t("teacher_modal_btn_generate")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
