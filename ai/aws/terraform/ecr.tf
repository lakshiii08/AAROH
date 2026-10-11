# Amazon Elastic Container Registry (ECR) for Translation Service
resource "aws_ecr_repository" "translation_service_repo" {
  name                 = "${var.project_name}-translation-service"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.project_name}-ecr-translation"
    Phase       = "Phase2-Translation"
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  tags = { Name = "${var.project_name}-ecr-api", Phase = "Phase8-Deployment", Environment = var.environment }
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{ rulePriority = 1, description = "Keep the 20 newest images", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 20 }, action = { type = "expire" } }]
  })
}

resource "aws_ecr_lifecycle_policy" "translation_repo_policy" {
  repository = aws_ecr_repository.translation_service_repo.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
