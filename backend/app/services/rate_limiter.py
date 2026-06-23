import redis
import os

redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

class RateLimiter:
    @staticmethod
    def check_user_limit(user_id: str, action_type: str, limit: int = 5, window_seconds: int = 3600):
        """
        Check if a user has exceeded their per‑hour limit for actions.
        Returns True if allowed, False if limit exceeded.
        """
        key = f"user:{user_id}:{action_type}:{int(time.time()) // window_seconds}"
        current = redis_client.incr(key)
        if current == 1:
            redis_client.expire(key, window_seconds)
        return current <= limit

    @staticmethod
    def reset_user_limit(user_id: str, action_type: str):
        """Reset user action counter."""
        key = f"user:{user_id}:{action_type}:*"
        for k in redis_client.scan_iter(match=key):
            redis_client.delete(k)