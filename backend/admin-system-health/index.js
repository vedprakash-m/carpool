const { container } = require('../src/container');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

/**
 * System Health Monitoring API
 * Provides real-time system health status for admin dashboard
 */
module.exports = async function (context, req) {
  context.log('admin-system-health HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetSystemHealth(context, req);
        break;
      default:
        context.res = UnifiedResponseHandler.methodNotAllowedError();
    }
  } catch (error) {
    context.log('Error in admin-system-health', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

async function handleGetSystemHealth(context, req) {
  try {
    // Verify admin access
    const userId = req.headers.authorization?.replace('Bearer ', '');
    if (!userId) {
      context.res = UnifiedResponseHandler.authenticationError();
      return;
    }

    const userQuery = {
      query:
        "SELECT * FROM c WHERE c.id = @userId AND c.type = 'user' AND (c.role = 'admin' OR c.role = 'super_admin')",
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources: users } = await container.items.query(userQuery).fetchAll();
    if (users.length === 0) {
      context.res = UnifiedResponseHandler.forbiddenError('Admin access required');
      return;
    }

    // Check system components
    const [databaseHealth, apiHealth, notificationHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkApiHealth(),
      checkNotificationHealth(),
    ]);

    // Determine overall system status
    const overallStatus = determineOverallStatus([
      databaseHealth.status,
      apiHealth.status,
      notificationHealth.status,
    ]);

    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: databaseHealth,
      api: apiHealth,
      notifications: notificationHealth,
      uptime: await calculateUptime(),
      version: process.env.APP_VERSION || '1.0.0',
    };

    context.res = UnifiedResponseHandler.success(healthReport);
  } catch (error) {
    context.log(`Error getting system health: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

async function checkDatabaseHealth() {
  const startTime = Date.now();

  try {
    // Test database connectivity with a simple query
    const testQuery = {
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'user'",
      parameters: [],
    };

    await container.items.query(testQuery).fetchAll();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 100 ? 'connected' : responseTime < 500 ? 'slow' : 'slow',
      responseTime,
      connections: await getConnectionCount(),
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.log('Database health check failed:', error);
    return {
      status: 'disconnected',
      responseTime: Date.now() - startTime,
      connections: 0,
      lastChecked: new Date().toISOString(),
      error: error.message,
    };
  }
}

async function checkApiHealth() {
  const startTime = Date.now();

  try {
    // Test API responsiveness by checking function execution time
    const testOperations = [
      () => container.items.query({ query: 'SELECT TOP 1 * FROM c', parameters: [] }).fetchAll(),
      () => Promise.resolve('test'), // Simple promise resolution test
      () => new Promise((resolve) => setTimeout(resolve, 10)), // Async operation test
    ];

    await Promise.all(testOperations.map((op) => op()));

    const responseTime = Date.now() - startTime;
    const errorRate = await calculateRecentErrorRate();

    return {
      status: responseTime < 150 ? 'healthy' : responseTime < 1000 ? 'degraded' : 'down',
      avgResponseTime: responseTime,
      errorRate,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.log('API health check failed:', error);
    return {
      status: 'down',
      avgResponseTime: Date.now() - startTime,
      errorRate: 100,
      lastChecked: new Date().toISOString(),
      error: error.message,
    };
  }
}

async function checkNotificationHealth() {
  try {
    // Check notification queue status (simulated for demo)
    const queueSize = await getNotificationQueueSize();
    const failureRate = await getNotificationFailureRate();

    let status = 'operational';
    if (queueSize > 100 || failureRate > 5) {
      status = 'delayed';
    }
    if (queueSize > 500 || failureRate > 20) {
      status = 'failed';
    }

    return {
      status,
      queueSize,
      failureRate,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.log('Notification health check failed:', error);
    return {
      status: 'failed',
      queueSize: 0,
      failureRate: 100,
      lastChecked: new Date().toISOString(),
      error: error.message,
    };
  }
}

function determineOverallStatus(componentStatuses) {
  const criticalStatuses = ['disconnected', 'down', 'failed'];
  const warningStatuses = ['slow', 'degraded', 'delayed'];

  if (componentStatuses.some((status) => criticalStatuses.includes(status))) {
    return 'critical';
  }

  if (componentStatuses.some((status) => warningStatuses.includes(status))) {
    return 'warning';
  }

  return 'healthy';
}

async function getConnectionCount() {
  try {
    // This would typically come from Azure Cosmos DB metrics
    // For demo purposes, return a simulated value
    return Math.floor(Math.random() * 10) + 5; // 5-15 connections
  } catch (error) {
    return 0;
  }
}

async function calculateRecentErrorRate() {
  try {
    // This would typically come from application logs or Azure Monitor
    // For demo purposes, return a simulated low error rate
    return Math.random() * 2; // 0-2% error rate
  } catch (error) {
    return 0;
  }
}

async function getNotificationQueueSize() {
  try {
    // In a real implementation, this would check the actual notification queue
    // For demo purposes, return a simulated small queue size
    return Math.floor(Math.random() * 50); // 0-50 pending notifications
  } catch (error) {
    return 0;
  }
}

async function getNotificationFailureRate() {
  try {
    // This would typically come from notification service logs
    // For demo purposes, return a simulated low failure rate
    return Math.random() * 3; // 0-3% failure rate
  } catch (error) {
    return 0;
  }
}

async function calculateUptime() {
  try {
    // This would typically come from Azure Monitor or Application Insights
    // For demo purposes, return a simulated high uptime
    return 99.5 + Math.random() * 0.4; // 99.5-99.9% uptime
  } catch (error) {
    return 99.0;
  }
}
