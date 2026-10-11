# Phase 8 deployment

This stack deploys the FastAPI application to ECS Fargate, serves the district dashboard from a private S3 bucket through CloudFront, routes `/api/*` through the same HTTPS CloudFront URL, and requires Cognito staff sign-in for application API routes. ECS tasks accept traffic only from the ALB. The ALB requires a private origin header from CloudFront, so its public DNS name cannot be used to bypass the dashboard path.

## First-time setup

Prerequisites: AWS CLI credentials for the Terraform operator, Terraform 1.5+, Docker, and a GitHub repository on the `main` branch.

1. Build the ingestion Lambda archive for the Linux Lambda runtime:

   ```bash
   bash aws/scripts/build_lambda_package.sh
   ```

2. Configure Terraform in `aws/terraform`. Set `github_repository` to the exact GitHub owner/repository (for example `district/Aaroh`). Change `project_name` if the globally named S3 buckets are already taken. For a custom API certificate, set `acm_certificate_arn` to an ACM certificate in the selected AWS region.

3. Provision the resources:

   ```bash
   cd aws/terraform
   terraform init
   terraform plan
   terraform apply
   ```

   The ECS service starts at zero tasks so its ECR repository can be created before an image exists. The first GitHub deployment starts two tasks.

4. Copy these Terraform outputs into GitHub repository **Variables** (Settings → Secrets and variables → Actions → Variables):

   | Variable | Terraform output |
   | --- | --- |
   | `AWS_ROLE_ARN` | `github_deploy_role_arn` |
   | `AWS_REGION` | `aws_region` value (defaults to `ap-south-1`) |
   | `ECR_REPOSITORY` | `api_ecr_repository` |
   | `ECS_CLUSTER` | `ecs_cluster_name` |
   | `ECS_SERVICE` | `ecs_service_name` |
   | `FRONTEND_BUCKET` | `frontend_bucket` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id` |
   | `COGNITO_DOMAIN` | `cognito_domain_url` |
   | `COGNITO_APP_CLIENT_ID` | `cognito_app_client_id` |

5. Push to `main` or run **Build and deploy AAROH** from GitHub Actions. The workflow pushes an immutable commit tag and `latest` to ECR, starts a new ECS deployment, uploads the dashboard, and invalidates CloudFront.

6. Create staff accounts as an AWS administrator. Self-registration is disabled:

   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id "$(terraform output -raw cognito_user_pool_id)" \
     --username teacher@example.org \
     --user-attributes Name=email,Value=teacher@example.org Name=email_verified,Value=true
   ```

   Cognito sends the staff member a temporary password and requires a password change at first sign-in.

The dashboard is available at `terraform output -raw frontend_url`; its API base is the same CloudFront origin. `/health` remains available through CloudFront for health checks. The API ALB DNS itself returns 403 by design.

## Operations

- ECS application logs are retained in CloudWatch Logs for 30 days. Container Insights is enabled.
- CloudWatch alarms cover sustained ECS CPU utilization and unhealthy ALB targets.
- ECS retrieves the generated database password from Secrets Manager. The RDS security group accepts PostgreSQL only from API tasks.
- GitHub Actions uses OIDC; it does not need long-lived AWS access keys. Its IAM role is restricted to this repository's `main` branch and the API ECR repository, ECS service, frontend bucket, and CloudFront distribution.
- Cognito issues OAuth authorization-code tokens with PKCE. The API validates token signature, issuer, expiry, token type, and app client ID.

Terraform state contains generated database and CloudFront origin secrets. Use an encrypted, access-controlled remote state backend with locking for shared or production use; protect local state files and backups if you keep the default local backend.
