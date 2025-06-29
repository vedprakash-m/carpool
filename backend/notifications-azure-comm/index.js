const { EmailClient } = require('@azure/communication-email');
const { SmsClient } = require('@azure/communication-sms');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

/**
 * Azure Communication Services Integration for Carpool Notifications
 * Implements PRD requirements for enterprise-grade email/SMS delivery
 * Following tech spec: Azure Communication Services with delivery tracking
 */
module.exports = async function (context, req) {
  context.log('notifications-azure-comm HTTP trigger invoked');

  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  if (req.method !== 'POST') {
    context.res = UnifiedResponseHandler.methodNotAllowedError();
    return;
  }

  try {
    const { recipients, templateName, data, channel, priority } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      context.res = UnifiedResponseHandler.validationError('Recipients array is required');
      return;
    }

    if (!templateName) {
      context.res = UnifiedResponseHandler.validationError('Template name is required');
      return;
    }

    if (!channel || !['email', 'sms', 'both'].includes(channel)) {
      context.res = UnifiedResponseHandler.validationError(
        "Channel must be 'email', 'sms', or 'both'",
      );
      return;
    }

    context.log(
      `Processing notification: ${templateName} to ${recipients.length} recipients via ${channel}`,
    );

    const results = {
      email: null,
      sms: null,
      timestamp: new Date().toISOString(),
      templateName,
      recipientCount: recipients.length,
    };

    // Initialize Azure Communication Services clients
    const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
    if (!connectionString) {
      context.res = UnifiedResponseHandler.configurationError(
        'Azure Communication Services not configured',
      );
      return;
    }

    // Send email notifications
    if (channel === 'email' || channel === 'both') {
      try {
        const emailClient = new EmailClient(connectionString);
        results.email = await sendBulkEmails(emailClient, recipients, templateName, data, context);
        context.log(`Email delivery initiated for ${recipients.length} recipients`);
      } catch (error) {
        context.log(`Email delivery failed: ${error.message}`);
        results.email = { error: error.message };
      }
    }

    // Send SMS notifications
    if (channel === 'sms' || channel === 'both') {
      try {
        const smsClient = new SmsClient(connectionString);
        results.sms = await sendBulkSMS(smsClient, recipients, templateName, data, context);
        context.log(`SMS delivery initiated for ${recipients.length} recipients`);
      } catch (error) {
        context.log(`SMS delivery failed: ${error.message}`);
        results.sms = { error: error.message };
      }
    }

    // Store delivery tracking information
    await trackDelivery(
      {
        templateName,
        recipients: recipients.length,
        channel,
        priority,
        results,
        timestamp: results.timestamp,
      },
      context,
    );

    context.res = UnifiedResponseHandler.success({
      message: 'Notification delivery initiated',
      results,
      deliveryId: generateDeliveryId(templateName, results.timestamp),
    });
  } catch (error) {
    context.log('Error in notifications-azure-comm', error);
    context.res = UnifiedResponseHandler.internalError();
  }
};

/**
 * Send bulk email notifications using Azure Communication Services
 */
async function sendBulkEmails(emailClient, recipients, templateName, data, context) {
  const template = getEmailTemplate(templateName, data);
  const fromAddress = process.env.AZURE_COMM_EMAIL_FROM;

  if (!fromAddress) {
    throw new Error('AZURE_COMM_EMAIL_FROM environment variable not configured');
  }

  const results = [];

  for (const recipient of recipients) {
    try {
      const message = {
        senderAddress: fromAddress,
        content: {
          subject: template.subject,
          html: template.html,
          plainText: template.text,
        },
        recipients: {
          to: [{ address: recipient.email, displayName: recipient.name || '' }],
        },
      };

      const poller = await emailClient.beginSend(message);
      const result = await poller.pollUntilDone();

      results.push({
        recipient: recipient.email,
        messageId: result.id,
        status: result.status,
        timestamp: new Date().toISOString(),
      });

      context.log(`Email queued for ${recipient.email}: ${result.id}`);
    } catch (error) {
      results.push({
        recipient: recipient.email,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      context.log(`Email failed for ${recipient.email}: ${error.message}`);
    }
  }

  return {
    deliveredCount: results.filter((r) => !r.error).length,
    failedCount: results.filter((r) => r.error).length,
    details: results,
  };
}

/**
 * Send bulk SMS notifications using Azure Communication Services
 */
async function sendBulkSMS(smsClient, recipients, templateName, data, context) {
  const template = getSmsTemplate(templateName, data);
  const fromNumber = process.env.AZURE_COMM_SMS_FROM;

  if (!fromNumber) {
    throw new Error('AZURE_COMM_SMS_FROM environment variable not configured');
  }

  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await smsClient.send({
        from: fromNumber,
        to: [recipient.phone],
        message: template.message,
      });

      results.push({
        recipient: recipient.phone,
        messageId: result[0].messageId,
        status: result[0].httpStatusCode === 202 ? 'sent' : 'failed',
        timestamp: new Date().toISOString(),
      });

      context.log(`SMS queued for ${recipient.phone}: ${result[0].messageId}`);
    } catch (error) {
      results.push({
        recipient: recipient.phone,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      context.log(`SMS failed for ${recipient.phone}: ${error.message}`);
    }
  }

  return {
    deliveredCount: results.filter((r) => !r.error).length,
    failedCount: results.filter((r) => r.error).length,
    details: results,
  };
}

/**
 * Get email template for notification type
 */
function getEmailTemplate(templateName, data) {
  const templates = {
    schedule_reminder: {
      subject: 'Carpool Schedule Reminder - Please Submit Your Preferences',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Carpool Schedule Reminder</h2>
          <p>Hi ${data.parentName || 'Parent'},</p>
          <p>This is a friendly reminder to submit your driving preferences for the week of <strong>${
            data.weekStartDate
          }</strong>.</p>
          <p><strong>Deadline:</strong> Saturday 10:00 PM</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Group:</strong> ${data.groupName}</p>
            <p><strong>Children:</strong> ${data.childrenNames}</p>
          </div>
          <a href="${
            data.preferencesUrl
          }" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Submit Preferences</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            Tesla STEM Carpool Management System
          </p>
        </div>
      `,
      text: `Carpool Schedule Reminder\n\nHi ${
        data.parentName || 'Parent'
      },\n\nPlease submit your driving preferences for the week of ${
        data.weekStartDate
      }.\nDeadline: Saturday 10:00 PM\n\nGroup: ${data.groupName}\nChildren: ${
        data.childrenNames
      }\n\nSubmit at: ${data.preferencesUrl}\n\nTesla STEM Carpool Management System`,
    },
    schedule_generated: {
      subject: 'Your Carpool Schedule is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Your Carpool Schedule is Ready</h2>
          <p>Hi ${data.parentName || 'Parent'},</p>
          <p>The carpool schedule for the week of <strong>${
            data.weekStartDate
          }</strong> has been generated.</p>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin-top: 0;">Your Assignments:</h3>
            ${data.assignments || '<p>No driving assignments this week.</p>'}
          </div>
          <a href="${
            data.scheduleUrl
          }" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Schedule</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            Tesla STEM Carpool Management System
          </p>
        </div>
      `,
      text: `Your Carpool Schedule is Ready\n\nHi ${
        data.parentName || 'Parent'
      },\n\nThe carpool schedule for the week of ${
        data.weekStartDate
      } has been generated.\n\nYour Assignments:\n${
        data.assignmentsText || 'No driving assignments this week.'
      }\n\nView at: ${data.scheduleUrl}\n\nTesla STEM Carpool Management System`,
    },
    emergency_notification: {
      subject: '🚨 Carpool Emergency Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 8px; padding: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">🚨 Emergency Notification</h2>
          <p><strong>Urgent:</strong> ${data.message}</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Group:</strong> ${data.groupName}</p>
            <p><strong>Time:</strong> ${data.timestamp}</p>
            <p><strong>Contact:</strong> ${data.contactInfo}</p>
          </div>
          <p style="color: #dc2626; font-weight: bold;">Please respond immediately if you can assist.</p>
        </div>
      `,
      text: `🚨 CARPOOL EMERGENCY\n\nUrgent: ${data.message}\n\nGroup: ${data.groupName}\nTime: ${data.timestamp}\nContact: ${data.contactInfo}\n\nPlease respond immediately if you can assist.`,
    },
    safety_report: {
      subject: 'Safety Report Received - Carpool Group',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d97706;">Safety Report Notification</h2>
          <p>A safety report has been submitted for your carpool group.</p>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Group:</strong> ${data.groupName}</p>
            <p><strong>Report Type:</strong> ${data.reportType}</p>
            <p><strong>Submitted:</strong> ${data.timestamp}</p>
          </div>
          <a href="${data.reviewUrl}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Report</a>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            This report requires your attention as Group Admin.
          </p>
        </div>
      `,
      text: `Safety Report Notification\n\nA safety report has been submitted for your carpool group.\n\nGroup: ${data.groupName}\nReport Type: ${data.reportType}\nSubmitted: ${data.timestamp}\n\nReview at: ${data.reviewUrl}\n\nThis report requires your attention as Group Admin.`,
    },
  };

  return (
    templates[templateName] || {
      subject: 'Carpool Notification',
      html: `<p>${data.message || 'You have a new carpool notification.'}</p>`,
      text: data.message || 'You have a new carpool notification.',
    }
  );
}

/**
 * Get SMS template for notification type
 */
function getSmsTemplate(templateName, data) {
  const templates = {
    schedule_reminder: {
      message: `Carpool reminder: Submit preferences for ${data.weekStartDate} by Saturday 10 PM. Group: ${data.groupName}. Link: ${data.preferencesUrl}`,
    },
    schedule_generated: {
      message: `Carpool schedule ready for ${data.weekStartDate}. ${
        data.assignmentSummary || 'Check app for details'
      }. View: ${data.scheduleUrl}`,
    },
    emergency_notification: {
      message: `🚨 CARPOOL EMERGENCY: ${data.message}. Group: ${data.groupName}. Contact: ${data.contactInfo}. Respond if you can help.`,
    },
    swap_request: {
      message: `Carpool swap request: ${data.requesterName} needs coverage for ${data.date}. ${data.timeSlot}. Respond: ${data.responseUrl}`,
    },
  };

  return (
    templates[templateName] || {
      message: data.message || 'You have a new carpool notification.',
    }
  );
}

/**
 * Track delivery for monitoring and retry purposes
 */
async function trackDelivery(deliveryInfo, context) {
  try {
    // Store in database for tracking (simplified for beta)
    context.log(`Delivery tracking: ${JSON.stringify(deliveryInfo)}`);

    // TODO: Store in Cosmos DB for full tracking
    // await container.items.create({
    //   id: deliveryInfo.deliveryId,
    //   type: 'notification_delivery',
    //   ...deliveryInfo,
    //   createdAt: new Date().toISOString()
    // });
  } catch (error) {
    context.log(`Failed to track delivery: ${error.message}`);
  }
}

/**
 * Generate unique delivery ID for tracking
 */
function generateDeliveryId(templateName, timestamp) {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toISOString().slice(11, 19).replace(/:/g, '');
  return `${templateName}_${dateStr}_${timeStr}_${Math.random().toString(36).substr(2, 9)}`;
}
