import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "s1";
    const subjectId = searchParams.get("subjectId");

    let evaluations = db.getStudentEvaluations(studentId);

    if (subjectId && subjectId !== "all") {
      evaluations = evaluations.filter((e) => e.subjectId === subjectId);
    }

    return NextResponse.json({ evaluations });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 });
  }
}
