# S3 Raw Lessons Ingestion Bucket
resource "aws_s3_bucket" "raw_bucket" {
  bucket = "${var.project_name}-raw-lessons-${var.environment}"

  tags = {
    Name = "${var.project_name}-raw-bucket"
  }
}

resource "aws_s3_bucket_versioning" "raw_bucket_versioning" {
  bucket = aws_s3_bucket.raw_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_bucket_encryption" {
  bucket = aws_s3_bucket.raw_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Processed / Cached Lessons Bucket
resource "aws_s3_bucket" "processed_bucket" {
  bucket = "${var.project_name}-processed-lessons-${var.environment}"

  tags = {
    Name = "${var.project_name}-processed-bucket"
  }
}

# S3 Event Notification -> Lambda
resource "aws_s3_bucket_notification" "raw_upload_notification" {
  bucket = aws_s3_bucket.raw_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.ingestion_lambda.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw_uploads/"
  }

  depends_on = [aws_lambda_permission.allow_s3_invocation]
}
