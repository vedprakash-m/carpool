module.exports = function (context, req) {
  context.log('Unified authentication endpoint called');

  try {
    context.log('Processing request method:', req.method);

    // Very basic response for now
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: true,
        message: 'Auth endpoint is working',
        method: req.method,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    context.log.error('Error in auth endpoint:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: {
        success: false,
        message: 'Internal server error',
        error: error.message,
      },
    };
  }
};
