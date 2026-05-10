# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Singularity is a full-stack local chat app. The data contract is defined in proto, the backend is FastAPI (Python), and the frontend is React. The AI inference layer is abstracted behind an interface so any provider (Anthropic, OpenAI, local model) can be swapped in.

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

To regenerate Python/gRPC stubs from `proto/chat.proto`:
```bash
make proto   # outputs to backend/generated/
```

## Architecture

**Proto (`proto/chat.proto`)** is the source of truth for message shapes: `Message`, `ChatRequest`, `ChatResponse`, `StreamChunk`, and the `ChatService` gRPC service. Python stubs live in `backend/generated/` (gitignored, generated via `make proto`). TypeScript types in `frontend/src/types.ts` are hand-maintained mirrors of the same shapes.

**Backend (`backend/`)** — FastAPI app:
- `main.py` — mounts CORS middleware and the chat router
- `api/chat.py` — REST `POST /api/v1/chat` and WebSocket `ws /api/v1/chat/stream`
- `inference/interface.py` — abstract `InferenceBackend` with `chat()` and `stream_chat()` methods
- `inference/echo.py` — noop `EchoBackend` for local dev; swap in a real backend by replacing `_backend` in `api/chat.py`

**Frontend (`frontend/`)** — React + Vite + TypeScript:
- `src/App.tsx` — single-page chat UI; streams responses over WebSocket
- `src/types.ts` — TypeScript types mirroring the proto shapes
- Vite dev server proxies `/api` → `http://localhost:8000`

**Adding a real inference backend**: implement `InferenceBackend` in a new file under `backend/inference/`, then replace `_backend = EchoBackend()` in `backend/api/chat.py`.
