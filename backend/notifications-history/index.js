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

  const userId = req.query.userId;
  const limit = parseInt(req.query.limit || "20", 10);
  if (!userId) {
    context.res = UnifiedResponseHandler.validationError("userId query param required");
    return;
  }

  try {
    const notificationService = container.notificationService;
    const { notifications } = await notificationService.getUserNotifications(userId, {
      read: false,
      limit,
    });
    context.res = UnifiedResponseHandler.success({ notifications });
  } catch (err) {
    context.log.error("Error fetching notifications", err);
    context.res = UnifiedResponseHandler.internalError();
  }
}; 