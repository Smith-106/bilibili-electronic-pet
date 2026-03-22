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
    assert "foundation_ready" in data
    assert "delivery_ready" in data
    assert "foundation_blockers" in data
    assert "delivery_blockers" in data
    assert "blocking_reasons" in data
    assert "delivery_signals" in data
    assert "bilibili_diagnostics" in data

    assert isinstance(data["database"], dict)
    assert isinstance(data["redis"], dict)
    assert isinstance(data["foundation_blockers"], list)
    assert isinstance(data["delivery_blockers"], list)
    assert isinstance(data["blocking_reasons"], list)
    assert isinstance(data["delivery_signals"], dict)
    assert isinstance(data["bilibili_diagnostics"], dict)
    assert "connected" in data["database"]
    assert "connected" in data["redis"]


def test_readiness_reflects_database_failure(client, monkeypatch):
    def mock_check_database_connection_fail():
        return {"connected": False, "error": "connection failed"}

    import app.main
    monkeypatch.setattr(app.main, "check_database_connection", mock_check_database_connection_fail)

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is False
    assert data["database"]["connected"] is False
    assert data["foundation_ready"] is False
    assert data["delivery_ready"] is False
    assert "error" in data["database"]
    assert any(reason.startswith("database:") for reason in data["foundation_blockers"])
    assert any(reason.startswith("database:") for reason in data["delivery_blockers"])


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
    assert data["foundation_ready"] is False
    assert data["delivery_ready"] is False
    assert "error" in data["redis"]
    assert any(reason.startswith("redis:") for reason in data["foundation_blockers"])
    assert any(reason.startswith("redis:") for reason in data["delivery_blockers"])


def test_readiness_includes_bilibili_delivery_blockers(client, monkeypatch):
    import redis
    from unittest.mock import Mock
    import app.main

    monkeypatch.setattr(app.main, "check_database_connection", lambda: {"connected": True})

    def mock_from_url_ok(*args, **kwargs):
        _ = args, kwargs
        mock_client = Mock()
        mock_client.ping.return_value = True
        return mock_client

    monkeypatch.setattr(redis, "from_url", mock_from_url_ok)
    monkeypatch.setattr(
        app.main,
        "build_bilibili_diagnostics",
        lambda db: {
            "ready": False,
            "blocking_reasons": ["auth:no active credential"],
            "effective_publish_mode": "native_bilibili",
            "signals": {},
        },
    )

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is True
    assert data["foundation_ready"] is True
    assert data["delivery_ready"] is False
    assert "bilibili:auth:no active credential" in data["delivery_blockers"]


def test_readiness_allows_external_publish_modes_without_native_bilibili(client, monkeypatch):
    import redis
    from unittest.mock import Mock
    import app.main

    monkeypatch.setattr(app.main, "check_database_connection", lambda: {"connected": True})

    def mock_from_url_ok(*args, **kwargs):
        _ = args, kwargs
        mock_client = Mock()
        mock_client.ping.return_value = True
        return mock_client

    monkeypatch.setattr(redis, "from_url", mock_from_url_ok)
    monkeypatch.setattr(
        app.main,
        "build_bilibili_diagnostics",
        lambda db: {
            "ready": False,
            "blocking_reasons": [
                "config:bilibili_enabled is false",
                "config:bilibili_publish_enabled is false",
            ],
            "effective_publish_mode": "webhook",
            "checks": {
                "worker_or_publish": {
                    "ready": True,
                    "errors": [],
                }
            },
            "release_gates": {
                "worker_or_publish_ready": True,
            },
            "signals": {},
        },
    )

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is True
    assert data["foundation_ready"] is True
    assert data["delivery_ready"] is True
    assert "bilibili:delivery_diagnostics_not_ready" not in data["delivery_blockers"]
    assert not any(reason.startswith("bilibili:config:") for reason in data["delivery_blockers"])


def test_readiness_keeps_simulated_publish_mode_blocked(client, monkeypatch):
    import redis
    from unittest.mock import Mock
    import app.main

    monkeypatch.setattr(app.main, "check_database_connection", lambda: {"connected": True})

    def mock_from_url_ok(*args, **kwargs):
        _ = args, kwargs
        mock_client = Mock()
        mock_client.ping.return_value = True
        return mock_client

    monkeypatch.setattr(redis, "from_url", mock_from_url_ok)
    monkeypatch.setattr(
        app.main,
        "build_bilibili_diagnostics",
        lambda db: {
            "ready": False,
            "blocking_reasons": [],
            "effective_publish_mode": "simulated",
            "checks": {
                "worker_or_publish": {
                    "ready": True,
                    "errors": [],
                }
            },
            "release_gates": {
                "worker_or_publish_ready": True,
            },
            "signals": {},
        },
    )

    response = client.get("/readiness")
    data = response.json()

    assert data["ready"] is True
    assert data["foundation_ready"] is True
    assert data["delivery_ready"] is False
    assert "bilibili:publish_mode_not_delivery_capable:simulated" in data["delivery_blockers"]
    assert "bilibili:delivery_diagnostics_not_ready" in data["delivery_blockers"]
