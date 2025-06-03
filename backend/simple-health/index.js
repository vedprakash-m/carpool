module.exports = async function (context, req) {
  context.log("Simple health function processed a request.");

  const responseMessage = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "VCarpool API is running",
  };

  context.res = {
    status: 200,
    body: responseMessage,
    headers: {
      "Content-Type": "application/json",
    },
  };
};
