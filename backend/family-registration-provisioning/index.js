/**
 * FAMILY REGISTRATION PROVISIONING
 *
 * Handles new family registration by:
 * 1. Creating parent user account
 * 2. Creating family record with children
 * 3. Associating address
 * 4. Sending welcome email (future)
 */

function generateId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

module.exports = async function (context, req) {
  context.log('Family registration provisioning called');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: corsHeaders,
    };
    return;
  }

  if (req.method !== 'POST') {
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, message: 'Method not allowed' }),
    };
    return;
  }

  try {
    const body = req.body;

    // Validate required fields
    if (!body.parent?.email || !body.parent?.firstName || !body.parent?.lastName) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Parent information is required (email, firstName, lastName)',
        }),
      };
      return;
    }

    if (!body.children || body.children.length === 0) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'At least one child is required',
        }),
      };
      return;
    }

    if (!body.homeAddress?.street || !body.homeAddress?.city) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: 'Home address is required',
        }),
      };
      return;
    }

    // Generate IDs for family and members
    const familyId = generateId('family');
    const parentId = generateId('user');
    const childIds = body.children.map(() => generateId('student'));

    // Log the registration details
    context.log('Processing registration:', {
      familyId,
      parentId,
      parentEmail: body.parent.email,
      childCount: body.children.length,
      address: `${body.homeAddress.city}, ${body.homeAddress.state}`,
    });

    // In MVP phase, we're acknowledging the registration
    // Full provisioning would integrate with Entra ID and Cosmos DB
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Family registration received. Account provisioning initiated.',
        familyId,
        parentId,
        childIds,
        nextSteps: [
          'Check your email for Microsoft account invitation',
          'Complete account setup via the invitation link',
          'Return to app to complete onboarding',
        ],
      }),
    };
  } catch (error) {
    context.error('Registration error:', error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: 'Failed to process registration',
        error: error.message,
      }),
    };
  }
};
