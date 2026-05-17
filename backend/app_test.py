def test_health_live(client):
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_sets_request_id(client):
    response = client.get("/health/live")
    assert "x-request-id" in response.headers
