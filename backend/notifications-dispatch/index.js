const { container } = require("../src/container");
const notificationService = container.notificationService;
const UnifiedResponseHandler = require("../src/utils/unified-response.service");

module.exports = async function (context, req) {
  context.log("notifications-dispatch HTTP trigger invoked");

  if (req.method === "OPTIONS") {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  if (req.method !== "POST") {
    context.res = UnifiedResponseHandler.methodNotAllowedError();
    return;
  }

  try {
    const { type, payload, targetUserIds, groupId } = req.body;
    if (!type) {
      context.res = UnifiedResponseHandler.validationError("Notification type is required");
      return;
    }

    await notificationService.enqueueNotification({
      type,
      payload,
      targetUserIds,
      groupId,
    });

    context.res = UnifiedResponseHandler.success({ message: "Notification enqueued" });
  } catch (error) {
    context.log("Error dispatching notification", error);
    context.res = UnifiedResponseHandler.internalError();
  }
}; 