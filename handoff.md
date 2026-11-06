# Epic Automate Project Handoff — HTHH Bible Hip-Hop Music Automation

## 1. Project Overview & Modus Operandi
- **Automation Name**: HTHH Bible Hip-Hop Music Automation Platform
- **Created**: 2026-11-06T01:33:00+01:00
- **Last Modified**: 2026-11-06T11:24:00+01:00
- **Modus Operandi**: Epic Automate standard (New Firebase + Firestore + Kaggle T4 GPU + Hugging Face Datasets + GitHub)

## 2. Infrastructure & Live Endpoints
- **Firebase Project ID**: `hthh-music-auto-2026`
- **Live Frontend URL**: `https://hthh-music-auto-2026.web.app`
- **Firestore Collections**:
  - `/calendars/{rowId}` — Content Calendar CSV rows (`book`, `chapters` [4 chapters], `status`, `asset_url`, `last_job_id`)
  - `/automations/{jobId}` — Real-time job execution state, progress %, milestone text, live log console, cancellation flag, 8-track metadata, and Hugging Face video URL
  - `/users/{userId}` — Persistent user settings (Master AI System Prompt, per-chapter Suno models, YouTube upload defaults, and encrypted credential vault)
- **Kaggle Kernel**: `https://www.kaggle.com/code/ikechukwuebiringa1/hthh-bible-music-worker` (ID: `ikechukwuebiringa/hthh-bible-music-worker`)
- **Kaggle GPU Tier**: T4 GPU (`nvidiaTeslaT4`, `enable_gpu: true`)
- **Hugging Face Dataset**: `https://huggingface.co/datasets/pearlyoscar/hthh-bible-music-assets`
- **GitHub Repository**: `https://github.com/Airpyk-98/hthh-bible-music-automation`

## 3. Core Functional Pipeline
1. **Content Calendar (CSV & 1-Row-Per-Run Execution)**:
   - Static CSV headers: `book,chapter_1,chapter_2,chapter_3,chapter_4` (see `sample_content_calendar.csv`).
   - If chapters are omitted, 4 random distinct chapters for that Bible book are automatically rolled.
   - Clicking **Run Row** (or **Run Next Pending Row**) executes one row at a time.
2. **Lyrics & Style Generation (Google Gemini API — Free Credit)**:
   - Guided by the user's **Master Producer System Prompt** in Settings.
   - Generates pure Biblical Hip-Hop lyrics for each of the 4 chapters, strictly enforced and calibrated to **4,850 – 4,950 characters** per chapter (`enforce_exact_char_window` in `kaggle_worker/kaggle_executor.py`).
   - Generates custom Suno `style` and `negativeTags` per chapter, plus the 16:9 widescreen image prompt.
3. **Music Generation & 8-Track Master Stitch (KIE.AI Suno Music API)**:
   - Configurable Suno model per chapter column (`Chapter 1 Model`, `Chapter 2 Model`, `Chapter 3 Model`, `Chapter 4 Model` — defaults to `V4_5PLUS` supporting up to 5,000 chars).
   - Collects both audio variations (`Copy A` and `Copy B`) produced by each Suno generation call.
   - Stitches `Ch1_CopyA -> Ch2_CopyA -> Ch3_CopyA -> Ch4_CopyA` followed by `Ch1_CopyB -> Ch2_CopyB -> Ch3_CopyB -> Ch4_CopyB` into an 8-track continuous master audio file (`stitched_8tracks.m4a`).
4. **Background Visual & iPhone Dynamic Beat-Map Video (KIE.AI ChatGPT 2.0 + FFmpeg GPU)**:
   - Generates a 16:9 background image via KIE.AI ChatGPT 2.0 Image (`gpt-image-2-text-to-image` / `gpt-image-2-6/sunburst-text-to-image` / `gpt4o-image`).
   - Renders a 1920x1080 MP4 video with a frosted dark iPhone-style glass overlay in the lower portion of the screen displaying a live multi-band frequency beat-map reacting to the music.
5. **Google Sign-In & Direct YouTube Channel Upload**:
   - Users sign in with Google (`youtube.upload` scope) and can preview the finished video in the embedded HTML5 player or push it directly to their signed-in YouTube channel using customizable default Title, Description, and Tags templates.
6. **Secure Encrypted Payload Vault**:
   - User's KIE.AI API Key, Google Gemini API Key, Kaggle Username/Token, and Hugging Face Token are encrypted via SHA-256 stream cipher before dispatch and wiped from the job document immediately upon read.

## 4. Credentials & Secrets Checklist
| Credential | Status | Configured In | Notes |
|---|---|---|---|
| Firebase Auth | Connected | CLI / `hthh-music-auto-2026` | Google Sign-In & Anonymous Auth enabled |
| Kaggle API | Connected | `~/.kaggle/kaggle.json` & UI Vault | Tested kernel push to `ikechukwuebiringa1/hthh-bible-music-worker` |
| Hugging Face Token | Connected | `HF_TOKEN` & UI Vault | Dataset `pearlyoscar/hthh-bible-music-assets` provisioned |
| GitHub PAT | Connected | `GITHUB_TOKEN` | Synced to `Airpyk-98/hthh-bible-music-automation` |
| KIE.AI & Gemini Keys | UI Input | Web App -> Settings -> Vault | Encrypted per user & job payload |

## 5. Current State & Modifications Completed
- [x] Provisioned isolated Firebase project `hthh-music-auto-2026`.
- [x] Authored & deployed Firestore Security Rules (`firestore.rules`).
- [x] Built & deployed Web App frontend (`public/index.html`, `public/app.js`) to `https://hthh-music-auto-2026.web.app`.
- [x] Built Kaggle T4 GPU worker (`kaggle_worker/kaggle_executor.py`) & pushed to Kaggle.
- [x] Built & started Local Kaggle Kernel Bridge (`kaggle_bridge.py` on `http://127.0.0.1:8765`).
- [x] Provisioned Hugging Face Dataset `pearlyoscar/hthh-bible-music-assets`.
- [x] Synced all codebase files to GitHub (`https://github.com/Airpyk-98/hthh-bible-music-automation`).

## 6. Instructions for Next Agent
- To trigger jobs directly from the web app (`https://hthh-music-auto-2026.web.app`), ensure `python kaggle_bridge.py` is running locally (or run `kaggle kernels push -p kaggle_worker`).
- To modify the video visualizer or KIE.AI endpoints, edit `kaggle_worker/kaggle_executor.py` and re-push via `kaggle kernels push -p kaggle_worker`.
- Always update this `handoff.md` file after any architectural or code changes.
