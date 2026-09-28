resource "aws_cognito_user_pool" "staff" {
  name                     = "${var.project_name}-staff-${var.environment}"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  admin_create_user_config {
    allow_admin_create_user_only = true
  }
  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  tags = { Name = "${var.project_name}-staff-${var.environment}", Phase = "Phase8-Auth" }
}

resource "random_id" "cognito_domain" {
  byte_length = 4
}

resource "aws_cognito_user_pool_domain" "staff" {
  domain       = "${var.project_name}-${var.environment}-${random_id.cognito_domain.hex}"
  user_pool_id = aws_cognito_user_pool.staff.id
}

resource "aws_cognito_user_pool_client" "dashboard" {
  name                                 = "${var.project_name}-dashboard-${var.environment}"
  user_pool_id                         = aws_cognito_user_pool.staff.id
  generate_secret                      = false
  supported_identity_providers         = ["COGNITO"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = ["https://${aws_cloudfront_distribution.frontend.domain_name}/"]
  logout_urls                          = ["https://${aws_cloudfront_distribution.frontend.domain_name}/"]
  prevent_user_existence_errors        = "ENABLED"
  explicit_auth_flows                  = ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]
}
