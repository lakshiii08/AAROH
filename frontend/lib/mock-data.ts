// Mock data for the AAROH prototype. No backend — everything here is
// hardcoded so the UI can be explored end-to-end.

export type Flashcard = {
  id: string;
  concept: string; // subject-neutral concept name, e.g. "Water"
  category: "Vocabulary" | "Science" | "Math";
  imageEmoji: string; // stand-in for an illustration
  front: {
    hindi: string;
    english: string;
  };
  back: {
    santhaliOlChiki: string;
    santhaliRoman: string;
  };
};

export const flashcards: Flashcard[] = [
  {
    id: "fc-01",
    concept: "Water",
    category: "Vocabulary",
    imageEmoji: "💧",
    front: { hindi: "पानी", english: "Water" },
    back: { santhaliOlChiki: "ᱫᱟᱜ", santhaliRoman: "Daᶜ" },
  },
  {
    id: "fc-02",
    concept: "Sun",
    category: "Vocabulary",
    imageEmoji: "☀️",
    front: { hindi: "सूरज", english: "Sun" },
    back: { santhaliOlChiki: "ᱥᱤᱝᱜᱮᱞ", santhaliRoman: "Singel" },
  },
  {
    id: "fc-03",
    concept: "Tree",
    category: "Vocabulary",
    imageEmoji: "🌳",
    front: { hindi: "पेड़", english: "Tree" },
    back: { santhaliOlChiki: "ᱫᱟᱨᱮ", santhaliRoman: "Dare" },
  },
  {
    id: "fc-04",
    concept: "Photosynthesis",
    category: "Science",
    imageEmoji: "🌿",
    front: { hindi: "प्रकाश संश्लेषण", english: "Photosynthesis" },
    back: {
      santhaliOlChiki: "ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱡᱚᱢ ᱵᱮᱱᱟᱣ",
      santhaliRoman: "Dare reyaɡ jom benao",
    },
  },
  {
    id: "fc-05",
    concept: "Seed",
    category: "Science",
    imageEmoji: "🌱",
    front: { hindi: "बीज", english: "Seed" },
    back: { santhaliOlChiki: "ᱡᱟᱶ", santhaliRoman: "Jaṅ" },
  },
  {
    id: "fc-06",
    concept: "Addition",
    category: "Math",
    imageEmoji: "➕",
    front: { hindi: "जोड़", english: "Addition" },
    back: { santhaliOlChiki: "ᱥᱮᱨᱢᱟ", santhaliRoman: "Sermaa" },
  },
  {
    id: "fc-07",
    concept: "Number",
    category: "Math",
    imageEmoji: "🔢",
    front: { hindi: "संख्या", english: "Number" },
    back: { santhaliOlChiki: "ᱞᱮᱠᱷᱟ", santhaliRoman: "Lekha" },
  },
  {
    id: "fc-08",
    concept: "River",
    category: "Vocabulary",
    imageEmoji: "🏞️",
    front: { hindi: "नदी", english: "River" },
    back: { santhaliOlChiki: "ᱜᱟᱰᱟ", santhaliRoman: "Gaḍa" },
  },
];

export type Lesson = {
  id: string;
  title: string;
  subject: string;
  progress: number; // 0-100
  durationMin: number;
  icon: "book" | "flask" | "calculator" | "globe";
};

export const currentLessons: Lesson[] = [
  { id: "l-1", title: "Plants Around Us", subject: "Science", progress: 70, durationMin: 12, icon: "flask" },
  { id: "l-2", title: "Counting to 100", subject: "Math", progress: 45, durationMin: 8, icon: "calculator" },
  { id: "l-3", title: "My Village, My World", subject: "Social Studies", progress: 20, durationMin: 10, icon: "globe" },
  { id: "l-4", title: "Reading: Short Stories", subject: "Language", progress: 90, durationMin: 15, icon: "book" },
];

export type AssessmentQuestion = {
  id: string;
  question: string;
  santhaliHint: string;
  options: string[];
  correctIndex: number;
};

export const mockAssessment: AssessmentQuestion[] = [
  {
    id: "q1",
    question: "Plants prepare their own food using sunlight. This process is called:",
    santhaliHint: "ᱫᱟᱨᱮ ᱠᱚ ᱥᱮᱫᱟᱭ ᱨᱮᱭᱟᱜ ᱡᱚᱢ ᱵᱮᱱᱟᱣ ᱠᱟᱛᱮ",
    options: ["Respiration", "Photosynthesis", "Digestion", "Germination"],
    correctIndex: 1,
  },
  {
    id: "q2",
    question: "What do seeds need to grow into a plant?",
    santhaliHint: "ᱡᱟᱶ ᱫᱚ ᱚᱠᱚᱭ ᱞᱟᱹᱜᱤᱫ ᱵᱟᱲᱟᱭ ᱟᱹᱰᱤ ᱵᱟᱹᱰᱟᱭ ᱠᱟᱱᱟ",
    options: ["Water, soil and sunlight", "Only water", "Only soil", "Salt and sugar"],
    correctIndex: 0,
  },
  {
    id: "q3",
    question: "Which part of the plant absorbs water from the soil?",
    santhaliHint: "ᱫᱟᱨᱮ ᱨᱮᱭᱟᱜ ᱚᱠᱟ ᱦᱤᱥᱥᱟ ᱫᱟᱜ ᱜᱟᱲᱮ ᱮᱫᱟᱭ",
    options: ["Leaves", "Flower", "Roots", "Stem"],
    correctIndex: 2,
  },
];

export type StudentSummary = {
  id: string;
  name: string;
  grade: string;
  badges: number;
  accuracy: number; // %
  weakConcepts: string[];
};

export const students: StudentSummary[] = [
  { id: "s1", name: "Sona Murmu", grade: "Grade 4", badges: 6, accuracy: 82, weakConcepts: ["Photosynthesis"] },
  { id: "s2", name: "Bijay Hembrom", grade: "Grade 4", badges: 3, accuracy: 54, weakConcepts: ["Photosynthesis", "Addition carry-over"] },
  { id: "s3", name: "Rupa Tudu", grade: "Grade 4", badges: 8, accuracy: 91, weakConcepts: [] },
  { id: "s4", name: "Somai Kisku", grade: "Grade 4", badges: 2, accuracy: 41, weakConcepts: ["Plant Growth", "Number place value"] },
  { id: "s5", name: "Lakhi Soren", grade: "Grade 4", badges: 5, accuracy: 76, weakConcepts: ["Seed germination"] },
  { id: "s6", name: "Ravi Marndi", grade: "Grade 4", badges: 4, accuracy: 63, weakConcepts: ["Photosynthesis"] },
];

export type ConceptGap = {
  concept: string;
  attempts: number;
  accuracy: number;
  recommendation: "On Track" | "Watch" | "Remedial Needed";
};

export const conceptGaps: ConceptGap[] = [
  { concept: "Photosynthesis", attempts: 132, accuracy: 48, recommendation: "Remedial Needed" },
  { concept: "Plant Growth", attempts: 98, accuracy: 61, recommendation: "Watch" },
  { concept: "Seed Germination", attempts: 87, accuracy: 58, recommendation: "Watch" },
  { concept: "Addition Carry-over", attempts: 140, accuracy: 39, recommendation: "Remedial Needed" },
  { concept: "Number Place Value", attempts: 110, accuracy: 72, recommendation: "On Track" },
  { concept: "Village & Community", attempts: 65, accuracy: 88, recommendation: "On Track" },
];

export type FlashcardStat = {
  concept: string;
  flips: number;
  accuracy: number;
  strugglingStudents: number;
};

export const flashcardAnalytics: FlashcardStat[] = [
  { concept: "Photosynthesis", flips: 214, accuracy: 44, strugglingStudents: 12 },
  { concept: "Addition", flips: 189, accuracy: 51, strugglingStudents: 9 },
  { concept: "River", flips: 96, accuracy: 88, strugglingStudents: 1 },
  { concept: "Seed", flips: 150, accuracy: 63, strugglingStudents: 6 },
  { concept: "Sun", flips: 80, accuracy: 92, strugglingStudents: 0 },
];

export const classPerformance = {
  overallMastery: 68,
  bySubject: [
    { subject: "Science", mastery: 58 },
    { subject: "Math", mastery: 62 },
    { subject: "Language", mastery: 81 },
    { subject: "Social Studies", mastery: 74 },
  ],
};

export const mockAssessmentSheet = {
  title: "Chapter 4 Worksheet: Plants Around Us",
  originalLanguage: "Hindi",
  items: [
    {
      id: "w1",
      original: "पौधे अपना भोजन कैसे बनाते हैं? कारण सहित उत्तर दीजिए।",
      translated: "गाछ रेयाग् जोम ओका लेकान बेनाओ काना? कारण सहित उत्तर मे।",
      translatedOlChiki: "ᱜᱟᱪ ᱨᱮᱭᱟᱜ ᱡᱚᱢ ᱚᱠᱟ ᱞᱮᱠᱟᱱ ᱵᱮᱱᱟᱣ ᱠᱟᱱᱟ?",
      concept: "Photosynthesis",
      localExample: "Local example: like how the sal trees in your village turn green and full after the first rains.",
    },
    {
      id: "w2",
      original: "एक बीज को पौधा बनने के लिए किन-किन चीज़ों की आवश्यकता होती है?",
      translated: "मित् जाङ् दो गाछ बाड़ाय आड़ि लागित् चेट् चेट् बा'नुक् लागित् चाहिय'?",
      translatedOlChiki: "ᱢᱤᱫ ᱡᱟᱶ ᱫᱚ ᱫᱟᱨᱮ ᱵᱟᱲᱟᱭ ᱞᱟᱹᱜᱤᱫ ᱪᱮᱫ ᱪᱮᱫ ᱵᱟᱹᱱᱩᱠ ᱪᱟᱦᱤ",
      concept: "Seed Germination",
      localExample: "Local example: paddy seeds sown before monsoon in the village fields.",
    },
    {
      id: "w3",
      original: "जड़ का क्या कार्य है?",
      translated: "रेहेत् रेयाग् चेत् काम काना?",
      translatedOlChiki: "ᱨᱮᱦᱮᱫ ᱨᱮᱭᱟᱜ ᱪᱮᱫ ᱠᱟᱢ ᱠᱟᱱᱟ",
      concept: "Plant Growth",
      localExample: "Local example: how mahua tree roots hold the soil on the hillside.",
    },
  ],
};
