module.exports = function (context, req) {
  context.log('Unified authentication endpoint called');

  try {
    context.log('Processing request method:', req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      context.res = {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
      };
      context.done();
      return;
    }

    // Very basic response for now
    context.res = {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Auth endpoint is working',
        method: req.method,
        timestamp: new Date().toISOString(),
      }),
    };
    context.done();
  } catch (error) {
    context.log.error('Error in auth endpoint:', error);

    context.res = {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
      }),
    };
    context.done();
  }
};
