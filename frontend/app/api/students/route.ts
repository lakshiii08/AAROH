import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const students = db.getStudents();
    const submissions = db.getSubmissions();

    // Enrich students with dynamic submission counts
    const enriched = students.map((s) => {
      const studentSubmissions = submissions.filter((sub) => sub.studentId === s.id);
      const graded = studentSubmissions.filter((sub) => sub.status === "Graded").length;
      const pending = studentSubmissions.filter((sub) => sub.status === "Submitted").length;
      return {
        ...s,
        totalSubmissions: studentSubmissions.length,
        gradedSubmissions: graded,
        pendingSubmissions: pending,
      };
    });

    return NextResponse.json({ students: enriched });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, school, grade, rollNo } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Student Name is required." }, { status: 400 });
    }
    if (!school || !school.trim()) {
      return NextResponse.json({ error: "School/Village is required." }, { status: 400 });
    }
    if (!grade || !grade.trim()) {
      return NextResponse.json({ error: "Class/Grade is required." }, { status: 400 });
    }
    if (!rollNo || !rollNo.trim()) {
      return NextResponse.json({ error: "Roll Number is required." }, { status: 400 });
    }

    const cleanRoll = rollNo.trim().toLowerCase();
    const cleanGrade = grade.trim().toLowerCase();
    const cleanSchool = school.trim().toLowerCase();

    // Constraint: Prevent duplicate roll number within the same Class and School
    const existing = db.getStudents().find((s) => {
      return (
        s.rollNo.trim().toLowerCase() === cleanRoll &&
        s.grade.trim().toLowerCase() === cleanGrade &&
        s.school.trim().toLowerCase() === cleanSchool
      );
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Roll Number "${rollNo}" is already assigned to ${existing.name} in ${grade} (${school}). Each roll number within a class must be unique.`,
        },
        { status: 409 }
      );
    }

    const { student, generatedPin } = db.addStudent({
      name: name.trim(),
      school: school.trim(),
      grade: grade.trim(),
      rollNo: rollNo.trim(),
    });

    return NextResponse.json({
      success: true,
      student,
      generatedPin,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create student account." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    // Reset PIN action
    if (action === "reset-pin") {
      const newPin = db.resetStudentPIN(id);
      if (!newPin) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, newPin });
    }

    const updated = db.updateStudent(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ student: updated, success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Student ID is required." }, { status: 400 });
    }

    const success = db.deleteStudent(id);
    if (!success) {
      return NextResponse.json({ error: "Student not found or could not be deleted." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete student account." }, { status: 500 });
  }
}
