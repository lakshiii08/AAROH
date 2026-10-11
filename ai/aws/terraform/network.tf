data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "aaroh" {
  cidr_block           = "10.40.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project_name}-vpc-${var.environment}" }
}

resource "aws_internet_gateway" "aaroh" {
  vpc_id = aws_vpc.aaroh.id
  tags   = { Name = "${var.project_name}-igw-${var.environment}" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.aaroh.id
  cidr_block              = cidrsubnet(aws_vpc.aaroh.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project_name}-public-${count.index + 1}-${var.environment}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.aaroh.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.aaroh.id
  }
  tags = { Name = "${var.project_name}-public-${var.environment}" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "api_alb" {
  name        = "${var.project_name}-api-alb-${var.environment}"
  description = "Public HTTP(S) ingress for the AAROH API"
  vpc_id      = aws_vpc.aaroh.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  dynamic "ingress" {
    for_each = var.acm_certificate_arn == "" ? [] : [1]
    content {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "api_tasks" {
  name        = "${var.project_name}-api-tasks-${var.environment}"
  description = "AAROH API tasks accept traffic only from the ALB"
  vpc_id      = aws_vpc.aaroh.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.api_alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.project_name}/${var.environment}/database"
  description             = "AAROH PostgreSQL connection credentials"
  recovery_window_in_days = 7
}

resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "cloudfront_origin" {
  length  = 40
  special = false
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.database.result
  })
}
