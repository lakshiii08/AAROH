import os
import yaml
import json
import hashlib
from typing import Any, Dict
from pathlib import Path
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

def read_yaml(path_to_yaml: Path | str) -> Dict[str, Any]:
    """Reads a yaml file safely and returns a dictionary."""
    try:
        path = Path(path_to_yaml)
        if not path.exists():
            raise FileNotFoundError(f"YAML file not found at: {path}")
        with open(path, "r", encoding="utf-8") as yaml_file:
            content = yaml.safe_load(yaml_file)
            return content or {}
    except Exception as e:
        logger.error(f"Failed to read YAML file at {path_to_yaml}: {e}")
        raise AarohException(e, sys)

def create_directories(paths: list[Path | str], verbose: bool = True) -> None:
    """Creates a list of directories if they don't exist."""
    for path in paths:
        path_obj = Path(path)
        if not path_obj.exists():
            path_obj.mkdir(parents=True, exist_ok=True)
            if verbose:
                logger.info(f"Created directory: {path}")

def compute_file_hash(file_path: Path | str) -> str:
    """Computes SHA-256 hash of a file for deduplication."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def clean_text(text: str) -> str:
    """Cleans whitespace, line breaks, and non-printable characters."""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines()]
    cleaned_lines = [l for l in lines if l]
    return "\n".join(cleaned_lines)
