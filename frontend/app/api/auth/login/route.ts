import { NextResponse } from "next/server";

const API_PREFIX = "/api/v1";

function resolveBackendBaseUrl(): string | null {
  const configured = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const clean = configured.trim().replace(/\/+$/, "");
  if (!clean) return null;
  return clean.endsWith(API_PREFIX) ? clean : `${clean}${API_PREFIX}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendBaseUrl = resolveBackendBaseUrl();

    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend auth URL is not configured." },
        { status: 503 }
      );
    }

    const role = body.role;
    const isStudent = role === "student";
    const endpoint = isStudent ? "/auth/student-login" : "/auth/login";
    const payload = isStudent
      ? {
          roll_number: (body.rollNo || body.roll || "").toString().trim(),
          password: (body.pin || body.password || "").toString().trim(),
          school_code: body.schoolCode || body.school_code,
        }
      : {
          login_id: (body.email || body.login_id || "").toString().trim(),
          password: (body.password || "").toString(),
          school_code: body.schoolCode || body.school_code,
        };

    const backendResponse = await fetch(`${backendBaseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await backendResponse.json().catch(() => null);
    const response = NextResponse.json(data ?? {}, { status: backendResponse.status });
    const user = data?.data;

    if (backendResponse.ok && user?.user_id && user?.role) {
      response.cookies.set("aaroh_user_id", user.user_id, {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
      response.cookies.set("aaroh_user_role", String(user.role).toLowerCase(), {
        path: "/",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed. Server error." }, { status: 500 });
  }
}
