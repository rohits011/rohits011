# Faceless Video Pipeline

An automated YouTube video production pipeline: topic in, reviewed private
upload out. Built as a learning scaffold for AI-automation engineering — the
design decisions come straight from the research in `../reports/`.

```
topic ──> script ──> [HUMAN REVIEW GATE] ──> voiceover ──> assets ──> render ──> thumbnail ──> upload (private)
           LLM            you edit             TTS API      Pexels     ffmpeg      Pillow      YouTube API
          3-pass        & approve
```

## Design principles (and why)

1. **Checkpoint everything.** Each video lives in `videos/<slug>/` with a
   `manifest.json` recording per-stage status. A render failure never re-bills
   the LLM or TTS calls that already succeeded — resume picks up exactly where
   it stopped. This is the pattern Temporal formalizes, implemented by hand.
2. **Human editorial gate.** The pipeline *stops* after the script stage until
   you review, edit, and `approve`. Every documented channel termination in the
   research automated the editorial layer (topic choice, script thesis,
   fact-checking) — this gate is the line between "AI-assisted" and the
   mass-produced output YouTube's inauthentic-content policy demonetizes.
3. **Providers behind interfaces.** TTS and visuals are swappable classes;
   OpenAI killed its entire Sora video API in 2026, so a vendor shutdown here
   is a config change, not a rewrite.
4. **Private-first upload.** Uploads land as `private` for review in YouTube
   Studio. Also pragmatic: unverified YouTube API projects can *only* upload
   private videos, and each upload costs 1,600 of your 10,000 daily quota units.

## Quick start

```bash
cd pipeline
pip install -r requirements.txt

# Free end-to-end test — no API keys, stub script, silent audio, test-pattern video:
python run.py new "How container shipping ate the world" --dry-run --yes

# Real run:
cp .env.example .env   # fill in ANTHROPIC_API_KEY, OPENAI_API_KEY (or ElevenLabs), PEXELS_API_KEY
python run.py new "How container shipping ate the world"
#   -> writes videos/<slug>/script.md + script.json, then stops for review
#   -> edit script.json (this file is authoritative)
python run.py approve <slug>
python run.py resume <slug>
#   -> voiceover -> assets -> render -> thumbnail -> upload (private)
```

Other commands: `status <slug>`, `list`, `resume <slug> --from render`
(re-run from a stage), `--until render` (stop before upload).

Requires `ffmpeg`/`ffprobe` on PATH.

## Cost per video (research estimates, 8-min video)

| Stage | Budget | Quality |
|---|---|---|
| Script (Claude, 3 passes) | ~$0.10–0.50 | same |
| TTS | OpenAI ~$0.12 | ElevenLabs ~$0.50–0.90 |
| Footage | Pexels: free | + AI images/b-roll $1–7 |
| Render / thumbnail | free (local ffmpeg) | free |
| **Total** | **< $1** | **~$2–9** |

## YouTube upload setup (one-time)

1. Create a project at console.cloud.google.com, enable **YouTube Data API v3**.
2. Create OAuth credentials (type: Desktop app), download JSON to
   `pipeline/secrets/client_secret.json`.
3. First upload opens a browser sign-in; the token is cached in `secrets/`.

Quota gotchas (from the research): 6 uploads/day on the default quota;
unverified projects upload private-only until passing Google's compliance
audit; custom thumbnails need a phone-verified channel.

## Extension roadmap (in rough order of value)

- [ ] **Burned-in captions** — transcribe with Whisper (`$0.006/min` API or
      local `faster-whisper`), style as ASS subtitles, add `subtitles=` to the
      render filter chain. Big retention win.
- [ ] **Background music bed** — a `-20dB` music track under the narration
      (YouTube Audio Library is free and claim-safe); one extra ffmpeg input.
- [ ] **AI images for abstract scenes** — a Flux provider in
      `providers/visuals.py` (via fal.ai, ~$0.003–0.04/image) for concepts
      stock footage can't show. Keep Pexels as the default.
- [ ] **n8n trigger wrapper** — wrap `run.py` stages as webhook-called steps:
      a Google Sheet of topics triggers `new`, a Slack approval button calls
      `approve`. This is the orchestration-tool learning exercise.
- [ ] **Analytics feedback loop** — pull per-video retention via the YouTube
      Analytics API and feed hook performance back into the outline prompt.
      (Notably: no real build found in the research does this. Differentiator.)
- [ ] **Evals for script quality** — score scripts against a rubric (concrete
      claims per 100 words, banned-phrase count) before the human gate, so the
      gate gets faster over time.

## Repo layout

```
run.py                 CLI + orchestrator (stage loop, resume, review gate)
config.yaml            channel voice, video specs, provider choices
core/state.py          manifest/checkpoint logic
core/config.py         config + env loading
stages/                script, voiceover, assets, render, thumbnail, upload
providers/             llm (Claude), tts (OpenAI/ElevenLabs), visuals (Pexels)
videos/                generated projects (gitignored)
```
