/**
 * Application Insights KQL Queries for Production Monitoring
 * Ready-to-use queries for dashboards and alerting
 */

export const MONITORING_QUERIES = {
  // Authentication Success Rate Dashboard
  authenticationMetrics: `
requests
| where timestamp > ago(24h)
| where name == "auth-unified"
| extend action = tostring(customDimensions.action)
| summarize
    Total = count(),
    Success = countif(resultCode < 400),
    Failed = countif(resultCode >= 400)
    by action
| extend SuccessRate = round((Success * 100.0) / Total, 2)
| project action, Total, Success, Failed, SuccessRate
| order by Total desc`,

  // API Performance Analysis
  performanceMetrics: `
requests
| where timestamp > ago(1h)
| where name startswith "api/"
| summarize
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95),
    P99Duration = percentile(duration, 99),
    RequestCount = count(),
    ErrorRate = round((countif(resultCode >= 400) * 100.0) / count(), 2)
    by name
| order by AvgDuration desc`,

  // Health Check Status
  healthMetrics: `
requests
| where timestamp > ago(6h)
| where name == "health-check"
| extend status = tostring(customDimensions.status)
| summarize
    TotalChecks = count(),
    HealthyChecks = countif(status == "healthy"),
    UnhealthyChecks = countif(status == "unhealthy")
    by bin(timestamp, 15m)
| extend HealthRate = round((HealthyChecks * 100.0) / TotalChecks, 2)
| project timestamp, TotalChecks, HealthyChecks, UnhealthyChecks, HealthRate`,

  // Database Performance
  databaseMetrics: `
dependencies
| where timestamp > ago(2h)
| where type == "Azure DocumentDB"
| summarize
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95),
    RequestCount = count(),
    FailureRate = round((countif(success == false) * 100.0) / count(), 2)
    by name
| order by AvgDuration desc`,

  // Error Analysis
  errorAnalysis: `
exceptions
| where timestamp > ago(24h)
| summarize
    ErrorCount = count(),
    UniqueErrors = dcount(type)
    by type, outerMessage
| order by ErrorCount desc
| take 20`,

  // JWT Token Validation Metrics
  jwtMetrics: `
traces
| where timestamp > ago(4h)
| where message contains "JWT" or message contains "token"
| extend logLevel = tostring(customDimensions.logLevel)
| summarize count() by logLevel, message
| order by count_ desc`,

  // User Activity Patterns
  userActivity: `
requests
| where timestamp > ago(24h)
| where name !in ("health-check", "ping")
| extend userId = tostring(customDimensions.userId)
| where isnotempty(userId)
| summarize
    RequestCount = count(),
    UniqueEndpoints = dcount(name),
    AvgResponseTime = avg(duration)
    by userId
| order by RequestCount desc
| take 50`,

  // System Resource Usage
  resourceMetrics: `
performanceCounters
| where timestamp > ago(2h)
| where category == "Process" or category == "Memory"
| summarize avg(value) by name, bin(timestamp, 5m)
| render timechart`,

  // Security Events
  securityEvents: `
requests
| where timestamp > ago(24h)
| where resultCode in (401, 403, 429)
| extend clientIP = tostring(customDimensions.clientIP)
| summarize
    FailedAttempts = count(),
    UniqueIPs = dcount(clientIP),
    EndpointsTargeted = dcount(name)
    by resultCode, bin(timestamp, 1h)
| order by timestamp desc`,

  // Real-time Monitoring
  realTimeMetrics: `
requests
| where timestamp > ago(5m)
| summarize
    RequestsPerMinute = count() / 5,
    AvgResponseTime = avg(duration),
    ErrorRate = round((countif(resultCode >= 400) * 100.0) / count(), 2)
    by bin(timestamp, 1m)
| order by timestamp desc`,
};

/**
 * Alert Thresholds Configuration
 */
export const ALERT_THRESHOLDS = {
  // Critical Alerts
  authentication: {
    failureRate: 5, // %
    timeWindow: '10m',
    query: `
requests
| where timestamp > ago(10m)
| where name == "auth-unified"
| summarize
    Total = count(),
    Failed = countif(resultCode >= 400)
| extend FailureRate = (Failed * 100.0) / Total
| where FailureRate > 5`,
  },

  database: {
    timeoutCount: 1,
    timeWindow: '5m',
    query: `
dependencies
| where timestamp > ago(5m)
| where type == "Azure DocumentDB"
| where duration > 5000 or success == false
| count`,
  },

  performance: {
    responseTime: 2000, // ms
    timeWindow: '15m',
    query: `
requests
| where timestamp > ago(15m)
| where name !in ("health-check")
| summarize P95 = percentile(duration, 95)
| where P95 > 2000`,
  },

  health: {
    unhealthyCount: 3,
    timeWindow: '10m',
    query: `
requests
| where timestamp > ago(10m)
| where name == "health-check"
| where resultCode >= 400
| count`,
  },
};

/**
 * Dashboard Configuration
 */
export const DASHBOARD_CONFIG = {
  title: 'Tesla STEM Carpool - Production Monitoring',
  refreshInterval: '5m',
  timeRange: '24h',

  panels: [
    {
      title: 'System Health Overview',
      type: 'stat',
      query: MONITORING_QUERIES.healthMetrics,
      width: 6,
      height: 4,
    },
    {
      title: 'API Performance',
      type: 'graph',
      query: MONITORING_QUERIES.performanceMetrics,
      width: 6,
      height: 4,
    },
    {
      title: 'Authentication Success Rate',
      type: 'singlestat',
      query: MONITORING_QUERIES.authenticationMetrics,
      width: 4,
      height: 3,
    },
    {
      title: 'Error Analysis',
      type: 'table',
      query: MONITORING_QUERIES.errorAnalysis,
      width: 8,
      height: 6,
    },
    {
      title: 'Real-time Metrics',
      type: 'timechart',
      query: MONITORING_QUERIES.realTimeMetrics,
      width: 12,
      height: 4,
    },
  ],
};

/**
 * Custom Telemetry Events
 */
export const TELEMETRY_EVENTS = {
  // Authentication Events
  userLogin: 'User_Login',
  userLogout: 'User_Logout',
  tokenRefresh: 'Token_Refresh',
  authFailure: 'Authentication_Failure',

  // Business Events
  groupCreated: 'Group_Created',
  tripScheduled: 'Trip_Scheduled',
  parentAssigned: 'Parent_Assigned',
  notificationSent: 'Notification_Sent',

  // System Events
  functionStartup: 'Function_Startup',
  databaseConnection: 'Database_Connection',
  configurationLoaded: 'Configuration_Loaded',
  healthCheckFailed: 'Health_Check_Failed',
};

/**
 * Helper function to track custom events
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>,
  metrics?: Record<string, number>,
) {
  if (typeof window !== 'undefined' && (window as any).appInsights) {
    (window as any).appInsights.trackEvent({ name: eventName }, properties, metrics);
  }

  // Server-side tracking
  if (typeof process !== 'undefined' && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    try {
      // Dynamic import for server-side only
      import('applicationinsights')
        .then((appInsights) => {
          if (appInsights.defaultClient) {
            appInsights.defaultClient.trackEvent({
              name: eventName,
              properties,
              measurements: metrics,
            });
          }
        })
        .catch((error) => {
          console.warn('Failed to track event:', error);
        });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }
}
