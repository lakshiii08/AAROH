import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const worksheetId = searchParams.get("worksheetId");
    const status = searchParams.get("status");

    let submissions = db.getSubmissions(worksheetId || undefined);

    if (studentId) {
      submissions = submissions.filter((s) => s.studentId === studentId);
    }
    if (status) {
      submissions = submissions.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    return NextResponse.json({ submissions });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
