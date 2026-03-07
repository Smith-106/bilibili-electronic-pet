import hashlib
import hmac
import json


def reply_hash(comment_id: str, reply_text: str) -> str:
    raw = f"{comment_id}::{reply_text.strip()}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def sign_payload(payload: dict, secret: str) -> str:
    canonical = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()


def verify_payload_signature(payload: dict, secret: str, signature: str) -> bool:
    expected = sign_payload(payload, secret)
    return hmac.compare_digest(expected, signature)
