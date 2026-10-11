resource "aws_ecs_cluster" "aaroh_cluster" {
  name = "${var.project_name}-cluster-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-execution-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_secret_read" {
  name = "${var.project_name}-ecs-read-db-secret"
  role = aws_iam_role.ecs_task_execution_role.id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = [aws_secretsmanager_secret.database.arn] }]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ecs-tasks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "ecs_application" {
  name = "${var.project_name}-api-runtime-${var.environment}"
  role = aws_iam_role.ecs_task_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:BatchGetItem", "dynamodb:Query", "dynamodb:Scan"], Resource = [aws_dynamodb_table.glossary_table.arn] },
      { Effect = "Allow", Action = ["sagemaker:InvokeEndpoint"], Resource = "arn:aws:sagemaker:${var.aws_region}:*:endpoint/aaroh-indictrans2-endpoint" },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject"], Resource = ["${aws_s3_bucket.raw_bucket.arn}/*", "${aws_s3_bucket.processed_bucket.arn}/*"] },
      { Effect = "Allow", Action = ["bedrock:InvokeModel", "bedrock:Converse"], Resource = "*" }
    ]
  })
}

resource "aws_lb" "api" {
  name               = "${var.project_name}-api-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.api_alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = { Name = "${var.project_name}-api-${var.environment}" }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project_name}-api-${var.environment}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.aaroh.id
  target_type = "ip"
  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "api_http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Use the AAROH dashboard endpoint."
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener" "api_https" {
  count             = var.acm_certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.acm_certificate_arn
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Use the AAROH dashboard endpoint."
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "api_http_from_cloudfront" {
  listener_arn = aws_lb_listener.api_http.arn
  priority     = 100
  condition {
    http_header {
      http_header_name = "X-Aaroh-Origin"
      values           = [random_password.cloudfront_origin.result]
    }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener_rule" "api_https_from_cloudfront" {
  count        = var.acm_certificate_arn == "" ? 0 : 1
  listener_arn = aws_lb_listener.api_https[0].arn
  priority     = 100
  condition {
    http_header {
      http_header_name = "X-Aaroh-Origin"
      values           = [random_password.cloudfront_origin.result]
    }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  container_definitions = jsonencode([{
    name         = "aaroh-api"
    image        = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
    essential    = true
    portMappings = [{ containerPort = 8000, hostPort = 8000, protocol = "tcp" }]
    environment = [
      { name = "APP_ENV", value = var.environment },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "DB_HOST", value = aws_db_instance.aaroh_rds.address },
      { name = "DB_PORT", value = tostring(aws_db_instance.aaroh_rds.port) },
      { name = "DB_NAME", value = var.db_name },
      { name = "DB_USER", value = var.db_username },
      { name = "DB_DIALECT", value = "postgresql" },
      { name = "DB_USE_SQLITE_FALLBACK", value = "false" },
      { name = "COGNITO_USER_POOL_ID", value = aws_cognito_user_pool.staff.id },
      { name = "COGNITO_APP_CLIENT_ID", value = aws_cognito_user_pool_client.dashboard.id },
      { name = "FRONTEND_ORIGIN", value = "https://${aws_cloudfront_distribution.frontend.domain_name}" },
      { name = "DYNAMODB_GLOSSARY_TABLE", value = aws_dynamodb_table.glossary_table.name },
      { name = "S3_RAW_BUCKET", value = aws_s3_bucket.raw_bucket.bucket },
      { name = "S3_PROCESSED_BUCKET", value = aws_s3_bucket.processed_bucket.bucket }
    ]
    secrets = [{ name = "DB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.database.arn}:password::" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = { command = ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\""], interval = 30, timeout = 5, retries = 3, startPeriod = 60 }
  }])
}

resource "aws_ecs_service" "api" {
  name            = "${var.project_name}-api-${var.environment}"
  cluster         = aws_ecs_cluster.aaroh_cluster.id
  task_definition = aws_ecs_task_definition.api.arn
  # Start at zero so Terraform can create the ECR repository and service before
  # the first image is pushed. CI sets this to two after its first successful build.
  desired_count = 0
  launch_type   = "FARGATE"
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.api_tasks.id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "aaroh-api"
    container_port   = 8000
  }
  depends_on = [aws_lb_listener_rule.api_http_from_cloudfront]
  lifecycle {
    ignore_changes = [desired_count]
  }
}
