const { CosmosClient } = require("@azure/cosmos");

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

module.exports = async function (context, req) {
  context.log("Admin Schedule Templates API called");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: "",
    };
    return;
  }

  try {
    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        status: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid authorization token",
          },
        }),
      };
    }

    // TODO: Verify admin role from JWT token
    const token = authHeader.split(" ")[1];

    // Initialize Cosmos DB (use environment variables or fallback to mock)
    let cosmosClient = null;
    let templatesContainer = null;

    if (process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY) {
      cosmosClient = new CosmosClient({
        endpoint: process.env.COSMOS_DB_ENDPOINT,
        key: process.env.COSMOS_DB_KEY,
      });
      const database = cosmosClient.database("vcarpool");
      templatesContainer = database.container("scheduleTemplates");
    }

    const templateId = req.params.id;
    const method = req.method.toUpperCase();

    switch (method) {
      case "GET":
        return await handleGet(templatesContainer, templateId, context);
      case "POST":
        return await handlePost(templatesContainer, req, context);
      case "PUT":
        return await handlePut(templatesContainer, templateId, req, context);
      case "DELETE":
        return await handleDelete(templatesContainer, templateId, context);
      default:
        return {
          status: 405,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "METHOD_NOT_ALLOWED",
              message: `Method ${method} not allowed`,
            },
          }),
        };
    }
  } catch (error) {
    context.log.error("Template management error:", error);
    return {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          details: error.message,
        },
      }),
    };
  }
};

// GET handler - List all templates or get specific template
async function handleGet(container, templateId, context) {
  try {
    if (templateId) {
      // Get specific template
      if (container) {
        const { resource: template } = await container
          .item(templateId, templateId)
          .read();
        if (!template) {
          return {
            status: 404,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: {
                code: "TEMPLATE_NOT_FOUND",
                message: "Schedule template not found",
              },
            }),
          };
        }
        return {
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: template,
          }),
        };
      } else {
        // Mock single template
        const mockTemplate = getMockTemplates().find(
          (t) => t.id === templateId
        );
        if (!mockTemplate) {
          return {
            status: 404,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: {
                code: "TEMPLATE_NOT_FOUND",
                message: "Schedule template not found",
              },
            }),
          };
        }
        return {
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: mockTemplate,
          }),
        };
      }
    } else {
      // List all templates
      if (container) {
        const { resources: templates } = await container.items
          .query("SELECT * FROM c ORDER BY c.dayOfWeek, c.startTime")
          .fetchAll();

        return {
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: templates,
            pagination: {
              total: templates.length,
              page: 1,
              limit: templates.length,
            },
          }),
        };
      } else {
        // Mock templates
        const mockTemplates = getMockTemplates();
        return {
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: mockTemplates,
            pagination: {
              total: mockTemplates.length,
              page: 1,
              limit: mockTemplates.length,
            },
          }),
        };
      }
    }
  } catch (error) {
    context.log.error("Get templates error:", error);
    throw error;
  }
}

// POST handler - Create new template
async function handlePost(container, req, context) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Validate required fields
    const requiredFields = [
      "dayOfWeek",
      "startTime",
      "endTime",
      "routeType",
      "description",
      "maxPassengers",
    ];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return {
          status: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Missing required field: ${field}`,
            },
          }),
        };
      }
    }

    // Validate day of week (0-6)
    if (body.dayOfWeek < 0 || body.dayOfWeek > 6) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "dayOfWeek must be between 0 (Sunday) and 6 (Saturday)",
          },
        }),
      };
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.startTime) || !timeRegex.test(body.endTime)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "startTime and endTime must be in HH:MM format",
          },
        }),
      };
    }

    // Validate route type
    const validRouteTypes = [
      "school_dropoff",
      "school_pickup",
      "multi_stop",
      "point_to_point",
    ];
    if (!validRouteTypes.includes(body.routeType)) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "routeType must be one of: " + validRouteTypes.join(", "),
          },
        }),
      };
    }

    // Create template object
    const template = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      routeType: body.routeType,
      description: body.description,
      locationId: body.locationId || null,
      maxPassengers: body.maxPassengers,
      isActive: body.isActive !== false, // Default to true
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (container) {
      // Save to Cosmos DB
      const { resource: createdTemplate } = await container.items.create(
        template
      );
      context.log("Template created:", createdTemplate.id);

      return {
        status: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: createdTemplate,
          message: "Schedule template created successfully",
        }),
      };
    } else {
      // Mock creation
      context.log("Mock template created:", template.id);
      return {
        status: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: template,
          message: "Schedule template created successfully (mock mode)",
        }),
      };
    }
  } catch (error) {
    context.log.error("Create template error:", error);
    throw error;
  }
}

// PUT handler - Update existing template
async function handlePut(container, templateId, req, context) {
  try {
    if (!templateId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Template ID is required for updates",
          },
        }),
      };
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (container) {
      // Get existing template
      const { resource: existingTemplate } = await container
        .item(templateId, templateId)
        .read();
      if (!existingTemplate) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "TEMPLATE_NOT_FOUND",
              message: "Schedule template not found",
            },
          }),
        };
      }

      // Update template
      const updatedTemplate = {
        ...existingTemplate,
        ...body,
        id: templateId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      const { resource: result } = await container
        .item(templateId, templateId)
        .replace(updatedTemplate);

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result,
          message: "Schedule template updated successfully",
        }),
      };
    } else {
      // Mock update
      const mockTemplate = getMockTemplates().find((t) => t.id === templateId);
      if (!mockTemplate) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "TEMPLATE_NOT_FOUND",
              message: "Schedule template not found",
            },
          }),
        };
      }

      const updatedTemplate = {
        ...mockTemplate,
        ...body,
        id: templateId,
        updatedAt: new Date().toISOString(),
      };

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: updatedTemplate,
          message: "Schedule template updated successfully (mock mode)",
        }),
      };
    }
  } catch (error) {
    context.log.error("Update template error:", error);
    throw error;
  }
}

// DELETE handler - Delete template
async function handleDelete(container, templateId, context) {
  try {
    if (!templateId) {
      return {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Template ID is required for deletion",
          },
        }),
      };
    }

    if (container) {
      // Check if template exists
      const { resource: existingTemplate } = await container
        .item(templateId, templateId)
        .read();
      if (!existingTemplate) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "TEMPLATE_NOT_FOUND",
              message: "Schedule template not found",
            },
          }),
        };
      }

      // Delete template
      await container.item(templateId, templateId).delete();

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "Schedule template deleted successfully",
        }),
      };
    } else {
      // Mock deletion
      const mockTemplate = getMockTemplates().find((t) => t.id === templateId);
      if (!mockTemplate) {
        return {
          status: 404,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: {
              code: "TEMPLATE_NOT_FOUND",
              message: "Schedule template not found",
            },
          }),
        };
      }

      return {
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "Schedule template deleted successfully (mock mode)",
        }),
      };
    }
  } catch (error) {
    context.log.error("Delete template error:", error);
    throw error;
  }
}

// Mock templates for development/fallback
function getMockTemplates() {
  return [
    {
      id: "template-monday-morning-dropoff",
      dayOfWeek: 1, // Monday
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Monday Morning School Drop-off",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-monday-afternoon-pickup",
      dayOfWeek: 1, // Monday
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Monday Afternoon School Pick-up",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-tuesday-morning-dropoff",
      dayOfWeek: 2, // Tuesday
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Tuesday Morning School Drop-off",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-tuesday-afternoon-pickup",
      dayOfWeek: 2, // Tuesday
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Tuesday Afternoon School Pick-up",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-wednesday-morning-dropoff",
      dayOfWeek: 3, // Wednesday
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Wednesday Morning School Drop-off",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-wednesday-afternoon-pickup",
      dayOfWeek: 3, // Wednesday
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Wednesday Afternoon School Pick-up",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-thursday-morning-dropoff",
      dayOfWeek: 4, // Thursday
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Thursday Morning School Drop-off",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-thursday-afternoon-pickup",
      dayOfWeek: 4, // Thursday
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Thursday Afternoon School Pick-up",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-friday-morning-dropoff",
      dayOfWeek: 5, // Friday
      startTime: "07:30",
      endTime: "08:30",
      routeType: "school_dropoff",
      description: "Friday Morning School Drop-off",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "template-friday-afternoon-pickup",
      dayOfWeek: 5, // Friday
      startTime: "15:00",
      endTime: "16:00",
      routeType: "school_pickup",
      description: "Friday Afternoon School Pick-up",
      locationId: "lincoln-elementary",
      maxPassengers: 4,
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    },
  ];
}
