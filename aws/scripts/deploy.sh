#!/usr/bin/env bash
set -e

CLUSTER_NAME="aaroh-cluster-dev"
SERVICE_NAME="aaroh-translation-service"
AWS_REGION="${AWS_REGION:-ap-south-1}"

echo "Updating ECS service ${SERVICE_NAME} in cluster ${CLUSTER_NAME}..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --force-new-deployment \
  --region "${AWS_REGION}"

echo "Deployment triggered successfully on ECS Fargate!"
