module.exports = async function (context, req) {
  context.log("Health function processed a request.");

  const responseMessage = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "VCarpool API is running",
    environment: process.env.NODE_ENV || "development",
    version: process.env.VERSION || "1.0.0",
  };

  context.res = {
    status: 200,
    body: responseMessage,
    headers: {
      "Content-Type": "application/json",
    },
  };
};
