import hashlib
import json
from typing import Optional, Any
from abc import ABC, abstractmethod

class CacheBackend(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        pass

class InMemoryLRUCache(CacheBackend):
    def __init__(self, max_size: int = 1000):
        from collections import OrderedDict
        self.cache = OrderedDict()
        self.max_size = max_size

    async def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        # TTL is ignored for this simple in-memory implementation but kept for interface parity
        self.cache[key] = value
        self.cache.move_to_end(key)
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)

# Singleton cache instance. Can be swapped for RedisCache later without breaking business logic.
cache_store: CacheBackend = InMemoryLRUCache()

def generate_text_hash(text: str) -> str:
    """Generate a deterministic hash for caching"""
    if not text:
        return ""
    return hashlib.md5(text.encode('utf-8')).hexdigest()
