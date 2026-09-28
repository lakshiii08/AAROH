# Ingestion Lambda Function
resource "aws_lambda_function" "ingestion_lambda" {
  function_name = "${var.project_name}-content-ingestion-${var.environment}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "src.aaroh.lambda_handlers.content_ingestion_lambda.lambda_handler"
  runtime       = "python3.11"
  timeout       = 300 # 5 minutes for document parsing and Bedrock concept extraction
  memory_size   = 1024

  environment {
    variables = {
      S3_RAW_BUCKET         = aws_s3_bucket.raw_bucket.bucket
      S3_PROCESSED_BUCKET   = aws_s3_bucket.processed_bucket.bucket
      DB_HOST               = aws_db_instance.aaroh_rds.address
      DB_PORT               = aws_db_instance.aaroh_rds.port
      DB_NAME               = var.db_name
      DB_USER               = var.db_username
      DB_PASSWORD           = var.db_password
      AWS_REGION            = var.aws_region
      BEDROCK_MODEL_ID      = "anthropic.claude-3-5-sonnet-20241022-v2:0"
      BEDROCK_EMBEDDING_ID  = "amazon.titan-embed-text-v2:0"
    }
  }

  tags = {
    Name = "${var.project_name}-content-ingestion-lambda"
  }
}

# Permission for S3 to invoke Lambda
resource "aws_lambda_permission" "allow_s3_invocation" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingestion_lambda.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw_bucket.arn
}
