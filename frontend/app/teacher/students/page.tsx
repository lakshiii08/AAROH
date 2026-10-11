"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  Search,
  Check,
  Plus,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  GraduationCap,
  Award,
  BookOpen,
} from "lucide-react";
import { TeacherSideNav } from "@/components/layout/teacher-side-nav";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StudentData {
  id: string;
  student_id?: string;
  name: string;
  roll_number: string;
  grade_level: number;
  school_id: string;
  school_name?: string;
  village?: string;
  section?: string;
  overall_mastery?: number;
  quizzes_taken?: number;
  weak_concepts?: string[];
}

interface AssessmentHistoryItem {
  submission_id?: string;
  quiz_id?: string;
  concept_code?: string;
  score_pct: number;
  correct_count?: number;
  total_questions?: number;
  concept_mastery_level?: number;
  weak_concepts_detected?: string[];
  remedial_recommended?: boolean;
  created_at: string;
}

function TeacherStudentsContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId");

  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentHistory, setStudentHistory] = useState<AssessmentHistoryItem[]>([]);
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Student Creation Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentVillage, setNewStudentVillage] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("4");
  const [newStudentRoll, setNewStudentRoll] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("A");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  // Immediate credential display modal
  const [createdStudentResult, setCreatedStudentResult] = useState<{
    name: string;
    rollNo: string;
    password: string;
    schoolCode?: string;
    schoolId?: string;
  } | null>(null);

  // Reset password modal
  const [pinResetNotice, setPinResetNotice] = useState<{
    studentName: string;
    newPin: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.teachers.listStudents();
      const list: StudentData[] = Array.isArray(data) ? data : [];
      setStudents(list);

      if (list.length > 0) {
        const found = initialStudentId ? list.find((s) => s.id === initialStudentId || s.student_id === initialStudentId) : null;
        const targetId = found ? (found.student_id || found.id) : (list[0].student_id || list[0].id);
        setSelectedStudentId(targetId);
        fetchStudentHistory(targetId);
      }
    } catch (e: any) {
      console.error("Failed to load students:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async (studentId: string) => {
    if (!studentId) return;
    setLoadingHistory(true);
    try {
      const history = await api.assessment.getStudentHistory(studentId);
      setStudentHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error("Failed to load student assessment history:", err);
      setStudentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectedStudent =
    students.find((s) => (s.student_id || s.id) === selectedStudentId) || students[0];

  const handleSelectStudent = (st: StudentData) => {
    const sId = st.student_id || st.id;
    setSelectedStudentId(sId);
    fetchStudentHistory(sId);
  };

  // Filtered roster
  const filteredStudents = students.filter((s) => {
    const q = searchStudentQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      (s.village && s.village.toLowerCase().includes(q))
    );
  });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setCreatingStudent(true);

    try {
      const currentUser = api.getCurrentUser();
      const schoolId = currentUser?.school_id || "SCH_001";

      const res = await api.teachers.createStudent({
        name: newStudentName.trim(),
        roll_number: newStudentRoll.trim(),
        grade_level: parseInt(newStudentGrade, 10) || 4,
        school_id: schoolId,
        village: newStudentVillage.trim() || undefined,
        section: newStudentSection.trim() || undefined,
      });

      // Refresh list
      await fetchStudents();

      // Reset form
      setShowAddModal(false);
      setNewStudentName("");
      setNewStudentRoll("");
      setNewStudentVillage("");

      // Show immediate credential modal
      setCreatedStudentResult({
        name: res.name,
        rollNo: res.roll_number,
        password: res.temporary_password,
        schoolCode: res.school_code || schoolId,
        schoolId: res.school_id,
      });
      setCopied(false);
    } catch (err: any) {
      setAddError(err?.message || "Failed to create student account.");
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleResetPin = async (studentId: string, studentName: string) => {
    if (!confirm(`Generate a new password for ${studentName}? The previous credentials will stop working immediately.`)) return;

    try {
      const res = await api.teachers.resetPassword(studentId);
      setPinResetNotice({
        studentName: res.name || studentName,
        newPin: res.temporary_password,
      });
    } catch (err: any) {
      alert(`PIN reset failed: ${err?.message || "Unknown error"}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen md:flex bg-cream">
      <TeacherSideNav />

      <main className="flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-24 md:pb-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-ink">Student Management &amp; Evaluation</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Secure roster management, auto-generated login credentials, and real assessment records
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              <strong className="text-ink">{students.length}</strong> students enrolled
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAddError("");
                setShowAddModal(true);
              }}
              className="text-xs gap-1.5 h-8 bg-emerald hover:bg-emerald/90 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </Button>
          </div>
        </div>

        {/* Feedback alert */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 font-medium">
            {toastMessage}
          </div>
        )}

        {/* Section 1: Enrolled Students Roster */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Enrolled Students
              </h2>
              <p className="text-[11px] text-gray-500">
                Official roster: Login credentials (Roll Number &amp; Password) and classroom performance
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Search name, roll no, village..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:border-emerald text-ink"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">Loading student roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No students enrolled yet. Click &quot;Add Student&quot; above to create a student account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-4 font-semibold">Student Name</th>
                    <th className="py-2.5 px-3 font-semibold">Village / Section</th>
                    <th className="py-2.5 px-3 font-semibold">Grade</th>
                    <th className="py-2.5 px-3 font-semibold font-mono">Roll Number</th>
                    <th className="py-2.5 px-3 font-semibold">Mastery</th>
                    <th className="py-2.5 px-3 font-semibold">Quizzes Taken</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((st) => {
                    const sId = st.student_id || st.id;
                    const isSelected = (selectedStudent?.student_id || selectedStudent?.id) === sId;

                    return (
                      <tr
                        key={sId}
                        onClick={() => handleSelectStudent(st)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-emerald-50/60 font-medium"
                            : "hover:bg-gray-50/70 text-gray-700"
                        )}
                      >
                        <td className="py-2.5 px-4 font-semibold text-ink">
                          <div className="flex items-center gap-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald shrink-0" />}
                            <span>{st.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 max-w-[180px] truncate">
                          {st.village ? `${st.village} (Sec ${st.section || "A"})` : `Section ${st.section || "A"}`}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">Grade {st.grade_level}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-ink">
                          {st.roll_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald h-full rounded-full"
                                style={{ width: `${st.overall_mastery || 0}%` }}
                              />
                            </div>
                            <span className="text-gray-700 font-mono">{st.overall_mastery || 0}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600">
                          {st.quizzes_taken || 0} attempts
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectStudent(st)}
                              className={cn(
                                "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                                isSelected
                                  ? "bg-emerald text-white"
                                  : "text-gray-600 hover:text-ink hover:bg-gray-100"
                              )}
                            >
                              {isSelected ? "Active" : "View"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetPin(sId, st.name)}
                              title="Reset and generate a new password"
                              className="p-1 text-gray-400 hover:text-ink hover:bg-gray-100 rounded"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 2: Selected Student Overview */}
        {selectedStudent && (
          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">{selectedStudent.name}</h2>
                  <span className="text-xs text-gray-500 font-mono">Roll #{selectedStudent.roll_number}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-600">Grade {selectedStudent.grade_level}</span>
                  {selectedStudent.village && (
                    <>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-500">{selectedStudent.village}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Login Credentials: Roll Number <strong className="text-gray-700 font-mono">{selectedStudent.roll_number}</strong> · School Code <strong className="text-gray-700 font-mono">{selectedStudent.school_id || "SCH_001"}</strong>
                </p>
              </div>

              {/* Real Stats */}
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Mastery</span>
                  <span className="font-semibold text-ink">{selectedStudent.overall_mastery || 0}%</span>
                </div>
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-gray-400 block text-[11px]">Quizzes Taken</span>
                  <span className="font-semibold text-ink">{selectedStudent.quizzes_taken || 0}</span>
                </div>
                <div className="w-px h-6 bg-gray-200" />
                <div>
                  <span className="text-gray-400 block text-[11px]">Section</span>
                  <span className="font-semibold text-ink">{selectedStudent.section || "A"}</span>
                </div>
              </div>
            </div>

            {/* Target Revision Topics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-gray-500 font-medium">Concept Mastery Status:</span>
                <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="bg-emerald h-full rounded-full"
                    style={{ width: `${selectedStudent.overall_mastery || 0}%` }}
                  />
                </div>
                <span className="text-gray-700 font-mono">{selectedStudent.overall_mastery || 0}%</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-gray-500">Weak concepts detected:</span>
                {selectedStudent.weak_concepts && selectedStudent.weak_concepts.length > 0 ? (
                  selectedStudent.weak_concepts.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px]"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">All concepts currently on track</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Assessment & Quiz History */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Assessment History for {selectedStudent?.name}
              </h2>
              <p className="text-[11px] text-gray-500">
                Real quiz evaluations, concept mastery scores, and remedial status
              </p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-8 text-center text-xs text-gray-500">Loading assessment history...</div>
          ) : studentHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No assessment attempts recorded yet for {selectedStudent?.name || "this student"}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-4 font-semibold">Concept Code</th>
                    <th className="py-2.5 px-4 font-semibold">Score</th>
                    <th className="py-2.5 px-3 font-semibold">Mastery Level</th>
                    <th className="py-2.5 px-3 font-semibold">Remedial</th>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentHistory.map((item, idx) => {
                    const formattedDate = item.created_at
                      ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recent";

                    return (
                      <tr key={item.submission_id || idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-ink">
                          {item.concept_code || "Assessment"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "font-bold font-mono",
                            item.score_pct >= 70 ? "text-emerald-700" : item.score_pct >= 40 ? "text-amber-700" : "text-rose-700"
                          )}>
                            {item.score_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-gray-700">
                            {item.concept_mastery_level !== undefined ? `${item.concept_mastery_level}%` : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {item.remedial_recommended ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-medium">
                              Remedial Needed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium">
                              Mastered
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {formattedDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Create Student Account */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-lg border border-gray-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-base font-bold text-ink">Add New Student Account</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    A secure temporary password will be auto-generated upon creation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Student Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Rahul Murmu"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Village / Locality (Optional)
                  </label>
                  <input
                    type="text"
                    value={newStudentVillage}
                    onChange={(e) => setNewStudentVillage(e.target.value)}
                    placeholder="e.g. Dumka Gram"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald text-ink bg-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Class / Grade <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={newStudentGrade}
                      onChange={(e) => setNewStudentGrade(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald text-ink bg-white font-medium"
                    >
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Section
                    </label>
                    <input
                      type="text"
                      value={newStudentSection}
                      onChange={(e) => setNewStudentSection(e.target.value)}
                      placeholder="A"
                      className="w-full px-2 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald text-ink bg-white font-medium uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 block">
                      Roll No <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentRoll}
                      onChange={(e) => setNewStudentRoll(e.target.value)}
                      placeholder="e.g. 27"
                      className="w-full px-2 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-mono font-medium text-ink bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-800">Student Identity Rules:</p>
                  <p>• <strong>Login ID</strong> = Roll Number</p>
                  <p>• <strong>Password</strong> = Auto-generated secure temporary password</p>
                  <p>• Passwords are cryptographically hashed and displayed strictly once.</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={creatingStudent}
                    className="bg-emerald hover:bg-emerald/90 text-white"
                  >
                    {creatingStudent ? "Creating..." : "Create Student Account"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Immediate Credentials Display Confirmation */}
        {createdStudentResult && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald" />
                <h3 className="text-base font-bold text-ink">Student Account Created!</h3>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                Please write down or give these login credentials to the student. They will use their <strong>Roll Number</strong> and this generated password to log in.
              </p>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-gray-500">Student Name:</span>
                  <span className="font-semibold text-ink">{createdStudentResult.name}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-gray-500 font-medium">School Code:</span>
                  <span className="font-mono font-semibold text-ink">{createdStudentResult.schoolCode || "SCH_001"}</span>
                </div>
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-gray-500 font-medium">Login ID (Roll No):</span>
                  <span className="font-bold font-mono text-sm text-ink">{createdStudentResult.rollNo}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-emerald-900 font-bold">Auto-Generated Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-emerald-900 bg-white px-2.5 py-1 rounded border border-emerald-300 tracking-wider">
                      {createdStudentResult.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`School: ${createdStudentResult.schoolCode || "SCH_001"}\nRoll Number: ${createdStudentResult.rollNo}\nPassword: ${createdStudentResult.password}`)}
                      className="p-1.5 text-emerald hover:text-emerald-800 hover:bg-emerald-100 rounded transition-colors"
                      title="Copy credentials"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreatedStudentResult(null)}
                  className="bg-emerald hover:bg-emerald/90 text-white"
                >
                  Done, I Have Noted Down the Credentials
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Password Reset Notification */}
        {pinResetNotice && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-gray-200 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald" />
                <h3 className="text-base font-bold text-ink">New Password Generated</h3>
              </div>
              <p className="text-xs text-gray-600">
                New login credentials generated for <strong>{pinResetNotice.studentName}</strong>:
              </p>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
                <span className="font-mono font-bold text-xl text-ink tracking-wider block">
                  {pinResetNotice.newPin}
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  The previous password is no longer valid.
                </span>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setPinResetNotice(null)}
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

export default function TeacherStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen md:flex bg-cream items-center justify-center p-8">
          <div className="text-xs text-gray-500 font-medium">Loading student performance...</div>
        </div>
      }
    >
      <TeacherStudentsContent />
    </Suspense>
  );
}
