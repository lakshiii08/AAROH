"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  Award,
  Star,
  FileText,
  Download,
  Folder,
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { SubjectItem, SubmissionItem } from "@/lib/db";
import { cn } from "@/lib/utils";

export default function StudentEvaluationsPage() {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [evaluations, setEvaluations] = useState<SubmissionItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvaluationsData();
  }, []);

  const fetchEvaluationsData = async () => {
    setLoading(true);
    try {
      const [subRes, profRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/user/preference"),
      ]);
      const subData = await subRes.json();
      const profData = await profRes.json();
      const studentId = profData.profile?.id || "s1";

      const evalRes = await fetch(`/api/evaluations?studentId=${studentId}`);
      const evalData = await evalRes.json();

      if (subData.subjects) setSubjects(subData.subjects);
      if (evalData.evaluations) setEvaluations(evalData.evaluations);
    } catch (e) {
      console.error("Failed to load evaluations:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations =
    selectedSubjectId === "all"
      ? evaluations
      : evaluations.filter((e) => e.subjectId === selectedSubjectId);

  const averageScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((acc, curr) => acc + (curr.scorePercentage || 85), 0) /
            evaluations.length
        )
      : 0;

  const handleDownloadReport = (sub: SubmissionItem) => {
    const reportText = `AAROH ACADEMIC EVALUATION & MARKS CARD
Student: ${sub.studentName}
Worksheet: ${sub.worksheetTitle}
Subject: ${sub.subjectName}
Marks Obtained: ${sub.marks || "18/20"} (${sub.grade || "A"})
Evaluated Date: ${sub.checkedAt ? new Date(sub.checkedAt).toLocaleDateString() : new Date().toLocaleDateString()}

TEACHER REMARKS & FEEDBACK:
${sub.feedback || "Good work. Keep practicing."}

QUESTIONS & BILINGUAL TRANSLATION:
${
  sub.answers
    ? sub.answers
        .map(
          (a, i) => `
Q${i + 1}: ${a.question}
Your Santali (Ol Chiki) Answer: ${a.studentAnswerSantali}
AI Reverse Translation (Hindi): ${a.aiConvertedHindi}
AI Reverse Translation (English): ${a.aiConvertedEnglish}
`
        )
        .join("\n---\n")
    : "Evaluated directly from submitted PDF."
}
`;
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sub.worksheetTitle.replace(/\s+/g, "_")}_Evaluated.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <StudentSideNav />

      <main className="flex-1 min-w-0 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/student/dashboard"
                className="text-xs text-gray-500 hover:text-ink inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t("nav_dashboard")}</span>
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-xs text-emerald font-semibold">{t("nav_evaluations")}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("eval_title")}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("eval_subtitle")}
            </p>
          </div>

          <Badge tone="emerald" className="self-start sm:self-auto text-xs px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" /> {t("eval_graded_assignments", { count: evaluations.length })}
          </Badge>
        </div>

        {/* Overall Academic Progress Banner */}
        <section className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald uppercase tracking-wider">
              {t("eval_academic_standing")}
            </span>
            <h2 className="font-display font-bold text-lg text-ink">
              {t("eval_overall_average", { score: averageScore })}
            </h2>
            <p className="text-xs text-gray-500 max-w-md">
              {t("eval_standing_desc")}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-emerald-50/80 border border-emerald-200/60 rounded-lg px-4 py-2.5 text-center">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                {t("eval_worksheets_graded")}
              </span>
              <span className="font-display font-bold text-xl text-emerald-900 mt-0.5 block">
                {evaluations.length}
              </span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/60 rounded-lg px-4 py-2.5 text-center">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
                {t("eval_average_grade")}
              </span>
              <span className="font-display font-bold text-xl text-amber-900 mt-0.5 block">
                A
              </span>
            </div>
          </div>
        </section>

        {/* Subject Folders Filter */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-0.5">
              {t("eval_filter_subject")}
            </h2>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedSubjectId("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors border",
                selectedSubjectId === "all"
                  ? "bg-emerald text-white border-emerald"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              )}
            >
              {t("eval_all_subjects", { count: evaluations.length })}
            </button>
            {subjects.map((sub) => {
              const count = evaluations.filter((e) => e.subjectId === sub.id).length;
              const isSelected = selectedSubjectId === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors border flex items-center gap-1.5",
                    isSelected
                      ? "bg-emerald text-white border-emerald"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                >
                  <Folder className="w-3 h-3" />
                  <span>{sub.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1 py-0.2 rounded-full",
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Evaluated Worksheets List */}
        <section className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">{t("loading")}</div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-gray-200 rounded-xl bg-cream/20">
              <CheckSquare className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-600">{t("eval_no_evaluations")}</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {t("eval_no_evaluations_desc")}
              </p>
            </div>
          ) : (
            filteredEvaluations.map((evalItem) => {
              const formattedDate = evalItem.checkedAt
                ? new Date(evalItem.checkedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Recently Checked";

              return (
                <div
                  key={evalItem.id}
                  className="bg-white border border-gray-200/80 rounded-xl p-5 sm:p-6 space-y-4 hover:border-gray-300 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge tone="slate" className="text-xs">
                          {evalItem.subjectName}
                        </Badge>
                        <Badge tone="emerald" className="text-xs font-semibold">
                          Grade: {evalItem.grade || "A"}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          {formattedDate}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base text-ink">
                        {evalItem.worksheetTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                          {t("eval_marks_obtained", { marks: "" }).trim()}
                        </span>
                        <span className="font-display font-bold text-xl text-emerald-800">
                          {evalItem.marks}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(evalItem)}
                        className="text-xs gap-1"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span>{t("eval_download_report")}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Teacher Feedback Box */}
                  {evalItem.feedback && (
                    <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-emerald-950 space-y-1">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800 block">
                        {t("eval_teacher_feedback")}:
                      </span>
                      <p className="italic leading-relaxed">
                        &quot;{evalItem.feedback}&quot;
                      </p>
                    </div>
                  )}

                  {/* Question & Answer Bilingual Breakdown */}
                  {evalItem.answers && evalItem.answers.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        {t("eval_title")} &amp; {t("eval_your_answer_sat")}
                      </span>

                      <div className="space-y-2.5">
                        {evalItem.answers.map((ans, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-cream/40 border border-gray-100 space-y-2 text-xs"
                          >
                            <div className="font-semibold text-gray-900">
                              {t("question_label")} {idx + 1}: {ans.question}
                            </div>

                            <div className="p-2.5 bg-white border border-gray-200/80 rounded-md">
                              <span className="text-[10px] font-bold text-emerald uppercase tracking-wider block">
                                {t("eval_your_answer_sat")}:
                              </span>
                              <p className="text-sm font-medium text-ink mt-0.5">
                                {ans.studentAnswerSantali}
                              </p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 bg-amber-50/50 rounded border border-amber-100/60">
                                <span className="font-bold text-amber-800 block">
                                  {t("eval_reverse_hindi")}:
                                </span>
                                <span className="text-ink">{ans.aiConvertedHindi}</span>
                              </div>
                              <div className="p-2 bg-emerald-50/50 rounded border border-emerald-100/60">
                                <span className="font-bold text-emerald-800 block">
                                  {t("eval_reverse_english")}:
                                </span>
                                <span className="text-ink">{ans.aiConvertedEnglish}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
