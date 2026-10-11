import fs from "fs";
import path from "path";

export type FlashcardItem = {
  id: string;
  concept: string;
  category: string;
  imageEmoji: string;
  front: {
    santhaliOlChiki: string;
    santhaliRoman: string;
  };
  back: {
    hindi: string;
    english: string;
  };
};

export type SubjectItem = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  createdAt: string;
};

export type WorksheetItem = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  originalLanguage: string;
  fileName: string;
  pdfUrl?: string;
  deadline: string;
  status: "active" | "translating" | "closed";
  items: Array<{
    id: string;
    original: string;
    translated: string;
    translatedOlChiki: string;
    concept: string;
    localExample: string;
  }>;
  materialId?: string;
  materialTitle?: string;
  createdAt: string;
};

export type GeneratedQuestion = {
  id: string;
  questionNumber: number;
  question: string;
  type?: "mcq" | "short_answer" | "descriptive";
  options?: string[]; // for quiz
  correctAnswer?: string;
  explanation?: string;
  writingSpaceLines?: number;
  suggestedAnswer?: string;
  marks: number;
};

export type GeneratedAssessment = {
  id: string;
  title: string;
  instructions: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questions: GeneratedQuestion[];
  totalMarks: number;
  estimatedTimeMinutes?: number;
};

export type LearningMaterialItem = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  grade: string; // e.g. "Grade 4"
  chapterTopic: string;
  fileName: string;
  fileSize?: string;
  fileData?: string;
  uploadedAt: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  aiProcessedAt?: string;
  aiSummary?: string;
  generatedContent?: {
    quiz: GeneratedAssessment;
    worksheet: GeneratedAssessment;
  };
  approvalStatus: "pending_review" | "approved" | "assigned";
  approvedAt?: string;
  assignedWorksheetId?: string;
};

export type SubmissionItem = {
  id: string;
  worksheetId: string;
  worksheetTitle: string;
  subjectId?: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  fileName: string;
  fileUrl?: string;
  status: "Submitted" | "Graded" | "Late";
  grade?: string;
  marks?: string; // e.g. "18/20"
  scorePercentage?: number;
  feedback?: string; // Teacher feedback comments
  checkedAt?: string;
  checkedFileName?: string;
  aiConvertedFileName?: string;
  aiConvertedText?: string;
  answers?: Array<{
    questionId: string;
    question: string;
    studentAnswerSantali: string;
    aiConvertedHindi: string;
    aiConvertedEnglish: string;
    marksAwarded?: string;
  }>;
};

export type StudentRecord = {
  id: string;
  name: string;
  rollNo: string;
  grade: string;
  school: string;
  pin: string; // 4-digit unique login PIN
  language: "en" | "hi" | "sat";
  accuracy: number;
  badges: number;
  weakConcepts: string[];
  cardsReviewed: number;
  masteryPercentage: number;
  seenCardIds?: string[];
  createdAt: string;
  avatarEmoji?: string;
};

export type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  role: "teacher";
  employeeId: string;
  assignedGrade: string;
  schoolName: string;
  subjectSpecialization: string;
  language: "en" | "hi" | "sat";
  autoAiTranslation: boolean;
  lateSubmissionsAllowed: boolean;
  notifyOnSubmission: boolean;
};

export type NotificationItem = {
  id: string;
  studentId: string;
  title: string;
  message: string;
  subjectName: string;
  worksheetId: string;
  deadline: string;
  read: boolean;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  name: string;
  role: "student" | "teacher";
  rollNo?: string;
  grade?: string;
  school?: string;
  pin?: string;
  language: "en" | "hi" | "sat";
  badges: number;
  accuracy: number;
  weakConcepts: string[];
  seenCardIds: string[]; // Track seen card IDs to prevent repeating cards
};

// Authentic, genuine, standalone Santali vocabulary dataset
export const AUTHENTIC_SANTALI_WORDS: FlashcardItem[] = [
  // Numbers & Math
  { id: "fc-1", concept: "One (1)", category: "Math", imageEmoji: "1️⃣", front: { santhaliOlChiki: "ᱢᱤᱫ", santhaliRoman: "Mid" }, back: { hindi: "एक (१)", english: "One (1)" } },
  { id: "fc-2", concept: "Two (2)", category: "Math", imageEmoji: "2️⃣", front: { santhaliOlChiki: "ᱵᱟᱨ", santhaliRoman: "Bar" }, back: { hindi: "दो (२)", english: "Two (2)" } },
  { id: "fc-3", concept: "Three (3)", category: "Math", imageEmoji: "3️⃣", front: { santhaliOlChiki: "ᱯᱮ", santhaliRoman: "Pe" }, back: { hindi: "तीन (३)", english: "Three (3)" } },
  { id: "fc-4", concept: "Four (4)", category: "Math", imageEmoji: "4️⃣", front: { santhaliOlChiki: "ᱯᱩᱱ", santhaliRoman: "Pun" }, back: { hindi: "चार (४)", english: "Four (4)" } },
  { id: "fc-5", concept: "Five (5)", category: "Math", imageEmoji: "5️⃣", front: { santhaliOlChiki: "ᱢᱚᱬᱮ", santhaliRoman: "Mõṇe" }, back: { hindi: "पांच (५)", english: "Five (5)" } },
  { id: "fc-6", concept: "Six (6)", category: "Math", imageEmoji: "6️⃣", front: { santhaliOlChiki: "ᱛᱩᱨᱩᱭ", santhaliRoman: "Turuy" }, back: { hindi: "छह (६)", english: "Six (6)" } },
  { id: "fc-7", concept: "Seven (7)", category: "Math", imageEmoji: "7️⃣", front: { santhaliOlChiki: "ᱮᱭᱟᱭ", santhaliRoman: "Eyay" }, back: { hindi: "सात (७)", english: "Seven (7)" } },
  { id: "fc-8", concept: "Eight (8)", category: "Math", imageEmoji: "8️⃣", front: { santhaliOlChiki: "ᱤᱨᱟᱹᱞ", santhaliRoman: "Iral" }, back: { hindi: "आठ (८)", english: "Eight (8)" } },
  { id: "fc-9", concept: "Nine (9)", category: "Math", imageEmoji: "9️⃣", front: { santhaliOlChiki: "ᱟᱨᱮ", santhaliRoman: "Are" }, back: { hindi: "नौ (९)", english: "Nine (9)" } },
  { id: "fc-10", concept: "Ten (10)", category: "Math", imageEmoji: "🔟", front: { santhaliOlChiki: "ᱜᱮᱞ", santhaliRoman: "Gel" }, back: { hindi: "दस (१०)", english: "Ten (10)" } },
  { id: "fc-11", concept: "Eleven (11)", category: "Math", imageEmoji: "🔢", front: { santhaliOlChiki: "ᱜᱮᱞ ᱢᱤᱫ", santhaliRoman: "Gel Mid" }, back: { hindi: "ग्यारह (११)", english: "Eleven (11)" } },
  { id: "fc-12", concept: "Twelve (12)", category: "Math", imageEmoji: "🔢", front: { santhaliOlChiki: "ᱜᱮᱞ ᱵᱟᱨ", santhaliRoman: "Gel Bar" }, back: { hindi: "बारह (१२)", english: "Twelve (12)" } },
  { id: "fc-13", concept: "Twenty (20)", category: "Math", imageEmoji: "🔢", front: { santhaliOlChiki: "ᱤᱥᱤ", santhaliRoman: "Isi" }, back: { hindi: "बीस (२०)", english: "Twenty (20)" } },
  { id: "fc-14", concept: "Hundred (100)", category: "Math", imageEmoji: "💯", front: { santhaliOlChiki: "ᱥᱟᱭ", santhaliRoman: "Say" }, back: { hindi: "सौ (१००)", english: "One Hundred (100)" } },
  { id: "fc-15", concept: "Thousand (1000)", category: "Math", imageEmoji: "🔢", front: { santhaliOlChiki: "ᱦᱟᱡᱟᱨ", santhaliRoman: "Hajar" }, back: { hindi: "एक हज़ार", english: "One Thousand (1000)" } },
  { id: "fc-16", concept: "Number / Counting", category: "Math", imageEmoji: "🔢", front: { santhaliOlChiki: "ᱞᱮᱠᱷᱟ", santhaliRoman: "Lekha" }, back: { hindi: "संख्या / गिनती", english: "Number / Count" } },
  { id: "fc-17", concept: "Addition", category: "Math", imageEmoji: "➕", front: { santhaliOlChiki: "ᱥᱮᱞᱮᱫ", santhaliRoman: "Seled" }, back: { hindi: "जोड़ / योग", english: "Addition" } },
  { id: "fc-18", concept: "Subtraction", category: "Math", imageEmoji: "➖", front: { santhaliOlChiki: "ᱵᱷᱮᱫᱽ", santhaliRoman: "Bhed" }, back: { hindi: "घटाव / अंतर", english: "Subtraction" } },
  { id: "fc-19", concept: "Multiplication", category: "Math", imageEmoji: "✖️", front: { santhaliOlChiki: "ᱜᱩᱬᱟᱹ", santhaliRoman: "Guna" }, back: { hindi: "गुणा", english: "Multiplication" } },
  { id: "fc-20", concept: "Division", category: "Math", imageEmoji: "➗", front: { santhaliOlChiki: "ᱦᱟᱹᱴᱤᱧ", santhaliRoman: "Hating" }, back: { hindi: "भाग / विभाजन", english: "Division" } },
  { id: "fc-21", concept: "Equal", category: "Math", imageEmoji: "🟰", front: { santhaliOlChiki: "ᱥᱚᱢᱟᱱ", santhaliRoman: "Soman" }, back: { hindi: "बराबर", english: "Equal" } },
  { id: "fc-22", concept: "Triangle", category: "Math", imageEmoji: "🔺", front: { santhaliOlChiki: "ᱯᱮ ᱠᱳᱬ", santhaliRoman: "Pe Kon" }, back: { hindi: "त्रिभुज", english: "Triangle" } },
  { id: "fc-23", concept: "Circle", category: "Math", imageEmoji: "⭕", front: { santhaliOlChiki: "ᱜᱩᱞᱟᱹᱭ", santhaliRoman: "Gulay" }, back: { hindi: "वृत्त / गोला", english: "Circle" } },
  { id: "fc-24", concept: "Square", category: "Math", imageEmoji: "⏹️", front: { santhaliOlChiki: "ᱯᱩᱱ ᱠᱳᱬ", santhaliRoman: "Pun Kon" }, back: { hindi: "वर्ग / चौकोर", english: "Square" } },
  { id: "fc-25", concept: "More / Greater", category: "Math", imageEmoji: "📈", front: { santhaliOlChiki: "ᱵᱟᱹᱲᱛᱤ", santhaliRoman: "Barti" }, back: { hindi: "अधिक / ज्यादा", english: "More / Greater" } },
  { id: "fc-26", concept: "Less / Fewer", category: "Math", imageEmoji: "📉", front: { santhaliOlChiki: "ᱠᱚᱢ", santhaliRoman: "Kom" }, back: { hindi: "कम", english: "Less / Fewer" } },

  // Nature, Science & Environment
  { id: "fc-27", concept: "Water", category: "Science", imageEmoji: "💧", front: { santhaliOlChiki: "ᱫᱟᱜ", santhaliRoman: "Da'" }, back: { hindi: "पानी / जल", english: "Water" } },
  { id: "fc-28", concept: "Tree", category: "Science", imageEmoji: "🌳", front: { santhaliOlChiki: "ᱫᱟᱨᱮ", santhaliRoman: "Dare" }, back: { hindi: "पेड़ / वृक्ष", english: "Tree" } },
  { id: "fc-29", concept: "Sun", category: "Science", imageEmoji: "☀️", front: { santhaliOlChiki: "ᱥᱤᱸᱜᱤ", santhaliRoman: "Singi" }, back: { hindi: "सूरज / सूर्य", english: "Sun" } },
  { id: "fc-30", concept: "Moon", category: "Science", imageEmoji: "🌙", front: { santhaliOlChiki: "ᱪᱟᱸᱫᱚ", santhaliRoman: "Cando" }, back: { hindi: "चांद / चंद्रमा", english: "Moon" } },
  { id: "fc-31", concept: "Star", category: "Science", imageEmoji: "⭐", front: { santhaliOlChiki: "ᱤᱯᱤᱞ", santhaliRoman: "Ipil" }, back: { hindi: "तारा / सितारा", english: "Star" } },
  { id: "fc-32", concept: "Sky", category: "Science", imageEmoji: "🌌", front: { santhaliOlChiki: "ᱥᱮᱨᱢᱟ", santhaliRoman: "Serma" }, back: { hindi: "आकाश / गगन", english: "Sky" } },
  { id: "fc-33", concept: "Earth / Soil", category: "Geography", imageEmoji: "🌍", front: { santhaliOlChiki: "ᱦᱟᱥᱟ", santhaliRoman: "Hasa" }, back: { hindi: "धरती / मिट्टी", english: "Earth / Soil" } },
  { id: "fc-34", concept: "Air / Wind", category: "Science", imageEmoji: "💨", front: { santhaliOlChiki: "ᱦᱚᱭ", santhaliRoman: "Hoy" }, back: { hindi: "हवा / वायु", english: "Air / Wind" } },
  { id: "fc-35", concept: "Fire", category: "Science", imageEmoji: "🔥", front: { santhaliOlChiki: "ᱥᱮᱸᱜᱮᱞ", santhaliRoman: "Sengel" }, back: { hindi: "आग / अग्नि", english: "Fire" } },
  { id: "fc-36", concept: "Cloud", category: "Science", imageEmoji: "☁️", front: { santhaliOlChiki: "ᱨᱤᱢᱤᱞ", santhaliRoman: "Rimil" }, back: { hindi: "बादल / मेघ", english: "Cloud" } },
  { id: "fc-37", concept: "Rain", category: "Science", imageEmoji: "🌧️", front: { santhaliOlChiki: "ᱫᱟᱜ ᱡᱟᱹᱲᱤ", santhaliRoman: "Dag Jari" }, back: { hindi: "बारिश / वर्षा", english: "Rain" } },
  { id: "fc-38", concept: "Seed", category: "Science", imageEmoji: "🌱", front: { santhaliOlChiki: "ᱡᱟᱝ", santhaliRoman: "Jang" }, back: { hindi: "बीज", english: "Seed" } },
  { id: "fc-39", concept: "Plant", category: "Science", imageEmoji: "🌿", front: { santhaliOlChiki: "ᱜᱟᱪ", santhaliRoman: "Gac" }, back: { hindi: "पौधा", english: "Plant" } },
  { id: "fc-40", concept: "Leaf", category: "Science", imageEmoji: "🍃", front: { santhaliOlChiki: "ᱥᱟᱠᱟᱢ", santhaliRoman: "Sakam" }, back: { hindi: "पत्ता", english: "Leaf" } },
  { id: "fc-41", concept: "Flower", category: "Science", imageEmoji: "🌸", front: { santhaliOlChiki: "ᱵᱟᱦᱟ", santhaliRoman: "Baha" }, back: { hindi: "फूल", english: "Flower" } },
  { id: "fc-42", concept: "Fruit", category: "Science", imageEmoji: "🍎", front: { santhaliOlChiki: "ᱡᱚ", santhaliRoman: "Jo" }, back: { hindi: "फल", english: "Fruit" } },
  { id: "fc-43", concept: "Root", category: "Science", imageEmoji: "🪵", front: { santhaliOlChiki: "ᱨᱮᱦᱮᱫ", santhaliRoman: "Rehed" }, back: { hindi: "जड़", english: "Root" } },
  { id: "fc-44", concept: "Forest", category: "Geography", imageEmoji: "🌲", front: { santhaliOlChiki: "ᱵᱤᱨ", santhaliRoman: "Bir" }, back: { hindi: "जंगल / वन", english: "Forest" } },
  { id: "fc-45", concept: "Mountain", category: "Geography", imageEmoji: "⛰️", front: { santhaliOlChiki: "ᱵᱩᱨᱩ", santhaliRoman: "Buru" }, back: { hindi: "पहाड़ / पर्वत", english: "Mountain" } },
  { id: "fc-46", concept: "River", category: "Geography", imageEmoji: "🏞️", front: { santhaliOlChiki: "ᱜᱟᱰᱟ", santhaliRoman: "Gada" }, back: { hindi: "नदी", english: "River" } },
  { id: "fc-47", concept: "Pond", category: "Geography", imageEmoji: "🌊", front: { santhaliOlChiki: "ᱯᱩᱠᱷᱨᱤ", santhaliRoman: "Pukhri" }, back: { hindi: "तालाब / पोखर", english: "Pond" } },
  { id: "fc-48", concept: "Village", category: "Geography", imageEmoji: "🏘️", front: { santhaliOlChiki: "ᱟᱹᱛᱩ", santhaliRoman: "Atu" }, back: { hindi: "गांव / ग्राम", english: "Village" } },
  { id: "fc-49", concept: "Farm / Field", category: "Geography", imageEmoji: "🌾", front: { santhaliOlChiki: "ᱠᱷᱮᱛ", santhaliRoman: "Khet" }, back: { hindi: "खेत", english: "Farm / Field" } },
  { id: "fc-50", concept: "Stone / Rock", category: "Geography", imageEmoji: "🪨", front: { santhaliOlChiki: "ᱫᱷᱤᱨᱤ", santhaliRoman: "Dhiri" }, back: { hindi: "पत्थर / शिला", english: "Stone / Rock" } },

  // Animals & Birds
  { id: "fc-51", concept: "Bird", category: "Science", imageEmoji: "🐦", front: { santhaliOlChiki: "ᱪᱮᱬᱮ", santhaliRoman: "Cene" }, back: { hindi: "पक्षी / चिड़िया", english: "Bird" } },
  { id: "fc-52", concept: "Fish", category: "Science", imageEmoji: "🐟", front: { santhaliOlChiki: "ᱦᱟᱹᱠᱩ", santhaliRoman: "Haku" }, back: { hindi: "मछली", english: "Fish" } },
  { id: "fc-53", concept: "Cow", category: "Vocabulary", imageEmoji: "🐄", front: { santhaliOlChiki: "ᱜᱟᱹᱭ", santhaliRoman: "Gai" }, back: { hindi: "गाय", english: "Cow" } },
  { id: "fc-54", concept: "Bull / Ox", category: "Vocabulary", imageEmoji: "🐂", front: { santhaliOlChiki: "ᱰᱟᱝᱜᱽᱨᱟ", santhaliRoman: "Dangra" }, back: { hindi: "बैल", english: "Ox / Bull" } },
  { id: "fc-55", concept: "Goat", category: "Vocabulary", imageEmoji: "🐐", front: { santhaliOlChiki: "ᱢᱮᱨᱚᱢ", santhaliRoman: "Merom" }, back: { hindi: "बकरी", english: "Goat" } },
  { id: "fc-56", concept: "Dog", category: "Vocabulary", imageEmoji: "🐕", front: { santhaliOlChiki: "ᱥᱮᱛᱟ", santhaliRoman: "Seta" }, back: { hindi: "कुत्ता", english: "Dog" } },
  { id: "fc-57", concept: "Cat", category: "Vocabulary", imageEmoji: "🐈", front: { santhaliOlChiki: "ᱵᱤᱞᱟᱹᱭ", santhaliRoman: "Bilai" }, back: { hindi: "बिल्ली", english: "Cat" } },
  { id: "fc-58", concept: "Chicken / Hen", category: "Vocabulary", imageEmoji: "🐔", front: { santhaliOlChiki: "ᱥᱤᱢ", santhaliRoman: "Sim" }, back: { hindi: "मुर्गी", english: "Chicken / Hen" } },
  { id: "fc-59", concept: "Elephant", category: "Vocabulary", imageEmoji: "🐘", front: { santhaliOlChiki: "ᱦᱟᱹᱛᱤ", santhaliRoman: "Hati" }, back: { hindi: "हाथी", english: "Elephant" } },
  { id: "fc-60", concept: "Tiger", category: "Vocabulary", imageEmoji: "🐅", front: { santhaliOlChiki: "ᱛᱟᱹᱨᱩᱵ", santhaliRoman: "Tarub" }, back: { hindi: "बाघ", english: "Tiger" } },
  { id: "fc-61", concept: "Lion", category: "Vocabulary", imageEmoji: "🦁", front: { santhaliOlChiki: "ᱠᱩᱞ", santhaliRoman: "Kul" }, back: { hindi: "शेर", english: "Lion" } },
  { id: "fc-62", concept: "Deer", category: "Vocabulary", imageEmoji: "🦌", front: { santhaliOlChiki: "ᱥᱟᱨᱟᱢ", santhaliRoman: "Saram" }, back: { hindi: "हिरण", english: "Deer" } },
  { id: "fc-63", concept: "Snake", category: "Science", imageEmoji: "🐍", front: { santhaliOlChiki: "ᱵᱤᱧ", santhaliRoman: "Bing" }, back: { hindi: "सांप / सर्प", english: "Snake" } },
  { id: "fc-64", concept: "Frog", category: "Science", imageEmoji: "🐸", front: { santhaliOlChiki: "ᱨᱚᱴᱮ", santhaliRoman: "Rote" }, back: { hindi: "मेंढक", english: "Frog" } },
  { id: "fc-65", concept: "Horse", category: "Vocabulary", imageEmoji: "🐎", front: { santhaliOlChiki: "ᱥᱟᱫᱚᱢ", santhaliRoman: "Sadom" }, back: { hindi: "घोड़ा", english: "Horse" } },
  { id: "fc-66", concept: "Butterfly", category: "Science", imageEmoji: "🦋", front: { santhaliOlChiki: "ᱯᱤᱯᱤᱲᱤᱭᱟᱹᱝ", santhaliRoman: "Pipiriang" }, back: { hindi: "तितली", english: "Butterfly" } },
  { id: "fc-67", concept: "Honeybee", category: "Science", imageEmoji: "🐝", front: { santhaliOlChiki: "ᱧᱮᱞᱮ", santhaliRoman: "Nele" }, back: { hindi: "मधुमक्खी", english: "Honeybee" } },
  { id: "fc-68", concept: "Peacock", category: "Vocabulary", imageEmoji: "🦚", front: { santhaliOlChiki: "ᱢᱟᱨᱟᱜ", santhaliRoman: "Marag" }, back: { hindi: "मोर", english: "Peacock" } },

  // Human Body
  { id: "fc-69", concept: "Head", category: "Science", imageEmoji: "🗣️", front: { santhaliOlChiki: "ᱵᱚᱦᱚᱜ", santhaliRoman: "Bohog" }, back: { hindi: "सिर", english: "Head" } },
  { id: "fc-70", concept: "Eye", category: "Science", imageEmoji: "👁️", front: { santhaliOlChiki: "ᱢᱮᱫ", santhaliRoman: "Med" }, back: { hindi: "आंख / नेत्र", english: "Eye" } },
  { id: "fc-71", concept: "Ear", category: "Science", imageEmoji: "👂", front: { santhaliOlChiki: "ᱞᱩᱛᱩᱨ", santhaliRoman: "Lutur" }, back: { hindi: "कान", english: "Ear" } },
  { id: "fc-72", concept: "Nose", category: "Science", imageEmoji: "👃", front: { santhaliOlChiki: "ᱢᱩ", santhaliRoman: "Mu" }, back: { hindi: "नाक", english: "Nose" } },
  { id: "fc-73", concept: "Mouth", category: "Science", imageEmoji: "👄", front: { santhaliOlChiki: "ᱢᱚᱪᱟ", santhaliRoman: "Moca" }, back: { hindi: "मुंह", english: "Mouth" } },
  { id: "fc-74", concept: "Tooth", category: "Science", imageEmoji: "🦷", front: { santhaliOlChiki: "ᱰᱟᱴᱟ", santhaliRoman: "Data" }, back: { hindi: "दांत", english: "Tooth" } },
  { id: "fc-75", concept: "Hand", category: "Science", imageEmoji: "✋", front: { santhaliOlChiki: "ᱛᱤ", santhaliRoman: "Ti" }, back: { hindi: "हाथ", english: "Hand" } },
  { id: "fc-76", concept: "Leg / Foot", category: "Science", imageEmoji: "🦵", front: { santhaliOlChiki: "ᱡᱟᱝᱜᱟ", santhaliRoman: "Janga" }, back: { hindi: "पैर", english: "Leg / Foot" } },
  { id: "fc-77", concept: "Stomach", category: "Science", imageEmoji: "🫃", front: { santhaliOlChiki: "ᱞᱟᱡ", santhaliRoman: "Laj" }, back: { hindi: "पेट", english: "Stomach" } },
  { id: "fc-78", concept: "Heart", category: "Science", imageEmoji: "🫀", front: { santhaliOlChiki: "ᱫᱤᱞ", santhaliRoman: "Dil" }, back: { hindi: "हृदय / दिल", english: "Heart" } },

  // People, School & Family
  { id: "fc-79", concept: "House / Home", category: "Vocabulary", imageEmoji: "🏡", front: { santhaliOlChiki: "ᱚᱲᱟᱜ", santhaliRoman: "Orag" }, back: { hindi: "घर / गृह", english: "House / Home" } },
  { id: "fc-80", concept: "School", category: "Vocabulary", imageEmoji: "🏫", front: { santhaliOlChiki: "ᱟᱥᱲᱟ", santhaliRoman: "Asra" }, back: { hindi: "विद्यालय / स्कूल", english: "School" } },
  { id: "fc-81", concept: "Teacher", category: "Vocabulary", imageEmoji: "🧑‍🏫", front: { santhaliOlChiki: "ᱢᱟᱪᱮᱛ", santhaliRoman: "Macet" }, back: { hindi: "शिक्षक / गुरुजी", english: "Teacher" } },
  { id: "fc-82", concept: "Student", category: "Vocabulary", imageEmoji: "🧑‍🎓", front: { santhaliOlChiki: "ᱪᱮᱛᱮᱫᱤᱭᱟᱹ", santhaliRoman: "Cetediyạ" }, back: { hindi: "विद्यार्थी / छात्र", english: "Student" } },
  { id: "fc-83", concept: "Book", category: "Vocabulary", imageEmoji: "📖", front: { santhaliOlChiki: "ᱯᱩᱛᱷᱤ", santhaliRoman: "Puthi" }, back: { hindi: "पुस्तक / किताब", english: "Book" } },
  { id: "fc-84", concept: "Pen", category: "Vocabulary", imageEmoji: "🖊️", front: { santhaliOlChiki: "ᱠᱚᱞᱚᱢ", santhaliRoman: "Kolom" }, back: { hindi: "कलम", english: "Pen" } },
  { id: "fc-85", concept: "Friend", category: "Vocabulary", imageEmoji: "🤝", front: { santhaliOlChiki: "ᱜᱟᱛᱮ", santhaliRoman: "Gate" }, back: { hindi: "मित्र / दोस्त", english: "Friend" } },
  { id: "fc-86", concept: "Mother", category: "Vocabulary", imageEmoji: "👩", front: { santhaliOlChiki: "ᱟᱭᱳ", santhaliRoman: "Ayo" }, back: { hindi: "माता / मां", english: "Mother" } },
  { id: "fc-87", concept: "Father", category: "Vocabulary", imageEmoji: "👨", front: { santhaliOlChiki: "ᱵᱟᱵᱟ", santhaliRoman: "Baba" }, back: { hindi: "पिता / बाबा", english: "Father" } },
  { id: "fc-88", concept: "Brother", category: "Vocabulary", imageEmoji: "👦", front: { santhaliOlChiki: "ᱵᱚᱭᱦᱟ", santhaliRoman: "Boyha" }, back: { hindi: "भाई", english: "Brother" } },
  { id: "fc-89", concept: "Sister", category: "Vocabulary", imageEmoji: "👧", front: { santhaliOlChiki: "ᱢᱤᱥᱤ", santhaliRoman: "Misi" }, back: { hindi: "बहन", english: "Sister" } },

  // Everyday Verbs & Actions
  { id: "fc-90", concept: "Write", category: "Vocabulary", imageEmoji: "✍️", front: { santhaliOlChiki: "ᱚᱞ", santhaliRoman: "Ol" }, back: { hindi: "लिखना", english: "Write" } },
  { id: "fc-91", concept: "Read", category: "Vocabulary", imageEmoji: "📖", front: { santhaliOlChiki: "ᱯᱟᱲᱦᱟᱣ", santhaliRoman: "Parhao" }, back: { hindi: "पढ़ना", english: "Read" } },
  { id: "fc-92", concept: "Learn", category: "Vocabulary", imageEmoji: "🎓", front: { santhaliOlChiki: "ᱤᱛᱩᱱ", santhaliRoman: "Itun" }, back: { hindi: "सीखना", english: "Learn" } },
  { id: "fc-93", concept: "Eat", category: "Vocabulary", imageEmoji: "🍽️", front: { santhaliOlChiki: "ᱡᱚᱢ", santhaliRoman: "Jom" }, back: { hindi: "खाना", english: "Eat" } },
  { id: "fc-94", concept: "Drink", category: "Vocabulary", imageEmoji: "🥤", front: { santhaliOlChiki: "ᱧᱩ", santhaliRoman: "Nu" }, back: { hindi: "पीना", english: "Drink" } },
  { id: "fc-95", concept: "Sleep", category: "Vocabulary", imageEmoji: "😴", front: { santhaliOlChiki: "ᱡᱟᱹᱯᱤᱫ", santhaliRoman: "Japid" }, back: { hindi: "सोना", english: "Sleep" } },
  { id: "fc-96", concept: "Walk", category: "Vocabulary", imageEmoji: "🚶", front: { santhaliOlChiki: "ᱛᱟᱲᱟᱢ", santhaliRoman: "Taram" }, back: { hindi: "चलना", english: "Walk" } },
  { id: "fc-97", concept: "Run", category: "Vocabulary", imageEmoji: "🏃", front: { santhaliOlChiki: "ᱫᱟᱹᱲ", santhaliRoman: "Dar" }, back: { hindi: "दौड़ना", english: "Run" } },
  { id: "fc-98", concept: "Speak", category: "Vocabulary", imageEmoji: "🗣️", front: { santhaliOlChiki: "ᱨᱚᱲ", santhaliRoman: "Ror" }, back: { hindi: "बोलना", english: "Speak" } },
  { id: "fc-99", concept: "Listen", category: "Vocabulary", imageEmoji: "👂", front: { santhaliOlChiki: "ᱟᱸᱡᱚᱢ", santhaliRoman: "Anjom" }, back: { hindi: "सुनना", english: "Listen" } },
  { id: "fc-100", concept: "See", category: "Vocabulary", imageEmoji: "👀", front: { santhaliOlChiki: "ᱧᱮᱞ", santhaliRoman: "Nel" }, back: { hindi: "देखना", english: "See" } },
  { id: "fc-101", concept: "Sing", category: "Vocabulary", imageEmoji: "🎵", front: { santhaliOlChiki: "ᱥᱮᱨᱮᱧ", santhaliRoman: "Sereng" }, back: { hindi: "गाना", english: "Sing" } },
  { id: "fc-102", concept: "Dance", category: "Vocabulary", imageEmoji: "💃", front: { santhaliOlChiki: "ᱮᱱᱮᱡ", santhaliRoman: "Enej" }, back: { hindi: "नाचना", english: "Dance" } },
  { id: "fc-103", concept: "Play", category: "Vocabulary", imageEmoji: "⚽", front: { santhaliOlChiki: "ᱠᱷᱮᱞᱚᱸᱰ", santhaliRoman: "Khelond" }, back: { hindi: "खेलना", english: "Play" } },
  { id: "fc-104", concept: "Laugh", category: "Vocabulary", imageEmoji: "😄", front: { santhaliOlChiki: "ᱞᱟᱸᱫᱟ", santhaliRoman: "Landa" }, back: { hindi: "हंसना", english: "Laugh" } },
  { id: "fc-105", concept: "Cry", category: "Vocabulary", imageEmoji: "😢", front: { santhaliOlChiki: "ᱨᱟᱜ", santhaliRoman: "Rag" }, back: { hindi: "रोना", english: "Cry" } },
  { id: "fc-106", concept: "Work", category: "Vocabulary", imageEmoji: "🛠️", front: { santhaliOlChiki: "ᱠᱟᱹᱢᱤ", santhaliRoman: "Kami" }, back: { hindi: "काम करना", english: "Work" } },
  { id: "fc-107", concept: "Love", category: "Vocabulary", imageEmoji: "❤️", front: { santhaliOlChiki: "ᱫᱩᱞᱟᱹᱲ", santhaliRoman: "Dular" }, back: { hindi: "प्रेम / प्यार", english: "Love" } },
  { id: "fc-108", concept: "Joy / Happy", category: "Vocabulary", imageEmoji: "😊", front: { santhaliOlChiki: "ᱨᱟᱹᱥᱠᱟᱹ", santhaliRoman: "Raska" }, back: { hindi: "खुशी / आनंद", english: "Joy / Happy" } },

  // Food & Kitchen
  { id: "fc-109", concept: "Cooked Rice", category: "Vocabulary", imageEmoji: "🍚", front: { santhaliOlChiki: "ᱫᱟᱠᱟ", santhaliRoman: "Daka" }, back: { hindi: "भात / पके चावल", english: "Cooked Rice" } },
  { id: "fc-110", concept: "Paddy", category: "Science", imageEmoji: "🌾", front: { santhaliOlChiki: "ᱦᱩᱲᱩ", santhaliRoman: "Huru" }, back: { hindi: "धान", english: "Paddy" } },
  { id: "fc-111", concept: "Wheat", category: "Science", imageEmoji: "🌾", front: { santhaliOlChiki: "ᱜᱩᱦᱩᱢ", santhaliRoman: "Guhum" }, back: { hindi: "गेहूं", english: "Wheat" } },
  { id: "fc-112", concept: "Salt", category: "Vocabulary", imageEmoji: "🧂", front: { santhaliOlChiki: "ᱵᱩᱞᱩᱝ", santhaliRoman: "Bulung" }, back: { hindi: "नमक", english: "Salt" } },
  { id: "fc-113", concept: "Oil", category: "Vocabulary", imageEmoji: "🫗", front: { santhaliOlChiki: "ᱥᱩᱱᱩᱢ", santhaliRoman: "Sunum" }, back: { hindi: "तेल", english: "Oil" } },
  { id: "fc-114", concept: "Curry / Vegetable", category: "Vocabulary", imageEmoji: "🥘", front: { santhaliOlChiki: "ᱩᱛᱩ", santhaliRoman: "Utu" }, back: { hindi: "सब्जी / तरकारी", english: "Curry / Vegetable" } },
  { id: "fc-115", concept: "Milk", category: "Vocabulary", imageEmoji: "🥛", front: { santhaliOlChiki: "ᱛᱳᱣᱟ", santhaliRoman: "Towa" }, back: { hindi: "दूध", english: "Milk" } },
  { id: "fc-116", concept: "Bread / Roti", category: "Vocabulary", imageEmoji: "🫓", front: { santhaliOlChiki: "ᱯᱤᱴᱷᱟᱹ", santhaliRoman: "Pitha" }, back: { hindi: "रोटी / पीठा", english: "Flatbread / Roti" } },
  { id: "fc-117", concept: "Egg", category: "Vocabulary", imageEmoji: "🥚", front: { santhaliOlChiki: "ᱵᱤᱞᱤ", santhaliRoman: "Bili" }, back: { hindi: "अंडा", english: "Egg" } },

  // Colors
  { id: "fc-118", concept: "Red", category: "Vocabulary", imageEmoji: "🔴", front: { santhaliOlChiki: "ᱟᱨᱟᱜ", santhaliRoman: "Arag" }, back: { hindi: "लाल", english: "Red" } },
  { id: "fc-119", concept: "Green", category: "Vocabulary", imageEmoji: "🟢", front: { santhaliOlChiki: "ᱦᱟᱹᱨᱤᱭᱟᱹᱲ", santhaliRoman: "Hariyar" }, back: { hindi: "हरा", english: "Green" } },
  { id: "fc-120", concept: "White", category: "Vocabulary", imageEmoji: "⚪", front: { santhaliOlChiki: "ᱯᱳᱱᱰ", santhaliRoman: "Pond" }, back: { hindi: "सफेद", english: "White" } },
  { id: "fc-121", concept: "Black", category: "Vocabulary", imageEmoji: "⚫", front: { santhaliOlChiki: "ᱦᱮᱸᱫᱮ", santhaliRoman: "Hende" }, back: { hindi: "काला", english: "Black" } },
  { id: "fc-122", concept: "Yellow", category: "Vocabulary", imageEmoji: "🟡", front: { santhaliOlChiki: "ᱥᱟᱥᱟᱝ", santhaliRoman: "Sasang" }, back: { hindi: "पीला", english: "Yellow" } },
  { id: "fc-123", concept: "Blue", category: "Vocabulary", imageEmoji: "🔵", front: { santhaliOlChiki: "ᱞᱤᱞ", santhaliRoman: "Lil" }, back: { hindi: "नीला", english: "Blue" } },

  // Time & Days
  { id: "fc-124", concept: "Today", category: "Vocabulary", imageEmoji: "📅", front: { santhaliOlChiki: "ᱛᱮᱦᱮᱧ", santhaliRoman: "Teheng" }, back: { hindi: "आज", english: "Today" } },
  { id: "fc-125", concept: "Tomorrow", category: "Vocabulary", imageEmoji: "🗓️", front: { santhaliOlChiki: "ᱜᱟᱯᱟ", santhaliRoman: "Gapa" }, back: { hindi: "कल (आने वाला)", english: "Tomorrow" } },
  { id: "fc-126", concept: "Yesterday", category: "Vocabulary", imageEmoji: "📆", front: { santhaliOlChiki: "ᱦᱚᱞᱟ", santhaliRoman: "Hola" }, back: { hindi: "कल (बीता हुआ)", english: "Yesterday" } },
  { id: "fc-127", concept: "Morning", category: "Vocabulary", imageEmoji: "🌅", front: { santhaliOlChiki: "ᱥᱮᱛᱟᱜ", santhaliRoman: "Setag" }, back: { hindi: "सुबह / प्रात:", english: "Morning" } },
  { id: "fc-128", concept: "Night", category: "Vocabulary", imageEmoji: "🌙", front: { santhaliOlChiki: "ᱧᱤᱫᱟᱹ", santhaliRoman: "Nida" }, back: { hindi: "रात / रात्रि", english: "Night" } },
  { id: "fc-129", concept: "Sunlight / Heat", category: "Science", imageEmoji: "🌞", front: { santhaliOlChiki: "ᱥᱤᱛᱩᱝ", santhaliRoman: "Situng" }, back: { hindi: "धूप / गरमी", english: "Sunlight / Heat" } },
  { id: "fc-130", concept: "Cold / Chill", category: "Science", imageEmoji: "❄️", front: { santhaliOlChiki: "ᱨᱮᱭᱟᱲ", santhaliRoman: "Reyar" }, back: { hindi: "ठंड / सर्दी", english: "Cold / Chill" } },
  { id: "fc-131", concept: "Day", category: "Vocabulary", imageEmoji: "☀️", front: { santhaliOlChiki: "ᱢᱟᱦᱟ", santhaliRoman: "Maha" }, back: { hindi: "दिन", english: "Day" } },
  { id: "fc-132", concept: "Year", category: "Vocabulary", imageEmoji: "🗓️", front: { santhaliOlChiki: "ᱥᱮᱨᱢᱟ", santhaliRoman: "Serma" }, back: { hindi: "वर्ष / साल", english: "Year" } },
  { id: "fc-133", concept: "Rainy Season", category: "Science", imageEmoji: "⛈️", front: { santhaliOlChiki: "ᱡᱟᱹᱯᱩᱫ ᱫᱤᱱ", santhaliRoman: "Japud Din" }, back: { hindi: "वर्षा ऋतु / बरसात", english: "Monsoon / Rainy Season" } },

  // Extended Family & Relations
  { id: "fc-134", concept: "Grandfather", category: "Vocabulary", imageEmoji: "👴", front: { santhaliOlChiki: "ᱦᱟᱲᱟᱢᱵᱟ", santhaliRoman: "Haram ba" }, back: { hindi: "दादाजी", english: "Grandfather" } },
  { id: "fc-135", concept: "Grandmother", category: "Vocabulary", imageEmoji: "👵", front: { santhaliOlChiki: "ᱵᱩᱰᱷᱤᱟᱭᱳ", santhaliRoman: "Budhi ayo" }, back: { hindi: "दादीजी", english: "Grandmother" } },
  { id: "fc-136", concept: "Child / Baby", category: "Vocabulary", imageEmoji: "👶", front: { santhaliOlChiki: "ᱜᱤᱫᱽᱨᱟᱹ", santhaliRoman: "Gidrạ" }, back: { hindi: "बच्चा / शिशु", english: "Child / Baby" } },
  { id: "fc-137", concept: "Son", category: "Vocabulary", imageEmoji: "👦", front: { santhaliOlChiki: "ᱦᱚᱯᱚᱱ", santhaliRoman: "Hopon" }, back: { hindi: "बेटा / पुत्र", english: "Son" } },
  { id: "fc-138", concept: "Daughter", category: "Vocabulary", imageEmoji: "👧", front: { santhaliOlChiki: "ᱦᱚᱯᱚᱱ ᱮᱨᱟ", santhaliRoman: "Hopon era" }, back: { hindi: "बेटी / पुत्री", english: "Daughter" } },
  { id: "fc-139", concept: "Uncle", category: "Vocabulary", imageEmoji: "🧔", front: { santhaliOlChiki: "ᱠᱟᱠᱟ", santhaliRoman: "Kaka" }, back: { hindi: "चाचा", english: "Uncle" } },
  { id: "fc-140", concept: "Aunt", category: "Vocabulary", imageEmoji: "🧕", front: { santhaliOlChiki: "ᱠᱟᱹᱠᱤ", santhaliRoman: "Kaki" }, back: { hindi: "चाची", english: "Aunt" } },

  // Household & Village Objects
  { id: "fc-141", concept: "Cot / Bed", category: "Vocabulary", imageEmoji: "🛏️", front: { santhaliOlChiki: "ᱯᱟᱨᱠᱚᱢ", santhaliRoman: "Parkom" }, back: { hindi: "खाट / चारपाई", english: "Cot / Bed" } },
  { id: "fc-142", concept: "Plate", category: "Vocabulary", imageEmoji: "🍽️", front: { santhaliOlChiki: "ᱛᱷᱟᱹᱨᱤ", santhaliRoman: "Thạri" }, back: { hindi: "थाली", english: "Plate" } },
  { id: "fc-143", concept: "Bowl", category: "Vocabulary", imageEmoji: "🥣", front: { santhaliOlChiki: "ᱵᱟᱹᱴᱤ", santhaliRoman: "Bạti" }, back: { hindi: "कटोरी", english: "Bowl" } },
  { id: "fc-144", concept: "Clay Pitcher / Pot", category: "Vocabulary", imageEmoji: "🏺", front: { santhaliOlChiki: "ᱴᱩᱠᱩᱡ", santhaliRoman: "Tukuj" }, back: { hindi: "घड़ा / मटका", english: "Clay Pitcher / Pot" } },
  { id: "fc-145", concept: "Spoon", category: "Vocabulary", imageEmoji: "🥄", front: { santhaliOlChiki: "ᱪᱟᱹᱢᱩᱪ", santhaliRoman: "Camuc" }, back: { hindi: "चम्मच", english: "Spoon" } },
  { id: "fc-146", concept: "Clothes / Fabric", category: "Vocabulary", imageEmoji: "👕", front: { santhaliOlChiki: "ᱠᱤᱪᱨᱤᱪ", santhaliRoman: "Kicric" }, back: { hindi: "कपड़ा / वस्त्र", english: "Clothes / Fabric" } },
  { id: "fc-147", concept: "Door", category: "Vocabulary", imageEmoji: "🚪", front: { santhaliOlChiki: "ᱥᱤᱞᱯᱤᱧ", santhaliRoman: "Silping" }, back: { hindi: "दरवाजा / किवाड़", english: "Door" } },
  { id: "fc-148", concept: "Window", category: "Vocabulary", imageEmoji: "🪟", front: { santhaliOlChiki: "ᱠᱷᱤᱲᱠᱤ", santhaliRoman: "Khirki" }, back: { hindi: "खिड़की", english: "Window" } },
  { id: "fc-149", concept: "Road / Path", category: "Geography", imageEmoji: "🛣️", front: { santhaliOlChiki: "ᱰᱟᱦᱟᱨ", santhaliRoman: "Dahar" }, back: { hindi: "रास्ता / सड़क", english: "Road / Path" } },
  { id: "fc-150", concept: "Bamboo Basket", category: "Vocabulary", imageEmoji: "🧺", front: { santhaliOlChiki: "ᱴᱩᱠᱨᱤ", santhaliRoman: "Tukri" }, back: { hindi: "टोकरी / दौरी", english: "Bamboo Basket" } },

  // More Nature & Minerals
  { id: "fc-151", concept: "Grass", category: "Science", imageEmoji: "🌱", front: { santhaliOlChiki: "ᱜᱷᱟᱸᱥ", santhaliRoman: "Ghãs" }, back: { hindi: "घास", english: "Grass" } },
  { id: "fc-152", concept: "Bamboo", category: "Science", imageEmoji: "🎋", front: { santhaliOlChiki: "ᱢᱟᱫ", santhaliRoman: "Mad" }, back: { hindi: "बांस", english: "Bamboo" } },
  { id: "fc-153", concept: "Sand", category: "Geography", imageEmoji: "🏖️", front: { santhaliOlChiki: "ᱜᱤᱛᱤᱞ", santhaliRoman: "Gitil" }, back: { hindi: "रेत / बालू", english: "Sand" } },
  { id: "fc-154", concept: "Iron", category: "Science", imageEmoji: "⚙️", front: { santhaliOlChiki: "ᱢᱮᱬᱦᱮᱫ", santhaliRoman: "Menhed" }, back: { hindi: "लोहा", english: "Iron" } },
  { id: "fc-155", concept: "Gold", category: "Science", imageEmoji: "🪙", front: { santhaliOlChiki: "ᱥᱚᱱᱟ", santhaliRoman: "Sona" }, back: { hindi: "सोना / स्वर्ण", english: "Gold" } },
  { id: "fc-156", concept: "Silver", category: "Science", imageEmoji: "🥈", front: { santhaliOlChiki: "ᱨᱩᱯᱟᱹ", santhaliRoman: "Rupa" }, back: { hindi: "चांदी", english: "Silver" } },

  // More Animals & Birds
  { id: "fc-157", concept: "Monkey", category: "Science", imageEmoji: "🐒", front: { santhaliOlChiki: "ᱜᱟᱹᱲᱤ", santhaliRoman: "Gari" }, back: { hindi: "बंदर", english: "Monkey" } },
  { id: "fc-158", concept: "Fox / Jackal", category: "Science", imageEmoji: "🦊", front: { santhaliOlChiki: "ᱛᱩᱭᱩ", santhaliRoman: "Tuyu" }, back: { hindi: "लोमड़ी / सियार", english: "Fox / Jackal" } },
  { id: "fc-159", concept: "Duck", category: "Science", imageEmoji: "🦆", front: { santhaliOlChiki: "ᱜᱷᱮᱸᱣᱮ", santhaliRoman: "Ghenwe" }, back: { hindi: "बत्तख", english: "Duck" } },
  { id: "fc-160", concept: "Crow", category: "Science", imageEmoji: "🐦‍⬛", front: { santhaliOlChiki: "ᱠᱟᱣᱟ", santhaliRoman: "Kawa" }, back: { hindi: "कौआ", english: "Crow" } },
  { id: "fc-161", concept: "Pigeon", category: "Science", imageEmoji: "🕊️", front: { santhaliOlChiki: "ᱯᱟᱬᱮ", santhaliRoman: "Pane" }, back: { hindi: "कबूतर", english: "Pigeon" } },
  { id: "fc-162", concept: "Rabbit / Hare", category: "Science", imageEmoji: "🐇", front: { santhaliOlChiki: "ᱠᱩᱞᱟᱹᱭ", santhaliRoman: "Kulai" }, back: { hindi: "खरगोश", english: "Rabbit / Hare" } },

  // More Anatomy & Body
  { id: "fc-163", concept: "Hair", category: "Science", imageEmoji: "💇", front: { santhaliOlChiki: "ᱩᱵ", santhaliRoman: "Ub" }, back: { hindi: "बाल / केश", english: "Hair" } },
  { id: "fc-164", concept: "Tongue", category: "Science", imageEmoji: "👅", front: { santhaliOlChiki: "ᱟᱞᱟᱝ", santhaliRoman: "Alang" }, back: { hindi: "जीभ", english: "Tongue" } },
  { id: "fc-165", concept: "Neck", category: "Science", imageEmoji: "🦒", front: { santhaliOlChiki: "ᱦᱚᱛᱚᱜ", santhaliRoman: "Hotog" }, back: { hindi: "गर्दन / गला", english: "Neck" } },
  { id: "fc-166", concept: "Finger", category: "Science", imageEmoji: "☝️", front: { santhaliOlChiki: "ᱛᱤ ᱠᱟᱹᱴᱩᱵ", santhaliRoman: "Ti Katub" }, back: { hindi: "उंगली", english: "Finger" } },
  { id: "fc-167", concept: "Knee", category: "Science", imageEmoji: "🦵", front: { santhaliOlChiki: "ᱢᱩᱠᱩᱲ", santhaliRoman: "Mukur" }, back: { hindi: "घुटना", english: "Knee" } },

  // More Daily Verbs & Actions
  { id: "fc-168", concept: "Give", category: "Vocabulary", imageEmoji: "🤲", front: { santhaliOlChiki: "ᱮᱢ", santhaliRoman: "Em" }, back: { hindi: "देना", english: "Give" } },
  { id: "fc-169", concept: "Take / Receive", category: "Vocabulary", imageEmoji: "🫳", front: { santhaliOlChiki: "ᱦᱟᱛᱟᱣ", santhaliRoman: "Hatao" }, back: { hindi: "लेना", english: "Take / Receive" } },
  { id: "fc-170", concept: "Sit", category: "Vocabulary", imageEmoji: "🪑", front: { santhaliOlChiki: "ᱫᱩᱲᱩᱵ", santhaliRoman: "Durup" }, back: { hindi: "बैठना", english: "Sit" } },
  { id: "fc-171", concept: "Stand", category: "Vocabulary", imageEmoji: "🧍", front: { santhaliOlChiki: "ᱛᱤᱸᱜᱩ", santhaliRoman: "Tingu" }, back: { hindi: "खड़े होना", english: "Stand" } },
  { id: "fc-172", concept: "Come", category: "Vocabulary", imageEmoji: "🙋", front: { santhaliOlChiki: "ᱦᱤᱡᱩᱜ", santhaliRoman: "Hijug" }, back: { hindi: "आना", english: "Come" } },
  { id: "fc-173", concept: "Go", category: "Vocabulary", imageEmoji: "🚶", front: { santhaliOlChiki: "ᱥᱮᱱᱚᱜ", santhaliRoman: "Senog" }, back: { hindi: "जाना", english: "Go" } },
  { id: "fc-174", concept: "Open", category: "Vocabulary", imageEmoji: "🔓", front: { santhaliOlChiki: "ᱡᱷᱤᱡ", santhaliRoman: "Jhij" }, back: { hindi: "खोलना", english: "Open" } },
  { id: "fc-175", concept: "Close", category: "Vocabulary", imageEmoji: "🔒", front: { santhaliOlChiki: "ᱵᱚᱸᱫᱽ", santhaliRoman: "Bond" }, back: { hindi: "बंद करना", english: "Close" } },
  { id: "fc-176", concept: "Ask", category: "Vocabulary", imageEmoji: "❓", front: { santhaliOlChiki: "ᱠᱩᱞᱤ", santhaliRoman: "Kuli" }, back: { hindi: "पूछना", english: "Ask" } },
  { id: "fc-177", concept: "Tell / Say", category: "Vocabulary", imageEmoji: "🗣️", front: { santhaliOlChiki: "ᱞᱟᱹᱭ", santhaliRoman: "Lạy" }, back: { hindi: "बताना / कहना", english: "Tell / Say" } },
];

// Scalable retrieval of authentic Santali flashcard words
export function getGeneratedFlashcard(index: number): FlashcardItem {
  const item = AUTHENTIC_SANTALI_WORDS[index % AUTHENTIC_SANTALI_WORDS.length];
  return {
    id: `fc-word-${(index % AUTHENTIC_SANTALI_WORDS.length) + 1}`,
    concept: item.concept,
    category: item.category,
    imageEmoji: item.imageEmoji,
    front: {
      santhaliOlChiki: item.front.santhaliOlChiki,
      santhaliRoman: item.front.santhaliRoman,
    },
    back: {
      hindi: item.back.hindi,
      english: item.back.english,
    },
  };
}

// Data Store File Path
const DB_FILE = path.join(process.cwd(), "data_store.json");

interface DBData {
  subjects: SubjectItem[];
  worksheets: WorksheetItem[];
  materials: LearningMaterialItem[];
  submissions: SubmissionItem[];
  notifications: NotificationItem[];
  userProfile: UserProfile;
  students: StudentRecord[];
  teacherProfile: TeacherProfile;
}

export function generateUniquePIN(existingPINs: Set<string>): string {
  let attempts = 0;
  while (attempts < 10000) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!existingPINs.has(pin)) {
      return pin;
    }
    attempts++;
  }
  return (1000 + (Date.now() % 9000)).toString();
}

function createDefaultStudentPins(count: number): string[] {
  const existingPINs = new Set<string>();
  return Array.from({ length: count }, () => {
    const pin = generateUniquePIN(existingPINs);
    existingPINs.add(pin);
    return pin;
  });
}

const DEFAULT_STUDENT_PINS = createDefaultStudentPins(4);

const DEFAULT_DATA: DBData = {
  subjects: [
    { id: "sub-1", name: "Mathematics", icon: "calculator", description: "Fractions, Algebra & Numbers", createdAt: "2026-09-01T10:00:00Z" },
    { id: "sub-2", name: "Science", icon: "flask", description: "Plants, Animals & Natural Phenomena", createdAt: "2026-09-01T10:00:00Z" },
    { id: "sub-3", name: "Social Science", icon: "globe", description: "History, Village & Community", createdAt: "2026-09-01T10:00:00Z" },
    { id: "sub-4", name: "Language & Literature", icon: "book", description: "Santali & Hindi Grammar & Reading", createdAt: "2026-09-01T10:00:00Z" },
  ],
  worksheets: [
    {
      id: "ws-101",
      title: "Fractions & Basic Division",
      subjectId: "sub-1",
      subjectName: "Mathematics",
      originalLanguage: "Hindi",
      fileName: "Fractions_Worksheet.pdf",
      deadline: "2026-10-15T18:00:00Z",
      status: "active",
      createdAt: "2026-09-20T09:00:00Z",
      items: [
        {
          id: "w1",
          original: "यदि आपके पास 8 आम हैं और आप उन्हें 4 दोस्तों में बराबर बांटते हैं, तो प्रत्येक को कितने मिलेंगे?",
          translated: "ᱡᱩᱫᱤ ᱟᱢ ᱴᱷᱮᱱ ᱘ ᱴᱤ ᱩᱞ ᱢᱮᱱᱟᱜ-ᱟ ᱟᱨ ᱟᱢ ᱔ ᱡᱚᱱ ᱜᱟᱛᱮ ᱨᱮ ᱥᱚᱢᱟᱱ ᱮᱢ ᱦᱟᱹᱴᱤᱧᱟ, ᱛᱚᱵᱮ ᱡᱚᱛᱚ ᱦᱚᱲ ᱛᱤᱱᱟᱹᱜ ᱠᱚ ᱧᱟᱢᱟ?",
          translatedOlChiki: "ᱡᱩᱫᱤ ᱟᱢ ᱴᱷᱮᱱ ᱘ ᱴᱤ ᱩᱞ ᱢᱮᱱᱟᱜ-ᱟ ᱟᱨ ᱟᱢ ᱔ ᱡᱚᱱ ᱜᱟᱛᱮ ᱨᱮ ᱥᱚᱢᱟᱱ ᱮᱢ ᱦᱟᱹᱴᱤᱧᱟ?",
          concept: "Equal Sharing",
          localExample: "Local example: Distributing mangoes in your village orchard equally.",
        },
        {
          id: "w2",
          original: "1/2 और 1/4 में से कौन सा भिन्न बड़ा है?",
          translated: "᱑/᱒ ᱟᱨ ᱑/᱔ ᱢᱩᱫᱽ ᱨᱮ ᱚᱠᱟ ᱦᱟᱹᱴᱤᱧ ᱞᱮᱠᱷᱟ ᱢᱟᱨᱟᱝᱟ?",
          translatedOlChiki: "᱑/᱒ ᱟᱨ ᱑/᱔ ᱢᱩᱫᱽ ᱨᱮ ᱚᱠᱟ ᱦᱟᱹᱴᱤᱧ ᱞᱮᱠᱷᱟ ᱢᱟᱨᱟᱝᱟ?",
          concept: "Fractions Comparison",
          localExample: "Local example: Half a roti vs one-quarter of a roti.",
        },
      ],
    },
    {
      id: "ws-102",
      title: "Plants Around Us (Chapter 4)",
      subjectId: "sub-2",
      subjectName: "Science",
      originalLanguage: "Hindi",
      fileName: "Plants_Around_Us.pdf",
      deadline: "2026-10-05T17:00:00Z",
      status: "active",
      createdAt: "2026-09-22T14:30:00Z",
      items: [
        {
          id: "w101",
          original: "पौधे अपना भोजन कैसे बनाते हैं? कारण सहित उत्तर दीजिए।",
          translated: "গাছ রেয়াগ যোম ওকা লেকান বেনাও কাটু? कारण सह उत्तर मे।",
          translatedOlChiki: "ᱜᱟᱪ ᱨᱮᱭᱟᱜ ᱡᱚᱢ ᱚᱠᱟ ᱞᱮᱠᱟᱱ ᱵᱮᱱᱟᱣ ᱠᱟᱱᱟ?",
          concept: "Photosynthesis",
          localExample: "Local example: Sal trees turning lush green after monsoon rains.",
        },
        {
          id: "w102",
          original: "एक बीज को पौधा बनने के लिए किन-किन चीज़ों की आवश्यकता होती है?",
          translated: "মিত্ জাङ् দেᱟ গাছ বাᱲᱟᱭ আᱲᱤ লাগিত্ চেᱴ্ চᱮᱴ্ বা'ᱱᱩᱠ লাগিত্ چاہিয়'?",
          translatedOlChiki: "ᱢᱤᱫ ᱡᱟᱶ ᱫᱚ ᱫᱟᱨᱮ ᱵᱟᱲᱟᱭ ᱞᱟᱹᱜᱤᱫ ᱪᱮᱫ ᱪᱮᱫ ᱵᱟᱹᱱᱩᱠ ᱪᱟᱦᱤ",
          concept: "Seed Germination",
          localExample: "Local example: Paddy seeds sown before rain.",
        },
      ],
    },
  ],
  materials: [
    {
      id: "mat-101",
      title: "SCERT Jharkhand Science: Chapter 4 - Plants Around Us",
      subjectId: "sub-2",
      subjectName: "Science",
      grade: "Grade 4",
      chapterTopic: "Chapter 4: Plant Roots, Leaves & Forest Trees",
      fileName: "Ch4_Science_Plants_Around_Us.pdf",
      fileSize: "2.4 MB",
      uploadedAt: "2026-09-24T10:00:00Z",
      status: "ready",
      aiProcessedAt: "2026-09-24T10:02:15Z",
      aiSummary: "AI successfully analyzed Ch4_Science_Plants_Around_Us.pdf. Extracted 5 quiz questions and 5 descriptive worksheet problems on root systems, photosynthesis, and Jharkhand trees.",
      approvalStatus: "approved",
      approvedAt: "2026-09-24T10:15:00Z",
      assignedWorksheetId: "ws-102",
      generatedContent: {
        quiz: {
          id: "quiz-mat-101",
          title: "Plants Around Us — Concept Quiz",
          instructions: "Read each question carefully and select the correct option. Total marks: 10.",
          difficulty: "Medium",
          totalMarks: 10,
          estimatedTimeMinutes: 15,
          questions: [
            {
              id: "q-1",
              questionNumber: 1,
              question: "Which part of a tree anchors it into the soil and absorbs groundwater?",
              type: "mcq",
              options: ["Roots (ᱨᱮᱦᱮᱫ)", "Leaves (ᱥᱟᱠᱟᱢ)", "Flower (ᱵᱟᱦᱟ)", "Bark (ᱪᱷᱟᱞ)"],
              correctAnswer: "Roots (ᱨᱮᱦᱮᱫ)",
              explanation: "Roots anchor the plant firmly and absorb vital groundwater and minerals from the soil.",
              marks: 2,
            },
            {
              id: "q-2",
              questionNumber: 2,
              question: "What green substance inside leaves captures solar energy to prepare plant food?",
              type: "mcq",
              options: ["Chlorophyll (ᱦᱟᱹᱨᱤᱭᱟᱹᱲ ᱨᱚᱝ)", "Carotene", "Pure water", "Nitrogen dust"],
              correctAnswer: "Chlorophyll (ᱦᱟᱹᱨᱤᱭᱟᱹᱲ ᱨᱚᱝ)",
              explanation: "Chlorophyll absorbs sunlight to synthesize glucose from carbon dioxide and water.",
              marks: 2,
            },
            {
              id: "q-3",
              questionNumber: 3,
              question: "Which vital gas do green forest trees release during daylight that humans breathe?",
              type: "mcq",
              options: ["Oxygen (ᱡᱤᱣᱤ ᱦᱚᱭ)", "Carbon Dioxide", "Argon", "Smoke"],
              correctAnswer: "Oxygen (ᱡᱤᱣᱤ ᱦᱚᱭ)",
              explanation: "Plants produce oxygen as a byproduct of daylight photosynthesis.",
              marks: 2,
            },
            {
              id: "q-4",
              questionNumber: 4,
              question: "What protective coat wraps around a seed before it germinates in moist soil?",
              type: "mcq",
              options: ["Seed Coat (ᱡᱟᱶ ᱪᱷᱟᱞ)", "Leaf vein", "Stem bark", "Flower petal"],
              correctAnswer: "Seed Coat (ᱡᱟᱶ ᱪᱷᱟᱞ)",
              explanation: "The seed coat shields the dormant embryo until moisture and warmth induce sprouting.",
              marks: 2,
            },
            {
              id: "q-5",
              questionNumber: 5,
              question: "Why do Sal trees in Jharkhand shed leaves during late winter and dry spring?",
              type: "mcq",
              options: [
                "To reduce water loss through transpiration",
                "Because of heavy rainfall",
                "To attract butterflies",
                "Due to excessive shade",
              ],
              correctAnswer: "To reduce water loss through transpiration",
              explanation: "Deciduous shedding conserves vital moisture in dry weather prior to summer rains.",
              marks: 2,
            },
          ],
        },
        worksheet: {
          id: "ws-mat-101",
          title: "Plants Around Us — Classroom Practice Worksheet",
          instructions: "Answer each question neatly in the lines provided below. Total marks: 20.",
          difficulty: "Medium",
          totalMarks: 20,
          estimatedTimeMinutes: 30,
          questions: [
            {
              id: "wsq-1",
              questionNumber: 1,
              question: "Explain why indigenous trees like Sal and Mahua need deep taproots in our district.",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "Deep taproots penetrate deep underground to reach water tables during dry hot months.",
              marks: 4,
            },
            {
              id: "wsq-2",
              questionNumber: 2,
              question: "List the three essential raw materials that green leaves use to produce food through photosynthesis.",
              type: "descriptive",
              writingSpaceLines: 3,
              suggestedAnswer: "1. Sunlight (ᱵᱮᱲᱟ ᱢᱟᱨᱥᱟᱞ), 2. Water from soil (ᱫᱟᱜ), 3. Carbon Dioxide from air (ᱦᱚᱭ).",
              marks: 4,
            },
            {
              id: "wsq-3",
              questionNumber: 3,
              question: "How do village forests help keep the ambient air cool and reduce seasonal soil erosion?",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "Tree root networks bind loose topsoil against runoff, and leafy canopy provides transpiration cooling.",
              marks: 4,
            },
            {
              id: "wsq-4",
              questionNumber: 4,
              question: "Describe the changes observed when a farmer sows paddy seeds into freshly plowed soil.",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "The seed absorbs soil moisture, swells, splits its testa, and sprouts a downward radicle root and upward green shoot.",
              marks: 4,
            },
            {
              id: "wsq-5",
              questionNumber: 5,
              question: "Give two reasons why planting and protecting fruit and shade trees near our school is beneficial.",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "Trees offer shade during recess, improve air quality, and provide seasonal nutritious fruits like Jamun and Mango.",
              marks: 4,
            },
          ],
        },
      },
    },
    {
      id: "mat-102",
      title: "Fractions & Fair Sharing - Chapter 2 Notes",
      subjectId: "sub-1",
      subjectName: "Mathematics",
      grade: "Grade 4",
      chapterTopic: "Chapter 2: Fractions & Sharing Produce",
      fileName: "Math_Ch2_Fractions_Notes.pdf",
      fileSize: "1.8 MB",
      uploadedAt: "2026-09-26T11:30:00Z",
      status: "ready",
      aiProcessedAt: "2026-09-26T11:31:40Z",
      aiSummary: "AI successfully analyzed Math_Ch2_Fractions_Notes.pdf. Extracted 5 multiple-choice fraction comparison items and 4 word problems on equal division.",
      approvalStatus: "pending_review",
      generatedContent: {
        quiz: {
          id: "quiz-mat-102",
          title: "Fractions & Equal Sharing — Quick Quiz",
          instructions: "Select the correct option for each problem. Total marks: 10.",
          difficulty: "Medium",
          totalMarks: 10,
          estimatedTimeMinutes: 15,
          questions: [
            {
              id: "qm-1",
              questionNumber: 1,
              question: "If 12 guavas are shared equally among 3 friends, how many guavas does each friend get?",
              type: "mcq",
              options: ["4 guavas (᱔ ᱴᱤ)", "3 guavas", "6 guavas", "2 guavas"],
              correctAnswer: "4 guavas (᱔ ᱴᱤ)",
              explanation: "12 divided by 3 equals 4 (12 ÷ 3 = 4).",
              marks: 2,
            },
            {
              id: "qm-2",
              questionNumber: 2,
              question: "Which fraction represents one half of a whole unit?",
              type: "mcq",
              options: ["1/2", "1/4", "3/4", "2/1"],
              correctAnswer: "1/2",
              explanation: "1/2 indicates 1 equal part out of 2.",
              marks: 2,
            },
            {
              id: "qm-3",
              questionNumber: 3,
              question: "Which fraction is bigger: 1/2 or 1/4?",
              type: "mcq",
              options: ["1/2 is bigger", "1/4 is bigger", "Both are equal", "Cannot be determined"],
              correctAnswer: "1/2 is bigger",
              explanation: "Dividing into 2 parts creates larger pieces than dividing into 4 parts.",
              marks: 2,
            },
            {
              id: "qm-4",
              questionNumber: 4,
              question: "If a string of length 20 cm is cut into 4 equal segments, what is the length of each segment?",
              type: "mcq",
              options: ["5 cm", "4 cm", "10 cm", "2 cm"],
              correctAnswer: "5 cm",
              explanation: "20 cm ÷ 4 = 5 cm.",
              marks: 2,
            },
            {
              id: "qm-5",
              questionNumber: 5,
              question: "What is 3/4 + 1/4 equal to?",
              type: "mcq",
              options: ["1 (One whole)", "4/8", "2/4", "3/8"],
              correctAnswer: "1 (One whole)",
              explanation: "(3 + 1) / 4 = 4/4 = 1.",
              marks: 2,
            },
          ],
        },
        worksheet: {
          id: "ws-mat-102",
          title: "Fractions & Equal Sharing — Practice Sheet",
          instructions: "Solve the word problems clearly showing calculations. Total marks: 16.",
          difficulty: "Medium",
          totalMarks: 16,
          estimatedTimeMinutes: 25,
          questions: [
            {
              id: "wsm-1",
              questionNumber: 1,
              question: "Solve: 24 kilograms of rice are shared equally among 4 families. How much does each family receive?",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "24 kg ÷ 4 = 6 kg per family.",
              marks: 4,
            },
            {
              id: "wsm-2",
              questionNumber: 2,
              question: "Draw two identical circular rotis. Shade 1/2 of the first and 1/4 of the second to demonstrate which is larger.",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "Shading half of a circle covers twice the area of one quarter.",
              marks: 4,
            },
            {
              id: "wsm-3",
              questionNumber: 3,
              question: "A piece of cloth measures 15 meters. If Guruji cuts 3/5 of it for school banner craft, how many meters are cut?",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "(15 ÷ 5) × 3 = 3 × 3 = 9 meters cut.",
              marks: 4,
            },
            {
              id: "wsm-4",
              questionNumber: 4,
              question: "Sona had ₹60. She spent 1/3 of it on colored pencils. How much did she spend, and how much money is left?",
              type: "descriptive",
              writingSpaceLines: 4,
              suggestedAnswer: "Spent = 60 ÷ 3 = ₹20. Remaining = 60 - 20 = ₹40.",
              marks: 4,
            },
          ],
        },
      },
    },
  ],
  submissions: [
    {
      id: "subm-1",
      worksheetId: "ws-101",
      worksheetTitle: "Fractions & Basic Division",
      subjectId: "sub-1",
      subjectName: "Mathematics",
      studentId: "s1",
      studentName: "Sona Murmu",
      submittedAt: "2026-09-24T11:20:00Z",
      fileName: "Sona_Math_Fractions_Completed.pdf",
      status: "Graded",
      grade: "A",
      marks: "18/20",
      scorePercentage: 90,
      feedback: "Very neat work on fractions! Ol Chiki handwriting is clear. Keep practicing unit comparisons.",
      checkedAt: "2026-09-25T14:15:00Z",
      checkedFileName: "Sona_Math_Fractions_Checked.pdf",
      aiConvertedFileName: "Sona_Math_Fractions_Converted_En_Hi.pdf",
      aiConvertedText: "Student Answer 1: 2 mangoes each (ᱡᱚᱛᱚ ᱦᱚᱲ ᱵᱟᱨᱭᱟ ᱠᱟᱛᱮ ᱩᱞ ᱠᱚ ᱧᱟᱢᱟ - प्रत्येक को 2 आम मिलेंगे)\nStudent Answer 2: 1/2 is greater than 1/4 (᱑/᱒ ᱫᱚ ᱑/᱔ ᱠᱷᱚᱱ ᱢᱟᱨᱟᱝᱟ - 1/2, 1/4 से बड़ा है)",
      answers: [
        {
          questionId: "w1",
          question: "यदि आपके पास 8 आम हैं और आप उन्हें 4 दोस्तों में बराबर बांटते हैं, तो प्रत्येक को कितने मिलेंगे?",
          studentAnswerSantali: "ᱡᱚᱛᱚ ᱦᱚᱲ ᱵᱟᱨᱭᱟ (2) ᱠᱟᱛᱮ ᱩᱞ ᱠᱚ ᱧᱟᱢᱟ",
          aiConvertedHindi: "प्रत्येक दोस्त को 2 आम मिलेंगे (8 ÷ 4 = 2)",
          aiConvertedEnglish: "Each friend gets 2 mangoes (8 divided by 4 = 2)",
          marksAwarded: "10/10",
        },
        {
          questionId: "w2",
          question: "1/2 और 1/4 में से कौन सा भिन्न बड़ा है?",
          studentAnswerSantali: "᱑/᱒ ᱫᱚ ᱑/᱔ ᱠᱷᱚᱱ ᱢᱟᱨᱟᱝ ᱦᱟᱹᱴᱤᱧ ᱠᱟᱱᱟ",
          aiConvertedHindi: "1/2, 1/4 से बड़ा भिन्न है",
          aiConvertedEnglish: "1/2 is a larger fraction than 1/4",
          marksAwarded: "8/10",
        },
      ],
    },
    {
      id: "subm-2",
      worksheetId: "ws-102",
      worksheetTitle: "Plants Around Us (Chapter 4)",
      subjectId: "sub-2",
      subjectName: "Science",
      studentId: "s1",
      studentName: "Sona Murmu",
      submittedAt: "2026-09-28T09:40:00Z",
      fileName: "Sona_Science_Plants_Submitted.pdf",
      status: "Submitted",
      marks: "Pending",
      feedback: "",
      answers: [
        {
          questionId: "w101",
          question: "पौधे अपना भोजन कैसे बनाते हैं? कारण सहित उत्तर दीजिए।",
          studentAnswerSantali: "ᱫᱟᱨᱮ ᱠᱚᱫᱚ ᱥᱤᱛᱩᱝ ᱵᱮᱲᱟ ᱟᱨ ᱫᱟᱜ ᱦᱟᱥᱟ ᱠᱷᱚᱱ ᱡᱚᱢᱟᱜ ᱠᱚ ᱛᱮᱭᱟᱨᱟ (ᱯᱷᱚᱴᱚᱥᱤᱱᱛᱷᱮᱥᱤᱥ)",
          aiConvertedHindi: "पौधे धूप, पानी और मिट्टी से भोजन बनाते हैं (प्रकाश संश्लेषण द्वारा)",
          aiConvertedEnglish: "Plants prepare food using sunlight, water, and soil nutrients (photosynthesis)",
        },
        {
          questionId: "w102",
          question: "एक बीज को पौधा बनने के लिए किन-किन चीज़ों की आवश्यकता होती है?",
          studentAnswerSantali: "ᱢᱤᱫᱴᱟᱹᱝ ᱡᱟᱝ ᱫᱟᱨᱮ ᱵᱮᱱᱟᱣ ᱞᱟᱹᱜᱤᱫ ᱦᱟᱥᱟ, ᱫᱟᱜ ᱟᱨ ᱥᱤᱛᱩᱝ ᱞᱟᱹᱠᱛᱤᱜ-ᱟ",
          aiConvertedHindi: "बीज को अंकुरित होने के लिए मिट्टी, पानी और धूप की आवश्यकता होती है",
          aiConvertedEnglish: "A seed needs soil, moisture/water, and sunlight to germinate into a plant",
        },
      ],
    },
    {
      id: "subm-3",
      worksheetId: "ws-101",
      worksheetTitle: "Fractions & Basic Division",
      subjectId: "sub-1",
      subjectName: "Mathematics",
      studentId: "s2",
      studentName: "Bijay Hembrom",
      submittedAt: "2026-09-24T16:00:00Z",
      fileName: "Bijay_Fractions_Worksheet.pdf",
      status: "Graded",
      grade: "A+",
      marks: "20/20",
      scorePercentage: 100,
      feedback: "Exceptional mastery of fractional reasoning and clear step-by-step Ol Chiki solution.",
      checkedAt: "2026-09-25T15:00:00Z",
      checkedFileName: "Bijay_Fractions_Checked.pdf",
      aiConvertedFileName: "Bijay_Fractions_Converted.pdf",
      aiConvertedText: "Student answered both questions with complete accuracy and reasoning.",
    },
  ],
  notifications: [
    {
      id: "notif-1",
      studentId: "s1",
      title: "New worksheet published",
      message: "Science — Plants Around Us (Chapter 4)",
      subjectName: "Science",
      worksheetId: "ws-102",
      deadline: "2026-10-05T17:00:00Z",
      read: false,
      createdAt: "2026-09-22T14:30:00Z",
    },
  ],
  userProfile: {
    id: "s1",
    name: "Sona Murmu",
    role: "student",
    rollNo: "24",
    grade: "Grade 4",
    school: "Rajkiya Prathmik Vidyalaya, Dumka",
    pin: DEFAULT_STUDENT_PINS[0],
    language: "en",
    badges: 6,
    accuracy: 82,
    weakConcepts: ["Photosynthesis", "Addition carry-over"],
    seenCardIds: [],
  },
  students: [
    {
      id: "s1",
      name: "Sona Murmu",
      rollNo: "24",
      grade: "Grade 4",
      school: "Rajkiya Prathmik Vidyalaya, Dumka",
      pin: DEFAULT_STUDENT_PINS[0],
      language: "en",
      accuracy: 82,
      badges: 6,
      weakConcepts: ["Photosynthesis", "Addition carry-over"],
      cardsReviewed: 142,
      masteryPercentage: 78,
      createdAt: "2026-09-01T08:00:00Z",
    },
    {
      id: "s2",
      name: "Bijay Hembrom",
      rollNo: "12",
      grade: "Grade 4",
      school: "Rajkiya Prathmik Vidyalaya, Dumka",
      pin: DEFAULT_STUDENT_PINS[1],
      language: "sat",
      accuracy: 91,
      badges: 9,
      weakConcepts: ["Fractions Comparison"],
      cardsReviewed: 198,
      masteryPercentage: 88,
      createdAt: "2026-09-01T08:00:00Z",
    },
    {
      id: "s3",
      name: "Rupa Tudu",
      rollNo: "08",
      grade: "Grade 4",
      school: "Rajkiya Prathmik Vidyalaya, Dumka",
      pin: DEFAULT_STUDENT_PINS[2],
      language: "hi",
      accuracy: 74,
      badges: 4,
      weakConcepts: ["Plant Parts", "Seed Germination"],
      cardsReviewed: 110,
      masteryPercentage: 69,
      createdAt: "2026-09-01T08:00:00Z",
    },
    {
      id: "s4",
      name: "Chandan Hansda",
      rollNo: "17",
      grade: "Grade 4",
      school: "Rajkiya Prathmik Vidyalaya, Dumka",
      pin: DEFAULT_STUDENT_PINS[3],
      language: "en",
      accuracy: 86,
      badges: 7,
      weakConcepts: ["Division remainder"],
      cardsReviewed: 165,
      masteryPercentage: 82,
      createdAt: "2026-09-01T08:00:00Z",
    },
  ],
  teacherProfile: {
    id: "t1",
    name: "Guruji Hemant Soren",
    email: "hemant.soren@aaroh-edu.in",
    role: "teacher",
    employeeId: "EDU-JH-2024-089",
    assignedGrade: "Grade 4 (Sections A & B)",
    schoolName: "Rajkiya Prathmik Vidyalaya, Dumka",
    subjectSpecialization: "Science & Santali Language",
    language: "en",
    autoAiTranslation: true,
    lateSubmissionsAllowed: true,
    notifyOnSubmission: true,
  },
};

function readDB(): DBData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.userProfile) {
        parsed.userProfile = DEFAULT_DATA.userProfile;
      }
      if (!parsed.userProfile.seenCardIds) {
        parsed.userProfile.seenCardIds = [];
      }
      if (!parsed.userProfile.school) {
        parsed.userProfile.school = "Rajkiya Prathmik Vidyalaya, Dumka";
      }
      if (!parsed.userProfile.pin) {
        const students = Array.isArray(parsed.students) ? parsed.students : [];
        const matchingStudent = students.find((s: any) => s.id === parsed.userProfile.id);
        const existingPINs = new Set<string>(students.map((s: any) => s.pin).filter(Boolean));
        parsed.userProfile.pin = matchingStudent?.pin || generateUniquePIN(existingPINs);
      }
      if (!parsed.students || parsed.students.length === 0) {
        parsed.students = DEFAULT_DATA.students;
      } else {
        // Ensure each student has school, pin, language, createdAt
        const existingPINs = new Set<string>(parsed.students.map((s: any) => s.pin).filter(Boolean));
        parsed.students.forEach((s: any) => {
          if (!s.school) s.school = "Rajkiya Prathmik Vidyalaya, Dumka";
          if (!s.pin) {
            s.pin = generateUniquePIN(existingPINs);
          }
          existingPINs.add(s.pin);
          if (!s.language) s.language = "en";
          if (!s.createdAt) s.createdAt = "2026-09-01T08:00:00Z";
        });
        const activeStudent = parsed.students.find((s: any) => s.id === parsed.userProfile.id);
        if (activeStudent) {
          parsed.userProfile.pin = activeStudent.pin;
        }
      }
      if (!parsed.teacherProfile) {
        parsed.teacherProfile = DEFAULT_DATA.teacherProfile;
      }
      if (!parsed.submissions || parsed.submissions.length === 0) {
        parsed.submissions = DEFAULT_DATA.submissions;
      }
      if (!parsed.subjects || parsed.subjects.length === 0) {
        parsed.subjects = DEFAULT_DATA.subjects;
      }
      if (!parsed.worksheets || parsed.worksheets.length === 0) {
        parsed.worksheets = DEFAULT_DATA.worksheets;
      }
      if (!parsed.materials || parsed.materials.length === 0) {
        parsed.materials = DEFAULT_DATA.materials;
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error reading DB_FILE:", e);
  }
  return DEFAULT_DATA;
}

function writeDB(data: DBData) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing DB_FILE:", e);
  }
}

export const db = {
  getSubjects: (): SubjectItem[] => {
    return readDB().subjects;
  },
  addSubject: (name: string, description?: string, icon?: string): SubjectItem => {
    const data = readDB();
    const newSubject: SubjectItem = {
      id: `sub-${Date.now()}`,
      name,
      description: description || `${name} worksheets and lessons`,
      icon: icon || "book",
      createdAt: new Date().toISOString(),
    };
    data.subjects.push(newSubject);
    writeDB(data);
    return newSubject;
  },
  getWorksheets: (subjectId?: string): WorksheetItem[] => {
    const worksheets = readDB().worksheets;
    if (subjectId && subjectId !== "all") {
      return worksheets.filter((w) => w.subjectId === subjectId);
    }
    return worksheets;
  },
  getWorksheetById: (id: string): WorksheetItem | undefined => {
    return readDB().worksheets.find((w) => w.id === id);
  },
  addWorksheet: (worksheet: Omit<WorksheetItem, "id" | "createdAt">): WorksheetItem => {
    const data = readDB();
    const newWorksheet: WorksheetItem = {
      ...worksheet,
      id: `ws-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    data.worksheets.unshift(newWorksheet);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      studentId: "s1",
      title: "New worksheet published",
      message: `${worksheet.subjectName} — ${worksheet.title}`,
      subjectName: worksheet.subjectName,
      worksheetId: newWorksheet.id,
      deadline: worksheet.deadline,
      read: false,
      createdAt: new Date().toISOString(),
    };
    data.notifications.unshift(newNotif);

    writeDB(data);
    return newWorksheet;
  },
  getSubmissions: (worksheetId?: string): SubmissionItem[] => {
    const submissions = readDB().submissions;
    if (worksheetId) {
      return submissions.filter((s) => s.worksheetId === worksheetId);
    }
    return submissions;
  },
  addSubmission: (
    worksheetId: string,
    fileName: string,
    studentId = "s1",
    studentName = "Sona Murmu"
  ): SubmissionItem => {
    const data = readDB();
    const worksheet = data.worksheets.find((w) => w.id === worksheetId);
    const newSub: SubmissionItem = {
      id: `subm-${Date.now()}`,
      worksheetId,
      worksheetTitle: worksheet ? worksheet.title : "Worksheet",
      subjectName: worksheet ? worksheet.subjectName : "General",
      studentId,
      studentName,
      submittedAt: new Date().toISOString(),
      fileName,
      status: "Submitted",
    };
    data.submissions.unshift(newSub);
    writeDB(data);
    return newSub;
  },
  getNotifications: (studentId = "s1"): NotificationItem[] => {
    return readDB().notifications;
  },
  markNotificationRead: (id: string) => {
    const data = readDB();
    const n = data.notifications.find((item) => item.id === id);
    if (n) {
      n.read = true;
      writeDB(data);
    }
  },
  markAllNotificationsRead: () => {
    const data = readDB();
    data.notifications.forEach((n) => (n.read = true));
    writeDB(data);
  },
  getUserProfile: (): UserProfile => {
    return readDB().userProfile;
  },
  updateUserProfile: (profile: Partial<UserProfile>): UserProfile => {
    const data = readDB();
    data.userProfile = { ...data.userProfile, ...profile };
    writeDB(data);
    return data.userProfile;
  },

  // Deduplication & Seen Cards Tracking
  markCardSeen: (cardId: string): string[] => {
    const data = readDB();
    if (!data.userProfile.seenCardIds.includes(cardId)) {
      data.userProfile.seenCardIds.push(cardId);
      writeDB(data);
    }
    return data.userProfile.seenCardIds;
  },
  markCardsSeen: (cardIds: string[]): string[] => {
    const data = readDB();
    let updated = false;
    cardIds.forEach((id) => {
      if (!data.userProfile.seenCardIds.includes(id)) {
        data.userProfile.seenCardIds.push(id);
        updated = true;
      }
    });
    if (updated) writeDB(data);
    return data.userProfile.seenCardIds;
  },
  resetSeenCards: (): void => {
    const data = readDB();
    data.userProfile.seenCardIds = [];
    writeDB(data);
  },
  recordFlashcardReview: (params: {
    studentId?: string;
    cardId: string;
    concept: string;
    result: "right" | "practice";
  }) => {
    const data = readDB();
    const studentId = params.studentId || data.userProfile.id || "s1";
    const student = data.students.find((s) => s.id === studentId);

    // 1. Mark card as seen so it never repeats
    if (!data.userProfile.seenCardIds.includes(params.cardId)) {
      data.userProfile.seenCardIds.push(params.cardId);
    }

    if (student) {
      if (!student.seenCardIds) student.seenCardIds = [];
      if (!student.seenCardIds.includes(params.cardId)) {
        student.seenCardIds.push(params.cardId);
      }
      student.cardsReviewed = (student.cardsReviewed || 0) + 1;

      if (params.result === "right") {
        // Correct answer: increment mastery, boost accuracy, remove from weakConcepts if present
        student.accuracy = Math.min(100, Math.round(((student.accuracy || 80) * 9 + 100) / 10));
        student.masteryPercentage = Math.min(100, (student.masteryPercentage || 75) + 1);
        if (student.weakConcepts.includes(params.concept)) {
          student.weakConcepts = student.weakConcepts.filter((c) => c !== params.concept);
        }
      } else {
        // Needs practice (wrong): lower accuracy slightly, add to student's weak concepts for teacher
        student.accuracy = Math.max(20, Math.round(((student.accuracy || 80) * 9 + 0) / 10));
        student.masteryPercentage = Math.max(10, (student.masteryPercentage || 75) - 1);
        if (params.concept && !student.weakConcepts.includes(params.concept)) {
          student.weakConcepts.push(params.concept);
        }
      }

      if (data.userProfile.id === studentId) {
        data.userProfile.accuracy = student.accuracy;
        data.userProfile.weakConcepts = [...student.weakConcepts];
      }
    }

    writeDB(data);
    return {
      success: true,
      studentId,
      accuracy: student?.accuracy,
      masteryPercentage: student?.masteryPercentage,
      weakConcepts: student?.weakConcepts || [],
      seenCount: data.userProfile.seenCardIds.length,
    };
  },

  getStudents: (): StudentRecord[] => {
    return readDB().students;
  },
  getStudentById: (id: string): StudentRecord | undefined => {
    return readDB().students.find((s) => s.id === id);
  },
  updateStudent: (id: string, update: Partial<StudentRecord>): StudentRecord | undefined => {
    const data = readDB();
    const s = data.students.find((st) => st.id === id);
    if (s) {
      Object.assign(s, update);
      if (data.userProfile.id === id) {
        Object.assign(data.userProfile, update);
      }
      writeDB(data);
    }
    return s;
  },
  addStudent: (data: {
    name: string;
    school: string;
    grade: string;
    rollNo: string;
  }): { student: StudentRecord; generatedPin: string } => {
    const dbData = readDB();
    const existingPINs = new Set<string>(dbData.students.map((s) => s.pin).filter(Boolean));
    const generatedPin = generateUniquePIN(existingPINs);

    const newStudent: StudentRecord = {
      id: `s-${Date.now()}`,
      name: data.name.trim(),
      school: data.school.trim() || "Rajkiya Prathmik Vidyalaya, Dumka",
      grade: data.grade.trim() || "Grade 4",
      rollNo: data.rollNo.trim(),
      pin: generatedPin,
      language: "en",
      accuracy: 0,
      badges: 0,
      weakConcepts: [],
      cardsReviewed: 0,
      masteryPercentage: 0,
      createdAt: new Date().toISOString(),
    };

    dbData.students.push(newStudent);
    writeDB(dbData);
    return { student: newStudent, generatedPin };
  },
  deleteStudent: (id: string): boolean => {
    const dbData = readDB();
    const initLen = dbData.students.length;
    dbData.students = dbData.students.filter((s) => s.id !== id);
    if (dbData.students.length !== initLen) {
      writeDB(dbData);
      return true;
    }
    return false;
  },
  resetStudentPIN: (id: string): string | null => {
    const dbData = readDB();
    const student = dbData.students.find((s) => s.id === id);
    if (!student) return null;
    const existingPINs = new Set<string>(dbData.students.map((s) => s.pin).filter(Boolean));
    const newPin = generateUniquePIN(existingPINs);
    student.pin = newPin;
    if (dbData.userProfile.id === id) {
      dbData.userProfile.pin = newPin;
    }
    writeDB(dbData);
    return newPin;
  },
  authenticateStudent: (rollNo: string, pin: string, grade?: string): StudentRecord | null => {
    const data = readDB();
    const cleanRoll = rollNo.trim().toLowerCase();
    const cleanPin = pin.trim();

    const student = data.students.find((s) => {
      const matchRoll = s.rollNo.trim().toLowerCase() === cleanRoll;
      const matchPin = s.pin.trim() === cleanPin;
      if (grade && grade.trim()) {
        return matchRoll && matchPin && s.grade.toLowerCase() === grade.trim().toLowerCase();
      }
      return matchRoll && matchPin;
    });

    if (!student) return null;

    data.userProfile = {
      id: student.id,
      name: student.name,
      role: "student",
      rollNo: student.rollNo,
      grade: student.grade,
      school: student.school,
      pin: student.pin,
      language: student.language || "en",
      badges: student.badges,
      accuracy: student.accuracy,
      weakConcepts: student.weakConcepts,
      seenCardIds: data.userProfile?.seenCardIds || [],
    };
    writeDB(data);
    return student;
  },
  setActiveStudent: (id: string): StudentRecord | null => {
    const data = readDB();
    const student = data.students.find((s) => s.id === id);
    if (!student) return null;

    data.userProfile = {
      id: student.id,
      name: student.name,
      role: "student",
      rollNo: student.rollNo,
      grade: student.grade,
      school: student.school,
      pin: student.pin,
      language: student.language || "en",
      badges: student.badges,
      accuracy: student.accuracy,
      weakConcepts: student.weakConcepts,
      seenCardIds: data.userProfile?.seenCardIds || [],
    };
    writeDB(data);
    return student;
  },
  getTeacherProfile: (): TeacherProfile => {
    return readDB().teacherProfile;
  },
  updateTeacherProfile: (profile: Partial<TeacherProfile>): TeacherProfile => {
    const data = readDB();
    data.teacherProfile = { ...data.teacherProfile, ...profile };
    writeDB(data);
    return data.teacherProfile;
  },
  evaluateSubmission: (
    id: string,
    evalData: {
      marks: string;
      grade?: string;
      feedback?: string;
      scorePercentage?: number;
      aiConvertedFileName?: string;
      aiConvertedText?: string;
      checkedFileName?: string;
      answers?: SubmissionItem["answers"];
    }
  ): SubmissionItem | undefined => {
    const data = readDB();
    const sub = data.submissions.find((s) => s.id === id);
    if (!sub) return undefined;

    sub.status = "Graded";
    sub.marks = evalData.marks;
    sub.grade = evalData.grade || "A";
    sub.feedback = evalData.feedback || "";
    sub.scorePercentage = evalData.scorePercentage ?? 85;
    sub.checkedAt = new Date().toISOString();
    if (evalData.checkedFileName) sub.checkedFileName = evalData.checkedFileName;
    if (evalData.aiConvertedFileName) sub.aiConvertedFileName = evalData.aiConvertedFileName;
    if (evalData.aiConvertedText) sub.aiConvertedText = evalData.aiConvertedText;
    if (evalData.answers) sub.answers = evalData.answers;

    // Create a student notification that their worksheet was evaluated
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      studentId: sub.studentId,
      title: "Worksheet Evaluated",
      message: `${sub.worksheetTitle} has been evaluated: ${sub.marks}`,
      subjectName: sub.subjectName,
      worksheetId: sub.worksheetId,
      deadline: "",
      read: false,
      createdAt: new Date().toISOString(),
    };
    data.notifications.unshift(newNotif);

    writeDB(data);
    return sub;
  },
  getStudentEvaluations: (studentId = "s1"): SubmissionItem[] => {
    return readDB().submissions.filter(
      (s) => s.studentId === studentId && s.status === "Graded"
    );
  },
  deleteSubject: (id: string): boolean => {
    const data = readDB();
    const initLen = data.subjects.length;
    data.subjects = data.subjects.filter((s) => s.id !== id);
    if (data.subjects.length !== initLen) {
      writeDB(data);
      return true;
    }
    return false;
  },
  deleteWorksheet: (id: string): boolean => {
    const data = readDB();
    const initLen = data.worksheets.length;
    data.worksheets = data.worksheets.filter((w) => w.id !== id);
    if (data.worksheets.length !== initLen) {
      writeDB(data);
      return true;
    }
    return false;
  },
  getMaterials: (subjectId?: string): LearningMaterialItem[] => {
    const materials = readDB().materials || [];
    if (subjectId && subjectId !== "all") {
      return materials.filter((m) => m.subjectId === subjectId);
    }
    return materials;
  },
  getMaterialById: (id: string): LearningMaterialItem | undefined => {
    return (readDB().materials || []).find((m) => m.id === id);
  },
  addMaterial: (
    material: Omit<LearningMaterialItem, "id" | "uploadedAt" | "status" | "approvalStatus"> & {
      status?: LearningMaterialItem["status"];
      approvalStatus?: LearningMaterialItem["approvalStatus"];
    }
  ): LearningMaterialItem => {
    const data = readDB();
    if (!data.materials) data.materials = [];
    const newMaterial: LearningMaterialItem = {
      ...material,
      id: `mat-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      status: material.status || "uploaded",
      approvalStatus: material.approvalStatus || "pending_review",
    };
    data.materials.unshift(newMaterial);
    writeDB(data);
    return newMaterial;
  },
  updateMaterial: (
    id: string,
    updates: Partial<LearningMaterialItem>
  ): LearningMaterialItem | undefined => {
    const data = readDB();
    const mat = (data.materials || []).find((m) => m.id === id);
    if (!mat) return undefined;
    Object.assign(mat, updates);
    writeDB(data);
    return mat;
  },
  deleteMaterial: (id: string): boolean => {
    const data = readDB();
    const initLen = (data.materials || []).length;
    data.materials = (data.materials || []).filter((m) => m.id !== id);
    if (data.materials.length !== initLen) {
      writeDB(data);
      return true;
    }
    return false;
  },
  approveAndAssignMaterial: (
    materialId: string,
    deadline: string
  ): { material: LearningMaterialItem; worksheet: WorksheetItem } | undefined => {
    const data = readDB();
    const material = (data.materials || []).find((m) => m.id === materialId);
    if (!material || !material.generatedContent) return undefined;

    material.approvalStatus = "assigned";
    material.approvedAt = new Date().toISOString();

    const wsQuestions = material.generatedContent.worksheet.questions || [];
    const items = wsQuestions.map((q, idx) => ({
      id: `w-mat-${idx + 1}`,
      original: q.question,
      translated: q.suggestedAnswer || q.question,
      translatedOlChiki: q.question,
      concept: material.chapterTopic || "Core Concept",
      localExample: `Extracted from ${material.title} (${material.grade})`,
    }));

    const newWorksheet: WorksheetItem = {
      id: `ws-${Date.now()}`,
      title: `${material.title} (Worksheet)`,
      subjectId: material.subjectId,
      subjectName: material.subjectName,
      originalLanguage: "English / Hindi",
      fileName: material.fileName,
      pdfUrl: "",
      deadline: deadline || "2026-10-30T17:00:00Z",
      status: "active",
      materialId: material.id,
      materialTitle: material.title,
      items,
      createdAt: new Date().toISOString(),
    };

    data.worksheets.unshift(newWorksheet);
    material.assignedWorksheetId = newWorksheet.id;

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      studentId: "s1",
      title: "New study worksheet assigned!",
      message: `${material.subjectName} (${material.grade}) — ${material.title}`,
      subjectName: material.subjectName,
      worksheetId: newWorksheet.id,
      deadline: newWorksheet.deadline,
      read: false,
      createdAt: new Date().toISOString(),
    };
    data.notifications.unshift(newNotif);

    writeDB(data);
    return { material, worksheet: newWorksheet };
  },
};
