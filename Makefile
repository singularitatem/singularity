.PHONY: backend frontend dev install test test-integration load-test load-test-server load-test-ui requirements-lock

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
	cd frontend && npm test

test-integration:
	python3 -m pytest backend/app_test.py -v

PROVIDER ?= echo

load-test-server:
	PROVIDER=$(PROVIDER) CHAT_RATE_LIMIT=100/second python3 -m uvicorn backend.main:app --port 8000

load-test:
	python3 -m locust -f backend/locustfile.py --headless -u 100 -r 20 --run-time 30s --host http://localhost:8000 --exit-code-on-error 0

load-test-ui:
	python3 -m locust -f backend/locustfile.py --host http://localhost:8000

requirements-lock:
	python3 -m piptools compile backend/requirements.in -o backend/requirements_lock.txt
