# Singularity

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/frontend-React-61dafb?logo=react&logoColor=black">
  <a href="https://github.com/singularitatem/singularity/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/singularitatem/singularity.svg?color=blue">
  </a>
</p>

A local AI chat studio. Talk to richly-configured AI characters over a streaming WebSocket connection — all running on your machine.

## Features

- **Streaming chat** — responses stream word-by-word via WebSocket
- **Character system** — choose from built-in characters (Einstein, Socrates, Ada Lovelace, Tesla) or create your own with a custom name, emoji, description, and system prompt
- **Markdown rendering** — assistant responses render full GFM markdown: headers, lists, code blocks, tables, blockquotes
- **Voice** — read any message aloud with one click; voice pitch and rate are tuned per character using the browser's Web Speech API
- **Conversation library** — multiple parallel conversations, persisted in `localStorage`, with per-conversation character binding
- **Pluggable inference** — swap the backend AI provider by implementing a single abstract interface (`InferenceBackend`)

## Quick start

```bash
make install   # one-time: pip install + npm install
make dev       # starts backend :8000 and frontend :5173 in parallel
```

Then open [http://localhost:5173](http://localhost:5173).

You can also run each process separately:

```bash
python3 -m uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

## Configuration

Copy `.env.example` to `.env` (or set environment variables directly):

| Variable | Default | Description |
|---|---|---|
| `PROVIDER` | `chai` | Inference backend (`chai` or `echo`) |
| `CHAI_API_KEY` | — | API key for the Chai inference service |
| `CHAI_USER_NAME` | `User` | Display name sent to Chai as the human turn |

Set `PROVIDER=echo` to run fully offline with a dev echo backend (no API key needed).

## Architecture

```
backend/
  api/routes/chat.py         ← REST GET /api/v1/characters, POST /api/v1/chat
                                  WebSocket /api/v1/chat/stream (JSON chunks)
  inference/
    interface.py             ← abstract InferenceBackend
    chai_backend.py          ← Chai API (default)
    echo.py                  ← no-op dev backend (no key needed)
  services/chat.py           ← ChatService
  core/settings.py           ← pydantic-settings config + built-in character list
frontend/src/
  model/useChatModel.ts      ← WebSocket streaming, conversation state
  model/useCharacterStore.ts ← character CRUD (builtins from API + custom in localStorage)
  model/useSpeech.ts         ← Web Speech API with per-character voice profiles
  view/                      ← React view components (CSS modules, dark theme)
```

**Adding a new inference backend:** implement `InferenceBackend` in `backend/inference/`, then set `PROVIDER=<your_key>` in `.env` and register it in `backend/inference/factory.py`.

## Development

```bash
make test      # run backend tests (pytest)
```
