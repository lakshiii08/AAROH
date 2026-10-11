/**
 * Centralized AAROH API client.
 * Talks to the FastAPI backend under /api/v1 with environment-driven hosts.
 */

const API_PREFIX = "/api/v1";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withApiPrefix(baseUrl: string): string {
  const clean = trimTrailingSlash(baseUrl);
  return clean.endsWith(API_PREFIX) ? clean : `${clean}${API_PREFIX}`;
}

function resolveApiBaseUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    "";

  if (!configuredUrl.trim()) {
    return API_PREFIX;
  }

  return withApiPrefix(configuredUrl.trim());
}

const API_BASE_URL = resolveApiBaseUrl();

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UserSession {
  user_id: string;
  role: "ADMIN" | "DISTRICT_ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  name: string;
  school_id?: string;
  district_id?: string;
  roll_number?: string;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

class APIClient {
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("aaroh_token") || null;
  }

  public setTokens(accessToken: string, refreshToken?: string, user?: UserSession): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("aaroh_token", accessToken);
    if (refreshToken) localStorage.setItem("aaroh_refresh_token", refreshToken);
    if (user) localStorage.setItem("aaroh_user", JSON.stringify(user));
  }

  public clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("aaroh_token");
    localStorage.removeItem("aaroh_refresh_token");
    localStorage.removeItem("aaroh_user");
  }

  public getCurrentUser(): UserSession | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("aaroh_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(this.buildUrl(endpoint), {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearTokens();
    }

    const data = await response.json().catch(() => null);

    if (!response.ok || (data && data.success === false)) {
      const errorMessage = data?.error?.message || `HTTP ${response.status}: Failed to communicate with server.`;
      const errorCode = data?.error?.code || "REQUEST_FAILED";
      const err = new Error(errorMessage) as Error & {
        code?: string;
        status?: number;
        details?: unknown;
      };
      err.code = errorCode;
      err.status = response.status;
      err.details = data?.error?.details;
      throw err;
    }

    return (data?.data ?? data) as T;
  }

  private post<T>(endpoint: string, body?: unknown, method: HttpMethod = "POST"): Promise<T> {
    return this.request<T>(endpoint, {
      method,
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  auth = {
    login: async (login_id: string, password: string, school_code?: string) => {
      const res = await this.post<{
        access_token: string;
        refresh_token: string;
        user_id: string;
        role: UserSession["role"];
        name: string;
        school_id?: string;
        district_id?: string;
        roll_number?: string;
      }>("/auth/login", { login_id, password, school_code });

      this.setTokens(res.access_token, res.refresh_token, {
        user_id: res.user_id,
        role: res.role,
        name: res.name,
        school_id: res.school_id,
        district_id: res.district_id,
        roll_number: res.roll_number,
      });
      return res;
    },

    studentLogin: async (roll_number: string, password: string, school_code: string) => {
      const res = await this.post<{
        access_token: string;
        refresh_token: string;
        user_id: string;
        role: "STUDENT";
        name: string;
        school_id: string;
        roll_number: string;
      }>("/auth/student-login", { roll_number, password, school_code });

      this.setTokens(res.access_token, res.refresh_token, {
        user_id: res.user_id,
        role: "STUDENT",
        name: res.name,
        school_id: res.school_id,
        roll_number: res.roll_number,
      });
      return res;
    },

    signupTeacher: async (data: {
      name: string;
      email: string;
      password: string;
      school_id: string;
      district_id?: string;
      employee_id?: string;
      assigned_grades?: number[];
      subjects?: string[];
    }) => this.post("/auth/teacher/signup", data),

    getMe: async () => this.request<UserSession>("/auth/me"),

    logout: async () => {
      try {
        await this.post("/auth/logout");
      } finally {
        this.clearTokens();
      }
    },
  };

  teachers = {
    listStudents: async (grade_level?: number) => {
      const q = grade_level ? `?grade_level=${grade_level}` : "";
      return this.request<any[]>(`/teachers/students${q}`);
    },

    createStudent: async (studentData: {
      name: string;
      roll_number: string;
      grade_level: number;
      school_id: string;
      village?: string;
      section?: string;
    }) => this.post<{
      student_id: string;
      name: string;
      roll_number: string;
      login_id: string;
      temporary_password: string;
      school_id: string;
      school_code?: string;
      created_at: string;
    }>("/teachers/students", studentData),

    getStudent: async (student_id: string) => this.request<any>(`/teachers/students/${student_id}`),

    resetPassword: async (student_id: string) => this.post<{
      student_id: string;
      name: string;
      roll_number: string;
      login_id: string;
      temporary_password: string;
    }>(`/teachers/students/${student_id}/reset-password`),

    getAnalytics: async () => this.request<{
      school_id: string;
      total_students: number;
      class_average_mastery: number;
      learning_gaps_count: number;
      weak_concepts: any[];
    }>("/teachers/analytics"),
  };

  students = {
    getMe: async () => this.request<any>("/students/me"),

    getAssignedLessons: async (grade_level?: number) => {
      const q = grade_level ? `?grade_level=${grade_level}` : "";
      return this.request<any[]>(`/students/lessons${q}`);
    },

    getProgress: async () => this.request<{
      student_id: string;
      overall_mastery: number;
      quizzes_taken: number;
      concept_breakdown: any[];
    }>("/students/progress"),
  };

  content = {
    upload: async (file: File, grade_hint = "Grade 3", subject_hint = "Environmental Studies") => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade_hint", grade_hint);
      formData.append("subject_hint", subject_hint);

      return this.post<{
        document_id: string;
        filename: string;
        status: string;
        total_pages: number;
        total_chunks: number;
        total_concepts: number;
      }>("/content/upload", formData);
    },

    listDocuments: async () => this.request<any[]>("/content/documents"),
    getDocument: async (document_id: string) => this.request<any>(`/content/documents/${document_id}`),
    getConcepts: async (document_id: string) => this.request<{
      document_id: string;
      total_concepts: number;
      concepts: any[];
    }>(`/content/documents/${document_id}/concepts`),

    search: async (params: {
      query: string;
      top_k?: number;
      grade_level?: number;
      subject?: string;
    } | string, top_k = 5) => {
      const body = typeof params === "string" ? { query: params, top_k } : params;
      return this.post<{
        query: string;
        total_results: number;
        results: any[];
      }>("/content/search", body);
    },
  };

  translation = {
    translate: async (params: {
      text: string;
      source_lang?: string;
      target_lang?: string;
      target_dialect?: string;
      apply_glossary?: boolean;
    }) => this.post<{
      original_text: string;
      translated_text: string;
      source_lang: string;
      target_lang: string;
      applied_glossary_terms: any[];
      latency_ms: number;
      backend_used: string;
    }>("/translation/translate", params),

    batch: async (params: {
      texts: string[];
      source_lang?: string;
      target_lang?: string;
      target_dialect?: string;
    }) => this.post<{
      total_count: number;
      total_time_ms: number;
      results: Array<{
        original_text: string;
        translated_text: string;
        applied_glossary_terms: any[];
        latency_ms: number;
      }>;
    }>("/translation/batch", params),

    getLanguages: async () => this.request<{
      supported_languages: string[];
      default_source: string;
      default_target: string;
    }>("/translation/languages"),

    lookupGlossary: async (term: string, source_lang = "en", target_lang = "hi") => {
      const q = new URLSearchParams({ term, source_lang, target_lang });
      return this.request<any>(`/translation/glossary/lookup?${q.toString()}`);
    },

    addGlossaryTerm: async (data: {
      source_term: string;
      translated_term: string;
      source_lang?: string;
      target_lang?: string;
      domain?: string;
      dialects?: Record<string, string>;
      phonetic_hint?: string;
      notes?: string;
    }) => this.post<any>("/translation/glossary/term", data),

    translateLesson: async (document_id: string, data: {
      target_lang?: string;
      target_dialect?: string;
    }) => this.post<any>(`/translation/lessons/${document_id}`, data),
  };

  simplification = {
    localizeConcept: async (concept_code: string, data: {
      target_language?: string;
      target_dialect?: string;
      grade_level?: number;
      force_regenerate?: boolean;
    }) => this.post<any>(`/simplification/concepts/${concept_code}`, data),

    localizeDocument: async (document_id: string, data: {
      target_language?: string;
      target_dialect?: string;
    }) => this.post<any>(`/simplification/documents/${document_id}`, data),

    runLangGraphAgent: async (concept_code: string, data: {
      target_language?: string;
      target_dialect?: string;
      grade_level?: number;
      force_regenerate?: boolean;
    }) => this.post<any>(`/simplification/langgraph/concepts/${concept_code}`, data),

    getCacheStatus: async () => this.request<any>("/simplification/cache/status"),
  };

  assessment = {
    generateQuiz: async (params: {
      concept_code: string;
      target_language?: string;
      target_dialect?: string;
      grade_level?: number;
      student_id?: string;
    }) => this.post<{
      quiz_id: string;
      concept_code: string;
      concept_name: string;
      total_questions: number;
      questions: any[];
    }>("/assessment/quizzes/generate", params),

    submitQuiz: async (quiz_id: string, student_id: string, answers: Record<string, string>) => this.post<{
      submission_id: string;
      quiz_id: string;
      student_id: string;
      score_pct: number;
      correct_count: number;
      total_questions: number;
      concept_mastery_level: number;
      weak_concepts_detected: string[];
      remedial_recommended: boolean;
      answers_evaluation: any[];
    }>(`/assessment/quizzes/${quiz_id}/submit`, { student_id, answers }),

    getStudentHistory: async (student_id: string) =>
      this.request<any[]>(`/assessment/students/${student_id}/history`),

    getTeacherReport: async (concept_code: string) =>
      this.request<any>(`/assessment/teachers/reports/${concept_code}`),
  };

  assignments = {
    generate: async (params: {
      document_id?: string;
      concept_code?: string;
      grade?: number;
      subject?: string;
      target_language?: string;
      target_dialect?: string;
      number_of_questions?: number;
      difficulty?: "easy" | "medium" | "hard";
      title?: string;
    }) => this.post<{
      id: string;
      title: string;
      subject: string;
      grade: number;
      language: string;
      dialect?: string;
      difficulty: string;
      total_questions: number;
      total_marks: number;
      pdf_download_url: string;
      created_at: string;
      items: any[];
    }>("/assignments/generate", params),

    list: async (subject?: string, grade?: number) => {
      const q = new URLSearchParams();
      if (subject) q.set("subject", subject);
      if (grade) q.set("grade", grade.toString());
      const qs = q.toString() ? `?${q.toString()}` : "";
      return this.request<any[]>(`/assignments${qs}`);
    },

    get: async (assignment_id: string) => this.request<any>(`/assignments/${assignment_id}`),

    submit: async (assignment_id: string, data: {
      student_id: string;
      student_name?: string;
      answers: Record<string, string>;
    }) => this.post<{
      assignment_id: string;
      student_id: string;
      total_questions: number;
      evaluated_score: number;
      score_percentage: number;
      grade: string;
      mastery_status: string;
      concept_gaps: string[];
      feedback: string;
    }>(`/assignments/${assignment_id}/submit`, data),

    getPdfUrl: (assignment_id: string) => this.buildUrl(`/assignments/${assignment_id}/pdf`),
  };

  voice = {
    synthesize: async (params: {
      text: string;
      section_name?: string;
      target_language?: string;
      target_dialect?: string;
    }) => this.post<{
      segment_id: string;
      duration_seconds: number;
      audio_file_path: string;
      stream_url: string;
    }>("/voice/synthesize", params),

    transcribe: async (audioBlob: Blob, language_code = "hi") => {
      const formData = new FormData();
      formData.append("audio_file", audioBlob, "recording.wav");
      formData.append("language_code", language_code);

      return this.post<{
        transcribed_text: string;
        detected_language: string;
        confidence_score: number;
        latency_ms: number;
      }>("/voice/transcribe", formData);
    },

    stt: async (audioBlob: Blob, language_code = "hi") =>
      this.voice.transcribe(audioBlob, language_code),

    generateLesson: async (concept_code: string, target_language = "hi", grade_level = 3, target_dialect?: string) =>
      this.post<{
        concept_code: string;
        concept_name: string;
        total_duration_seconds: number;
        audio_segments: any[];
      }>(`/voice/lessons/${concept_code}`, { target_language, target_dialect, grade_level }),

    submitOralQuizAudio: async (data: {
      quiz_id: string;
      question_id: string;
      student_id: string;
      expected_answer: string;
      audio_file: Blob;
      target_language?: string;
    }) => {
      const formData = new FormData();
      formData.append("quiz_id", data.quiz_id);
      formData.append("question_id", data.question_id);
      formData.append("student_id", data.student_id);
      formData.append("expected_answer", data.expected_answer);
      formData.append("target_language", data.target_language || "hi");
      formData.append("audio_file", data.audio_file, "oral-answer.wav");
      return this.post<any>("/voice/oral-quiz/submit-audio", formData);
    },

    getStreamUrl: (filename: string) => this.buildUrl(`/voice/stream/${encodeURIComponent(filename)}`),
  };

  copilot = {
    generateLessonPlan: async (params: {
      concept_code: string;
      grade_level?: number;
      target_language?: string;
      target_dialect?: string;
      duration_mins?: number;
    }) => this.post<any>("/copilot/lesson-plans/generate", params),

    generateRemedialAid: async (params: {
      concept_code: string;
      weak_bloom_level?: string;
      target_language?: string;
    }) => this.post<any>("/copilot/remedial-aid/generate", params),

    exportOfflinePackage: async (params: {
      grade_level: number;
      subject: string;
      target_language: string;
      target_dialect?: string;
    }) => this.post<{
      bundle_id: string;
      filename: string;
      download_url: string;
      size_bytes: number;
    }>("/copilot/edge/packages/export", params),

    getPackageDownloadUrl: (filename: string) =>
      this.buildUrl(`/copilot/edge/packages/download/${encodeURIComponent(filename)}`),

    syncOfflineAttempts: async (params: {
      batch_id: string;
      device_id: string;
      school_id: string;
      submissions: any[];
    }) => this.post<any>("/copilot/edge/sync/import", params),

    getMasteryHeatmap: async () => this.request<{
      total_concepts: number;
      mastery_heatmap: any[];
    }>("/copilot/analytics/mastery-heatmap"),
  };

  gamification = {
    generateQuest: async (params: {
      concept_code: string;
      target_language?: string;
      target_dialect?: string;
    }) => this.post<any>("/gamification/quests/generate", params),

    generateFlashcards: async (params: {
      concept_code: string;
      target_language?: string;
      target_dialect?: string;
    }) => this.post<{
      deck_id: string;
      concept_code: string;
      target_language: string;
      total_cards: number;
      cards: Array<{
        card_id: string;
        term_source: string;
        term_translated: string;
        dialect_terms?: Record<string, string>;
        image_prompt?: string;
        visual_emoji?: string;
        phonetic_transliteration?: string;
        child_explanation?: string;
      }>;
      html_preview_url?: string;
    }>("/gamification/flashcards/generate", params),

    getDeckUrl: (filename: string) =>
      this.buildUrl(`/gamification/flashcards/deck/${encodeURIComponent(filename)}`),

    getStudentPortfolio: async (student_id: string) =>
      this.request<any>(`/gamification/students/${student_id}/portfolio`),

    recordActivity: async (student_id: string, data: {
      student_name: string;
      school_id: string;
      grade_level: number;
      activity_type: string;
      concept_code: string;
    }) => this.post<any>(`/gamification/students/${student_id}/activity`, data),

    getLeaderboard: async (school_id: string) => this.request<{
      school_id: string;
      total_students: number;
      leaderboard: any[];
    }>(`/gamification/leaderboards/${school_id}`),
  };

  district = {
    generateRemedialPathway: async (params: {
      student_id: string;
      student_name?: string;
      concept_code: string;
      weak_bloom_level?: string;
      target_language?: string;
    }) => this.post<any>("/district/interventions/generate-pathway", params),

    sendParentVoiceNote: async (params: {
      student_id: string;
      student_name?: string;
      parent_phone: string;
      concept_code: string;
      target_language?: string;
      target_dialect?: string;
    }) => this.post<any>("/district/parent-advisory/send-voice-note", params),

    listPendingInterventions: async () =>
      this.request<any>("/district/interventions/pending"),

    getOverview: async () =>
      this.request<any>("/district/analytics/overview"),
  };
}

export const api = new APIClient();
