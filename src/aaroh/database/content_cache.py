import os
import json
import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any
from src.aaroh.entity.config_entity import LocalizationConfig
from src.aaroh.utils.logger import logger

class ContentCacheManager:
    """Two-tier cache: in-memory dict → local JSON file → DynamoDB (when AWS is live).
    Cache key = SHA-256(concept_code + target_language + target_dialect).
    """

    def __init__(self, config: LocalizationConfig):
        self.config = config
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.local_cache_path = Path(config.local_cache_path)
        self.local_cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._load_local_cache()

    def _make_key(self, concept_code: str, target_language: str, target_dialect: Optional[str]) -> str:
        # Ignore legacy Santali entries generated with the incorrect Devanagari
        # prompt; new Ol Chiki lessons get a separate cache namespace.
        version = "|sat-ol-chiki-v2" if target_language == "sat" else ""
        raw = f"{concept_code}|{target_language}|{target_dialect or 'none'}{version}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    def _load_local_cache(self):
        if self.local_cache_path.exists():
            try:
                with open(self.local_cache_path, "r", encoding="utf-8") as f:
                    self.memory_cache = json.load(f)
                logger.info(f"Loaded {len(self.memory_cache)} entries from local content cache.")
            except Exception as e:
                logger.warning(f"Could not load local content cache: {e}")

    def _persist_local_cache(self):
        try:
            with open(self.local_cache_path, "w", encoding="utf-8") as f:
                json.dump(self.memory_cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist content cache: {e}")

    def is_cached(self, concept_code: str, target_language: str, target_dialect: Optional[str]) -> bool:
        if not self.config.enable_cache:
            return False
        key = self._make_key(concept_code, target_language, target_dialect)
        if key not in self.memory_cache:
            return False
        entry = self.memory_cache[key]
        # TTL check
        age_days = (time.time() - entry.get("cached_at_ts", 0)) / 86400
        return age_days < self.config.cache_ttl_days

    def get(self, concept_code: str, target_language: str, target_dialect: Optional[str]) -> Optional[Dict[str, Any]]:
        if not self.is_cached(concept_code, target_language, target_dialect):
            return None
        key = self._make_key(concept_code, target_language, target_dialect)
        return self.memory_cache.get(key, {}).get("payload")

    def put(self, concept_code: str, target_language: str, target_dialect: Optional[str], payload: Dict[str, Any]):
        if not self.config.enable_cache:
            return
        key = self._make_key(concept_code, target_language, target_dialect)
        self.memory_cache[key] = {
            "payload": payload,
            "cached_at_ts": time.time(),
            "concept_code": concept_code,
            "target_language": target_language,
            "target_dialect": target_dialect,
        }
        self._persist_local_cache()
        logger.info(f"Cached localized lesson for concept '{concept_code}' ({target_language}/{target_dialect}) in local store.")
