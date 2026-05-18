from datetime import datetime, timezone

_CONV_PAYLOAD = {
    "id": "conv-abc",
    "title": "Test conversation",
    "character_id": "einstein",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}


def test_create_and_list_conversation(client):
    r = client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    assert r.status_code == 201
    data = r.json()
    assert data["id"] == "conv-abc"
    assert data["title"] == "Test conversation"
    assert data["messages"] == []

    r = client.get("/api/v1/conversations")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["id"] == "conv-abc"
    assert items[0]["message_count"] == 0


def test_create_idempotent(client):
    client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    r = client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["id"] == "conv-abc"

    r = client.get("/api/v1/conversations")
    assert len(r.json()) == 1


def test_get_conversation(client):
    client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    r = client.get("/api/v1/conversations/conv-abc")
    assert r.status_code == 200
    assert r.json()["id"] == "conv-abc"


def test_get_conversation_not_found(client):
    r = client.get("/api/v1/conversations/nonexistent")
    assert r.status_code == 404


def test_update_conversation_title(client):
    client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    r = client.patch("/api/v1/conversations/conv-abc", json={"title": "Updated title"})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated title"


def test_delete_conversation(client):
    client.post("/api/v1/conversations", json=_CONV_PAYLOAD)
    r = client.delete("/api/v1/conversations/conv-abc")
    assert r.status_code == 204

    r = client.get("/api/v1/conversations")
    assert r.json() == []


def test_delete_conversation_not_found(client):
    r = client.delete("/api/v1/conversations/nonexistent")
    assert r.status_code == 404


def test_chat_persists_turn_when_conversation_id_given(client):
    client.post("/api/v1/conversations", json=_CONV_PAYLOAD)

    client.post(
        "/api/v1/chat",
        json={
            "messages": [{"role": "user", "content": "hello"}, {"role": "assistant", "content": ""}],
            "model": "default",
            "conversation_id": "conv-abc",
            "character_id": "einstein",
        },
    )

    r = client.get("/api/v1/conversations/conv-abc")
    msgs = r.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "hello"
    assert msgs[1]["role"] == "assistant"
    assert "hello" in msgs[1]["content"]  # echo backend echoes the input


def test_chat_without_conversation_id_does_not_persist(client):
    client.post(
        "/api/v1/chat",
        json={
            "messages": [{"role": "user", "content": "hello"}],
            "model": "default",
        },
    )
    r = client.get("/api/v1/conversations")
    assert r.json() == []
