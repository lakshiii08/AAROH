#!/usr/bin/env bash
set -e

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID is required}"
IMAGE_NAME="aaroh-translation-service"
TAG="${1:-latest}"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}:${TAG}"

echo "Logging in to Amazon ECR (${AWS_REGION})..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "Tagging and pushing image to ${ECR_URI}..."
docker tag "${IMAGE_NAME}:${TAG}" "${ECR_URI}"
docker push "${ECR_URI}"

echo "Successfully pushed to ECR: ${ECR_URI}"
