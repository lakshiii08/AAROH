# DynamoDB Glossary Table for Fast Key-Value Term Lookup
resource "aws_dynamodb_table" "glossary_table" {
  name         = "${var.project_name}_glossary"
  billing_mode = "PAY_PER_REQUEST" # On-Demand capacity for cost-efficiency & spike handling
  hash_key     = "pk"              # Partition Key: LANG#<source_lang>#<target_lang>
  range_key    = "sk"              # Sort Key: TERM#<source_term>

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-glossary-table"
    Phase       = "Phase2-Translation"
    Environment = var.environment
  }
}
