import os
import json
import boto3
from pathlib import Path
from typing import Dict, List, Optional, Any
from botocore.exceptions import ClientError
from src.aaroh.entity.config_entity import DynamoDBConfig
from src.aaroh.entity.artifact_entity import GlossaryEntryEntity
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class GlossaryDatabaseManager:
    """Manages fast key-value glossary lookups in DynamoDB with in-memory caching and local fallback."""

    def __init__(self, config: DynamoDBConfig, local_fallback_path: str = "data/glossary/local_glossary.json"):
        self.config = config
        self.local_fallback_path = Path(local_fallback_path)
        self.local_fallback_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.dynamodb = self._init_dynamodb_client()
        self._load_local_fallback()
        self.seed_from_curated_file()

    def _init_dynamodb_client(self):
        try:
            return boto3.resource(
                "dynamodb",
                region_name=self.config.region_name,
            )
        except Exception as e:
            logger.warning(f"DynamoDB client could not be initialized ({e}). Using local in-memory & file storage.")
            return None

    def _get_table(self):
        if not self.dynamodb:
            return None
        try:
            table = self.dynamodb.Table(self.config.table_name)
            table.load()
            return table
        except Exception as e:
            logger.debug(f"DynamoDB table {self.config.table_name} not available on AWS ({e}). Falling back to local storage.")
            return None

    def _cache_key(self, source_term: str, source_lang: str, target_lang: str) -> str:
        return f"{source_lang.lower()}#{target_lang.lower()}#{source_term.strip().lower()}"

    def _load_local_fallback(self):
        if self.local_fallback_path.exists():
            try:
                with open(self.local_fallback_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        ck = self._cache_key(item["source_term"], item["source_lang"], item["target_lang"])
                        self.cache[ck] = item
                logger.info(f"Loaded {len(self.cache)} glossary terms into local memory cache.")
            except Exception as e:
                logger.warning(f"Could not load local glossary file: {e}")

    def _save_local_fallback(self):
        try:
            items = list(self.cache.values())
            with open(self.local_fallback_path, "w", encoding="utf-8") as f:
                json.dump(items, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist local glossary fallback: {e}")

    def put_term(self, entry: GlossaryEntryEntity) -> bool:
        """Stores a glossary term in DynamoDB and updates the fast cache."""
        source_clean = entry.source_term.strip().lower()
        pk = f"LANG#{entry.source_lang.lower()}#{entry.target_lang.lower()}"
        sk = f"TERM#{source_clean}"

        item_dict = {
            "pk": pk,
            "sk": sk,
            "source_term": source_clean,
            "translated_term": entry.translated_term,
            "source_lang": entry.source_lang.lower(),
            "target_lang": entry.target_lang.lower(),
            "domain": entry.domain,
            "dialects": entry.dialects,
            "phonetic_hint": entry.phonetic_hint or "",
            "notes": entry.notes or "",
        }

        # Update cache immediately (< 1ms)
        ck = self._cache_key(source_clean, entry.source_lang, entry.target_lang)
        self.cache[ck] = item_dict
        self._save_local_fallback()

        # Update DynamoDB if connected
        table = self._get_table()
        if table:
            try:
                table.put_item(Item=item_dict)
                logger.info(f"Persisted glossary term '{source_clean}' to DynamoDB table {self.config.table_name}")
            except Exception as e:
                logger.warning(f"Failed to write term '{source_clean}' to DynamoDB ({e}). Cached locally.")

        return True

    def get_term(self, source_term: str, source_lang: str = "en", target_lang: str = "hi") -> Optional[Dict[str, Any]]:
        """Looks up a translation term with ultra-low latency from cache or DynamoDB."""
        source_clean = source_term.strip().lower()
        ck = self._cache_key(source_clean, source_lang, target_lang)

        # 1. Fast Cache Lookup (Memory)
        if ck in self.cache:
            return self.cache[ck]

        # 2. DynamoDB Lookup
        table = self._get_table()
        if table:
            try:
                pk = f"LANG#{source_lang.lower()}#{target_lang.lower()}"
                sk = f"TERM#{source_clean}"
                response = table.get_item(Key={"pk": pk, "sk": sk})
                item = response.get("Item")
                if item:
                    self.cache[ck] = item
                    return item
            except Exception as e:
                logger.warning(f"DynamoDB lookup failed for term '{source_clean}': {e}")

        return None

    def batch_lookup(self, terms: List[str], source_lang: str = "en", target_lang: str = "hi") -> Dict[str, Dict[str, Any]]:
        """Performs batch lookup for multiple terms."""
        results = {}
        for t in terms:
            match = self.get_term(t, source_lang, target_lang)
            if match:
                results[t.lower()] = match
        return results

    def seed_from_curated_file(self, seed_path: str = "data/glossary/curated_primary_glossary.json"):
        """Seeds curated NCERT terms with tribal dialect variations into DynamoDB."""
        path = Path(seed_path)
        if not path.exists():
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                curated_list = json.load(f)

            count = 0
            for item in curated_list:
                ck = self._cache_key(item["source_term"], item["source_lang"], item["target_lang"])
                if ck not in self.cache:
                    entry = GlossaryEntryEntity(
                        source_term=item["source_term"],
                        translated_term=item["translated_term"],
                        source_lang=item["source_lang"],
                        target_lang=item["target_lang"],
                        domain=item.get("domain", "general"),
                        dialects=item.get("dialects", {}),
                        phonetic_hint=item.get("phonetic_hint"),
                        notes=item.get("notes"),
                    )
                    self.put_term(entry)
                    count += 1

            if count > 0:
                logger.info(f"Seeded {count} primary curriculum glossary terms.")
        except Exception as e:
            logger.error(f"Failed to seed initial glossary: {e}")
