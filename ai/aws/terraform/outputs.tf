output "api_url" {
  description = "HTTPS CloudFront URL used by the dashboard for the API"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_url" {
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  description = "CloudFront URL for the AAROH district dashboard"
}

output "frontend_bucket" {
  value       = aws_s3_bucket.frontend.bucket
  description = "Private S3 bucket deployed by GitHub Actions"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.frontend.id
  description = "Set this as the GitHub Actions CLOUDFRONT_DISTRIBUTION_ID variable"
}

output "api_ecr_repository" {
  value       = aws_ecr_repository.api.name
  description = "ECR repository name for the FastAPI application"
}

output "ecs_cluster_name" { value = aws_ecs_cluster.aaroh_cluster.name }
output "ecs_service_name" { value = aws_ecs_service.api.name }
output "aws_region" { value = var.aws_region }

output "github_deploy_role_arn" {
  value       = var.github_repository == "" ? null : aws_iam_role.github_deploy[0].arn
  description = "Set this as the GitHub Actions AWS_ROLE_ARN repository variable"
}

output "cognito_domain_url" {
  value       = "https://${aws_cognito_user_pool_domain.staff.domain}.auth.${var.aws_region}.amazoncognito.com"
  description = "Managed Cognito sign-in domain; set GitHub variable COGNITO_DOMAIN"
}

output "cognito_app_client_id" {
  value       = aws_cognito_user_pool_client.dashboard.id
  description = "Set GitHub variable COGNITO_APP_CLIENT_ID"
}

output "cognito_user_pool_id" { value = aws_cognito_user_pool.staff.id }
