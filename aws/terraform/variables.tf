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

variable "db_password" {
  description = "PostgreSQL Master Password"
  type        = string
  sensitive   = true
  default     = "AarohSecurePass2026!"
}

variable "db_name" {
  description = "PostgreSQL Database Name"
  type        = string
  default     = "aaroh_db"
}
