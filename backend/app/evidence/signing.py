from pathlib import Path
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

KEY_PATH = Path(__file__).resolve().parents[2] / "data" / "keys" / "ed25519.pem"

def _key():
    if KEY_PATH.exists():
        return serialization.load_pem_private_key(KEY_PATH.read_bytes(), password=None)
    KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    k = Ed25519PrivateKey.generate()
    KEY_PATH.write_bytes(k.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ))
    return k

def public_hex():
    return _key().public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    ).hex()

def sign(data):
    return _key().sign(data).hex()

def verify(data, sig_hex):
    try:
        _key().public_key().verify(bytes.fromhex(sig_hex), data)
        return True
    except InvalidSignature:
        return False