/**
 * Family Registration with Microsoft Account Provisioning
 *
 * This endpoint handles the complete family registration process:
 * 1. Collect family and children information
 * 2. Provision Microsoft accounts for parent and children in VED domain
 * 3. Send welcome emails with login instructions
 * 4. Store family data in Cosmos DB
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { userProvisioningService } from '../src/services/user-provisioning.service';
import { databaseService } from '../src/services/database.service';
import { notificationService } from '../src/services/notification.service';
import { v4 as uuidv4 } from 'uuid';

interface FamilyRegistrationRequest {
  familyName: string;
  parent: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  homeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  children: Array<{
    firstName: string;
    lastName: string;
    grade: string;
    school: string;
    birthDate?: string;
  }>;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export async function familyRegistrationWithProvisioning(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Family registration with Microsoft provisioning started');

  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      };
    }

    if (request.method !== 'POST') {
      return {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Method not allowed',
        }),
      };
    }

    const body = (await request.json()) as FamilyRegistrationRequest;

    // Validate required fields
    if (!body.familyName || !body.parent || !body.children || body.children.length === 0) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: familyName, parent, and at least one child',
        }),
      };
    }

    // Generate unique family ID
    const familyId = uuidv4();

    context.log('Starting Microsoft account provisioning for family:', familyId);

    // Step 1: Check if parent email already exists
    const parentExists = await userProvisioningService.userExists(body.parent.email);
    if (parentExists) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'A Microsoft account with this email already exists',
        }),
      };
    }

    // Step 2: Provision Microsoft accounts for the entire family
    const provisioningResult = await userProvisioningService.provisionFamily({
      familyId,
      parent: body.parent,
      children: body.children,
    });

    // Check if provisioning was successful
    if (!provisioningResult.parent.success) {
      context.log('Parent provisioning failed:', provisioningResult.parent.error);
      return {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Failed to create parent Microsoft account',
          error: provisioningResult.parent.error,
        }),
      };
    }

    // Check for child provisioning failures
    const failedChildren = provisioningResult.children.filter((child) => !child.success);
    if (failedChildren.length > 0) {
      context.log('Some children provisioning failed:', failedChildren);
      // You might want to implement partial success handling here
    }

    // Step 3: Store family data in Cosmos DB
    const familyRecord = {
      id: familyId,
      familyName: body.familyName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      parent: {
        microsoftUserId: provisioningResult.parent.microsoftUserId,
        firstName: body.parent.firstName,
        lastName: body.parent.lastName,
        email: body.parent.email,
        phone: body.parent.phone,
        role: 'parent',
      },
      children: body.children.map((child, index) => ({
        microsoftUserId: provisioningResult.children[index]?.microsoftUserId,
        firstName: child.firstName,
        lastName: child.lastName,
        grade: child.grade,
        school: child.school,
        birthDate: child.birthDate,
        email: provisioningResult.children[index]?.email,
        role: 'student',
        provisioningSuccess: provisioningResult.children[index]?.success || false,
      })),
      homeAddress: body.homeAddress,
      emergencyContact: body.emergencyContact,
    };

    await databaseService.createFamily(familyRecord);

    // Step 4: Send welcome emails with login instructions
    try {
      await notificationService.sendWelcomeEmail({
        parentEmail: body.parent.email,
        parentName: `${body.parent.firstName} ${body.parent.lastName}`,
        temporaryPassword: provisioningResult.parent.temporaryPassword!,
        children: provisioningResult.children
          .filter((child) => child.success)
          .map((child) => ({
            email: child.email,
            temporaryPassword: child.temporaryPassword!,
          })),
        familyId,
      });
    } catch (emailError) {
      context.log('Warning: Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    context.log('Family registration completed successfully:', familyId);

    return {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Family registered successfully',
        familyId,
        accounts: {
          parent: {
            email: provisioningResult.parent.email,
            microsoftUserId: provisioningResult.parent.microsoftUserId,
            temporaryPassword: provisioningResult.parent.temporaryPassword,
          },
          children: provisioningResult.children
            .filter((child) => child.success)
            .map((child) => ({
              email: child.email,
              microsoftUserId: child.microsoftUserId,
              temporaryPassword: child.temporaryPassword,
            })),
        },
        nextSteps: [
          '1. Check your email for login instructions',
          '2. Sign in to carpool.vedprakash.net with your Microsoft account',
          '3. Change your temporary password when prompted',
          '4. Complete your family profile setup',
        ],
      }),
    };
  } catch (error: any) {
    context.log('Family registration failed:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Registration failed',
        error: error.message,
      }),
    };
  }
}
