"use strict";
/**
 * Multi-Level Caching Strategy
 * Implements L1 (memory), L2 (Redis), and L3 (database) caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartCacheInvalidator = exports.MultiLevelCache = void 0;
const ioredis_1 = require("ioredis");
const lru_cache_1 = require("lru-cache");
class MultiLevelCache {
    l1Cache;
    l2Cache;
    config;
    constructor(config) {
        this.config = config;
        // L1 Cache (Memory)
        this.l1Cache = new lru_cache_1.LRUCache({
            max: config.l1.maxSize,
            ttl: config.l1.ttl,
        });
        // L2 Cache (Redis)
        this.l2Cache = new ioredis_1.Redis({
            host: config.l2.host,
            port: config.l2.port,
            lazyConnect: true,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        });
    }
    async get(key) {
        // Try L1 cache first
        const l1Result = this.l1Cache.get(key);
        if (l1Result) {
            return l1Result;
        }
        // Try L2 cache
        try {
            const l2Result = await this.l2Cache.get(key);
            if (l2Result) {
                const parsed = JSON.parse(l2Result);
                // Populate L1 cache
                this.l1Cache.set(key, parsed);
                return parsed;
            }
        }
        catch (error) {
            console.warn('L2 cache error:', error);
        }
        return null;
    }
    async set(key, value, ttl) {
        // Set in L1 cache
        this.l1Cache.set(key, value, { ttl: ttl || this.config.l1.ttl });
        // Set in L2 cache
        try {
            const serialized = JSON.stringify(value);
            await this.l2Cache.setex(key, ttl || this.config.l2.ttl, serialized);
        }
        catch (error) {
            console.warn('L2 cache set error:', error);
        }
    }
    async invalidate(pattern) {
        // Clear L1 cache (pattern matching)
        for (const key of this.l1Cache.keys()) {
            if (key.includes(pattern)) {
                this.l1Cache.delete(key);
            }
        }
        // Clear L2 cache
        try {
            const keys = await this.l2Cache.keys(`*${pattern}*`);
            if (keys.length > 0) {
                await this.l2Cache.del(...keys);
            }
        }
        catch (error) {
            console.warn('L2 cache invalidation error:', error);
        }
    }
}
exports.MultiLevelCache = MultiLevelCache;
/**
 * Smart cache invalidation based on data relationships
 */
class SmartCacheInvalidator {
    cache;
    constructor(cache) {
        this.cache = cache;
    }
    async invalidateUserData(userId) {
        await Promise.all([
            this.cache.invalidate(`user:${userId}`),
            this.cache.invalidate(`trips:user:${userId}`),
            this.cache.invalidate(`notifications:${userId}`),
        ]);
    }
    async invalidateTripData(tripId) {
        await Promise.all([
            this.cache.invalidate(`trip:${tripId}`),
            this.cache.invalidate(`participants:${tripId}`),
            this.cache.invalidate(`messages:${tripId}`),
        ]);
    }
}
exports.SmartCacheInvalidator = SmartCacheInvalidator;
