# AAROH - AI-Powered Educational Platform for Rural & Tribal Primary Education

AAROH is an AI-powered educational platform designed for rural and tribal primary education in India. It bridges curriculum gaps by translating and localizing learning material into children's mother tongues using simple language, local examples, voice explanations, adaptive quizzes, Bayesian Knowledge Tracing (BKT), and personalized remedial lessons.

---

## Phase 1: Content Ingestion & Concept Extraction (Completed)

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
   - Generates 1536-dimensional embeddings (Amazon Titan Text Embeddings V2) stored in `pgvector` for fast semantic similarity search.

---

## Phase 2: Mother-Tongue Translation Layer (Completed)

Phase 2 builds the translation and cultural localization backbone:
1. **Model Architecture (IndicTrans2 / NLLB-200)**:
   - High-throughput inference for Indian languages hosted on EC2 GPU instances or AWS SageMaker Endpoints (`aaroh-indictrans2-endpoint`).
   - Handles multi-sentence translation, preservation of pedagogical structure, and script detection.
2. **DynamoDB Key-Value Glossary Table**:
   - Ultra-low latency (< 2ms) key-value lookup table (`aaroh_glossary`) in Amazon DynamoDB with in-memory caching.
   - Preserves critical educational terminology (e.g. *water cycle*, *evaporation*, *check dam*, *earthen pot*, *handpump*).
   - Injects **tribal dialect anchors** for:
     - **Gondi (`gon`)**: e.g., Water $\rightarrow$ *येर (Yer)*, Earthen Pot $\rightarrow$ *कुंजे / मटका*
     - **Santhali (`sat`)**: e.g., Water $\rightarrow$ *दाः (Daah)*, Tree $\rightarrow$ *दारे (Dare)*
     - **Chhattisgarhi (`hne`)**: e.g., Well $\rightarrow$ *कुँवा*, Plant $\rightarrow$ *बिरवा (Birwa)*
     - **Bhili (`bhi`)**: e.g., Rain $\rightarrow$ *वरसाद*, Earthen pot $\rightarrow$ *माटी नो घड़ो*
3. **Glossary Term Masking & Demasking**:
   - Automatic placeholder masking (`__TERM_i__`) prevents models from mistranslating culturally sensitive and verified pedagogical terms.
   - Demasking accurately injects the verified mother tongue or tribal dialect equivalent.
4. **Internal FastAPI Service on ECS/Fargate**:
   - Packaged with Docker (`docker/Dockerfile`), hosted on ECS Fargate behind an internal Application Load Balancer (ALB).
   - Translates raw input or entire ingested Phase 1 lesson documents page by page.

---

## Directory Structure

```
Aaroh/
├── api/
│   ├── main.py                     # FastAPI application entrypoint (Phases 1 & 2)
│   └── routes/
│       ├── content.py              # Phase 1 REST endpoints (upload, concepts, search)
│       └── translation.py          # Phase 2 REST endpoints (translate, batch, glossary)
├── aws/
│   ├── scripts/                    # Build, push ECR, and deploy scripts
│   │   ├── build.sh
│   │   ├── push_ecr.sh
│   │   └── deploy.sh
│   └── terraform/                  # Terraform IaC
│       ├── main.tf
│       ├── variables.tf
│       ├── s3.tf                   # S3 raw & processed buckets
│       ├── rds.tf                  # RDS PostgreSQL with pgvector
│       ├── lambda.tf               # Ingestion Lambda
│       ├── iam.tf                  # IAM execution roles
│       ├── dynamodb.tf             # DynamoDB glossary table (Phase 2)
│       ├── ecr.tf                  # ECR repository (Phase 2)
│       └── ecs.tf                  # ECS Fargate + ALB (Phase 2)
├── config/
│   ├── config.yaml                 # Core system, database, and translation settings
│   ├── model_config.yaml           # Bedrock LLM, embeddings, and IndicTrans2 config
│   └── prompt_config.yaml          # Rural/tribal concept extraction prompt templates
├── data/
│   ├── glossary/
│   │   └── curated_primary_glossary.json # Curated NCERT terms + tribal dialects
│   └── raw/                        # Raw uploaded curriculum files
├── docker/
│   ├── Dockerfile                  # Container definition for AAROH backend
│   └── docker-compose.yaml         # Local PostgreSQL + pgvector + API stack
├── notebooks/
│   ├── 01_data_ingestion.ipynb     # Interactive walkthrough of Phase 1
│   └── 02_mother_tongue_translation.ipynb # Interactive walkthrough of Phase 2
├── scripts/
│   └── generate_sample_pdf.py      # Generates sample NCERT Grade 3 EVS curriculum PDF
├── src/
│   └── aaroh/
│       ├── configuration/          # Configuration managers
│       ├── database/               # PostgreSQL (pgvector) & DynamoDB glossary managers
│       │   ├── models.py
│       │   ├── session.py
│       │   └── glossary_db.py
│       ├── components/
│       │   ├── data_ingestion.py   # S3 & PyMuPDF parser + chunker (Phase 1)
│       │   ├── content_transformation.py # Bedrock concept extraction & Titan embeddings
│       │   ├── rag_pipeline.py     # pgvector indexing & cosine similarity search
│       │   └── translation.py      # IndicTrans2, term masking, tribal dialect translation (Phase 2)
│       ├── entity/                 # Strongly-typed dataclasses & artifacts
│       ├── lambda_handlers/        # AWS Lambda S3 event handler
│       ├── pipeline/               # Ingestion pipeline orchestrator
│       └── utils/                  # Logger, custom exceptions, common helpers
├── tests/
│   ├── test_phase1_pipeline.py     # End-to-end Phase 1 test
│   ├── test_api_endpoints.py       # FastAPI Phase 1 endpoint tests
│   ├── test_translation.py         # Phase 2 translation & glossary tests
│   └── test_translation_api.py     # Phase 2 REST API tests
├── .env                            # Environment variables template
├── app.py                          # Local server launcher
└── requirements.txt                # Project dependencies
```

---

## API Endpoints (Phases 1 & 2)

### Phase 1: Content Ingestion & Concepts
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/content/upload` | Upload PDF/TXT lesson file to trigger parsing, concept extraction, and vector indexing |
| `GET` | `/api/v1/content/documents` | List all ingested curriculum documents with page counts and statuses |
| `GET` | `/api/v1/content/documents/{id}/concepts` | Retrieve atomic concepts, Bloom's levels, and tribal/rural context anchors |
| `POST` | `/api/v1/content/search` | Semantic vector similarity search over curriculum chunks |

### Phase 2: Mother-Tongue Translation & Glossary
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/translation/translate` | Translate text into mother tongue with glossary preservation & dialect adaptation |
| `POST` | `/api/v1/translation/batch` | High-throughput batch translation for lesson sections |
| `GET` | `/api/v1/translation/languages` | List supported Indian languages and tribal dialects (Gondi, Santhali, Bhili, etc.) |
| `GET` | `/api/v1/translation/glossary/lookup` | Ultra-fast (< 2ms) DynamoDB key-value term lookup |
| `POST` | `/api/v1/translation/glossary/term` | Add or update pedagogical glossary term with dialect variations |
| `POST` | `/api/v1/translation/lessons/{document_id}` | Translate all chunks of an ingested Phase 1 lesson into a child's mother tongue |

---

## Running Tests

```bash
pytest tests/ -v
```
All 10 integration tests run and pass in ~1 second.
