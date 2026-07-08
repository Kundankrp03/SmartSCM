import Redis from 'ioredis';

class InMemoryCache {
  private cache = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }
}

class CacheManager {
  private redis: Redis | null = null;
  private memoryCache = new InMemoryCache();
  private isRedisConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            // Stop retrying quickly to fallback to memory cache
            this.isRedisConnected = false;
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.redis.on('connect', () => {
        this.isRedisConnected = true;
        console.log('Redis cache layer connected.');
      });

      this.redis.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch {
      this.redis = null;
      this.isRedisConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        return this.memoryCache.get(key);
      }
    }
    return this.memoryCache.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        if (ttlSeconds) {
          await this.redis.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory cache
      }
    }
    await this.memoryCache.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch {
        // Fallback to memory cache
      }
    }
    await this.memoryCache.del(key);
  }

  async flush(): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.flushall();
        return;
      } catch {
        // Fallback to memory cache
      }
    }
    await this.memoryCache.flush();
  }
}

const globalForCache = global as unknown as { cacheManager: CacheManager };
export const cache = globalForCache.cacheManager || new CacheManager();
if (process.env.NODE_ENV !== 'production') globalForCache.cacheManager = cache;
