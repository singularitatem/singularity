# ── Open mode (no auth configured) ───────────────────────────────────────────

def test_chat_success(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "user", "content": "hello"}], "model": "default"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert "hello" in data["content"]


def test_chat_includes_usage(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "user", "content": "hello"}], "model": "default"},
    )
    usage = response.json()["usage"]
    assert usage["prompt_tokens"] >= 0
    assert usage["completion_tokens"] >= 0
    assert usage["total_tokens"] == usage["prompt_tokens"] + usage["completion_tokens"]
    assert usage["estimated"] is True


def test_chat_invalid_role_rejected(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "robot", "content": "hi"}], "model": "default"},
    )
    assert response.status_code == 422


def test_chat_missing_messages_rejected(client):
    response = client.post("/api/v1/chat", json={"model": "default"})
    assert response.status_code == 422


def test_chat_empty_messages_ok(client):
    response = client.post(
        "/api/v1/chat",
        json={"messages": [], "model": "default"},
    )
    assert response.status_code == 200


def test_list_characters(client):
    response = client.get("/api/v1/characters")
    assert response.status_code == 200
    chars = response.json()
    assert len(chars) > 0
    assert all("id" in c and "name" in c for c in chars)


def test_get_character_found(client):
    response = client.get("/api/v1/characters/einstein")
    assert response.status_code == 200
    assert response.json()["id"] == "einstein"


def test_get_character_not_found(client):
    response = client.get("/api/v1/characters/nobody")
    assert response.status_code == 404


# ── Auth-enabled mode ─────────────────────────────────────────────────────────

def test_chat_blocked_without_key(authed_client):
    response = authed_client.post(
        "/api/v1/chat",
        json={"messages": [{"role": "user", "content": "hi"}], "model": "default"},
    )
    assert response.status_code == 401


def test_chat_blocked_with_wrong_key(authed_client):
    response = authed_client.post(
        "/api/v1/chat",
        headers={"X-API-Key": "wrong-key"},
        json={"messages": [{"role": "user", "content": "hi"}], "model": "default"},
    )
    assert response.status_code == 401


def test_chat_passes_with_valid_key(authed_client):
    response = authed_client.post(
        "/api/v1/chat",
        headers={"X-API-Key": "test-key-1"},
        json={"messages": [{"role": "user", "content": "hello"}], "model": "default"},
    )
    assert response.status_code == 200


def test_characters_blocked_without_key(authed_client):
    response = authed_client.get("/api/v1/characters")
    assert response.status_code == 401


def test_characters_passes_with_valid_key(authed_client):
    response = authed_client.get("/api/v1/characters", headers={"X-API-Key": "test-key-2"})
    assert response.status_code == 200
