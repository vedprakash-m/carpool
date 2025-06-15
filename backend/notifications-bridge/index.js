const { WebPubSubServiceClient } = require("@azure/web-pubsub");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (context, notification) {
  context.log("notifications-bridge SB trigger invoked", notification);

  const hub = process.env.WEB_PUBSUB_HUB || "vc-notify";
  const endpoint = process.env.WEB_PUBSUB_CONNECTION || "";

  if (!endpoint) {
    context.log.warn("WEB_PUBSUB_CONNECTION not configured – skipping publish");
    return;
  }

  const serviceClient = new WebPubSubServiceClient(endpoint, hub);

  try {
    // broadcast to all; later we can send to specific group/user using enrichers
    await serviceClient.sendToAll(JSON.stringify({ ...notification, id: uuidv4() }), {
      contentType: "application/json",
    });
    context.log("Notification relayed to Web PubSub");
  } catch (err) {
    context.log.error("Error relaying notification", err);
  }
}; 