"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Folder,
  Plus,
  UploadCloud,
  FileText,
  Calendar,
  Sparkles,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ChevronRight,
  ExternalLink,
  Award,
  Layers,
} from "lucide-react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DocumentItem {
  id?: string;
  document_id: string;
  filename: string;
  grade_hint?: string;
  subject_hint?: string;
  total_pages?: number;
  total_chunks?: number;
  total_concepts?: number;
  status: string;
  created_at?: string;
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
  pdf_download_url: string;
  created_at: string;
  items?: any[];
}

export default function TeacherMaterialsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [targetSubject, setTargetSubject] = useState("Science");
  const [targetGrade, setTargetGrade] = useState("4");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [autoGenerateAssignment, setAutoGenerateAssignment] = useState(true);
  const [targetLanguage, setTargetLanguage] = useState("sat");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Inspect Modal State
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docs, assigns] = await Promise.all([
        api.content.listDocuments().catch(() => []),
        api.assignments.list().catch(() => []),
      ]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setAssignments(Array.isArray(assigns) ? assigns : []);
    } catch (e) {
      console.error("Failed to load materials data:", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setUploadError("Please select a curriculum file (.pdf, .pptx, .txt, .md) to upload.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadStep("Ingesting file and extracting concepts via Aaroh-AI...");

    try {
      const uploadRes = await api.content.upload(
        uploadedFile,
        `Grade ${targetGrade}`,
        targetSubject
      );

      setUploadStep("Document ingested successfully. Analyzing concepts...");

      let newAssignment: AssignmentItem | null = null;
      if (autoGenerateAssignment) {
        setUploadStep("Generating localized assignment with real IndicTrans2 & pedagogical reasoning...");
        newAssignment = await api.assignments.generate({
          document_id: uploadRes.document_id,
          grade: parseInt(targetGrade, 10),
          subject: targetSubject,
          target_language: targetLanguage,
          number_of_questions: questionCount,
          difficulty: difficulty,
          title: materialTitle.trim() || `${targetSubject} Grade ${targetGrade} Assessment`,
        });
      }

      await fetchData();
      setShowUploadModal(false);
      setMaterialTitle("");
      setUploadedFile(null);

      showToast(
        newAssignment
          ? "Material ingested and localized assignment generated with printable PDF!"
          : "Material uploaded and concepts extracted successfully!"
      );

      if (newAssignment) {
        setSelectedAssignment(newAssignment);
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      setUploadError(err?.message || "Failed to process curriculum material. Please check backend connection.");
    } finally {
      setUploading(false);
      setUploadStep("");
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.subject.toLowerCase().includes(q) ||
      a.language.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />

      <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-ink">Curriculum Materials &amp; AI Worksheets</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload textbook chapters, extract atomic concepts, and generate mother-tongue localized worksheets
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setUploadError("");
                setShowUploadModal(true);
              }}
              className="text-xs gap-1.5 h-8 bg-emerald hover:bg-emerald/90 text-white"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Textbook / Chapter</span>
            </Button>
          </div>
        </div>

        {/* Feedback alert */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-medium">
            {toastMessage}
          </div>
        )}

        {/* Section 1: Ingested Curriculum Documents */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Ingested Curriculum Documents
              </h2>
              <p className="text-[11px] text-gray-500">
                Textbooks and syllabus materials parsed by Aaroh-AI OCR &amp; concept extraction engine
              </p>
            </div>
            <span className="text-xs text-gray-500">
              <strong className="text-ink">{documents.length}</strong> documents
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading curriculum documents...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No textbook files ingested yet. Click &quot;Upload Textbook / Chapter&quot; above to ingest curriculum documents.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-4 font-semibold">Document Filename</th>
                    <th className="py-2.5 px-3 font-semibold">Grade &amp; Subject</th>
                    <th className="py-2.5 px-3 font-semibold">Pages / Chunks</th>
                    <th className="py-2.5 px-3 font-semibold">Extracted Concepts</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.document_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald shrink-0" />
                          <span>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {doc.grade_hint || "Grade 4"} · {doc.subject_hint || "Science"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {doc.total_pages || 1} pages ({doc.total_chunks || 1} chunks)
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">
                          {doc.total_concepts || 0} atomic concepts
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald shrink-0" />
                          {doc.status || "COMPLETED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Generated Localized Worksheets & Assignments */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Generated Localized Worksheets
              </h2>
              <p className="text-[11px] text-gray-500">
                Printable bilingual worksheets anchored in local folklore and rural real-world contexts
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search worksheets..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:border-emerald text-ink"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading worksheets...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No worksheets generated yet. Upload a document to generate localized worksheets.
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
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAssignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-ink">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald shrink-0" />
                          <span>{assign.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {assign.subject} · Grade {assign.grade}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium uppercase text-[10px]">
                          {assign.language === "sat" ? "Santali (Ol Chiki)" : assign.language}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        {assign.total_questions} items ({assign.total_marks || 20} marks)
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-gray-600 font-medium">
                          {assign.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAssignment(assign)}
                            className="px-2 py-1 text-xs text-emerald hover:text-emerald-800 font-medium hover:bg-emerald-50 rounded transition-colors"
                          >
                            Review Items
                          </button>
                          <a
                            href={api.assignments.getPdfUrl(assign.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-gray-600" />
                            <span>Print PDF</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Upload & AI Processing */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-bold text-ink">Upload Study Material</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Aaroh-AI will perform OCR, extract concepts, and generate localized worksheets
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadMaterial} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Material Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="e.g. Chapter 4: Water and Environment"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Subject <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={targetSubject}
                      onChange={(e) => setTargetSubject(e.target.value)}
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
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Select Textbook File (PDF, PPTX, Text, or Markdown) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.pptx,.txt,.md"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none text-gray-700 bg-white file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoGen"
                      checked={autoGenerateAssignment}
                      onChange={(e) => setAutoGenerateAssignment(e.target.checked)}
                      className="rounded text-emerald focus:ring-emerald"
                    />
                    <label htmlFor="autoGen" className="text-xs font-bold text-gray-800">
                      Auto-generate Mother-Tongue Worksheet with Printable PDF
                    </label>
                  </div>

                  {autoGenerateAssignment && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-0.5">Language</label>
                        <select
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value)}
                          className="w-full p-1.5 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                        >
                          <option value="sat">Santali (Ol Chiki)</option>
                          <option value="hi">Hindi</option>
                          <option value="en">English</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-500 block mb-0.5">Questions</label>
                        <select
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                        >
                          <option value={3}>3 questions</option>
                          <option value={5}>5 questions</option>
                          <option value={8}>8 questions</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-500 block mb-0.5">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                          className="w-full p-1.5 border border-gray-200 rounded bg-white text-ink text-xs font-medium"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-emerald shrink-0" />
                    <span>{uploadStep}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={uploading}
                    className="bg-emerald hover:bg-emerald/90 text-white"
                  >
                    {uploading ? "Processing..." : "Upload & Analyze"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Review Worksheet Items */}
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-5 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-bold text-ink">{selectedAssignment.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedAssignment.subject} · Grade {selectedAssignment.grade} · Language: {selectedAssignment.language.toUpperCase()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Generated Worksheet Items &amp; Local Analogies
                  </span>
                  <a
                    href={api.assignments.getPdfUrl(selectedAssignment.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald text-white text-xs font-semibold rounded hover:bg-emerald/90 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Download Official PDF</span>
                  </a>
                </div>

                {selectedAssignment.items && selectedAssignment.items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedAssignment.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-ink">
                            Question {idx + 1} ({item.item_type || "Question"} · {item.marks || 2} Marks)
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            {item.concept_code || "Concept"}
                          </span>
                        </div>

                        <p className="text-gray-800 font-medium">
                          {item.prompt}
                        </p>

                        {item.localized_context && (
                          <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded text-[11px] text-amber-900">
                            <strong>Rural Anchor / Analogy:</strong> {item.localized_context}
                          </div>
                        )}

                        {item.options && item.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {item.options.map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                className={cn(
                                  "p-1.5 rounded border text-[11px]",
                                  opt === item.correct_answer
                                    ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900"
                                    : "bg-white border-gray-200 text-gray-700"
                                )}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded text-[11px] text-gray-700">
                          <strong>Expected Answer / Rubric:</strong> {item.correct_answer}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No questions recorded for this worksheet.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedAssignment(null)}
                  className="bg-emerald hover:bg-emerald/90 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
