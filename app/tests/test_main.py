def test_health_endpoint_returns_ok(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_readiness_endpoint_returns_healthy_status(client):
    response = client.get("/readiness")

    assert response.status_code == 200
    data = response.json()

    assert "ready" in data
    assert "database" in data
    assert "redis" in data
    assert "config" in data
    assert "publish" in data
    assert "kill_switch" in data

    assert isinstance(data["database"], dict)
    assert isinstance(data["redis"], dict)
    assert "connected" in data["database"]
    assert "connected" in data["redis"]


def test_readiness_reflects_database_failure(client, monkeypatch):
    from unittest.mock import Mock
    from sqlalchemy.exc import OperationalError

    def mock_check_database_connection_fail():
        return {"connected": False, "error": "connection failed"}

    import app.main
    monkeypatch.setattr(app.main, "check_database_connection", mock_check_database_connection_fail)

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is False
    assert data["database"]["connected"] is False
    assert "error" in data["database"]


def test_readiness_reflects_redis_failure(client, monkeypatch):
    import redis
    from unittest.mock import Mock

    def mock_from_url_fail(*args, **kwargs):
        mock_client = Mock()
        mock_client.ping.side_effect = redis.ConnectionError("redis unavailable")
        return mock_client

    monkeypatch.setattr(redis, "from_url", mock_from_url_fail)

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is False
    assert data["redis"]["connected"] is False
    assert "error" in data["redis"]
