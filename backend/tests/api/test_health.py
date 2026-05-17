def test_liveness_always_ok(client):
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_liveness_sets_request_id(client):
    response = client.get("/health/live")
    assert "x-request-id" in response.headers


def test_readiness_ok_with_echo_backend(client):
    # EchoBackend.health_check() returns True by default
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
