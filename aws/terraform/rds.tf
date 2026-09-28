# Security Group for PostgreSQL RDS
resource "aws_security_group" "rds_sg" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow inbound PostgreSQL traffic from Lambda and ECS"

  ingress {
    description     = "PostgreSQL from AAROH API tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "aaroh" {
  name       = "${var.project_name}-db-${var.environment}"
  subnet_ids = aws_subnet.public[*].id
  tags       = { Name = "${var.project_name}-db-${var.environment}" }
}

# DB Parameter Group enabling pgvector
resource "aws_db_parameter_group" "postgres_pgvector_params" {
  name   = "${var.project_name}-pg16-pgvector"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "vector"
  }
}

# PostgreSQL RDS Instance
resource "aws_db_instance" "aaroh_rds" {
  identifier            = "${var.project_name}-postgres-${var.environment}"
  engine                = "postgres"
  engine_version        = "16.1"
  instance_class        = "db.t4g.medium"
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.database.result

  parameter_group_name   = aws_db_parameter_group.postgres_pgvector_params.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.aaroh.name
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name = "${var.project_name}-pgvector-rds"
  }
}
