const { container } = require('../src/container');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

/**
 * Fairness Tracking System for Carpool Management
 * Implements PRD requirements for transparent driving distribution tracking
 * Following tech spec: Visual fairness dashboard with manual adjustments
 */
module.exports = async function (context, req) {
  context.log('fairness-tracking HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  if (req.method !== 'GET') {
    context.res = UnifiedResponseHandler.methodNotAllowedError();
    return;
  }

  try {
    const { groupId, userId, weeksBack = 8 } = req.query;

    if (!groupId) {
      context.res = UnifiedResponseHandler.validationError('Group ID is required');
      return;
    }

    if (!userId) {
      context.res = UnifiedResponseHandler.validationError('User ID is required');
      return;
    }

    // Verify user access to group
    const accessCheck = await verifyGroupAccess(groupId, userId, context);
    if (!accessCheck.hasAccess) {
      context.res = UnifiedResponseHandler.forbiddenError(accessCheck.message);
      return;
    }

    // Generate comprehensive fairness report
    const fairnessReport = await generateFairnessReport(groupId, parseInt(weeksBack), context);

    context.res = UnifiedResponseHandler.success({
      groupId,
      reportPeriod: {
        weeksBack: parseInt(weeksBack),
        startDate: fairnessReport.periodStart,
        endDate: fairnessReport.periodEnd,
      },
      ...fairnessReport,
    });
  } catch (error) {
    context.log('Error in fairness-tracking', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

/**
 * Verify user has access to view fairness data for this group
 */
async function verifyGroupAccess(groupId, userId, context) {
  try {
    // Check if user is member of the group
    const memberQuery = {
      query: `
        SELECT g.*, m.role as memberRole 
        FROM c g 
        JOIN m IN g.members 
        WHERE g.id = @groupId AND g.type = 'carpool_group' AND m.userId = @userId
      `,
      parameters: [
        { name: '@groupId', value: groupId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources: membership } = await container.items.query(memberQuery).fetchAll();

    if (membership.length === 0) {
      // Check if user is Super Admin
      const userQuery = {
        query: "SELECT * FROM c WHERE c.id = @userId AND c.type = 'user' AND c.role = 'admin'",
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources: users } = await container.items.query(userQuery).fetchAll();
      if (users.length > 0) {
        return { hasAccess: true, role: 'super_admin' };
      }

      return { hasAccess: false, message: 'User is not a member of this group' };
    }

    return { hasAccess: true, role: membership[0].memberRole };
  } catch (error) {
    context.log(`Error verifying group access: ${error.message}`);
    return { hasAccess: false, message: 'Error verifying access' };
  }
}

/**
 * Generate comprehensive fairness report for the group
 */
async function generateFairnessReport(groupId, weeksBack, context) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeksBack * 7);

  try {
    // Get group information and members
    const groupQuery = {
      query: "SELECT * FROM c WHERE c.id = @groupId AND c.type = 'carpool_group'",
      parameters: [{ name: '@groupId', value: groupId }],
    };

    const { resources: groups } = await container.items.query(groupQuery).fetchAll();
    if (groups.length === 0) {
      throw new Error('Group not found');
    }

    const group = groups[0];

    // Get all driving assignments in the period
    const assignmentsQuery = {
      query: `
        SELECT * FROM c 
        WHERE c.type = 'ride_assignment' 
        AND c.groupId = @groupId 
        AND c.weekStartDate >= @startDate 
        AND c.weekStartDate <= @endDate
        ORDER BY c.weekStartDate, c.dayOfWeek
      `,
      parameters: [
        { name: '@groupId', value: groupId },
        { name: '@startDate', value: startDate.toISOString().split('T')[0] },
        { name: '@endDate', value: endDate.toISOString().split('T')[0] },
      ],
    };

    const { resources: assignments } = await container.items.query(assignmentsQuery).fetchAll();

    // Calculate fairness metrics
    const fairnessMetrics = calculateFairnessMetrics(group, assignments, weeksBack);

    // Get historical fairness scores
    const historicalScores = await getHistoricalFairnessScores(groupId, weeksBack, context);

    // Generate recommendations
    const recommendations = generateFairnessRecommendations(fairnessMetrics, group);

    return {
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      groupInfo: {
        id: group.id,
        name: group.name,
        memberCount: group.members?.length || 0,
        activeDrivers: fairnessMetrics.activeDrivers,
      },
      fairnessMetrics,
      historicalScores,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    context.log(`Error generating fairness report: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate comprehensive fairness metrics
 */
function calculateFairnessMetrics(group, assignments, weeksBack) {
  const members = group.members || [];
  const driverStats = {};

  // Initialize driver statistics
  members.forEach((member) => {
    if (member.drivingPreferences?.canDrive) {
      driverStats[member.userId] = {
        userId: member.userId,
        userName: member.user?.firstName + ' ' + member.user?.lastName || 'Unknown',
        totalTrips: 0,
        weeklyBreakdown: {},
        expectedTrips: 0,
        fairnessScore: 0,
        isActive: false,
      };
    }
  });

  // Count actual trips by driver
  assignments.forEach((assignment) => {
    if (assignment.driverParentId && driverStats[assignment.driverParentId]) {
      driverStats[assignment.driverParentId].totalTrips++;
      driverStats[assignment.driverParentId].isActive = true;

      const week = assignment.weekStartDate;
      if (!driverStats[assignment.driverParentId].weeklyBreakdown[week]) {
        driverStats[assignment.driverParentId].weeklyBreakdown[week] = 0;
      }
      driverStats[assignment.driverParentId].weeklyBreakdown[week]++;
    }
  });

  // Calculate expected trips (equal distribution)
  const activeDrivers = Object.values(driverStats).filter((d) => d.isActive).length;
  const totalTrips = assignments.length;
  const expectedTripsPerDriver = activeDrivers > 0 ? totalTrips / activeDrivers : 0;

  // Calculate fairness scores
  Object.keys(driverStats).forEach((driverId) => {
    const driver = driverStats[driverId];
    driver.expectedTrips = expectedTripsPerDriver;

    if (expectedTripsPerDriver > 0) {
      // Fairness score: 1.0 = perfectly fair, <1.0 = under-driving, >1.0 = over-driving
      driver.fairnessScore = driver.totalTrips / expectedTripsPerDriver;
    }
  });

  // Calculate group-level fairness metrics
  const activeDrivingStats = Object.values(driverStats).filter((d) => d.isActive);
  const tripCounts = activeDrivingStats.map((d) => d.totalTrips);

  const groupFairnessScore = calculateGroupFairnessScore(tripCounts);
  const coefficientOfVariation = calculateCoefficientOfVariation(tripCounts);

  return {
    totalTrips,
    totalWeeks: weeksBack,
    activeDrivers: activeDrivers,
    driverStatistics: Object.values(driverStats),
    groupFairnessScore,
    coefficientOfVariation,
    fairnessLevel: getFairnessLevel(groupFairnessScore),
    tripDistribution: {
      min: Math.min(...tripCounts),
      max: Math.max(...tripCounts),
      average: expectedTripsPerDriver,
      standardDeviation: calculateStandardDeviation(tripCounts),
    },
  };
}

/**
 * Calculate group fairness score (Gini coefficient inspired)
 */
function calculateGroupFairnessScore(tripCounts) {
  if (tripCounts.length <= 1) return 1.0;

  const n = tripCounts.length;
  const mean = tripCounts.reduce((sum, count) => sum + count, 0) / n;

  if (mean === 0) return 1.0;

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      giniSum += Math.abs(tripCounts[i] - tripCounts[j]);
    }
  }

  const giniCoefficient = giniSum / (2 * n * n * mean);
  return Math.max(0, 1 - giniCoefficient); // Convert to fairness score (1 = perfectly fair)
}

/**
 * Calculate coefficient of variation
 */
function calculateCoefficientOfVariation(tripCounts) {
  if (tripCounts.length === 0) return 0;

  const mean = tripCounts.reduce((sum, count) => sum + count, 0) / tripCounts.length;
  if (mean === 0) return 0;

  const standardDev = calculateStandardDeviation(tripCounts);
  return standardDev / mean;
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(tripCounts) {
  if (tripCounts.length === 0) return 0;

  const mean = tripCounts.reduce((sum, count) => sum + count, 0) / tripCounts.length;
  const squaredDiffs = tripCounts.map((count) => Math.pow(count - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / tripCounts.length;
  return Math.sqrt(variance);
}

/**
 * Get fairness level description
 */
function getFairnessLevel(fairnessScore) {
  if (fairnessScore >= 0.9) return { level: 'excellent', description: 'Very fair distribution' };
  if (fairnessScore >= 0.8) return { level: 'good', description: 'Generally fair distribution' };
  if (fairnessScore >= 0.7) return { level: 'moderate', description: 'Some imbalance present' };
  if (fairnessScore >= 0.6) return { level: 'concerning', description: 'Significant imbalance' };
  return { level: 'poor', description: 'Major fairness issues' };
}

/**
 * Get historical fairness scores for trend analysis
 */
async function getHistoricalFairnessScores(groupId, weeksBack, context) {
  try {
    // For beta, calculate weekly fairness scores
    const historicalScores = [];
    const endDate = new Date();

    for (let weekOffset = 0; weekOffset < weeksBack; weekOffset++) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - weekOffset * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      // Get assignments for this week
      const weekQuery = {
        query: `
          SELECT * FROM c 
          WHERE c.type = 'ride_assignment' 
          AND c.groupId = @groupId 
          AND c.weekStartDate >= @startDate 
          AND c.weekStartDate < @endDate
        `,
        parameters: [
          { name: '@groupId', value: groupId },
          { name: '@startDate', value: weekStart.toISOString().split('T')[0] },
          { name: '@endDate', value: weekEnd.toISOString().split('T')[0] },
        ],
      };

      const { resources: weekAssignments } = await container.items.query(weekQuery).fetchAll();

      if (weekAssignments.length > 0) {
        // Calculate fairness for this week
        const driverCounts = {};
        weekAssignments.forEach((assignment) => {
          if (assignment.driverParentId) {
            driverCounts[assignment.driverParentId] =
              (driverCounts[assignment.driverParentId] || 0) + 1;
          }
        });

        const tripCounts = Object.values(driverCounts);
        const weekFairnessScore = calculateGroupFairnessScore(tripCounts);

        historicalScores.unshift({
          weekStartDate: weekStart.toISOString().split('T')[0],
          weekEndDate: weekEnd.toISOString().split('T')[0],
          fairnessScore: weekFairnessScore,
          totalTrips: weekAssignments.length,
          activeDrivers: Object.keys(driverCounts).length,
        });
      }
    }

    return historicalScores;
  } catch (error) {
    context.log(`Error getting historical fairness scores: ${error.message}`);
    return [];
  }
}

/**
 * Generate fairness improvement recommendations
 */
function generateFairnessRecommendations(metrics, group) {
  const recommendations = [];

  const { driverStatistics, groupFairnessScore, fairnessLevel } = metrics;

  // Identify over-driving and under-driving
  const overDrivers = driverStatistics.filter((d) => d.isActive && d.fairnessScore > 1.2);
  const underDrivers = driverStatistics.filter((d) => d.isActive && d.fairnessScore < 0.8);

  if (overDrivers.length > 0) {
    recommendations.push({
      type: 'over_driving',
      priority: 'medium',
      title: 'Some drivers are carrying extra load',
      description: `${overDrivers
        .map((d) => d.userName)
        .join(', ')} have driven significantly more than average.`,
      action: 'Consider giving these drivers preference for "unavailable" slots in upcoming weeks.',
      drivers: overDrivers.map((d) => ({
        userId: d.userId,
        userName: d.userName,
        currentRatio: d.fairnessScore,
      })),
    });
  }

  if (underDrivers.length > 0) {
    recommendations.push({
      type: 'under_driving',
      priority: 'medium',
      title: 'Some drivers need to contribute more',
      description: `${underDrivers
        .map((d) => d.userName)
        .join(', ')} have driven less than their fair share.`,
      action: 'Consider prioritizing these drivers for assignments in upcoming weeks.',
      drivers: underDrivers.map((d) => ({
        userId: d.userId,
        userName: d.userName,
        currentRatio: d.fairnessScore,
      })),
    });
  }

  if (groupFairnessScore < 0.7) {
    recommendations.push({
      type: 'group_fairness',
      priority: 'high',
      title: 'Group fairness needs attention',
      description: `Current fairness level is ${fairnessLevel.level} (${(
        groupFairnessScore * 100
      ).toFixed(1)}%).`,
      action: 'Review driving assignments and consider manual adjustments to balance the load.',
      suggestedActions: [
        'Review individual driver statistics',
        'Adjust algorithm weights for upcoming schedules',
        'Discuss fairness expectations with the group',
      ],
    });
  }

  if (metrics.activeDrivers < 3) {
    recommendations.push({
      type: 'driver_availability',
      priority: 'high',
      title: 'Need more active drivers',
      description: `Only ${metrics.activeDrivers} drivers are actively participating.`,
      action:
        'Encourage more group members to participate in driving or recruit additional families.',
      suggestedActions: [
        'Reach out to non-driving members',
        'Consider recruiting new families',
        'Review group requirements',
      ],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'all_good',
      priority: 'low',
      title: 'Fairness looks great!',
      description: `Your group maintains ${fairnessLevel.level} fairness with a score of ${(
        groupFairnessScore * 100
      ).toFixed(1)}%.`,
      action: 'Keep up the good work with current scheduling practices.',
      suggestedActions: [
        'Continue current scheduling approach',
        'Monitor trends in upcoming weeks',
      ],
    });
  }

  return recommendations;
}
