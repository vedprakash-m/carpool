/**
 * Health Check Azure Function
 * Phase 1: Foundation Strengthening - Health Check Endpoints
 * 
 * Provides comprehensive health monitoring for the VCarpool system
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { MonitoringService } from '../services/monitoring.service';
import { PerformanceOptimizer } from '../services/performance-optimizer';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, any>;
  performance?: any;
  detailed?: boolean;
}

/**
 * Basic health check endpoint
 */
async function healthCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const monitor = MonitoringService.getInstance();
  const optimizer = PerformanceOptimizer.getInstance();
  
  try {
    monitor.setCorrelationId(context.executionContext.invocationId);
    monitor.log('info', 'Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for')
    });

    // Execute health checks
    const healthResult = await monitor.executeHealthChecks();
    
    const response: HealthResponse = {
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      version: healthResult.version,
      uptime: healthResult.uptime,
      checks: healthResult.checks
    };

    // Return appropriate HTTP status based on health
    const httpStatus = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 206 : 503;

    return optimizer.createOptimizedResponse(response, httpStatus);

  } catch (error) {
    monitor.log('error', 'Health check failed', {}, error);
    
    return optimizer.createOptimizedResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check execution failed'
    }, 503);
  }
}

/**
 * Detailed health check with performance metrics
 */
async function healthCheckDetailed(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const monitor = MonitoringService.getInstance();
  const optimizer = PerformanceOptimizer.getInstance();
  
  try {
    monitor.setCorrelationId(context.executionContext.invocationId);
    monitor.log('info', 'Detailed health check requested');

    // Execute health checks
    const healthResult = await monitor.executeHealthChecks();
    
    // Get performance statistics
    const performanceStats = optimizer.getPerformanceStats();
    const monitoringStats = monitor.getStats();

    const response: HealthResponse = {
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      version: healthResult.version,
      uptime: healthResult.uptime,
      checks: healthResult.checks,
      performance: {
        optimizer: performanceStats,
        monitoring: monitoringStats,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          env: process.env.NODE_ENV,
          nodeVersion: process.version
        }
      },
      detailed: true
    };

    const httpStatus = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 206 : 503;

    return optimizer.createOptimizedResponse(response, httpStatus);

  } catch (error) {
    monitor.log('error', 'Detailed health check failed', {}, error);
    
    return optimizer.createOptimizedResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check execution failed'
    }, 503);
  }
}

/**
 * Ready check - lighter weight check for readiness
 */
async function readyCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const monitor = MonitoringService.getInstance();
  const optimizer = PerformanceOptimizer.getInstance();
  
  try {
    monitor.setCorrelationId(context.executionContext.invocationId);
    
    // Quick readiness checks
    const isReady = await checkReadiness();
    
    const response = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0'
    };

    return optimizer.createOptimizedResponse(response, isReady ? 200 : 503);

  } catch (error) {
    monitor.log('error', 'Ready check failed', {}, error);
    
    return optimizer.createOptimizedResponse({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Ready check execution failed'
    }, 503);
  }
}

/**
 * Live check - minimal check for liveness
 */
async function liveCheck(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const optimizer = PerformanceOptimizer.getInstance();
  
  const response = {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  return optimizer.createOptimizedResponse(response, 200);
}

/**
 * Check if the application is ready to serve requests
 */
async function checkReadiness(): Promise<boolean> {
  try {
    // Check critical dependencies
    const checks = await Promise.allSettled([
      checkDatabaseConnection(),
      checkEnvironmentVariables(),
      checkMemoryUsage()
    ]);

    // Return false if any critical check fails
    return checks.every(result => result.status === 'fulfilled');
  } catch (error) {
    return false;
  }
}

/**
 * Check database connection
 */
async function checkDatabaseConnection(): Promise<boolean> {
  if (!process.env.COSMOS_DB_CONNECTION_STRING) {
    return false;
  }

  try {
    const { CosmosClient } = await import('@azure/cosmos');
    const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
    await client.getDatabaseAccount();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check required environment variables
 */
async function checkEnvironmentVariables(): Promise<boolean> {
  const required = [
    'COSMOS_DB_CONNECTION_STRING',
    'COSMOS_DB_DATABASE_ID',
    'JWT_SECRET'
  ];

  return required.every(env => !!process.env[env]);
}

/**
 * Check memory usage is within acceptable limits
 */
async function checkMemoryUsage(): Promise<boolean> {
  const usage = process.memoryUsage();
  const maxMemoryMB = 1024; // 1GB limit
  const currentMemoryMB = usage.heapUsed / 1024 / 1024;
  
  return currentMemoryMB < maxMemoryMB;
}

// Register Azure Functions
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthCheck
});

app.http('health-detailed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health/detailed',
  handler: healthCheckDetailed
});

app.http('ready', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ready',
  handler: readyCheck
});

app.http('live', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'live',
  handler: liveCheck
});

export { healthCheck, healthCheckDetailed, readyCheck, liveCheck };
