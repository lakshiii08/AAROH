"use client";

import { useEffect, useState } from "react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/components/providers/language-provider";
import { AlertTriangle, BookOpen, CheckCircle2, RefreshCw, Sparkles, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentReportItem {
  id: string;
  name: string;
  rollNo: string;
  grade: string;
  accuracy: number;
  cardsReviewed: number;
  weakConcepts: string[];
}

export default function FlashcardReportPage() {
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (data && Array.isArray(data.students)) {
        setStudents(data.students);
      }
    } catch (e) {
      console.error("Failed to load flashcard report:", e);
    } finally {
      setLoading(false);
    }
  };

  const strugglingStudents = students.filter((s) => s.weakConcepts && s.weakConcepts.length > 0);
  const totalCardsReviewed = students.reduce((sum, s) => sum + (s.cardsReviewed || 0), 0);
  const averageClassAccuracy = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.accuracy || 75), 0) / students.length)
    : 80;

  // Extract all concept gaps reported by students
  const conceptGapFrequency: Record<string, { count: number; studentNames: string[] }> = {};
  students.forEach((s) => {
    (s.weakConcepts || []).forEach((c) => {
      if (!conceptGapFrequency[c]) {
        conceptGapFrequency[c] = { count: 0, studentNames: [] };
      }
      conceptGapFrequency[c].count++;
      conceptGapFrequency[c].studentNames.push(s.name);
    });
  });

  const hardestConcepts = Object.entries(conceptGapFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6);

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />
      <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              {t("nav_teacher_report") || "Flashcard Mastery & Concept Gaps"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Live student retention across the 10M+ Santali (Ol Chiki) vocabulary deck.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchReportData}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald", loading && "animate-spin")} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Telemetry Overview Cards */}
        <section className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Class Average Accuracy</p>
              <p className="font-display text-2xl font-bold text-emerald">{averageClassAccuracy}%</p>
              <p className="text-xs text-gray-500">Across active vocabulary sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Card Reviews</p>
              <p className="font-display text-2xl font-bold text-ink">{totalCardsReviewed}</p>
              <p className="text-xs text-gray-500">Unique cards practiced by students</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Students Needing Remediation</p>
              <p className="font-display text-2xl font-bold text-amber-700">{strugglingStudents.length}</p>
              <p className="text-xs text-amber-700 font-medium">Flagged via &quot;Needs Practice&quot;</p>
            </CardContent>
          </Card>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Concept Gap Frequency Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Live Concept Gaps from Student Flashcards</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hardestConcepts.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-gray-700">All students are retaining concepts well!</p>
                  <p>When students click &quot;Needs practice&quot;, concept gaps will instantly appear here.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50/50">
                      <th className="font-semibold py-2.5 px-5">Concept / Word</th>
                      <th className="font-semibold py-2.5 px-3">Students Struggling</th>
                      <th className="font-semibold py-2.5 px-5">Student Names</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {hardestConcepts.map(([concept, data]) => (
                      <tr key={concept} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-5 font-semibold text-ink">{concept}</td>
                        <td className="py-3 px-3">
                          <Badge tone="amber">{data.count} student(s)</Badge>
                        </td>
                        <td className="py-3 px-5 text-gray-600">
                          {data.studentNames.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Targeted Student Remediation List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald" />
                <span>Targeted Student Remediation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {strugglingStudents.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No students currently flagged for remediation.
                </p>
              ) : (
                strugglingStudents.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-1.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-xs">{s.name} (Roll: {s.rollNo})</span>
                      <span className="text-[11px] font-bold text-emerald-800">{s.accuracy}% accuracy</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.weakConcepts.map((w) => (
                        <Badge key={w} tone="amber" className="text-[10px]">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
