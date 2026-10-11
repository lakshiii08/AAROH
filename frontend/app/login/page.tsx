"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, AlertCircle, Sparkles, Globe, GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher";

const DEMO_SCHOOL_CODE = process.env.NEXT_PUBLIC_DEMO_SCHOOL_CODE || "DEMO01";
const DEMO_STUDENT_ROLL_NUMBER = process.env.NEXT_PUBLIC_DEMO_STUDENT_ROLL_NUMBER || "24";
const DEMO_STUDENT_PASSWORD = process.env.NEXT_PUBLIC_DEMO_STUDENT_PASSWORD || "1234";
const DEMO_TEACHER_LOGIN = process.env.NEXT_PUBLIC_DEMO_TEACHER_LOGIN || "teacher@123";
const DEMO_TEACHER_PASSWORD = process.env.NEXT_PUBLIC_DEMO_TEACHER_PASSWORD || "teacher@123";

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [role, setRole] = useState<Role>("student");
  const [rollNo, setRollNo] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      if (role === "student") {
        if (!rollNo.trim() || !pin.trim() || !schoolCode.trim()) {
          setErrorMessage("Please enter School Code, Roll Number, and Password.");
          setLoading(false);
          return;
        }

        await api.auth.studentLogin(rollNo.trim(), pin.trim(), schoolCode.trim());
        router.push("/student/dashboard");
      } else {
        if (!email.trim() || !password) {
          setErrorMessage("Please enter Email / Identifier and Password.");
          setLoading(false);
          return;
        }

        await api.auth.login(email.trim(), password);
        router.push("/teacher/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials. Please verify with your school.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoRole: Role) {
    setErrorMessage("");
    setLoading(true);

    try {
      if (demoRole === "student") {
        setRole("student");
        setSchoolCode(DEMO_SCHOOL_CODE);
        setRollNo(DEMO_STUDENT_ROLL_NUMBER);
        setPin(DEMO_STUDENT_PASSWORD);
        await api.auth.studentLogin(DEMO_STUDENT_ROLL_NUMBER, DEMO_STUDENT_PASSWORD, DEMO_SCHOOL_CODE);
        router.push("/student/dashboard");
      } else {
        setRole("teacher");
        setEmail(DEMO_TEACHER_LOGIN);
        setPassword(DEMO_TEACHER_PASSWORD);
        await api.auth.login(DEMO_TEACHER_LOGIN, DEMO_TEACHER_PASSWORD);
        router.push("/teacher/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login is unavailable. Please check backend demo settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-[#FAF8F5]">
      {/* Left panel: Simple School Portal Identity */}
      <div className="w-full md:w-80 lg:w-96 bg-emerald text-white p-6 sm:p-8 md:p-10 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight block">AAROH</span>
              <span className="text-white/70 text-xs font-medium">
                {language === "sat"
                  ? "ᱟᱭᱳ ᱟᱲᱟᱝ ᱥᱮᱪᱮᱫ ᱯᱞᱮᱴᱯᱷᱳᱨᱢ"
                  : language === "hi"
                  ? "मातृभाषा शिक्षण मंच"
                  : "Mother-Tongue Learning Platform"}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <h2 className="font-display text-xl font-bold">
              {role === "student" ? t("login_left_student_title") : t("login_left_teacher_title")}
            </h2>
            <p className="text-xs text-white/75 leading-relaxed">
              {role === "student" ? t("login_left_student_desc") : t("login_left_teacher_desc")}
            </p>
          </div>

          <div className="p-3.5 bg-white/10 rounded-lg border border-white/15 text-xs space-y-1.5">
            <div className="font-semibold text-white/95 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t("login_ai_engine_title")}</span>
            </div>
            <p className="text-white/70 text-[11px] leading-normal">
              {t("login_ai_engine_desc")}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-white/60 pt-6">
          AAROH Education · Rural &amp; Tribal Primary Schools
        </div>
      </div>

      {/* Right panel: Login Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative">
        {/* Global Language Selector Header */}
        <div className="w-full max-w-sm flex items-center justify-between pb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Globe className="w-4 h-4 text-emerald" />
            <span>{t("language_selector_label") || "Language / ᱯᱟᱹᱨᱥᱤ"}</span>
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-ink shadow-xs">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer pr-1 text-ink"
              aria-label="Select system language"
            >
              <option value="sat">ᱥᱟᱱᱛᱟᱲᱤ (Santali)</option>
              <option value="en">English (EN)</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white border border-gray-200/80 rounded-xl shadow-xs p-6 space-y-5">
          {/* Header */}
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-ink">{t("login_title")}</h3>
            <p className="text-xs text-gray-500">
              {role === "student" ? t("login_subtitle_student") : t("login_subtitle_teacher")}
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200/80 rounded text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role Toggle Tabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
              {t("login_type_label")}
            </label>
            <div className="grid grid-cols-2 p-0.5 bg-gray-100 rounded border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setErrorMessage("");
                }}
                className={cn(
                  "py-1.5 font-medium rounded transition-colors text-center cursor-pointer",
                  role === "student"
                    ? "bg-white text-ink font-semibold shadow-xs"
                    : "text-gray-600 hover:text-ink"
                )}
              >
                {t("login_student_tab")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("teacher");
                  setErrorMessage("");
                }}
                className={cn(
                  "py-1.5 font-medium rounded transition-colors text-center cursor-pointer",
                  role === "teacher"
                    ? "bg-white text-ink font-semibold shadow-xs"
                    : "text-gray-600 hover:text-ink"
                )}
              >
                {t("login_teacher_tab")}
              </button>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {role === "student" ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    {t("login_school_code_label")}
                  </label>
                  <input
                    type="text"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="School code"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    {t("login_roll_label")}
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="Roll number"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    {t("login_pin_label")}
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white font-mono"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    {t("login_teacher_email_label")}
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@example.org"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700 block">
                    {t("login_password_label")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded outline-none focus:border-emerald font-medium text-ink bg-white"
                    required
                  />
                </div>
              </>
            )}

            <div className="pt-2">
              <Button type="submit" variant="primary" size="md" className="w-full text-xs" disabled={loading}>
                {loading
                  ? t("login_verifying")
                  : role === "student"
                  ? t("login_btn_student")
                  : t("login_btn_teacher")}
              </Button>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-[11px]"
              disabled={loading}
              onClick={() => handleDemoLogin("student")}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Demo Student
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-[11px]"
              disabled={loading}
              onClick={() => handleDemoLogin("teacher")}
            >
              <UserRound className="w-3.5 h-3.5" />
              Demo Teacher
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
