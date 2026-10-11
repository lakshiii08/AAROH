import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const worksheetId = params.id;
  const submissions = db.getSubmissions(worksheetId);
  return NextResponse.json({ submissions });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const worksheetId = params.id;
    const body = await request.json();
    const { fileName, studentId, studentName } = body;

    const submission = db.addSubmission(
      worksheetId,
      fileName || "completed_assignment.pdf",
      studentId || "s1",
      studentName || "Sona Murmu"
    );

    return NextResponse.json({ submission, success: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }
}
