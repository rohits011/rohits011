"""Stage 1: research + script via a multi-pass LLM workflow.

Three passes (outline -> draft -> critique/revise) instead of one "write me a
script" call: the single-shot approach is what produces generic AI-slop
scripts. The output still goes through a human review gate before any money
is spent on TTS -- editorial judgment stays with you.
"""

import json

from providers.llm import LLM, DryRunLLM

SYSTEM = """You are a script writer for a faceless YouTube channel.
Niche: {niche}
Tone: {tone}
Audience: {audience}

Rules that keep scripts out of the "inauthentic content" bucket:
- Every claim must be concrete and specific (names, numbers, dates), never vague filler.
- No stock YouTube phrases ("without further ado", "smash that like button", "in today's video").
- Vary sentence rhythm; write for the ear, not the page.
- Structure each video around one thesis with narrative tension (conflict, decision, consequence),
  not a list of facts."""

OUTLINE_PROMPT = """Topic: {topic}

Produce an outline for a ~{minutes}-minute video (~{words} words of narration) as JSON:
{{
  "title": "best title, <= 70 chars, curiosity-driven but accurate",
  "hooks": ["3 alternative opening hooks, each 1-2 sentences"],
  "thesis": "the single argument this video makes",
  "sections": [{{"heading": "...", "key_points": ["..."], "open_question": "what pulls the viewer to the next section"}}]
}}
Aim for 4-7 sections."""

DRAFT_PROMPT = """Here is the approved outline:

{outline}

Write the full narration script as JSON:
{{
  "title": "...",
  "hook": "the single best hook, written out in full",
  "description": "YouTube description, 2-3 sentences + a one-line disclosure that visuals are stock footage with AI-assisted narration",
  "tags": ["8-12 search tags"],
  "scenes": [{{"id": 1, "text": "narration for this scene (40-90 words)", "broll_keywords": "2-4 words for stock footage search"}}]
}}
Target ~{words} words of narration total across all scenes. The hook is scene 1."""

CRITIQUE_PROMPT = """Here is a draft script:

{draft}

Critique it adversarially: flag every generic phrase, unsupported claim, repetitive
transition, or passage that sounds machine-written. Then return the REVISED script,
fixing everything you flagged, in exactly the same JSON shape as the draft.
Return only the revised JSON."""


def run(ctx):
    cfg, manifest = ctx["config"], ctx["manifest"]
    minutes = cfg.get("video.target_minutes", 8)
    words = int(minutes * cfg.get("video.words_per_minute", 150))

    if manifest.dry_run:
        llm = DryRunLLM(manifest.topic)
        script = llm.generate_json("", "")
    else:
        llm = LLM(model=cfg.get("llm.model", "claude-opus-5-5"),
                  effort=cfg.get("llm.effort", "high"))
        system = SYSTEM.format(
            niche=cfg.get("channel.niche", "general"),
            tone=cfg.get("channel.tone", "clear and concrete"),
            audience=cfg.get("channel.audience", "curious adults"),
        )
        print("  pass 1/3: outline...")
        outline = llm.generate_json(system, OUTLINE_PROMPT.format(
            topic=manifest.topic, minutes=minutes, words=words))
        print("  pass 2/3: full draft...")
        draft = llm.generate_json(system, DRAFT_PROMPT.format(
            outline=json.dumps(outline, indent=2), words=words))
        print("  pass 3/3: critique & revise...")
        script = llm.generate_json(system, CRITIQUE_PROMPT.format(
            draft=json.dumps(draft, indent=2)))

    _validate(script)

    script_path = ctx["project_dir"] / "script.json"
    with open(script_path, "w") as f:
        json.dump(script, f, indent=2)
    _write_readable(ctx["project_dir"] / "script.md", script)

    manifest.data["meta"] = {
        "title": script.get("title", manifest.topic),
        "description": script.get("description", ""),
        "tags": script.get("tags", []),
    }
    return {"script_file": "script.json", "scene_count": len(script["scenes"]),
            "approved": manifest.dry_run}  # dry runs auto-approve


def load_script(ctx) -> dict:
    with open(ctx["project_dir"] / "script.json") as f:
        return json.load(f)


def _validate(script: dict):
    scenes = script.get("scenes")
    if not scenes or not isinstance(scenes, list):
        raise RuntimeError("Script JSON has no 'scenes' list.")
    for scene in scenes:
        if not scene.get("text") or not scene.get("broll_keywords"):
            raise RuntimeError(f"Scene {scene.get('id')} is missing 'text' or 'broll_keywords'.")


def _write_readable(path, script: dict):
    lines = [f"# {script.get('title', '')}", "",
             f"**Hook:** {script.get('hook', '')}", "",
             script.get("description", ""), ""]
    for scene in script["scenes"]:
        lines += [f"## Scene {scene['id']}  _(b-roll: {scene['broll_keywords']})_",
                  "", scene["text"], ""]
    path.write_text("\n".join(lines))
