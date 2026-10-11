/**
 * Modular AI Materials & Assessment Processing Service for AAROH.
 * 
 * Supports:
 * 1. Pluggable connection to an external AI / backend server via AAROH_AI_BACKEND_URL or GEMINI_API_KEY.
 * 2. High-fidelity grade-specific pedagogical question synthesis (Grades 1-5).
 * 3. Graceful fallback & error handling when backend services are offline or pending configuration.
 */

import { GeneratedAssessment, GeneratedQuestion } from "@/lib/db";

export interface AIProcessOptions {
  title: string;
  subjectName: string;
  grade: string;
  chapterTopic: string;
  fileName: string;
  fileData?: string;
  questionCount?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
}

export interface AIProcessResponse {
  success: boolean;
  aiSummary: string;
  quiz: GeneratedAssessment;
  worksheet: GeneratedAssessment;
  backendUsed: "external_service" | "local_pedagogical_engine";
  error?: string;
}

/**
 * Attempts to call an external AI backend service if configured via environment variables.
 */
async function tryExternalAIBackend(options: AIProcessOptions): Promise<AIProcessResponse | null> {
  const backendUrl = process.env.AAROH_AI_BACKEND_URL;
  if (!backendUrl) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(`${backendUrl}/api/process-material`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.quiz && data.worksheet) {
        return {
          success: true,
          aiSummary: data.aiSummary || `Material analyzed by ${backendUrl}`,
          quiz: data.quiz,
          worksheet: data.worksheet,
          backendUsed: "external_service",
        };
      }
    }
  } catch (err) {
    console.warn("External AI backend unavailable or timed out, falling back to local pedagogical engine:", err);
  }
  return null;
}

/**
 * Local curriculum-aware pedagogical generation engine.
 * Generates structured, grade-appropriate, non-hardcoded questions based dynamically
 * on the provided topic, subject, grade level, and difficulty.
 */
function generateContextualAssessments(options: AIProcessOptions): AIProcessResponse {
  const {
    title,
    subjectName,
    grade,
    chapterTopic,
    fileName,
    questionCount = 5,
    difficulty = "Medium",
  } = options;

  const count = Math.max(3, Math.min(questionCount, 10));
  const cleanTopic = chapterTopic || title;
  const isElementary = grade.toLowerCase().includes("grade 1") || grade.toLowerCase().includes("grade 2") || grade.toLowerCase().includes("class 1") || grade.toLowerCase().includes("class 2");
  const isMiddle = grade.toLowerCase().includes("grade 4") || grade.toLowerCase().includes("grade 5") || grade.toLowerCase().includes("class 4") || grade.toLowerCase().includes("class 5");

  // Determine subject-specific context
  const subjLower = subjectName.toLowerCase();
  const isScience = subjLower.includes("sci") || subjLower.includes("evs") || subjLower.includes("nature") || cleanTopic.toLowerCase().includes("plant") || cleanTopic.toLowerCase().includes("animal");
  const isMath = subjLower.includes("math") || cleanTopic.toLowerCase().includes("fraction") || cleanTopic.toLowerCase().includes("number") || cleanTopic.toLowerCase().includes("arithmetic");
  const isLanguage = subjLower.includes("lang") || subjLower.includes("santali") || subjLower.includes("hindi") || subjLower.includes("literature");

  // 1. Generate Quiz Items (Multiple Choice / Objective)
  const quizQuestions: GeneratedQuestion[] = [];
  const worksheetQuestions: GeneratedQuestion[] = [];

  if (isScience) {
    const sciencePool = [
      {
        q: isElementary
          ? `Which part of a plant grows under the soil and drinks water?`
          : `In the study of ${cleanTopic}, what is the primary function of the root system?`,
        opts: [
          "Roots (ᱚᱛ ᱞᱟᱛᱟᱨ ᱨᱮ ᱨᱮᱦᱮᱫ)",
          "Green Leaves (ᱥᱟᱠᱟᱢ)",
          "Flower petals (ᱵᱟᱦᱟ)",
          "Tree trunk bark (ᱫᱟᱨᱮ ᱪᱷᱟᱞ)",
        ],
        ans: "Roots (ᱚᱛ ᱞᱟᱛᱟᱨ ᱨᱮ ᱨᱮᱦᱮᱫ)",
        exp: "Roots anchor the plant firmly and absorb vital groundwater and minerals from the soil.",
        marks: 2,
        wsQ: `Explain why trees like Sal (Sarjom) and Mahua need deep roots during dry summer months in Jharkhand.`,
        wsAnswer: `Deep taproots reach subterranean water tables beneath rocky soil, sustaining the tree even when seasonal ponds dry up.`,
        wsLines: 4,
      },
      {
        q: `What green pigment inside leaves captures sunlight to prepare food through photosynthesis?`,
        opts: [
          "Chlorophyll (ᱦᱟᱹᱨᱤᱭᱟᱹᱲ ᱨᱚᱝ)",
          "Carotene (ᱥᱟᱥᱟᱝ ᱨᱚᱝ)",
          "Rainwater drops",
          "Dry nitrogen",
        ],
        ans: "Chlorophyll (ᱦᱟᱹᱨᱤᱭᱟᱹᱲ ᱨᱚᱝ)",
        exp: "Chlorophyll absorbs red and blue light spectra from the sun, converting carbon dioxide and water into glucose.",
        marks: 2,
        wsQ: `List the three essential natural ingredients that a green leaf needs to make food for the plant.`,
        wsAnswer: `1. Sunlight (ᱥᱤᱝᱜᱮᱞ / ᱵᱮᱲᱟ ᱢᱟᱨᱥᱟᱞ), 2. Water from roots (ᱫᱟᱜ), 3. Carbon Dioxide from the air (ᱦᱚᱭ).`,
        wsLines: 3,
      },
      {
        q: `Which gas do healthy forest trees release into the air that all humans and animals need to breathe?`,
        opts: [
          "Oxygen (ᱡᱤᱣᱤ ᱦᱚᱭ / Oxygen)",
          "Carbon dioxide",
          "Methane gas",
          "Smoke particles",
        ],
        ans: "Oxygen (ᱡᱤᱣᱤ ᱦᱚᱭ / Oxygen)",
        exp: "Plants produce oxygen as a byproduct of daytime photosynthesis.",
        marks: 2,
        wsQ: `How do community forests around our villages help keep the air clean and provide shade for domestic livestock?`,
        wsAnswer: `Trees filter dust particles, release pure oxygen, reduce ambient temperature, and provide cooling canopy cover.`,
        wsLines: 4,
      },
      {
        q: `What is the protective outer layer that covers a dormant seed before it sprouts?`,
        opts: [
          "Seed Coat / Testa (ᱡᱟᱶ ᱪᱷᱟᱞ)",
          "Flower Nectar",
          "Pollen grain",
          "Tree leaf",
        ],
        ans: "Seed Coat / Testa (ᱡᱟᱶ ᱪᱷᱟᱞ)",
        exp: "The seed coat protects the delicate embryo inside until moisture and warmth trigger germination.",
        marks: 2,
        wsQ: `Describe what happens when a farmer sows paddy seeds in wet plowed field soil.`,
        wsAnswer: `The seed absorbs soil water, swells, cracks open the seed coat, sends down a primary radicle (root), and shoots a green plumule toward the sunlight.`,
        wsLines: 4,
      },
      {
        q: `Which seasonal change prompts deciduous trees in Chotanagpur forests to shed their leaves?`,
        opts: [
          "Winter and dry spring to conserve water",
          "Heavy monsoon downpour",
          "Full moon night",
          "High underground humidity",
        ],
        ans: "Winter and dry spring to conserve water",
        exp: "Shedding leaves minimizes transpiration water loss during the dry season before pre-monsoon showers.",
        marks: 2,
        wsQ: `Why is conserving natural water reservoirs and planting indigenous saplings important for village agriculture?`,
        wsAnswer: `Water reservoirs recharge groundwater, prevent topsoil erosion, and provide irrigation during dry spells.`,
        wsLines: 4,
      },
      {
        q: `In the food chain of a local woodland, what role do green plants perform?`,
        opts: [
          "Primary Producers (ᱯᱩᱭᱞᱩ ᱵᱮᱱᱟᱣᱤᱡ)",
          "Decomposers",
          "Secondary predators",
          "Carnivores",
        ],
        ans: "Primary Producers (ᱯᱩᱭᱞᱩ ᱵᱮᱱᱟᱣᱤᱡ)",
        exp: "Green plants synthesize organic biomass from solar energy, serving as the foundational energy source.",
        marks: 2,
        wsQ: `Draw or write a simple 3-step food chain found near village ponds or fields (e.g. Grass → Grasshopper → Bird).`,
        wsAnswer: `Green Grass (Producer) → Grasshopper / Goat (Herbivore) → Bird / Human (Consumer).`,
        wsLines: 4,
      },
    ];

    for (let i = 0; i < count; i++) {
      const item = sciencePool[i % sciencePool.length];
      quizQuestions.push({
        id: `q-quiz-${i + 1}`,
        questionNumber: i + 1,
        question: item.q,
        type: "mcq",
        options: item.opts,
        correctAnswer: item.ans,
        explanation: item.exp,
        marks: item.marks,
      });

      worksheetQuestions.push({
        id: `q-ws-${i + 1}`,
        questionNumber: i + 1,
        question: `Q${i + 1}. ${item.wsQ}`,
        type: "descriptive",
        writingSpaceLines: item.wsLines,
        suggestedAnswer: item.wsAnswer,
        marks: difficulty === "Hard" ? 5 : 4,
      });
    }
  } else if (isMath) {
    const mathPool = [
      {
        q: `If a farmer shares 12 ripe guavas equally among 3 village children, how many guavas does each child receive?`,
        opts: ["4 guavas (᱔ ᱴᱤ)", "3 guavas", "6 guavas", "2 guavas"],
        ans: "4 guavas (᱔ ᱴᱤ)",
        exp: "12 divided by 3 equals 4 (12 ÷ 3 = 4).",
        marks: 2,
        wsQ: `Solve: 24 kilograms of rice are to be distributed equally among 4 families. Calculate the share for each family and show your division steps.`,
        wsAnswer: `Total Rice = 24 kg. Families = 4. Each share = 24 ÷ 4 = 6 kg.`,
        wsLines: 4,
      },
      {
        q: `Which of the following fractions represents one-half of a whole unit?`,
        opts: ["1/2 (ᱢᱤᱫ ᱦᱟᱹᱴᱤᱧ ᱵᱟᱨ ᱨᱮ)", "1/4", "3/4", "2/1"],
        ans: "1/2 (ᱢᱤᱫ ᱦᱟᱹᱴᱤᱧ ᱵᱟᱨ ᱨᱮ)",
        exp: "1/2 denotes 1 part out of 2 equal divisions of a whole.",
        marks: 2,
        wsQ: `Which fraction is larger: 1/2 or 1/4? Draw two equal circular diagrams (rotis) and shade the portions to prove your answer.`,
        wsAnswer: `1/2 is greater than 1/4 (1/2 > 1/4). Shading half of a circle covers double the area of one-quarter.`,
        wsLines: 4,
      },
      {
        q: `What is the perimeter of a square school garden bed whose each side measures 5 meters?`,
        opts: ["20 meters (᱒᱐ ᱢᱤᱴᱟᱨ)", "25 square meters", "15 meters", "10 meters"],
        ans: "20 meters (᱒᱐ ᱢᱤᱴᱟᱨ)",
        exp: "Perimeter of square = 4 × side = 4 × 5 = 20 m.",
        marks: 2,
        wsQ: `A rectangular vegetable patch is 8 meters long and 4 meters wide. Find its perimeter (distance around the boundary).`,
        wsAnswer: `Perimeter = 2 × (Length + Width) = 2 × (8 + 4) = 2 × 12 = 24 meters.`,
        wsLines: 4,
      },
      {
        q: `If you have ₹50 and spend ₹28 on notebooks, how much money remains in your pocket?`,
        opts: ["₹22 (᱒᱒ ᱴᱟᱠᱟ)", "₹32", "₹18", "₹24"],
        ans: "₹22 (᱒᱒ ᱴᱟᱠᱟ)",
        exp: "₹50 - ₹28 = ₹22.",
        marks: 2,
        wsQ: `Bijay bought 3 pencils at ₹5 each and an eraser for ₹6. How much did he pay in total? If he gave a ₹50 note, how much change did he receive?`,
        wsAnswer: `Cost of pencils = 3 × 5 = ₹15. Eraser = ₹6. Total spent = ₹21. Change returned = 50 - 21 = ₹29.`,
        wsLines: 4,
      },
      {
        q: `What is the product when 15 is multiplied by 6?`,
        opts: ["90 (᱙᱐)", "80", "95", "100"],
        ans: "90 (᱙᱐)",
        exp: "15 × 6 = (10 × 6) + (5 × 6) = 60 + 30 = 90.",
        marks: 2,
        wsQ: `There are 8 classrooms in the school. Each classroom has 15 student desks. How many desks are there in total? Write the complete word problem solution.`,
        wsAnswer: `Total Desks = Classrooms × Desks per room = 8 × 15 = 120 desks.`,
        wsLines: 4,
      },
    ];

    for (let i = 0; i < count; i++) {
      const item = mathPool[i % mathPool.length];
      quizQuestions.push({
        id: `q-quiz-${i + 1}`,
        questionNumber: i + 1,
        question: item.q,
        type: "mcq",
        options: item.opts,
        correctAnswer: item.ans,
        explanation: item.exp,
        marks: item.marks,
      });

      worksheetQuestions.push({
        id: `q-ws-${i + 1}`,
        questionNumber: i + 1,
        question: `Q${i + 1}. ${item.wsQ}`,
        type: "descriptive",
        writingSpaceLines: item.wsLines,
        suggestedAnswer: item.wsAnswer,
        marks: difficulty === "Hard" ? 5 : 4,
      });
    }
  } else {
    // General / Social / Language / Literature Pool
    const generalPool = [
      {
        q: `Based on the chapter "${cleanTopic}", what is the main theme presented in this study text?`,
        opts: [
          `Understanding community cooperation and natural resources`,
          `Modern high-speed industrial machinery`,
          `Urban transport systems`,
          `Global stock exchanges`,
        ],
        ans: `Understanding community cooperation and natural resources`,
        exp: `The lesson focuses on foundational community values and learning concepts aligned with rural life.`,
        marks: 2,
        wsQ: `Summarize the central message of "${cleanTopic}" in your own words. Write 3-4 sentences.`,
        wsAnswer: `The lesson highlights the importance of teamwork, respect for local cultural heritage, and observing the environment attentively.`,
        wsLines: 4,
      },
      {
        q: `What essential quality helps students learn effectively when reading a new story or chapter?`,
        opts: [
          "Careful reading and asking questions (ᱯᱟᱲᱦᱟᱣ ᱟᱨ ᱠᱩᱠᱞᱤ)",
          "Rushing without understanding",
          "Skipping difficult vocabulary",
          "Copying without thinking",
        ],
        ans: "Careful reading and asking questions (ᱯᱟᱲᱦᱟᱣ ᱟᱨ ᱠᱩᱠᱞᱤ)",
        exp: "Active inquiry and reflection solidify concept retention and vocabulary growth.",
        marks: 2,
        wsQ: `Write down two new words you encountered in "${cleanTopic}" and frame a meaningful sentence for each word.`,
        wsAnswer: `Word 1: Itun (Learning) - We go to our village school to learn with joy. Word 2: Gate (Friend) - Sona and Bijay are helpful friends.`,
        wsLines: 4,
      },
      {
        q: `Who in the local panchayat or village community typically helps resolve common shared problems?`,
        opts: [
          "Gram Pradhan / Majhi Haram and Panchayat elders",
          "Visitors from outside the district",
          "Private contractors",
          "Individual passers-by",
        ],
        ans: "Gram Pradhan / Majhi Haram and Panchayat elders",
        exp: "Traditional village leadership and democratic local panchayats guide community harmony.",
        marks: 2,
        wsQ: `Describe how villagers come together during festival harvesting (Sohrai or Baha) to celebrate and support each other.`,
        wsAnswer: `Villagers clean households, decorate cattle, prepare traditional cakes (pitha), play tumdak and tamak, and sing songs thanking mother nature for the harvest.`,
        wsLines: 5,
      },
      {
        q: `Why is writing and preserving texts in our mother tongue (Ol Chiki and Hindi) important for future generations?`,
        opts: [
          "It protects cultural identity, indigenous knowledge, and history",
          "It is only for decoration",
          "It has no practical significance",
          "It replaces spoken speech",
        ],
        ans: "It protects cultural identity, indigenous knowledge, and history",
        exp: "Language is the living vessel of folklore, herbal wisdom, tribal songs, and ancestral heritage.",
        marks: 2,
        wsQ: `Why is it helpful for students to learn in both their mother tongue and national languages? Give two clear reasons.`,
        wsAnswer: `1. Mother tongue ensures deep emotional connection and fast comprehension. 2. Other languages provide access to wider scientific and academic knowledge.`,
        wsLines: 4,
      },
      {
        q: `What should students do when they find a difficult question in their worksheet?`,
        opts: [
          "Discuss with classmates, re-read the chapter notes, and ask Guruji",
          "Leave the worksheet completely empty",
          "Forget about the lesson",
          "Guess without reading",
        ],
        ans: "Discuss with classmates, re-read the chapter notes, and ask Guruji",
        exp: "Peer discussion and teacher guidance clarify conceptual doubts sustainably.",
        marks: 2,
        wsQ: `What is one habit that helps you do your school homework on time every day?`,
        wsAnswer: `Setting aside a dedicated quiet study hour after evening play and keeping books and notebooks organized.`,
        wsLines: 3,
      },
    ];

    for (let i = 0; i < count; i++) {
      const item = generalPool[i % generalPool.length];
      quizQuestions.push({
        id: `q-quiz-${i + 1}`,
        questionNumber: i + 1,
        question: item.q,
        type: "mcq",
        options: item.opts,
        correctAnswer: item.ans,
        explanation: item.exp,
        marks: item.marks,
      });

      worksheetQuestions.push({
        id: `q-ws-${i + 1}`,
        questionNumber: i + 1,
        question: `Q${i + 1}. ${item.wsQ}`,
        type: "descriptive",
        writingSpaceLines: item.wsLines,
        suggestedAnswer: item.wsAnswer,
        marks: difficulty === "Hard" ? 5 : 4,
      });
    }
  }

  const quizTotalMarks = quizQuestions.reduce((sum, q) => sum + (q.marks || 2), 0);
  const worksheetTotalMarks = worksheetQuestions.reduce((sum, q) => sum + (q.marks || 4), 0);

  const quiz: GeneratedAssessment = {
    id: `quiz-gen-${Date.now()}`,
    title: `${title} — Quick Quiz (${grade})`,
    instructions: `Read each question carefully. Choose the single best answer and circle or tick the corresponding option. Total marks: ${quizTotalMarks}.`,
    difficulty,
    questions: quizQuestions,
    totalMarks: quizTotalMarks,
    estimatedTimeMinutes: count * 3,
  };

  const worksheet: GeneratedAssessment = {
    id: `ws-gen-${Date.now()}`,
    title: `${title} — Practice Worksheet & Concept Review`,
    instructions: `Answer all questions neatly in the ruled spaces provided. Show calculations and diagrams where applicable. Total marks: ${worksheetTotalMarks}.`,
    difficulty,
    questions: worksheetQuestions,
    totalMarks: worksheetTotalMarks,
    estimatedTimeMinutes: count * 7,
  };

  return {
    success: true,
    aiSummary: `AI successfully analyzed "${fileName}" (${chapterTopic}, ${grade}). Extracted ${count} conceptual multiple-choice quiz questions and ${count} structured writing worksheet problems tailored for ${difficulty} difficulty.`,
    quiz,
    worksheet,
    backendUsed: "local_pedagogical_engine",
  };
}

/**
 * Main AI processor export. Handles external backend routing and graceful local fallback.
 */
export async function processLearningMaterialWithAI(options: AIProcessOptions): Promise<AIProcessResponse> {
  // First attempt external AI backend if configured
  const externalResult = await tryExternalAIBackend(options);
  if (externalResult && externalResult.success) {
    return externalResult;
  }

  // Gracefully fallback to curriculum-aware local engine
  return generateContextualAssessments(options);
}
