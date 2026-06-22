Haan bhai, ek file zaroor honi chahiye.

Naam rakho:

```txt
ENGINE_SETUP.md
```

Ye future me yaad dilayegi ki ye repo kis philosophy pe bana tha.

Repo root me ye file add kar:

# REEL-API-ENGINE SETUP

## PURPOSE

This repository is the master video generation engine.

Input:

Script

Output:

MP4 Video

---

## CORE RULE

This repository is the SINGLE SOURCE OF TRUTH for:

* Image Generation
* Audio Generation
* Video Rendering
* Motion Effects
* Subtitles
* Background Music
* Quality Improvements

Future projects must NOT reimplement this logic.

Improvements should be made here first.

Then updated files/folders can be copied into other projects.

---

## CURRENT STACK

Image:

* Pollinations

Audio:

* Edge-TTS

Video:

* FFmpeg

---

## FUTURE PROVIDER POLICY

Free providers remain permanent fallback providers.

Default Fallbacks:

Image:

* Pollinations

Audio:

* Edge-TTS

Future providers may be added:

Images:

* Gemini Imagen
* Cloudflare
* Flux
* Other Providers

Audio:

* ElevenLabs
* Gemini TTS
* OpenAI TTS

Provider order:

Primary Provider
↓
Secondary Provider
↓
Fallback Provider
↓
Pollinations / Edge-TTS

Never remove fallback support.

---

## REPOSITORY STATUS

Current Version:

v1.0

Status:

Stable
Working
Frozen

---

## FUTURE IMPROVEMENTS

Allowed:

* Prompt Intelligence
* Story Intelligence
* Motion Improvements
* Subtitle Improvements
* Audio Improvements
* Background Music
* Sound Effects
* Thumbnail Generation
* Quality Scoring
* Scene Intelligence
* Image Continuity
* Character Consistency

Not Allowed:

* Hardcoded Paid Providers
* Workflow-Specific Logic
* Project-Specific Business Rules

---

## ARCHITECTURE PRINCIPLE

# One Capability

One Engine

Examples:

research-engine
script-engine
reel-engine
publisher-engine

Main workflow should orchestrate engines.

Engines should remain independent and reusable.

---

## FUTURE USAGE

Recommended:

Content Factory
↓
Research Engine
↓
Script Engine
↓
Reel Engine
↓
Publisher Engine

Reel Engine should be reusable across all projects.

---

## IMPORTANT

Before modifying:

Ask:

"Will this improvement help every future project?"

If answer is YES:
Implement here.

If answer is NO:
Implement inside the project, not inside reel-engine.

---

END OF DOCUMENT

Phir terminal me:

```bash
cat > ENGINE_SETUP.md <<'EOF'
# (paste content)
EOF

git add ENGINE_SETUP.md
git commit -m "Add reel engine setup guide"
git push
```

Ye file future wale Praveen ko bahut kaam aayegi jab 3–4 engines ho jayenge. 🚀
