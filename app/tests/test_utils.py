from app.services.dedupe import is_recent_duplicate, remember_reply_phrase
from app.services.hashing import reply_hash, sign_payload, verify_payload_signature


def test_reply_hash_stable_and_trimmed():
    value1 = reply_hash("c-1", " hello world ")
    value2 = reply_hash("c-1", "hello world")
    value3 = reply_hash("c-1", "hello world!")

    assert value1 == value2
    assert value1 != value3


def test_sign_and_verify_payload_signature():
    payload = {"comment_id": "c-1", "reply_text": "你好", "source": "bili-pet-bot"}
    secret = "unit-test-secret"
    signature = sign_payload(payload, secret)

    assert verify_payload_signature(payload, secret, signature) is True
    assert verify_payload_signature(payload, secret, "invalid-signature") is False


def test_dedupe_remember_and_detect(db_session, make_comment):
    comment = make_comment(comment_id="dup-c-1", user_id="dup-user-1")
    _ = comment
    text = "  这 是 同 一 句 话  "

    assert is_recent_duplicate(db_session, "dup-user-1", text) is False
    remember_reply_phrase(db_session, "dup-user-1", text)
    assert is_recent_duplicate(db_session, "dup-user-1", "这是同一句话") is True
