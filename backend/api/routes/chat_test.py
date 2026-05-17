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


