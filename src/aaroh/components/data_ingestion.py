import os
import uuid
import boto3
from botocore.exceptions import ClientError
from pathlib import Path
from typing import List, Dict, Any, Optional
import pymupdf

from src.aaroh.entity.config_entity import IngestionConfig
from src.aaroh.entity.artifact_entity import (
    ParsedDocument,
    ParsedDocumentPage,
    ContentChunkEntity,
)
from src.aaroh.utils.common import compute_file_hash, clean_text
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class DocumentIngestionComponent:
    def __init__(self, config: IngestionConfig):
        self.config = config
        self.s3_client = self._init_s3_client()

    def _init_s3_client(self):
        try:
            return boto3.client(
                "s3",
                region_name=os.getenv("AWS_REGION", "ap-south-1")
            )
        except Exception as e:
            logger.warning(f"Could not initialize AWS S3 client ({e}). S3 remote sync will be bypassed if running locally.")
            return None

    def download_from_s3(self, s3_bucket: str, s3_key: str, local_destination_dir: str = "data/raw") -> Path:
        """Downloads a raw lesson document from S3 raw bucket."""
        try:
            dest_dir = Path(local_destination_dir)
            dest_dir.mkdir(parents=True, exist_ok=True)
            filename = Path(s3_key).name
            target_path = dest_dir / filename

            if not self.s3_client:
                raise AarohException("S3 client not initialized. Check AWS credentials.")

            logger.info(f"Downloading s3://{s3_bucket}/{s3_key} to {target_path}")
            self.s3_client.download_file(s3_bucket, s3_key, str(target_path))
            return target_path
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")
            raise AarohException(e, sys)

    def upload_to_s3(self, local_path: Path | str, s3_bucket: str, s3_key: str) -> str:
        """Uploads a file to S3 bucket."""
        try:
            if not self.s3_client:
                logger.warning("Bypassing S3 upload: S3 client not configured.")
                return f"s3://{s3_bucket}/{s3_key}"

            logger.info(f"Uploading {local_path} to s3://{s3_bucket}/{s3_key}")
            self.s3_client.upload_file(str(local_path), s3_bucket, s3_key)
            return f"s3://{s3_bucket}/{s3_key}"
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            raise AarohException(e, sys)

    def parse_document(self, file_path: Path | str, s3_bucket: Optional[str] = None, s3_key: Optional[str] = None) -> ParsedDocument:
        """Parses a document (PDF, TXT, MD) using PyMuPDF and creates structured pages."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        file_extension = path.suffix.lower()
        if file_extension not in self.config.allowed_extensions:
            raise ValueError(f"Unsupported file format '{file_extension}'. Allowed: {self.config.allowed_extensions}")

        file_size_bytes = path.stat().st_size
        max_bytes = self.config.max_file_size_mb * 1024 * 1024
        if file_size_bytes > max_bytes:
            raise ValueError(f"File exceeds max size limit of {self.config.max_file_size_mb}MB.")

        file_hash = compute_file_hash(path)
        file_id = str(uuid.uuid4())

        logger.info(f"Parsing document: {path.name} (Size: {file_size_bytes} bytes, Extension: {file_extension})")

        pages: List[ParsedDocumentPage] = []
        full_text_fragments = []

        if file_extension == ".pdf":
            try:
                doc = pymupdf.open(str(path))
                for page_idx, page in enumerate(doc):
                    page_text = page.get_text("text") or ""
                    cleaned = clean_text(page_text)
                    words = cleaned.split()

                    pages.append(
                        ParsedDocumentPage(
                            page_number=page_idx + 1,
                            text=cleaned,
                            char_count=len(cleaned),
                            word_count=len(words),
                        )
                    )
                    full_text_fragments.append(cleaned)
                doc.close()
            except Exception as e:
                logger.error(f"PyMuPDF parsing failed for {path}: {e}")
                raise AarohException(e, sys)

        elif file_extension in [".txt", ".md"]:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = clean_text(f.read())
            words = content.split()
            pages.append(
                ParsedDocumentPage(
                    page_number=1,
                    text=content,
                    char_count=len(content),
                    word_count=len(words),
                )
            )
            full_text_fragments.append(content)

        full_text = "\n\n".join(full_text_fragments)

        parsed_doc = ParsedDocument(
            file_id=file_id,
            filename=path.name,
            file_path=str(path),
            file_hash=file_hash,
            file_size_bytes=file_size_bytes,
            total_pages=len(pages),
            full_text=full_text,
            pages=pages,
            s3_bucket=s3_bucket,
            s3_key=s3_key,
        )
        logger.info(f"Successfully parsed {path.name}: {len(pages)} pages, {len(full_text)} characters.")
        return parsed_doc

    def chunk_document(self, parsed_doc: ParsedDocument) -> List[ContentChunkEntity]:
        """Splits document content into pedagogical chunks with overlap and page mapping."""
        chunks: List[ContentChunkEntity] = []
        target_size = self.config.target_chunk_size
        overlap = self.config.chunk_overlap
        min_length = self.config.min_chunk_length

        chunk_counter = 0

        for page in parsed_doc.pages:
            page_text = page.text
            if not page_text or len(page_text.strip()) < min_length:
                continue

            # Split by paragraphs
            paragraphs = page_text.split("\n\n")
            current_chunk_text = ""

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                if len(current_chunk_text) + len(para) <= target_size:
                    current_chunk_text += ("\n\n" if current_chunk_text else "") + para
                else:
                    if len(current_chunk_text) >= min_length:
                        chunk_counter += 1
                        chunks.append(
                            ContentChunkEntity(
                                chunk_index=chunk_counter,
                                page_number=page.page_number,
                                content=current_chunk_text,
                                token_count=len(current_chunk_text.split()),
                                metadata={
                                    "filename": parsed_doc.filename,
                                    "page": page.page_number,
                                    "file_id": parsed_doc.file_id,
                                },
                            )
                        )
                    # Start next chunk with overlap if possible
                    if overlap > 0 and len(current_chunk_text) > overlap:
                        overlap_text = current_chunk_text[-overlap:].strip()
                        current_chunk_text = overlap_text + "\n\n" + para
                    else:
                        current_chunk_text = para

            if current_chunk_text and len(current_chunk_text) >= min_length:
                chunk_counter += 1
                chunks.append(
                    ContentChunkEntity(
                        chunk_index=chunk_counter,
                        page_number=page.page_number,
                        content=current_chunk_text,
                        token_count=len(current_chunk_text.split()),
                        metadata={
                            "filename": parsed_doc.filename,
                            "page": page.page_number,
                            "file_id": parsed_doc.file_id,
                        },
                    )
                )

        logger.info(f"Generated {len(chunks)} educational chunks for document '{parsed_doc.filename}'")
        return chunks
