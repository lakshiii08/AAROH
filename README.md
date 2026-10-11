# AAROH — AI-Powered Mother-Tongue Learning Platform

> **Empowering Rural & Tribal Primary Education with Indic Translation, Cultural Localization, Voice Intelligence, and Offline-First Resilience.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

---

## 📖 Table of Contents

- [Overview & Mission](#-overview--mission)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Core Platform Capabilities](#-core-platform-capabilities)
  - [1. Aaroh-AI Pipeline Engine (`ai/`)](#1-aaroh-ai-pipeline-engine-ai)
  - [2. FastAPI Backend Gateway (`backend/`)](#2-fastapi-backend-gateway-backend)
  - [3. Next.js Frontend Portals (`frontend/`)](#3-nextjs-frontend-portals-frontend)
- [Dual-Database Architecture](#-dual-database-architecture)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Running via Docker Compose](#3-running-via-docker-compose)
- [Demo Credentials](#-demo-credentials)
- [API Reference Overview](#-api-reference-overview)
- [Offline Edge Synchronization](#-offline-edge-synchronization)
- [Testing](#-testing)
- [License](#-license)

---

## 🌟 Overview & Mission

In rural and tribal regions across India, millions of primary school students encounter significant learning barriers because textbooks and standard curriculums are taught in languages different from their spoken home tongues. 

**AAROH** bridges this critical gap. It ingests standard curriculum materials (such as NCERT textbooks), extracts core pedagogical concepts, and transforms them into culturally localized, mother-tongue learning experiences. By preserving indigenous dialects (**Gondi, Santhali, Chhattisgarhi, Bhili, Halbi, Kudukh, and Sadri**), using rural analogies (village handpumps, check-dams, folk stories), and offering audio-first interactions with offline sync capabilities, AAROH ensures no child is left behind due to linguistic or connectivity barriers.

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Frontend                             │
│       Teacher Dashboard (/teacher)  │  Student Dashboard (/student)    │
│            Flashcards (/flashcards) │  Worksheets (/mock-sheet)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (REST /api/v1)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI REST API Gateway                        │
│          (/api/v1: Auth, Teachers, Students, Content, AI, Edge)        │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
         ┌───────────────────┐             ┌───────────────────┐
         │  MongoDB Engine   │             │ PostgreSQL Engine │
         │  (Identity, Auth  │             │   (+ pgvector)    │
         │  & Credentials)   │             │ (Learning & RAG)  │
         └───────────────────┘             └─────────┬─────────┘
                                                     │
                                                     ▼
                                           ┌───────────────────┐
                                           │  Aaroh-AI Adapter │
                                           └─────────┬─────────┘
                                                     │
                                                     ▼
                                           ┌───────────────────┐
                                           │ Aaroh-AI Engine   │
                                           │  (Phases 1 to 8)  │
                                           └───────────────────┘
```

---

## 📂 Repository Structure

```
AAROH/
├── ai/                     # Aaroh-AI Core ML/AI Pipelines & AWS Infrastructure
│   ├── api/                # Internal FastAPI endpoints for AI tasks
│   ├── aws/                # Terraform IaC (ECS, RDS pgvector, DynamoDB, S3)
│   ├── config/             # YAML configurations (models, prompts, pipelines)
│   ├── data/               # Curated primary glossaries, audio tracks, sample PDFs
│   ├── notebooks/          # Walkthroughs for Phases 1 through 8
│   ├── src/aaroh/          # Core Python ML components, agents, models (BKT, IRT)
│   └── tests/              # End-to-end integration test suite
│
├── backend/                # Production Dual-Database FastAPI Backend Service
│   ├── app/
│   │   ├── ai/             # Adapter bridge connecting FastAPI to Aaroh-AI
│   │   ├── api/v1/         # Versioned REST routers (Auth, Teachers, Students, etc.)
│   │   ├── core/           # Config, logging, JWT security, MongoDB & Postgres managers
│   │   ├── models/         # Pydantic (Mongo) and SQLAlchemy (PostgreSQL) models
│   │   ├── repositories/   # Data access repositories (User, Student, School)
│   │   ├── schemas/        # Request & Response schemas
│   │   └── services/       # Core business logic services
│   ├── data/               # Local SQLite & mock storage fallbacks
│   ├── scripts/            # Database seeding and demo scripts
│   └── tests/              # Backend endpoint & security unit tests
│
├── frontend/               # Next.js 14 Web Application
│   ├── app/                # App Router pages (/login, /teacher, /student, /flashcards)
│   ├── components/         # Reusable UI components & layouts (Tailwind CSS)
│   ├── lib/
│   │   ├── api/            # Centralized API client (api-client.ts)
│   │   └── mock-data.ts    # Fallback and demo mock records
│   └── public/             # Static assets, icons, and audio
│
└── README.md               # Main repository documentation
```

---

## ⚡ Core Platform Capabilities

### 1. Aaroh-AI Pipeline Engine (`ai/`)
* **Phase 1: Ingestion & Concept Extraction**: Extracts text with PyMuPDF, chunks lessons by pedagogical boundaries, extracts Bloom-taxonomy competencies and real-world rural anchors using Amazon Bedrock, and indexes 1536-d embeddings in `pgvector`.
* **Phase 2: Indic Translation & Dialect Glossary Masking**: Translates educational texts via IndicTrans2 with strict glossary term masking (`__TERM_i__`) to preserve tribal dialects without hallucination (e.g., *Gondi*, *Santhali*, *Bhili*, *Chhattisgarhi*).
* **Phase 3: Simplification & LangGraph Agent**: Uses agentic chains to simplify scientific concepts into localized village folk metaphors and outdoor activities.
* **Phase 4: Quiz & Knowledge Tracing**: Adaptive Bloom-taxonomy assessment engine integrated with **Bayesian Knowledge Tracing (BKT)**, **Deep Knowledge Tracing (DKT)**, and **Item Response Theory (IRT)**.
* **Phase 5: Speech & Voice Intelligence**: Edge-friendly Text-to-Speech (TTS) Indic lessons and Speech-to-Text (STT) for oral student answers.
* **Phase 6: Multigrade Teacher Copilot & Offline Bundling**: Generates multigrade lesson plans and blackboard layouts, compiling lessons into compressed offline ZIP bundles.
* **Phase 7: Visual Storyboards & Gamification**: Generates interactive flashcard decks with imagery prompts, learning quests, XP, and badges.
* **Phase 8: District Insights & Parent Voice Advisory Bridge**: Generates district mastery heatmaps, automated 4-step remedial pathways, and mother-tongue voice notes for parents.

### 2. FastAPI Backend Gateway (`backend/`)
* **Scoped Identity Management**: Enforces scoped student credentials `(school_id, roll_number)` preventing roll number collisions across districts.
* **Teacher-Governed Onboarding**: Students never self-register; teachers generate student profiles and receive one-time cryptographically secure passwords.
* **Resilient Dual Database**: Segregates credentials (MongoDB) from curriculum and analytics (PostgreSQL), with automatic zero-configuration in-memory/SQLite fallbacks.
* **Aaroh-AI In-Process Adapter**: Calls AI pipeline components directly with environment variable synchronization and error shielding.

### 3. Next.js Frontend Portals (`frontend/`)
* **Teacher Portal**:
  * Onboard students and distribute printable login slips.
  * Real-time class mastery breakdowns and learning gap analytics.
  * Multigrade lesson planner and customized worksheet generator.
* **Student Portal**:
  * Mother-tongue lesson viewer with synchronous audio playback.
  * Oral quiz mode using browser microphone recording.
  * Gamified quest board, mastery streaks, and earned badges.
* **Standalone Modules**:
  * Interactive flashcard deck viewer (`/flashcards`).
  * Direct Indic translation playground (`/translation`).
  * Offline-style worksheet practice sheet (`/mock-sheet`).

---

## 💾 Dual-Database Architecture

| Database | Responsibilities | Handled Data | Fallback for Local Dev |
| :--- | :--- | :--- | :--- |
| **MongoDB** | Identity, Auth & Credentials | Users, Teachers, Admins, District Admins, Passwords (bcrypt), Sessions, Refresh Tokens | In-memory `mongomock-motor` |
| **PostgreSQL (+ pgvector)** | Learning, Curriculum & RAG | Documents, Chunks, Titan Embeddings, Concepts, Quizzes, Submissions, BKT/IRT Logs, Edge Sync Packages | Pre-seeded SQLite (`data/aaroh_backend.db`) |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python**: 3.10 to 3.12 recommended
* **Node.js**: v18.x or v20.x
* **npm** or **pnpm**
* *(Optional)* Docker & Docker Compose

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Ensure `AAROH_AI_PATH` in `backend/.env` points to the `ai` directory:
```ini
AAROH_AI_PATH=../ai
```

Seed initial demo data (schools, teachers, students, admins):
```bash
python scripts/seed_data.py
```

Run the backend server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend is now live:
* **Interactive Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend application is now accessible at [http://localhost:3000](http://localhost:3000).

---

### 3. Running via Docker Compose

To spin up the complete backend ecosystem with PostgreSQL, pgvector, and MongoDB:

```bash
cd backend
docker compose up -d --build
```

---

## 🔑 Demo Credentials

The platform includes pre-seeded demonstration accounts for local exploration:

| Role | Username / Email / ID | School Code | Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Teacher** | `sarita.devi@aaroh.gov.in` (or `teacher@123`) | `DEMO01` | `TeacherBastar2026!` (or `teacher@123`) | Teacher Dashboard, Student Creator, Analytics |
| **Student** | Roll No: `27` (or `24`) | `DEMO01` | `Murmu@2026` (or `1234`) | Student Dashboard, Audio Lessons, Quizzes |
| **Admin** | `admin@aaroh.gov.in` | — | `AarohAdmin2026!` | School & System Management |
| **District Admin**| `district.admin@aaroh.gov.in` | — | `DistrictAdmin2026!` | District Heatmaps, Remedial Interventions |

---

## 🌐 API Reference Overview

All REST API endpoints are served under `/api/v1`:

| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Teacher, Admin, and District Admin authentication |
| **Auth** | `POST` | `/api/v1/auth/student-login` | Scoped student login `(school_code, roll_number, password)` |
| **Teachers** | `POST` | `/api/v1/teachers/students` | Teacher creates student profile; returns one-time password |
| **Teachers** | `GET` | `/api/v1/teachers/analytics` | Class mastery scores and diagnostic gap analysis |
| **Students** | `GET` | `/api/v1/students/lessons` | Fetch localized curriculum lessons assigned to student |
| **Content** | `POST` | `/api/v1/content/upload` | Ingest textbook PDF with OCR, chunking & concept extraction |
| **Content** | `POST` | `/api/v1/content/search` | Semantic vector search across curriculum chunks |
| **Translation** | `POST` | `/api/v1/translation/translate` | Indic translation with tribal dialect glossary preservation |
| **Simplification**| `POST` | `/api/v1/simplification/concepts/{code}` | Simplify concept into village analogies using LangGraph |
| **Assessment** | `POST` | `/api/v1/assessment/quizzes/generate` | Generate concept-aligned Bloom's taxonomy quiz |
| **Assessment** | `POST` | `/api/v1/assessment/quizzes/{id}/submit` | Submit answers, score, and diagnose student misconceptions |
| **Voice** | `POST` | `/api/v1/voice/synthesize` | Indic TTS speech generation |
| **Voice** | `POST` | `/api/v1/voice/transcribe` | Indic STT audio speech-to-text |
| **Copilot** | `POST` | `/api/v1/copilot/lesson-plans/generate` | Multigrade classroom lesson planning |
| **Copilot** | `POST` | `/api/v1/copilot/edge/packages/export` | Bundle offline ZIP package for village edge devices |
| **Copilot** | `POST` | `/api/v1/copilot/edge/sync` | Ingest offline SQLite delta sync events |
| **Gamification** | `POST` | `/api/v1/gamification/flashcards/generate` | Visual flashcard decks with localized prompts |
| **Gamification** | `GET` | `/api/v1/gamification/students/{id}/portfolio` | Student XP, streaks, and badges |
| **District** | `GET` | `/api/v1/district/analytics/overview` | District-wide performance overview |
| **District** | `POST` | `/api/v1/district/interventions/generate-pathway` | 4-step personalized remedial roadmap |

---

## 📡 Offline Edge Synchronization

For remote village schools lacking continuous internet access:
1. **Package Export**: Teachers download a compressed ZIP package containing:
   * Localized lessons and pre-computed summaries.
   * Compressed audio tracks (WAV/MP3).
   * Standalone SQLite database for offline evaluation.
2. **Offline Execution**: Students take quizzes, practice lessons, and earn XP on offline tablets or school computers.
3. **Delta Sync**: When an edge device reconnects or syncs via USB, offline attempts are uploaded to `POST /api/v1/copilot/edge/sync`, merging student progress back into PostgreSQL.

---

## 🧪 Testing

### Backend Unit & Integration Tests
```bash
cd backend
pytest tests -v
```

### AI Pipeline Tests
```bash
cd ai
pytest tests -v
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).