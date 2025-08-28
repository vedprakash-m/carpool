/**
 * Enhanced Monitoring Service with Application Insights Integration
 */

import * as appInsights from 'applicationinsights';
import {
  MONITORING_QUERIES,
  ALERT_THRESHOLDS,
  TELEMETRY_EVENTS,
} from '../config/monitoring-queries';

export interface MonitoringMetrics {
  timestamp: Date;
  authenticationSuccessRate: number;
  averageResponseTime: number;
  errorRate: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  activeUsers: number;
  databasePerformance: {
    averageLatency: number;
    errorRate: number;
  };
}

export interface AlertCondition {
  name: string;
  severity: 'critical' | 'warning' | 'info';
  threshold: number;
  currentValue: number;
  triggered: boolean;
  message: string;
}

export class EnhancedMonitoringService {
  private client: appInsights.TelemetryClient | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
        console.warn('Application Insights connection string not configured');
        return;
      }

      this.client = appInsights.defaultClient;
      this.isInitialized = true;
      console.log('Enhanced monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring service:', error);
    }
  }

  /**
   * Track authentication events with detailed metrics
   */
  public trackAuthentication(
    action: 'login' | 'logout' | 'refresh' | 'failure',
    userId?: string,
    success: boolean = true,
    duration?: number,
    errorMessage?: string,
  ): void {
    const eventName = this.getAuthEventName(action);
    const properties = {
      userId: userId || 'anonymous',
      success: success.toString(),
      action,
      ...(errorMessage && { errorMessage }),
    };

    const metrics = {
      ...(duration && { duration }),
      success: success ? 1 : 0,
    };

    this.trackEvent(eventName, properties, metrics);
  }

  /**
   * Track API performance metrics
   */
  public trackApiPerformance(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    const properties = {
      endpoint,
      method,
      statusCode: statusCode.toString(),
      ...(userId && { userId }),
    };

    const metrics = {
      duration,
      success: statusCode < 400 ? 1 : 0,
    };

    this.trackEvent('API_Request', properties, metrics);
  }

  /**
   * Track business events
   */
  public trackBusinessEvent(
    eventType: 'group_created' | 'trip_scheduled' | 'parent_assigned' | 'notification_sent',
    userId: string,
    additionalProperties?: Record<string, string>,
  ): void {
    const properties = {
      userId,
      eventType,
      ...additionalProperties,
    };

    this.trackEvent('Business_Event', properties);
  }

  /**
   * Track system health metrics
   */
  public trackHealthMetrics(
    component: 'database' | 'jwt' | 'environment' | 'overall',
    status: 'healthy' | 'unhealthy',
    responseTime?: number,
    errorDetails?: string,
  ): void {
    const properties = {
      component,
      status,
      ...(errorDetails && { errorDetails }),
    };

    const metrics = {
      healthy: status === 'healthy' ? 1 : 0,
      ...(responseTime && { responseTime }),
    };

    this.trackEvent('Health_Check', properties, metrics);
  }

  /**
   * Track database operations
   */
  public trackDatabaseOperation(
    operation: 'read' | 'write' | 'delete' | 'query',
    collection: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
  ): void {
    const properties = {
      operation,
      collection,
      success: success.toString(),
      ...(errorMessage && { errorMessage }),
    };

    const metrics = {
      duration,
      success: success ? 1 : 0,
    };

    this.trackEvent('Database_Operation', properties, metrics);
  }

  /**
   * Track security events
   */
  public trackSecurityEvent(
    eventType: 'unauthorized_access' | 'suspicious_activity' | 'rate_limit_exceeded',
    clientIP: string,
    endpoint: string,
    additionalContext?: Record<string, string>,
  ): void {
    const properties = {
      eventType,
      clientIP,
      endpoint,
      severity: 'warning',
      ...additionalContext,
    };

    this.trackEvent('Security_Event', properties);
  }

  /**
   * Check alert conditions and return triggered alerts
   */
  public async checkAlertConditions(): Promise<AlertCondition[]> {
    const alerts: AlertCondition[] = [];

    // This would normally query Application Insights
    // For now, return mock data structure
    return alerts;
  }

  /**
   * Get current system metrics
   */
  public async getCurrentMetrics(): Promise<MonitoringMetrics> {
    // This would normally query Application Insights for real-time data
    const now = new Date();

    return {
      timestamp: now,
      authenticationSuccessRate: 99.5,
      averageResponseTime: 150,
      errorRate: 0.1,
      healthStatus: 'healthy',
      activeUsers: 25,
      databasePerformance: {
        averageLatency: 45,
        errorRate: 0,
      },
    };
  }

  /**
   * Create custom dashboard data
   */
  public async getDashboardData(timeRange: '1h' | '6h' | '24h' = '24h'): Promise<any> {
    // This would execute the KQL queries from monitoring-queries.ts
    // and return formatted data for dashboards
    return {
      timeRange,
      lastUpdated: new Date(),
      queries: Object.keys(MONITORING_QUERIES),
      alertThresholds: Object.keys(ALERT_THRESHOLDS),
    };
  }

  /**
   * Flush all pending telemetry
   */
  public flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        // Application Insights flush method doesn't take a callback in newer versions
        this.client.flush();
        // Give it a moment to flush
        setTimeout(() => resolve(), 100);
      } else {
        resolve();
      }
    });
  }

  private getAuthEventName(action: string): string {
    switch (action) {
      case 'login':
        return TELEMETRY_EVENTS.userLogin;
      case 'logout':
        return TELEMETRY_EVENTS.userLogout;
      case 'refresh':
        return TELEMETRY_EVENTS.tokenRefresh;
      case 'failure':
        return TELEMETRY_EVENTS.authFailure;
      default:
        return 'Authentication_Unknown';
    }
  }

  private trackEvent(
    eventName: string,
    properties?: Record<string, string>,
    metrics?: Record<string, number>,
  ): void {
    if (!this.isInitialized || !this.client) {
      console.log(`[MONITORING] ${eventName}:`, { properties, metrics });
      return;
    }

    try {
      this.client.trackEvent({
        name: eventName,
        properties,
        measurements: metrics,
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }
}

// Export singleton instance
export const monitoringService = new EnhancedMonitoringService();
