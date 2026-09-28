"""Phase 3 LangGraph Agent — Simplification & Localization.

Graph Nodes:
  ┌──────────────┐   ┌─────────────────┐   ┌───────────────────┐
  │ cache_lookup │──▶│  rag_retrieval  │──▶│ llm_simplification│
  └──────────────┘   └─────────────────┘   └───────────────────┘
        │ HIT                                        │
        ▼                                            ▼
  ┌──────────────┐                         ┌───────────────────┐
  │ return_cached│                         │   cache_and_emit  │
  └──────────────┘                         └───────────────────┘

Conditional edge: 'cache_lookup' → 'return_cached' if HIT, else → 'rag_retrieval'
"""

from typing import Optional, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from src.aaroh.entity.artifact_entity import ConceptEntity, LocalizedLessonEntity
from src.aaroh.components.simplification import SimplificationComponent
from src.aaroh.components.rag_pipeline import RAGPipelineComponent
from src.aaroh.database.content_cache import ContentCacheManager
from src.aaroh.utils.logger import logger


class LocalizationState(TypedDict):
    # Inputs
    concept: ConceptEntity
    curriculum_context: str
    target_language: str
    target_dialect: Optional[str]
    grade_level: int
    force_regenerate: bool

    # Intermediate state
    retrieved_chunks: list
    cache_hit: bool
    cached_payload: Optional[dict]
    generated_lesson: Optional[dict]

    # Output
    final_lesson: Optional[dict]
    error: Optional[str]


class SimplificationLocalizationGraph:
    """LangGraph workflow for Phase 3 RAG-powered Simplification & Localization."""

    def __init__(
        self,
        simplifier: SimplificationComponent,
        rag: RAGPipelineComponent,
        cache: ContentCacheManager,
    ):
        self.simplifier = simplifier
        self.rag = rag
        self.cache = cache
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        builder = StateGraph(LocalizationState)

        builder.add_node("cache_lookup", self._node_cache_lookup)
        builder.add_node("rag_retrieval", self._node_rag_retrieval)
        builder.add_node("llm_simplification", self._node_llm_simplification)
        builder.add_node("cache_and_emit", self._node_cache_and_emit)
        builder.add_node("return_cached", self._node_return_cached)

        builder.set_entry_point("cache_lookup")

        builder.add_conditional_edges(
            "cache_lookup",
            self._route_after_cache_check,
            {
                "cached": "return_cached",
                "generate": "rag_retrieval",
            },
        )

        builder.add_edge("return_cached", END)
        builder.add_edge("rag_retrieval", "llm_simplification")
        builder.add_edge("llm_simplification", "cache_and_emit")
        builder.add_edge("cache_and_emit", END)

        return builder.compile()

    # ── Nodes ────────────────────────────────────────────────────────────────

    def _node_cache_lookup(self, state: LocalizationState) -> LocalizationState:
        concept = state["concept"]
        if state.get("force_regenerate"):
            logger.info(f"Force regenerate for '{concept.concept_code}'. Skipping cache.")
            return {**state, "cache_hit": False, "cached_payload": None}

        cached = self.cache.get(concept.concept_code, state["target_language"], state.get("target_dialect"))
        if cached:
            logger.info(f"[LangGraph] Cache HIT → '{concept.concept_code}'")
            return {**state, "cache_hit": True, "cached_payload": cached}

        logger.info(f"[LangGraph] Cache MISS → proceeding to RAG for '{concept.concept_code}'")
        return {**state, "cache_hit": False, "cached_payload": None}

    def _route_after_cache_check(self, state: LocalizationState) -> str:
        return "cached" if state["cache_hit"] else "generate"

    def _node_return_cached(self, state: LocalizationState) -> LocalizationState:
        return {**state, "final_lesson": state["cached_payload"]}

    def _node_rag_retrieval(self, state: LocalizationState) -> LocalizationState:
        concept = state["concept"]
        rag_query = f"{concept.name} {' '.join(concept.key_vocabulary[:3])}"
        chunks = self.rag.search_similar_content(query=rag_query, top_k=3)
        context = "\n\n---\n\n".join(c.get("content", "") for c in chunks if c.get("content"))
        if not context:
            context = f"{concept.name}: {concept.definition}"
        logger.info(f"[LangGraph] RAG retrieved {len(chunks)} chunks for '{concept.name}'")
        return {**state, "retrieved_chunks": chunks, "curriculum_context": context}

    def _node_llm_simplification(self, state: LocalizationState) -> LocalizationState:
        concept = state["concept"]
        logger.info(f"[LangGraph] LLM Simplification → '{concept.concept_code}' ({state['target_language']})")
        lesson_dict = self.simplifier.simplify_and_localize(
            concept=concept,
            curriculum_context=state["curriculum_context"],
            grade_level=state["grade_level"],
            target_language=state["target_language"],
            target_dialect=state.get("target_dialect"),
        )
        return {**state, "generated_lesson": lesson_dict}

    def _node_cache_and_emit(self, state: LocalizationState) -> LocalizationState:
        concept = state["concept"]
        lesson = state["generated_lesson"]
        self.cache.put(
            concept.concept_code,
            state["target_language"],
            state.get("target_dialect"),
            lesson,
        )
        logger.info(f"[LangGraph] Lesson cached and emitted for '{concept.concept_code}'")
        return {**state, "final_lesson": lesson}

    # ── Public API ────────────────────────────────────────────────────────────

    def run(
        self,
        concept: ConceptEntity,
        target_language: str = "hi",
        target_dialect: Optional[str] = None,
        grade_level: int = 3,
        force_regenerate: bool = False,
    ) -> dict:
        """Executes the full LangGraph workflow and returns the final lesson dict."""
        initial_state: LocalizationState = {
            "concept": concept,
            "curriculum_context": "",
            "target_language": target_language,
            "target_dialect": target_dialect,
            "grade_level": grade_level,
            "force_regenerate": force_regenerate,
            "retrieved_chunks": [],
            "cache_hit": False,
            "cached_payload": None,
            "generated_lesson": None,
            "final_lesson": None,
            "error": None,
        }
        final_state = self.graph.invoke(initial_state)
        return final_state.get("final_lesson") or {}
