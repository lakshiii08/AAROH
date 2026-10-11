import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processLearningMaterialWithAI } from "@/lib/ai-materials-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const materials = db.getMaterials(subjectId);
    return NextResponse.json({ success: true, materials });
  } catch (error) {
    console.error("GET /api/materials failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch learning materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      subjectId,
      subjectName,
      grade,
      chapterTopic,
      fileName,
      fileSize,
      fileData,
      autoProcess = true,
      questionCount = 5,
      difficulty = "Medium",
    } = body;

    if (!title || !subjectId || !grade || !chapterTopic) {
      return NextResponse.json(
        {
          success: false,
          error: "Material title, subject, grade, and chapter/topic are required",
        },
        { status: 400 }
      );
    }

    // Create material record
    let newMaterial = db.addMaterial({
      title: title.trim(),
      subjectId,
      subjectName: subjectName || "General Subject",
      grade: grade.trim(),
      chapterTopic: chapterTopic.trim(),
      fileName: fileName || `${title.replace(/\s+/g, "_")}.pdf`,
      fileSize: fileSize || "1.5 MB",
      fileData,
      status: autoProcess ? "processing" : "uploaded",
      approvalStatus: "pending_review",
    });

    // If autoProcess is requested, trigger AI generation right away
    if (autoProcess) {
      try {
        const aiResult = await processLearningMaterialWithAI({
          title: newMaterial.title,
          subjectName: newMaterial.subjectName,
          grade: newMaterial.grade,
          chapterTopic: newMaterial.chapterTopic,
          fileName: newMaterial.fileName,
          fileData,
          questionCount: Number(questionCount) || 5,
          difficulty: difficulty as "Easy" | "Medium" | "Hard",
        });

        if (aiResult.success) {
          const updated = db.updateMaterial(newMaterial.id, {
            status: "ready",
            aiProcessedAt: new Date().toISOString(),
            aiSummary: aiResult.aiSummary,
            generatedContent: {
              quiz: aiResult.quiz,
              worksheet: aiResult.worksheet,
            },
          });
          if (updated) newMaterial = updated;
        } else {
          db.updateMaterial(newMaterial.id, {
            status: "failed",
            aiSummary: aiResult.error || "AI processing could not complete",
          });
        }
      } catch (aiErr) {
        console.error("Auto AI processing failed:", aiErr);
        db.updateMaterial(newMaterial.id, {
          status: "failed",
          aiSummary: "AI processing timed out or failed. You can retry anytime.",
        });
      }
    }

    return NextResponse.json({ success: true, material: newMaterial });
  } catch (error) {
    console.error("POST /api/materials failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload learning material" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Material id is required" },
        { status: 400 }
      );
    }
    const success = db.deleteMaterial(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("DELETE /api/materials failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete learning material" },
      { status: 500 }
    );
  }
}
