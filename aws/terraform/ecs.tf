# ECS Cluster
resource "aws_ecs_cluster" "aaroh_cluster" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task (Application runtime permissions)
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach DynamoDB and SageMaker permissions to ECS task
resource "aws_iam_policy" "ecs_phase2_policy" {
  name        = "${var.project_name}-ecs-phase2-policy"
  description = "Allows ECS Translation Service to access DynamoDB and SageMaker"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:BatchGetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.glossary_table.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_ecs_phase2_policy" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_phase2_policy.arn
}

# ECS Task Definition for Translation Service
resource "aws_ecs_task_definition" "translation_task" {
  family                   = "${var.project_name}-translation-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024" # 1 vCPU
  memory                   = "2048" # 2 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "aaroh-translation-service"
      image     = "${aws_ecr_repository.translation_service_repo.repository_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "DYNAMODB_GLOSSARY_TABLE", value = aws_dynamodb_table.glossary_table.name },
        { name = "SAGEMAKER_TRANSLATION_ENDPOINT", value = "aaroh-indictrans2-endpoint" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}-translation"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# Internal ALB for Translation Service
resource "aws_security_group" "alb_sg" {
  name        = "${var.project_name}-alb-sg"
  description = "Security group for internal ALB"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb_target_group" "translation_tg" {
  name        = "${var.project_name}-trans-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = "vpc-dummy-vpc-id"
  target_type = "ip"

  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
