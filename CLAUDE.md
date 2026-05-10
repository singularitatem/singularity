# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Singularity is a full-stack local chat app. The data contract is defined in proto, the backend is FastAPI (Python), and the frontend is React. The AI inference layer is abstracted behind an interface so any provider (Anthropic, OpenAI, local model) can be swapped in.

## Running locally (without Bazel)

```bash
# Backend
pip install -r backend/requirements.in
uvicorn backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev   # opens http://localhost:5173

# Or both together
make dev
```

## Bazel (MODULE.bazel / Bzlmod)

```bash
# Python backend
bazel run //backend:server

# Frontend production build (requires pnpm-lock.yaml — run `cd frontend && pnpm install` first)
bazel build //frontend:build

# Proto targets
bazel build //proto:chat_proto

# Tests
bazel test //...
```

To regenerate `backend/requirements_lock.txt` after changing `requirements.in`:
```bash
make requirements-lock   # uses pip-compile
```

To regenerate Python/gRPC stubs from proto:
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
