import json
import urllib.parse
from src.aaroh.pipeline.content_ingestion_pipeline import ContentIngestionPipeline
from src.aaroh.utils.logger import logger

def lambda_handler(event, context):
    """AWS Lambda entry point triggered by S3:ObjectCreated:* events.
    
    Parses incoming raw textbook/lesson PDF via PyMuPDF, extracts curriculum concepts
    using AWS Bedrock (Claude 3.5 Sonnet / Nova), generates Titan text embeddings,
    and stores structured metadata + vectors in RDS PostgreSQL (pgvector).
    """
    logger.info(f"Received Lambda event: {json.dumps(event)}")
    
    records = event.get("Records", [])
    if not records:
        logger.warning("No S3 records found in event payload.")
        return {
            "statusCode": 400,
            "body": json.dumps({"message": "No S3 records in event"}),
        }

    pipeline = ContentIngestionPipeline()
    results = []

    for record in records:
        try:
            s3_data = record.get("s3", {})
            bucket_name = s3_data.get("bucket", {}).get("name")
            raw_key = s3_data.get("object", {}).get("key")
            
            # URL-decode the S3 key (handles spaces and special characters)
            key = urllib.parse.unquote_plus(raw_key)
            logger.info(f"Triggering ingestion for s3://{bucket_name}/{key}")

            # Ignore non-document objects or subfolder markers
            if not any(key.lower().endswith(ext) for ext in [".pdf", ".txt", ".md"]):
                logger.info(f"Skipping non-supported file extension for key: {key}")
                continue

            result = pipeline.run_from_s3_event(s3_bucket=bucket_name, s3_key=key)
            results.append({
                "bucket": bucket_name,
                "key": key,
                "document_id": result.document_id,
                "status": result.status,
                "total_chunks": result.total_chunks,
                "total_concepts": result.total_concepts,
            })
        except Exception as e:
            logger.error(f"Failed to process S3 record {record}: {e}")
            results.append({
                "bucket": bucket_name if "bucket_name" in locals() else "unknown",
                "key": key if "key" in locals() else "unknown",
                "status": "FAILED",
                "error": str(e),
            })

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Content ingestion processing complete",
            "results": results,
        }),
    }
