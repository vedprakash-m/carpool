module.exports = async function (context, req) {
  context.log('Test health function executed');

  context.res = {
    status: 200,
    body: {
      message: 'Hello from Azure Functions!',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
};
