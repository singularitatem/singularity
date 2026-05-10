.PHONY: backend frontend dev install test requirements-lock

install:
	python3 -m pip install -r backend/requirements.in
	cd frontend && npm install

backend:
	python3 -m uvicorn backend.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

test:
	python3 -m pytest -v

requirements-lock:
	python3 -m piptools compile backend/requirements.in -o backend/requirements_lock.txt
