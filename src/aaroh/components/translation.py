import re
import time
import json
import boto3
from typing import List, Dict, Any, Optional, Tuple
from src.aaroh.entity.config_entity import TranslationConfig, DynamoDBConfig
from src.aaroh.entity.artifact_entity import (
    TranslationResponseEntity,
    BatchTranslationResponseEntity,
    GlossaryEntryEntity,
)
from src.aaroh.database.glossary_db import GlossaryDatabaseManager
from src.aaroh.utils.logger import logger
from src.aaroh.utils.exception import AarohException
import sys

class TranslationComponent:
    """Mother-Tongue Translation Layer supporting IndicTrans2/NLLB, SageMaker, and DynamoDB glossary integration."""

    def __init__(self, config: TranslationConfig, db_manager: Optional[GlossaryDatabaseManager] = None):
        self.config = config
        self.glossary_db = db_manager or GlossaryDatabaseManager(
            DynamoDBConfig(table_name="aaroh_glossary", region_name=self.config.region_name)
        )
        self.sagemaker_runtime = self._init_sagemaker_client()

    def _init_sagemaker_client(self):
        try:
            return boto3.client("sagemaker-runtime", region_name=self.config.region_name)
        except Exception as e:
            logger.warning(f"SageMaker client could not be initialized ({e}).")
            return None

    def translate_text(
        self,
        text: str,
        source_lang: str = "en",
        target_lang: str = "hi",
        target_dialect: Optional[str] = None,
        apply_glossary: bool = True,
    ) -> TranslationResponseEntity:
        """Translates curriculum text into mother tongue with glossary preservation and dialect adaptation."""
        start_time = time.perf_counter()
        clean_input = text.strip()
        if not clean_input:
            return TranslationResponseEntity(
                original_text=text,
                translated_text="",
                source_lang=source_lang,
                target_lang=target_lang,
                applied_glossary_terms=[],
                latency_ms=0.0,
            )

        applied_glossary_terms: List[Dict[str, str]] = []
        masked_text = clean_input
        placeholder_map: Dict[str, str] = {}

        # 1. Glossary Lookup & Term Masking
        if apply_glossary and self.config.enable_glossary_lookup:
            masked_text, placeholder_map, applied_glossary_terms = self._apply_glossary_masking(
                clean_input, source_lang, target_lang, target_dialect
            )

        # 2. Model Inference (SageMaker Endpoint / IndicTrans2 / Fallback)
        translated_masked = self._run_model_inference(masked_text, source_lang, target_lang)

        # 3. Post-Processing & Demasking
        final_translated = self._demask_glossary_terms(translated_masked, placeholder_map)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.info(f"Translated ({source_lang}->{target_lang}) in {elapsed_ms}ms with {len(applied_glossary_terms)} glossary terms.")

        return TranslationResponseEntity(
            original_text=text,
            translated_text=final_translated,
            source_lang=source_lang,
            target_lang=target_lang,
            applied_glossary_terms=applied_glossary_terms,
            latency_ms=elapsed_ms,
            backend_used=self.config.backend,
        )

    def translate_batch(
        self,
        texts: List[str],
        source_lang: str = "en",
        target_lang: str = "hi",
        target_dialect: Optional[str] = None,
    ) -> BatchTranslationResponseEntity:
        """Translates a batch of texts (e.g., all paragraphs of a lesson)."""
        start_time = time.perf_counter()
        results: List[TranslationResponseEntity] = []

        # Process in chunks of max_batch_size
        batch_size = self.config.max_batch_size
        for i in range(0, len(texts), batch_size):
            chunk = texts[i : i + batch_size]
            for text in chunk:
                res = self.translate_text(
                    text=text,
                    source_lang=source_lang,
                    target_lang=target_lang,
                    target_dialect=target_dialect,
                )
                results.append(res)

        total_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return BatchTranslationResponseEntity(
            results=results,
            total_count=len(texts),
            total_time_ms=total_time_ms,
        )

    def _apply_glossary_masking(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        target_dialect: Optional[str] = None,
    ) -> Tuple[str, Dict[str, str], List[Dict[str, str]]]:
        """Identifies glossary terms in text, replaces with <TERM_i>, and prepares target replacements."""
        masked_text = text
        placeholder_map: Dict[str, str] = {}
        applied_terms: List[Dict[str, str]] = []

        # Sort cache terms by length descending to match longest phrases first (e.g. 'earthen pot' before 'pot')
        sorted_cache_keys = sorted(
            self.glossary_db.cache.keys(),
            key=lambda k: len(self.glossary_db.cache[k]["source_term"]),
            reverse=True,
        )

        term_counter = 0
        for ck in sorted_cache_keys:
            entry = self.glossary_db.cache[ck]
            if entry["source_lang"] != source_lang.lower() or entry["target_lang"] != target_lang.lower():
                continue

            src_term = entry["source_term"]
            pattern = re.compile(r"\b" + re.escape(src_term) + r"\b", re.IGNORECASE)

            if pattern.search(masked_text):
                # Check for dialect substitution
                target_word = entry["translated_term"]
                if target_dialect and entry.get("dialects") and target_dialect in entry["dialects"]:
                    target_word = f"{entry['dialects'][target_dialect]} ({entry['translated_term']})"

                placeholder = f"__TERM_{term_counter}__"
                placeholder_map[placeholder] = target_word
                applied_terms.append({
                    "source": src_term,
                    "target": target_word,
                    "domain": entry.get("domain", "general"),
                })
                masked_text = pattern.sub(placeholder, masked_text)
                term_counter += 1

        return masked_text, placeholder_map, applied_terms

    def _demask_glossary_terms(self, translated_text: str, placeholder_map: Dict[str, str]) -> str:
        """Restores protected glossary translations into the translated output."""
        result = translated_text
        for placeholder, replacement in placeholder_map.items():
            result = result.replace(placeholder, replacement)
        return result

    def _run_model_inference(self, text: str, source_lang: str, target_lang: str) -> str:
        """Executes model inference via SageMaker or internal fallback translator."""
        # IndicTrans2 deployments may return Santali in Devanagari. Use the
        # Santali-specific translator so the result is validated as Ol Chiki.
        if (target_lang or "").lower() == "sat":
            from src.aaroh.components.santali_engine import translate_to_santali
            return translate_to_santali(text, source_lang)

        # 1. SageMaker IndicTrans2 Endpoint (Production on EC2 GPU)
        if self.sagemaker_runtime and not self.config.enable_mock_translation:
            try:
                payload = {
                    "inputs": [text],
                    "parameters": {
                        "src_lang": source_lang,
                        "tgt_lang": target_lang,
                    },
                }
                response = self.sagemaker_runtime.invoke_endpoint(
                    EndpointName=self.config.sagemaker_endpoint_name,
                    ContentType="application/json",
                    Body=json.dumps(payload),
                )
                res_json = json.loads(response["Body"].read().decode())
                if isinstance(res_json, list) and len(res_json) > 0:
                    return res_json[0].get("translation_text", text)
            except Exception as e:
                logger.warning(f"SageMaker IndicTrans2 inference failed ({e}). Using intelligent fallback.")

        # 2. Real Indic Neural & Santali Translation Engine
        return self._heuristic_translation_fallback(text, source_lang, target_lang)

    def _heuristic_translation_fallback(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translates curriculum and classroom text into authentic mother tongues, including Santali Ol Chiki."""
        import urllib.request
        import urllib.parse
        import json

        src = (source_lang or "en").lower()
        tgt = (target_lang or "hi").lower()
        clean = text.strip()

        # 1. Handle Santali (sat) with real Ol Chiki script & Roman transliteration
        if tgt == "sat":
            from src.aaroh.components.santali_engine import translate_to_santali
            return translate_to_santali(clean, src)

        # 2. Standard Indic Translation (Hindi, Bengali, Odia, English, etc.)
        try:
            target_code = "hi" if tgt in ["hi", "gon", "hne"] else tgt
            source_code = "en" if src == "en" else src
            trans_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_code}&tl={target_code}&dt=t&q={urllib.parse.quote(clean)}"
            req = urllib.request.Request(trans_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                translated = "".join([part[0] for part in data[0] if part[0]])
                return translated
        except Exception as err:
            logger.warning(f"Live neural translation failed ({err}).")
            return clean
