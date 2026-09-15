"""OpenRouter Full Model Catalog Manager.

Fetches and caches all 400-500+ foundation models offered by OpenRouter,
including OpenAI (GPT-4o, o1, o3, GPT Astra), Anthropic (Claude 3.7/3.5),
Google Gemini, DeepSeek (R1, V3), Meta Llama, Mistral, and Qwen.
"""

import time
import json
import logging
import urllib.request
from typing import List, Dict, Any

logger = logging.getLogger("antimatter.openrouter")

_CACHED_MODELS: List[Dict[str, Any]] = []
_LAST_FETCH_TIME: float = 0
_CACHE_TTL_SECONDS: float = 3600  # 1 hour


def _categorize_and_enrich_model(m: Dict[str, Any]) -> Dict[str, Any]:
    model_id = m.get("id", "")
    name = m.get("name") or model_id
    m_id_lower = model_id.lower()
    desc = m.get("description") or ""
    context_length = m.get("context_length", 128000)

    # Modality detection
    arch = m.get("architecture") or {}
    modality = str(arch.get("modality", "")).lower()
    is_multimodal = (
        "image" in modality
        or "multimodal" in modality
        or any(k in m_id_lower for k in ["vision", "4o", "gemini", "claude-3", "pixtral", "vl"])
    )

    # Determine provider, category, badge and brand color
    if "openrouter/auto" in m_id_lower or m_id_lower == "auto":
        category = "auto"
        provider = "OpenRouter"
        badge = "SMART ROUTING"
        badge_color = "#00e5ff"
    elif "anthropic" in m_id_lower or "claude" in m_id_lower:
        category = "anthropic"
        provider = "Anthropic"
        badge = "HYBRID REASONING" if ("3.7" in m_id_lower or "thinking" in m_id_lower) else "VISION & CODE"
        badge_color = "#f59e0b"
    elif "openai" in m_id_lower or "gpt" in m_id_lower or "o1" in m_id_lower or "o3" in m_id_lower:
        category = "openai"
        provider = "OpenAI"
        if "astra" in m_id_lower:
            badge = "ASTRA MULTIMODAL"
            badge_color = "#8b5cf6"
        elif "o1" in m_id_lower or "o3" in m_id_lower:
            badge = "DEEP REASONING"
            badge_color = "#10b981"
        elif "4o" in m_id_lower:
            badge = "MULTIMODAL"
            badge_color = "#10b981"
        else:
            badge = "FLAGSHIP"
            badge_color = "#10b981"
    elif "google" in m_id_lower or "gemini" in m_id_lower:
        category = "google"
        provider = "Google"
        badge = "LONG CONTEXT" if context_length >= 1000000 else "MULTIMODAL"
        badge_color = "#3b82f6"
    elif "deepseek" in m_id_lower:
        category = "deepseek"
        provider = "DeepSeek"
        badge = "REASONING" if "r1" in m_id_lower else "MOE ARCHITECTURE"
        badge_color = "#6366f1"
    elif "meta" in m_id_lower or "llama" in m_id_lower:
        category = "meta"
        provider = "Meta"
        badge = "OPEN WEIGHTS"
        badge_color = "#ec4899"
    elif any(k in m_id_lower for k in ["mistral", "mixtral", "pixtral", "codestral"]):
        category = "mistral"
        provider = "Mistral AI"
        badge = "HIGH EFFICIENCY"
        badge_color = "#f97316"
    elif "qwen" in m_id_lower:
        category = "qwen"
        provider = "Qwen"
        badge = "CODE & MATH"
        badge_color = "#a855f7"
    elif any(k in m_id_lower for k in ["nous", "hermes", "dolphin", "wizard", "openchat", "phind"]):
        category = "opensource"
        provider = "Open Source"
        badge = "COMMUNITY"
        badge_color = "#14b8a6"
    else:
        category = "other"
        provider = name.split(":")[0].strip() if ":" in name else "Partner"
        badge = "AVAILABLE"
        badge_color = "#64748b"

    # Clean label format
    clean_label = name
    if ":" in clean_label:
        clean_label = clean_label.split(":", 1)[1].strip()

    ctx_str = f"{context_length // 1000}k" if context_length else "128k"
    if context_length >= 1000000:
        ctx_str = f"{context_length // 1000000}M"

    return {
        "id": model_id,
        "label": clean_label,
        "sub": provider,
        "provider": provider,
        "category": category,
        "badge": badge,
        "badgeColor": badge_color,
        "context": ctx_str,
        "description": desc or f"{provider} {clean_label} via OpenRouter API.",
        "multimodal": is_multimodal,
    }


def get_all_openrouter_models(force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Retrieve all models from OpenRouter, with in-memory caching and fallback."""
    global _CACHED_MODELS, _LAST_FETCH_TIME

    now = time.time()
    if _CACHED_MODELS and not force_refresh and (now - _LAST_FETCH_TIME < _CACHE_TTL_SECONDS):
        return _CACHED_MODELS

    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={"User-Agent": "Antimatter-EDA/1.0", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            raw_data = json.loads(response.read().decode("utf-8"))
            data_list = raw_data.get("data", [])

            enriched = [_categorize_and_enrich_model(m) for m in data_list]

            # Ensure openrouter/auto is at the very top
            has_auto = any(m["id"] == "openrouter/auto" for m in enriched)
            if not has_auto:
                enriched.insert(0, {
                    "id": "openrouter/auto",
                    "label": "Auto (Recommended)",
                    "sub": "Smart Router",
                    "provider": "OpenRouter",
                    "category": "auto",
                    "badge": "SMART ROUTING",
                    "badgeColor": "#00e5ff",
                    "context": "200k+",
                    "description": "Dynamically routes to the best model based on prompt complexity, image attachments, and reasoning depth.",
                    "multimodal": True,
                })

            _CACHED_MODELS = enriched
            _LAST_FETCH_TIME = now
            logger.info("✅ [OpenRouter Catalog] Loaded %d foundation models.", len(_CACHED_MODELS))
            return _CACHED_MODELS
    except Exception as exc:
        logger.warning("⚠️  [OpenRouter Catalog] Could not fetch live models: %s. Using fallback catalog.", exc)
        if _CACHED_MODELS:
            return _CACHED_MODELS
        return _get_fallback_catalog()


def _get_fallback_catalog() -> List[Dict[str, Any]]:
    return [
        {
            "id": "openrouter/auto",
            "label": "Auto (Recommended)",
            "sub": "Smart Router",
            "provider": "OpenRouter",
            "category": "auto",
            "badge": "SMART ROUTING",
            "badgeColor": "#00e5ff",
            "context": "200k+",
            "description": "Dynamically routes to the best model based on prompt complexity, image attachments, and reasoning depth.",
            "multimodal": True,
        },
        {
            "id": "openai/gpt-astra-latest",
            "label": "GPT Astra Latest",
            "sub": "OpenAI",
            "provider": "OpenAI",
            "category": "openai",
            "badge": "ASTRA MULTIMODAL",
            "badgeColor": "#8b5cf6",
            "context": "128k",
            "description": "Next-generation multimodal reasoning engine by OpenAI.",
            "multimodal": True,
        },
        {
            "id": "anthropic/claude-3.7-sonnet",
            "label": "Claude 3.7 Sonnet",
            "sub": "Anthropic",
            "provider": "Anthropic",
            "category": "anthropic",
            "badge": "HYBRID REASONING",
            "badgeColor": "#f59e0b",
            "context": "200k",
            "description": "Industry standard for complex hardware architecture, schematics, netlists, and DRC resolution.",
            "multimodal": True,
        },
        {
            "id": "anthropic/claude-3.5-sonnet",
            "label": "Claude 3.5 Sonnet",
            "sub": "Anthropic",
            "provider": "Anthropic",
            "category": "anthropic",
            "badge": "VISION & CODE",
            "badgeColor": "#3b82f6",
            "context": "200k",
            "description": "High-speed, benchmark-leading electrical engineering, pinout synthesis, and schematic analysis.",
            "multimodal": True,
        },
        {
            "id": "openai/gpt-4o",
            "label": "GPT-4o",
            "sub": "OpenAI",
            "provider": "OpenAI",
            "category": "openai",
            "badge": "MULTIMODAL",
            "badgeColor": "#10b981",
            "context": "128k",
            "description": "State-of-the-art multimodal vision for reading hand sketches, datasheet diagrams, and pinouts.",
            "multimodal": True,
        },
        {
            "id": "openai/o3-mini",
            "label": "o3-mini (High Reasoning)",
            "sub": "OpenAI",
            "provider": "OpenAI",
            "category": "openai",
            "badge": "DEEP REASONING",
            "badgeColor": "#10b981",
            "context": "200k",
            "description": "Specialized reasoning model for formal electrical verification, impedance matching, and math.",
            "multimodal": False,
        },
        {
            "id": "deepseek/deepseek-r1",
            "label": "DeepSeek R1",
            "sub": "DeepSeek",
            "provider": "DeepSeek",
            "category": "deepseek",
            "badge": "REASONING",
            "badgeColor": "#6366f1",
            "context": "128k",
            "description": "Open reasoning flagship with transparent step-by-step circuit topology formulation.",
            "multimodal": False,
        },
        {
            "id": "deepseek/deepseek-chat",
            "label": "DeepSeek V3",
            "sub": "DeepSeek",
            "provider": "DeepSeek",
            "category": "deepseek",
            "badge": "MOE ARCHITECTURE",
            "badgeColor": "#6366f1",
            "context": "128k",
            "description": "Ultra-fast, cost-efficient 671B parameter Mixture of Experts architecture.",
            "multimodal": False,
        },
        {
            "id": "google/gemini-2.5-pro",
            "label": "Gemini 2.5 Pro",
            "sub": "Google",
            "provider": "Google",
            "category": "google",
            "badge": "1M CONTEXT",
            "badgeColor": "#3b82f6",
            "context": "1M",
            "description": "Massive context window capable of ingesting entire 500-page chip reference manuals.",
            "multimodal": True,
        },
        {
            "id": "google/gemini-2.5-flash",
            "label": "Gemini 2.5 Flash",
            "sub": "Google",
            "provider": "Google",
            "category": "google",
            "badge": "SUB-SECOND",
            "badgeColor": "#3b82f6",
            "context": "1M",
            "description": "Sub-second responsiveness for real-time iterative component placement and net connections.",
            "multimodal": True,
        },
        {
            "id": "meta-llama/llama-3.3-70b-instruct",
            "label": "Llama 3.3 70B",
            "sub": "Meta",
            "provider": "Meta",
            "category": "meta",
            "badge": "OPEN WEIGHTS",
            "badgeColor": "#ec4899",
            "context": "128k",
            "description": "Top-tier open-weight instruction model with strong hardware code synthesis.",
            "multimodal": False,
        },
        {
            "id": "qwen/qwen-2.5-coder-32b-instruct",
            "label": "Qwen 2.5 Coder 32B",
            "sub": "Qwen",
            "provider": "Qwen",
            "category": "qwen",
            "badge": "CODE & MATH",
            "badgeColor": "#a855f7",
            "context": "128k",
            "description": "Optimized for KiCad S-expression synthesis, SPICE netlists, and Python DRC scripting.",
            "multimodal": False,
        },
    ]
