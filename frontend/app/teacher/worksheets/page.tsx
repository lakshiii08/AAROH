"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  UploadCloud,
  FileText,
  Calendar,
  Sparkles,
  Search,
  CheckCircle2,
  Printer,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
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

export default function TeacherWorksheetsPage() {
  const [worksheets, setWorksheets] = useState<AssignmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Upload/Generate Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Science");
  const [grade, setGrade] = useState("4");
  const [language, setLanguage] = useState("sat");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successToast, setSuccessToast] = useState("");

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setGenerating(true);
    setErrorMsg("");

    try {
      await api.assignments.generate({
        title: title.trim(),
        subject,
        grade: parseInt(grade, 10),
        target_language: language,
        difficulty,
        number_of_questions: questionCount,
      });

      await fetchWorksheets();
      setShowGenerateModal(false);
      setTitle("");
      setSuccessToast(`Worksheet "${title.trim()}" generated with printable PDF!`);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err: any) {
      console.error("Failed to generate worksheet:", err);
      setErrorMsg(err?.message || "Failed to generate worksheet. Please check backend connection.");
    } finally {
      setGenerating(false);
    }
  };

  const filteredWorksheets = worksheets.filter((ws) => {
    const matchesSearch =
      ws.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject =
      selectedSubjectFilter === "all" ||
      ws.subject.toLowerCase() === selectedSubjectFilter.toLowerCase();
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />

      <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-ink">Bilingual Worksheets &amp; Printables</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Teacher-approved printable worksheets with Santali (Ol Chiki) translations and rural analogies
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              <strong className="text-ink">{worksheets.length}</strong> active worksheets
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setErrorMsg("");
                setShowGenerateModal(true);
              }}
              className="text-xs gap-1.5 h-8 bg-emerald hover:bg-emerald/90 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Worksheet</span>
            </Button>
          </div>
        </div>

        {/* Feedback alert */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-medium">
            {successToast}
          </div>
        )}

        {/* Section: Worksheets Roster */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Active Classroom Worksheets
              </h2>
              <p className="text-[11px] text-gray-500">
                Print, assign, and distribute curriculum-aligned sheets in local languages
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:border-emerald text-ink font-medium"
              >
                <option value="all">All Subjects</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Environmental Studies">Environmental Studies</option>
              </select>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search worksheet title..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:border-emerald text-ink"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading worksheets...</div>
          ) : filteredWorksheets.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No worksheets created yet. Click &quot;Generate Worksheet&quot; above to create a mother-tongue worksheet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-4 font-semibold">Title</th>
                    <th className="py-2.5 px-3 font-semibold">Subject &amp; Class</th>
                    <th className="py-2.5 px-3 font-semibold">Language</th>
                    <th className="py-2.5 px-3 font-semibold">Questions</th>
                    <th className="py-2.5 px-3 font-semibold">Difficulty</th>
                    <th className="py-2.5 px-3 font-semibold">Created</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredWorksheets.map((ws) => (
                    <tr key={ws.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald shrink-0" />
                          <span>{ws.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {ws.subject} · Grade {ws.grade}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium uppercase text-[10px]">
                          {ws.language === "sat" ? "Santali (Ol Chiki)" : ws.language}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        {ws.total_questions} items ({ws.total_marks || 20} marks)
                      </td>
                      <td className="py-3 px-3 capitalize text-gray-600">
                        {ws.difficulty}
                      </td>
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {ws.created_at ? new Date(ws.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recent"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <a
                          href={api.assignments.getPdfUrl(ws.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald text-white text-xs font-semibold rounded hover:bg-emerald/90 transition-colors shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Generate Worksheet */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-bold text-ink">Generate Localized Worksheet</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generates curriculum-grounded questions with Santali translation and printable PDF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Worksheet Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Science Grade 4: Water Cycle & Sources"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Subject <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald text-ink bg-white font-medium"
                    >
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Environmental Studies">Environmental Studies</option>
                      <option value="Social Studies">Social Studies</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Class / Grade <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald text-ink bg-white font-medium"
                    >
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                    >
                      <option value="sat">Santali</option>
                      <option value="hi">Hindi</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">Questions</label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full p-2 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                    >
                      <option value={3}>3 Items</option>
                      <option value={5}>5 Items</option>
                      <option value={8}>8 Items</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as any)}
                      className="w-full p-2 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGenerateModal(false)}
                    disabled={generating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={generating}
                    className="bg-emerald hover:bg-emerald/90 text-white"
                  >
                    {generating ? "Synthesizing with AI..." : "Generate Worksheet"}
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
