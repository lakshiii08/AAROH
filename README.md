# AAROH - AI-Powered Educational Platform for Rural & Tribal Primary Education

AAROH is an AI-powered educational platform designed for rural and tribal primary education in India. It bridges curriculum gaps by translating and localizing learning material into children's mother tongues using simple language, local examples, voice explanations, adaptive quizzes, Bayesian Knowledge Tracing (BKT), and personalized remedial lessons.

---

## Phase 1: Content Ingestion & Concept Extraction (Completed)

Phase 1 provides the foundational ingestion pipeline:
1. **Raw Ingestion & S3 Triggers**: Uploads raw lesson files (PDF, TXT, MD) to Amazon S3 (`aaroh-raw-lessons-storage`), where an S3 `ObjectCreated:*` event triggers an AWS Lambda processing function.
2. **PyMuPDF Document Parsing**: Extracts high-fidelity text, page layouts, reading orders, and token counts from primary school textbooks.
3. **Pedagogical Chunking**: Splits lessons into atomic learning sections with configurable overlap and page tracing.
4. **LLM Concept & Metadata Extraction**: Uses Amazon Bedrock (Claude 3.5 Sonnet / Claude Haiku / Nova) to extract structured curriculum metadata:
   - Target competencies, Grade level (1-5), and Subject
   - Atomic concept codes, names, and child-friendly definitions
   - Bloom's Taxonomy cognitive levels (Remember, Understand, Apply, etc.)
   - Difficulty ratings (1 to 5) and prerequisite concept links
   - **Rural & Tribal Real-World Context Anchors** (e.g., village wells, check-dams, bamboo channels, forest seasons, local flora/fauna)
5. **Vector Embedding & Storage**:
   - Stores structured relational metadata in Amazon RDS PostgreSQL.
   - Generates 1536-dimensional embeddings (Amazon Titan Text Embeddings V2) stored in `pgvector` for fast semantic similarity search and downstream RAG localization.
   - Built-in SQLite fallback for seamless offline local development.

---

## Directory Structure

```
Aaroh/
├── api/
│   ├── main.py                     # FastAPI application entrypoint
│   └── routes/
│       └── content.py              # Phase 1 REST endpoints (upload, concepts, search)
├── aws/
│   ├── terraform/                  # Terraform IaC for S3, RDS (pgvector), Lambda, IAM
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── s3.tf
│   │   ├── rds.tf
│   │   ├── lambda.tf
│   │   └── iam.tf
├── config/
│   ├── config.yaml                 # Core system & database settings
│   ├── model_config.yaml           # Bedrock LLM & embedding configurations
│   └── prompt_config.yaml          # Rural/tribal concept extraction prompt templates
├── data/
│   └── raw/                        # Raw uploaded curriculum files (e.g. sample NCERT PDF)
├── docker/
│   ├── Dockerfile                  # Container definition for AAROH backend
│   └── docker-compose.yaml         # Local PostgreSQL + pgvector + API stack
├── notebooks/
│   └── 01_data_ingestion.ipynb     # Interactive walkthrough of Phase 1
├── scripts/
│   └── generate_sample_pdf.py      # Generates sample NCERT Grade 3 EVS curriculum PDF
├── src/
│   └── aaroh/
│       ├── configuration/          # Configuration managers
│       ├── database/               # SQLAlchemy models & pgvector connection manager
│       ├── components/
│       │   ├── data_ingestion.py   # S3 & PyMuPDF parser + chunker
│       │   ├── content_transformation.py # Bedrock concept extraction & Titan embeddings
│       │   └── rag_pipeline.py     # pgvector indexing & cosine similarity search
│       ├── entity/                 # Strongly-typed dataclasses & artifacts
│       ├── lambda_handlers/        # AWS Lambda S3 event handler
│       ├── pipeline/               # End-to-end ingestion pipeline orchestrator
│       └── utils/                  # Logger, custom exceptions, common helpers
├── tests/
│   ├── test_phase1_pipeline.py     # End-to-end pipeline test
│   └── test_api_endpoints.py       # FastAPI endpoint tests
├── .env                            # Environment variables template
├── app.py                          # Local server launcher
└── requirements.txt                # Project dependencies
```

---

## Quick Start & Verification

### 1. Install Dependencies
```bash
pip install -r requirements.txt
pip install -e .
```

### 2. Generate Sample Textbook Lesson
```bash
python scripts/generate_sample_pdf.py
```

### 3. Run End-to-End Pipeline Test
```bash
python tests/test_phase1_pipeline.py
```

### 4. Run API Tests
```bash
python tests/test_api_endpoints.py
```

### 5. Launch FastAPI Server
```bash
python app.py
```
Open interactive Swagger documentation at: `http://localhost:8000/docs`

---

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/content/upload` | Upload PDF/TXT lesson file to trigger parsing, concept extraction, and vector indexing |
| `GET` | `/api/v1/content/documents` | List all ingested curriculum documents with page counts and statuses |
| `GET` | `/api/v1/content/documents/{id}/concepts` | Retrieve atomic concepts, Bloom's levels, and tribal/rural context anchors |
| `POST` | `/api/v1/content/search` | Semantic vector similarity search over curriculum chunks |
| `GET` | `/health` | Health check endpoint |

---

## Cloud Deployment (AWS Terraform)

To deploy Phase 1 resources to AWS:
```bash
cd aws/terraform
terraform init
terraform plan
terraform apply
```
This provisions:
- S3 raw & processed lesson buckets with event triggers
- Amazon RDS PostgreSQL (v16) with `pgvector` pre-configured
- AWS Lambda content ingestion function with 5-minute timeout
- IAM execution roles with least-privilege policies for S3 and Bedrock
