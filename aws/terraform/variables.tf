variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1" # Mumbai region
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name tag"
  type        = string
  default     = "aaroh"
}

variable "db_username" {
  description = "PostgreSQL Master Username"
  type        = string
  default     = "aaroh_admin"
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the deployment role (for example owner/Aaroh)"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "PostgreSQL Database Name"
  type        = string
  default     = "aaroh_db"
}

variable "acm_certificate_arn" {
  description = "Optional ACM certificate ARN in this region for HTTPS on the API ALB"
  type        = string
  default     = ""
}

variable "api_image_tag" {
  description = "Container tag for the AAROH API image"
  type        = string
  default     = "latest"
}
