module.exports = async function (context, req) {
  context.log('JavaScript HTTP trigger function processed a request.');

  const responseMessage = {
    message: 'Hello from Carpool API!',
    timestamp: new Date().toISOString(),
    status: 'healthy',
  };

  context.res = {
    status: 200,
    body: responseMessage,
  };
};
