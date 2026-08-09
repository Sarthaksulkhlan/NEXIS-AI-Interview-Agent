"""
LLM client abstraction: handles OpenAI-compatible endpoints and Anthropic Claude.
Features retry logic, JSON extraction, timeouts, and safe error handling.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx
from ..config import settings

logger = logging.getLogger(__name__)


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Robustly extracts a JSON object from text that may contain markdown fences or surrounding chatter.
    """
    cleaned = text.strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Look for ```json ... ``` blocks
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", cleaned, re.IGNORECASE)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Look for bare { ... }
    brace_match = re.search(r"(\{[\s\S]*\})", cleaned)
    if brace_match:
        try:
            return json.loads(brace_match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM response: {text[:200]}...")


class LLMClient:
    """
    HTTP-based LLM client for production inference.
    Supports OpenAI-compatible APIs (OpenAI, Groq, Ollama, Together) and Anthropic Claude.
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.api_key = settings.LLM_API_KEY or settings.ANTHROPIC_API_KEY
        self.base_url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL
        self.timeout = settings.LLM_TIMEOUT_SECONDS
        self.max_retries = settings.LLM_MAX_RETRIES

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> str:
        """
        Sends prompt to LLM and returns raw generated text string.
        """
        if not self.api_key:
            raise RuntimeError(
                "Real LLM provider is not configured. Set LLM_API_KEY (or ANTHROPIC_API_KEY) "
                "in the backend environment."
            )
        if self.provider == "anthropic" or self.api_key.startswith("sk-ant"):
            return await self._call_anthropic(system_prompt, user_prompt, temperature, max_tokens)
        else:
            return await self._call_openai_compatible(system_prompt, user_prompt, temperature, max_tokens)

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 1200,
    ) -> Dict[str, Any]:
        """
        Generates and extracts structured JSON from the model response.
        """
        json_system = system_prompt + "\n\nCRITICAL: Respond ONLY with valid JSON. Do not include explanation or markdown."
        raw_text = await self.generate_text(
            system_prompt=json_system,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return extract_json_from_text(raw_text)

    async def _call_openai_compatible(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Calls OpenAI-compatible /v1/chat/completions endpoint."""
        url = self.base_url or "https://api.openai.com/v1"
        endpoint = f"{url.rstrip('/')}/chat/completions"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key or ''}",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                last_error = e
                logger.warning(f"OpenAI API attempt {attempt + 1} failed: {e}")

        raise RuntimeError(f"OpenAI API failed after {self.max_retries + 1} attempts: {last_error}")

    async def _call_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Calls Anthropic /v1/messages endpoint."""
        endpoint = "https://api.anthropic.com/v1/messages"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key or "",
            "anthropic-version": "2023-06-01",
        }

        model = settings.ANTHROPIC_MODEL if "claude" in settings.ANTHROPIC_MODEL else "claude-3-5-sonnet-20241022"

        payload = {
            "model": model,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    content_blocks = data.get("content", [])
                    if content_blocks and "text" in content_blocks[0]:
                        return content_blocks[0]["text"].strip()
                    raise ValueError(f"Unexpected Anthropic response structure: {data}")
            except Exception as e:
                last_error = e
                logger.warning(f"Anthropic API attempt {attempt + 1} failed: {e}")

        raise RuntimeError(f"Anthropic API failed after {self.max_retries + 1} attempts: {last_error}")


# Global LLM client
llm_client = LLMClient()
