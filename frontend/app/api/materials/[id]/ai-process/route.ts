import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processLearningMaterialWithAI } from "@/lib/ai-materials-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = db.getMaterialById(params.id);
    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const questionCount = Number(body.questionCount) || 5;
    const difficulty = (body.difficulty || "Medium") as "Easy" | "Medium" | "Hard";

    // Mark status as processing
    db.updateMaterial(params.id, { status: "processing" });

    const aiResult = await processLearningMaterialWithAI({
      title: material.title,
      subjectName: material.subjectName,
      grade: material.grade,
      chapterTopic: material.chapterTopic,
      fileName: material.fileName,
      fileData: material.fileData,
      questionCount,
      difficulty,
    });

    if (aiResult.success) {
      const updated = db.updateMaterial(params.id, {
        status: "ready",
        aiProcessedAt: new Date().toISOString(),
        aiSummary: aiResult.aiSummary,
        generatedContent: {
          quiz: aiResult.quiz,
          worksheet: aiResult.worksheet,
        },
      });

      return NextResponse.json({
        success: true,
        material: updated,
        aiSummary: aiResult.aiSummary,
        backendUsed: aiResult.backendUsed,
      });
    } else {
      db.updateMaterial(params.id, {
        status: "failed",
        aiSummary: aiResult.error || "AI generation failed.",
      });

      return NextResponse.json(
        { success: false, error: aiResult.error || "AI generation failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/materials/[id]/ai-process failed:", error);
    db.updateMaterial(params.id, {
      status: "failed",
      aiSummary: "An unexpected error occurred during processing.",
    });

    return NextResponse.json(
      { success: false, error: "Failed to process learning material with AI" },
      { status: 500 }
    );
  }
}
