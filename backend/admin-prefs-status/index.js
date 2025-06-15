const { container } = require("../src/container");
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }
  if (req.method !== "GET") {
    context.res = UnifiedResponseHandler.methodNotAllowedError();
    return;
  }

  const groupId = req.query.groupId;
  const weekStart = req.query.weekStartDate; // ISO Monday date
  if (!groupId || !weekStart) {
    context.res = UnifiedResponseHandler.validationError("groupId and weekStartDate query params required");
    return;
  }

  try {
    const prefRepo = container.preferenceRepository;
    const familyRepo = container.familyRepository;

    const allFamilies = await familyRepo.findByGroupId(groupId); // assume exists
    const prefs = await prefRepo.getByGroupAndWeek(groupId, weekStart);

    const submittedFamilyIds = new Set(prefs.map((p) => p.parentId));
    const completeness = Math.round((submittedFamilyIds.size / allFamilies.length) * 100);

    context.res = UnifiedResponseHandler.success({
      groupId,
      weekStartDate: weekStart,
      totalFamilies: allFamilies.length,
      submitted: submittedFamilyIds.size,
      completenessPercentage: completeness,
    });
  } catch (err) {
    context.log.error("Error computing prefs status", err);
    context.res = UnifiedResponseHandler.internalError();
  }
}; 