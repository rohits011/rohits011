"""Claude API wrapper for script generation.

Uses the official Anthropic SDK. Server-side refusal fallbacks are enabled by
default so a safety-classifier decline is retried on a fallback model inside
the same call instead of failing the stage.
"""

import json
import re


class LLM:
    def __init__(self, model: str, effort: str = "high"):
        self.model = model
        self.effort = effort
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                import anthropic
            except ImportError:
                raise RuntimeError(
                    "The 'anthropic' package is required for script generation: "
                    "pip install -r pipeline/requirements.txt "
                    "(or run with --dry-run to test the pipeline without it)."
                )
            # Resolves ANTHROPIC_API_KEY / auth profile from the environment.
            self._client = anthropic.Anthropic()
        return self._client

    def generate(self, system: str, prompt: str, max_tokens: int = 16000) -> str:
        response = self.client.beta.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": self.effort},
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        if response.stop_reason == "refusal":
            detail = ""
            if response.stop_details:
                detail = f" ({response.stop_details.category}: {response.stop_details.explanation})"
            raise RuntimeError(f"Model declined the request{detail}. Adjust the topic or prompt.")
        if response.stop_reason == "max_tokens":
            raise RuntimeError("Response was truncated at max_tokens; raise max_tokens and retry.")
        return "".join(block.text for block in response.content if block.type == "text")

    def generate_json(self, system: str, prompt: str, max_tokens: int = 16000):
        text = self.generate(system, prompt + "\n\nRespond with JSON only.", max_tokens)
        return extract_json(text)


class DryRunLLM:
    """Offline stand-in used by --dry-run so the pipeline runs with no API keys."""

    def __init__(self, topic: str):
        self.topic = topic

    def generate(self, system: str, prompt: str, max_tokens: int = 16000) -> str:
        return json.dumps(self.generate_json(system, prompt, max_tokens))

    def generate_json(self, system: str, prompt: str, max_tokens: int = 16000):
        scenes = [
            {
                "id": i + 1,
                "text": f"[Dry-run scene {i + 1}] Placeholder narration about {self.topic}. "
                        "Replace this by running without --dry-run.",
                "broll_keywords": kw,
            }
            for i, kw in enumerate(["city skyline", "office work", "technology", "sunset ocean"])
        ]
        return {
            "title": f"{self.topic} (dry run)",
            "hook": f"Here's the surprising story behind {self.topic}.",
            "description": "Dry-run placeholder description.",
            "tags": ["dry-run"],
            "scenes": scenes,
        }


def extract_json(text: str):
    """Parse model output as JSON, tolerating code fences and surrounding prose."""
    text = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", text.strip())
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start_candidates = [i for i in (text.find("{"), text.find("[")) if i != -1]
    if not start_candidates:
        raise ValueError(f"No JSON found in model output:\n{text[:500]}")
    start = min(start_candidates)
    end = max(text.rfind("}"), text.rfind("]"))
    return json.loads(text[start:end + 1])
