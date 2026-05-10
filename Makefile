.PHONY: proto backend frontend dev install requirements-lock

PROTO_SRC = proto/chat.proto
PROTO_OUT_PY = backend/generated

proto:
	mkdir -p $(PROTO_OUT_PY)
	python3 -m grpc_tools.protoc \
		-I proto \
		--python_out=$(PROTO_OUT_PY) \
		--grpc_python_out=$(PROTO_OUT_PY) \
		$(PROTO_SRC)

install:
	python3 -m pip install -r backend/requirements.in
	cd frontend && npm install

backend:
	python3 -m uvicorn backend.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

requirements-lock:
	python3 -m piptools compile backend/requirements.in -o backend/requirements_lock.txt
