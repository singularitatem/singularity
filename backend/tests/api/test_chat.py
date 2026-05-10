def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_sets_request_id(client):
    response = client.get("/health")
    assert "x-request-id" in response.headers


def test_chat_success(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "user", "content": "hello"}], "model": "default"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert "hello" in data["content"]


def test_chat_missing_messages(client):
    response = client.post("/api/v1/chat", json={"model": "default"})
    assert response.status_code == 422


def test_chat_empty_messages(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [], "model": "default"},
    )
    assert response.status_code == 200


def test_websocket_stream(client):
    with client.websocket_connect("/api/v1/chat/stream") as ws:
        ws.send_json({"messages": [{"role": "user", "content": "ping"}], "model": "default"})
        chunks = []
        while True:
            data = ws.receive_json()
            if data["done"]:
                break
            chunks.append(data["delta"])
    assert len(chunks) > 0
    assert "ping" in "".join(chunks)
