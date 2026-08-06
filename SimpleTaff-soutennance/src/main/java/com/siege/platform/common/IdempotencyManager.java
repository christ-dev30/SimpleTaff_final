package com.siege.platform.common;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class IdempotencyManager {
    private static class CacheEntry {
        final Object response;
        final long timestamp;

        CacheEntry(Object response) {
            this.response = response;
            this.timestamp = System.currentTimeMillis();
        }
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

    public boolean has(String key) {
        if (key == null || key.isBlank()) return false;
        cleanExpired();
        CacheEntry entry = cache.get(key);
        if (entry == null) return false;
        if (System.currentTimeMillis() - entry.timestamp > TTL_MS) {
            cache.remove(key);
            return false;
        }
        return true;
    }

    public Object get(String key) {
        if (key == null || key.isBlank()) return null;
        CacheEntry entry = cache.get(key);
        return entry != null ? entry.response : null;
    }

    public void put(String key, Object response) {
        if (key == null || key.isBlank() || response == null) return;
        cleanExpired();
        cache.put(key, new CacheEntry(response));
    }

    private void cleanExpired() {
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> now - entry.getValue().timestamp > TTL_MS);
    }
}
