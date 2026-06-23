import os
from cryptography.fernet import Fernet

# Get encryption key from environment (must be 32 bytes base64 encoded)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY environment variable not set")

cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_token(token: str) -> str:
    """Encrypt a token or cookie string."""
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    """Decrypt a token or cookie string."""
    return cipher.decrypt(encrypted.encode()).decode()