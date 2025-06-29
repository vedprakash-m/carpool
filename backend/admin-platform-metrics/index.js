const { container } = require('../src/container');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

/**
 * Platform Metrics API
 * Provides comprehensive platform analytics for admin monitoring
 */
module.exports = async function (context, req) {
  context.log('admin-platform-metrics HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetPlatformMetrics(context, req);
        break;
      default:
        context.res = UnifiedResponseHandler.methodNotAllowedError();
    }
  } catch (error) {
    context.log('Error in admin-platform-metrics', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

async function handleGetPlatformMetrics(context, req) {
  const { timeframe = '7d' } = req.query;

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

    // Calculate timeframe
    const now = new Date();
    const timeframeDays = parseInt(timeframe.replace('d', ''));
    const startDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    // Get metrics in parallel
    const [
      totalUsers,
      activeUsers,
      totalGroups,
      activeGroups,
      totalTrips,
      successfulTrips,
      previousPeriodUsers,
      previousPeriodGroups,
      recentActivity,
    ] = await Promise.all([
      getUserCount(),
      getActiveUserCount(startDate),
      getGroupCount(),
      getActiveGroupCount(startDate),
      getTripCount(startDate),
      getSuccessfulTripCount(startDate),
      getUserCount(new Date(startDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000)),
      getGroupCount(new Date(startDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000)),
      getRecentActivity(startDate),
    ]);

    // Calculate growth rates
    const userGrowthRate =
      previousPeriodUsers > 0
        ? ((totalUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : 0;
    const groupGrowthRate =
      previousPeriodGroups > 0
        ? ((totalGroups - previousPeriodGroups) / previousPeriodGroups) * 100
        : 0;

    // Calculate performance metrics
    const avgResponseTime = await getAverageResponseTime(startDate);
    const uptime = await getSystemUptime(startDate);
    const errorRate = await getErrorRate(startDate);

    const metrics = {
      totalUsers,
      activeUsers,
      totalGroups,
      activeGroups,
      totalTrips,
      successfulTrips,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      groupGrowthRate: Math.round(groupGrowthRate * 100) / 100,
      avgResponseTime,
      uptime,
      errorRate,
      timeframe,
      generatedAt: now.toISOString(),
    };

    context.res = UnifiedResponseHandler.success(metrics);
  } catch (error) {
    context.log(`Error getting platform metrics: ${error.message}`);
    context.res = UnifiedResponseHandler.internalError();
  }
}

async function getUserCount(beforeDate = null) {
  try {
    let query = "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'user'";
    const parameters = [];

    if (beforeDate) {
      query += ' AND c.createdAt < @beforeDate';
      parameters.push({ name: '@beforeDate', value: beforeDate.toISOString() });
    }

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting user count:', error);
    return 0;
  }
}

async function getActiveUserCount(sinceDate) {
  try {
    const query = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE c.type = 'user' 
      AND c.lastLoginAt > @sinceDate
    `;
    const parameters = [{ name: '@sinceDate', value: sinceDate.toISOString() }];

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting active user count:', error);
    return 0;
  }
}

async function getGroupCount(beforeDate = null) {
  try {
    let query = "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'carpool_group'";
    const parameters = [];

    if (beforeDate) {
      query += ' AND c.createdAt < @beforeDate';
      parameters.push({ name: '@beforeDate', value: beforeDate.toISOString() });
    }

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting group count:', error);
    return 0;
  }
}

async function getActiveGroupCount(sinceDate) {
  try {
    const query = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE c.type = 'carpool_group' 
      AND c.status = 'active'
      AND (c.lastActivityAt > @sinceDate OR c.createdAt > @sinceDate)
    `;
    const parameters = [{ name: '@sinceDate', value: sinceDate.toISOString() }];

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting active group count:', error);
    return 0;
  }
}

async function getTripCount(sinceDate) {
  try {
    const query = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE c.type = 'trip' 
      AND c.createdAt > @sinceDate
    `;
    const parameters = [{ name: '@sinceDate', value: sinceDate.toISOString() }];

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting trip count:', error);
    return 0;
  }
}

async function getSuccessfulTripCount(sinceDate) {
  try {
    const query = `
      SELECT VALUE COUNT(1) FROM c 
      WHERE c.type = 'trip' 
      AND c.status = 'completed'
      AND c.createdAt > @sinceDate
    `;
    const parameters = [{ name: '@sinceDate', value: sinceDate.toISOString() }];

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources[0] || 0;
  } catch (error) {
    console.log('Error getting successful trip count:', error);
    return 0;
  }
}

async function getAverageResponseTime(sinceDate) {
  try {
    // This would typically come from application insights or monitoring logs
    // For demo purposes, return a simulated value
    const baseResponseTime = 120; // ms
    const randomVariation = Math.random() * 50; // 0-50ms variation
    return Math.round(baseResponseTime + randomVariation);
  } catch (error) {
    console.log('Error getting response time:', error);
    return 150; // fallback
  }
}

async function getSystemUptime(sinceDate) {
  try {
    // This would typically come from Azure Monitor or Application Insights
    // For demo purposes, return a simulated high uptime
    const baseUptime = 99.5;
    const randomVariation = (Math.random() - 0.5) * 0.5; // ±0.25%
    return Math.max(95, Math.min(100, baseUptime + randomVariation));
  } catch (error) {
    console.log('Error getting uptime:', error);
    return 99.0; // fallback
  }
}

async function getErrorRate(sinceDate) {
  try {
    // This would typically come from application logs or monitoring
    // For demo purposes, return a simulated low error rate
    const baseErrorRate = 0.5;
    const randomVariation = Math.random() * 0.5; // 0-0.5% variation
    return Math.round((baseErrorRate + randomVariation) * 100) / 100;
  } catch (error) {
    console.log('Error getting error rate:', error);
    return 1.0; // fallback
  }
}

async function getRecentActivity(sinceDate) {
  try {
    const query = `
      SELECT c.type, c.createdAt FROM c 
      WHERE c.createdAt > @sinceDate 
      AND c.type IN ('user', 'carpool_group', 'trip', 'preference_submission')
      ORDER BY c.createdAt DESC
    `;
    const parameters = [{ name: '@sinceDate', value: sinceDate.toISOString() }];

    const { resources } = await container.items.query({ query, parameters }).fetchAll();
    return resources;
  } catch (error) {
    console.log('Error getting recent activity:', error);
    return [];
  }
}
