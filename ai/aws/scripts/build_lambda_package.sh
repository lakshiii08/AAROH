#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$PACKAGE_DIR"' EXIT

docker run --rm --platform linux/amd64 \
  -v "$ROOT_DIR:/workspace" \
  -v "$PACKAGE_DIR:/package" \
  public.ecr.aws/sam/build-python3.11:latest \
  bash -lc 'grep -v "^pytest" /workspace/requirements.txt >/tmp/lambda-requirements.txt && python -m pip install --no-cache-dir -r /tmp/lambda-requirements.txt --target /package && cp -R /workspace/src /workspace/config /workspace/prompts /package/ && python -c "import os, zipfile; root=\"/package\"; archive=zipfile.ZipFile(\"/workspace/aws/terraform/ingestion.zip\", \"w\", zipfile.ZIP_DEFLATED); [archive.write(os.path.join(path, name), os.path.relpath(os.path.join(path, name), root)) for path, _, names in os.walk(root) for name in names]; archive.close()"'

echo "Created $ROOT_DIR/aws/terraform/ingestion.zip"
