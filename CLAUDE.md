# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Singularity is a full-stack local AI chat app. The backend is FastAPI (Python) and the frontend is React. Frontend and backend communicate over plain JSON — REST for characters/one-shot chat, WebSocket for streaming responses. The inference layer is abstracted so any provider can be swapped in.

## Running locally

```bash
make install   # one-time: pip install + npm install
make dev       # backend :8000 + frontend :5173 in parallel
```

Or separately:
```bash
python3 -m uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

## Architecture

**Backend (`backend/`)** — FastAPI app:
- `main.py` — app factory, CORS, lifespan (creates `ChatService`, closes inference client)
- `api/routes/chat.py` — `GET /api/v1/characters`, `POST /api/v1/chat`, WebSocket `/api/v1/chat/stream`
- `api/schemas/chat.py` — Pydantic request/response DTOs; `ChatRequestDTO.to_domain()` maps to internal dataclass
- `inference/interface.py` — abstract `InferenceBackend` with `chat()` and `stream_chat()`
- `inference/chai_backend.py` — Chai API (default); system prompts injected as first Bot message in chat history
- `inference/echo.py` — noop dev backend (no API key needed)
- `inference/factory.py` — selects backend from `Settings.provider`
- `core/settings.py` — pydantic-settings config; reads `.env`; defines built-in `Character` list

**Frontend (`frontend/src/`)** — React + Vite + TypeScript, CSS modules, dark theme:
- `App.tsx` — root controller; wires all hooks together
- `types.ts` — shared TypeScript interfaces (`Message`, `Character`, `Conversation`, `StreamChunk`)
- `model/useChatModel.ts` — WebSocket streaming, conversation state, localStorage persistence
- `model/useCharacterStore.ts` — character CRUD; builtins fetched from API, custom stored in localStorage
- `model/useSpeech.ts` — Web Speech API wrapper; per-character voice profiles (pitch/rate/voice)
- `view/` — pure view components (`ChatWindow`, `MessageBubble`, `Sidebar`, `InputBar`, `CharacterModal`, `CharacterPicker`)

**Adding a new inference backend**: implement `InferenceBackend` in `backend/inference/`, register it in `factory.py`, set `PROVIDER=<key>` in `.env`.
