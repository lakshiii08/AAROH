import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const submissionId = params.id;
    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { marks, grade, feedback, scorePercentage, checkedFileName, answers, aiConvertedText } = body;

    if (!marks) {
      return NextResponse.json({ error: "Marks are required for evaluation" }, { status: 400 });
    }

    const evaluated = db.evaluateSubmission(submissionId, {
      marks,
      grade: grade || "A",
      feedback: feedback || "Good attempt. Well presented.",
      scorePercentage: scorePercentage !== undefined ? Number(scorePercentage) : 85,
      checkedFileName: checkedFileName || `Checked_${submissionId}.pdf`,
      aiConvertedFileName: `Converted_En_Hi_${submissionId}.pdf`,
      aiConvertedText: aiConvertedText || "AI Reverse translation generated successfully.",
      answers,
    });

    if (!evaluated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ submission: evaluated, success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to evaluate submission" }, { status: 500 });
  }
}
