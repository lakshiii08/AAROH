#!/usr/bin/env bash
set -e

IMAGE_NAME="aaroh-translation-service"
TAG="${1:-latest}"

echo "Building Docker image: ${IMAGE_NAME}:${TAG}..."
docker build -t "${IMAGE_NAME}:${TAG}" -f docker/Dockerfile .

echo "Build complete for ${IMAGE_NAME}:${TAG}"
