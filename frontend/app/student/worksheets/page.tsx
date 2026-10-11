"use client";

import { useEffect, useState } from "react";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { api } from "@/lib/api";
import {
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  BookOpen,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  grade: number;
  language: string;
  difficulty: string;
  total_questions: number;
  total_marks: number;
  pdf_download_url: string;
  created_at: string;
  items?: any[];
}

interface SubmissionResult {
  assignment_id: string;
  student_id: string;
  total_questions: number;
  evaluated_score: number;
  score_percentage: number;
  grade: string;
  mastery_status: string;
  concept_gaps: string[];
  feedback: string;
}

export default function StudentWorksheetsPage() {
  const { t } = useLanguage();
  const [worksheets, setWorksheets] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Solving State
  const [solvingAssignment, setSolvingAssignment] = useState<AssignmentItem | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    fetchWorksheets();
  }, []);

  const fetchWorksheets = async () => {
    setLoading(true);
    try {
      const data = await api.assignments.list();
      setWorksheets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load worksheets:", e);
      setWorksheets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSolving = async (ws: AssignmentItem) => {
    let fullAssignment = ws;
    if (!ws.items || ws.items.length === 0) {
      try {
        const fetched = await api.assignments.get(ws.id);
        if (fetched) fullAssignment = fetched;
      } catch (err) {
        console.error("Failed to fetch assignment details:", err);
      }
    }
    setSolvingAssignment(fullAssignment);
    setStudentAnswers({});
    setSubmissionResult(null);
  };

  const handleAnswerChange = (itemIdx: number, answerText: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [itemIdx.toString()]: answerText,
    }));
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solvingAssignment) return;

    setSubmitting(true);
    try {
      const currentUser = api.getCurrentUser();
      const resp = await api.assignments.submit(solvingAssignment.id, {
        student_id: currentUser?.user_id || "s1",
        student_name: currentUser?.name || "Student",
        answers: studentAnswers,
      });
      setSubmissionResult(resp);
    } catch (err: any) {
      console.error("Failed to submit assignment answers:", err);
      alert(err.message || t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />

      <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("worksheets_title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("worksheets_subtitle_full")}
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {t("assignments_available", { count: worksheets.length })}
          </span>
        </div>

        {/* Worksheets Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">{t("loading")}</div>
        ) : worksheets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-2">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="font-bold text-base text-ink">{t("no_worksheets_title")}</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {t("no_worksheets_desc")}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {worksheets.map((ws) => (
              <div
                key={ws.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-semibold">
                      {ws.subject} · Grade {ws.grade}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded uppercase">
                      {ws.language === "sat" ? "ᱥᱟᱱᱛᱟᱲᱤ" : ws.language}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-ink">{ws.title}</h3>
                  <p className="text-xs text-gray-500">
                    {t("questions_count", { count: ws.total_questions })} · {t("marks_count", { count: ws.total_marks || 20 })} · {ws.difficulty}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <a
                    href={api.assignments.getPdfUrl(ws.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-600" />
                    <span>{t("print_pdf")}</span>
                  </a>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartSolving(ws)}
                    className="bg-emerald hover:bg-emerald/90 text-white text-xs h-8 px-4"
                  >
                    {t("solve_worksheet")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Interactive Worksheet Solver */}
        {solvingAssignment && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-ink">{solvingAssignment.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {solvingAssignment.subject} · Grade {solvingAssignment.grade} · ᱥᱟᱱᱛᱟᱲᱤ (Santali)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSolvingAssignment(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* If already submitted, show evaluation report */}
              {submissionResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                      <CheckCircle2 className="w-5 h-5 text-emerald shrink-0" />
                      <span>{t("eval_results")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div>
                        <span className="text-gray-500 block">{t("score_label")}:</span>
                        <strong className="text-emerald-900 font-bold text-lg font-mono">
                          {submissionResult.score_percentage}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Grade:</span>
                        <strong className="text-emerald-900 font-bold text-lg font-mono">
                          {submissionResult.grade}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">{t("dashboard_mastery")}:</span>
                        <strong className="text-emerald-900 font-bold text-sm capitalize">
                          {submissionResult.mastery_status}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 space-y-1">
                    <span className="font-bold block">{t("teacher_feedback")}:</span>
                    <p>{submissionResult.feedback}</p>
                  </div>

                  {submissionResult.concept_gaps && submissionResult.concept_gaps.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
                      <span className="font-bold block">{t("concept_gaps")}:</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {submissionResult.concept_gaps.map((gap, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-amber-300 rounded font-medium">
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-3 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setSolvingAssignment(null)}
                      className="bg-emerald hover:bg-emerald/90 text-white"
                    >
                      {t("close")}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Interactive questions form */
                <form onSubmit={handleSubmitAnswers} className="space-y-5">
                  <div className="space-y-4">
                    {solvingAssignment.items && solvingAssignment.items.length > 0 ? (
                      solvingAssignment.items.map((item, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ink text-sm">
                              {t("question_label")} {idx + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-500">
                              {t("marks_count", { count: item.marks || 2 })}
                            </span>
                          </div>

                          <p className="text-ink font-medium text-sm leading-relaxed">
                            {item.prompt}
                          </p>

                          {item.localized_context && (
                            <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded text-[11px] text-amber-900">
                              <strong>Context:</strong> {item.localized_context}
                            </div>
                          )}

                          {item.options && item.options.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-2 pt-1">
                              {item.options.map((opt: string, optIdx: number) => {
                                const isChecked = studentAnswers[idx.toString()] === opt;
                                return (
                                  <label
                                    key={optIdx}
                                    className={cn(
                                      "flex items-center gap-2 p-2.5 rounded border text-xs cursor-pointer transition-colors",
                                      isChecked
                                        ? "bg-emerald-50 border-emerald-400 font-semibold text-emerald-900"
                                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name={`question_${idx}`}
                                      value={opt}
                                      checked={isChecked}
                                      onChange={() => handleAnswerChange(idx, opt)}
                                      className="text-emerald focus:ring-emerald"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="pt-1">
                              <textarea
                                rows={2}
                                value={studentAnswers[idx.toString()] || ""}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                placeholder={t("answer_placeholder")}
                                className="w-full p-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald bg-white text-ink"
                              />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-500">
                        {t("no_assignments_yet")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSolvingAssignment(null)}
                      disabled={submitting}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={submitting}
                      className="bg-emerald hover:bg-emerald/90 text-white gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? t("worksheets_submitting") : t("submit_for_eval")}</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
