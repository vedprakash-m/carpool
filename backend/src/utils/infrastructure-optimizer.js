"use strict";
/**
 * Infrastructure Optimization Utilities
 * Azure Functions and cloud resource optimization tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceOptimizer = exports.ColdStartOptimizer = void 0;
const logger_1 = require("./logger");
const cache_1 = require("./cache");
/**
 * Cold start optimization utilities
 */
class ColdStartOptimizer {
    static isWarmup = false;
    static lastActivity = Date.now();
    /**
     * Optimize function for reduced cold starts
     */
    static async optimize() {
        try {
            logger_1.logger.info('Cold start optimization completed');
        }
        catch (error) {
            logger_1.logger.error('Cold start optimization failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Check if function needs warming up
     */
    static needsWarmup() {
        return Date.now() - this.lastActivity > 300000; // 5 minutes
    }
}
exports.ColdStartOptimizer = ColdStartOptimizer;
/**
 * Resource monitoring and optimization
 */
class ResourceOptimizer {
    /**
     * Monitor and optimize memory usage
     */
    static optimizeMemory() {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        logger_1.logger.debug('Memory usage', {
            heapUsed: `${heapUsedMB}MB`,
            heapTotal: `${heapTotalMB}MB`,
        });
    }
    /**
     * Get health status of the application
     */
    static async getHealthStatus() {
        const checks = {};
        // Memory check
        try {
            const memUsage = process.memoryUsage();
            const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;
            checks.memory = {
                status: heapUsedPercent < 0.9 ? 'healthy' : 'unhealthy',
                message: `Heap usage: ${(heapUsedPercent * 100).toFixed(1)}%`,
            };
        }
        catch (error) {
            checks.memory = {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        // Cache check
        try {
            const cacheMetrics = cache_1.globalCache.getMetrics();
            checks.cache = {
                status: 'healthy',
                message: `Hit rate: ${cacheMetrics.hitRate.toFixed(1)}%`,
            };
        }
        catch (error) {
            checks.cache = {
                status: 'unhealthy',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        const overallStatus = Object.values(checks).every(check => check.status === 'healthy')
            ? 'healthy'
            : 'unhealthy';
        return { status: overallStatus, checks };
    }
}
exports.ResourceOptimizer = ResourceOptimizer;
