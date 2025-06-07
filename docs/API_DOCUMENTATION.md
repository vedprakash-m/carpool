# VCarpool API Documentation v1

## Overview

The VCarpool API provides a comprehensive set of endpoints for managing school carpool operations. All endpoints follow the `/api/v1/` versioning pattern and use JSON for request/response payloads.

**Base URL**: `https://vcarpool-api-prod.azurewebsites.net/api/v1`
**Authentication**: JWT Bearer tokens
**Content-Type**: `application/json`

## Authentication Endpoints

### POST /v1/auth/token

**Purpose**: User authentication and JWT token generation
**Access**: Public

**Request Body**:

```json
{
  "email": "admin@vcarpool.com",
  "password": "Admin123!"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "admin@vcarpool.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "phoneNumber": "+1234567890",
      "preferences": {},
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /v1/auth/register

**Purpose**: New user registration
**Access**: Public

**Request Body**:

```json
{
  "email": "parent@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "role": "parent"
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "user": {
      /* User object */
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /v1/auth/refresh-token

**Purpose**: Refresh expired access tokens
**Access**: Requires valid refresh token

**Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## User Management Endpoints

### GET /v1/users/me

**Purpose**: Get current user profile
**Access**: Authenticated users
**Headers**: `Authorization: Bearer <token>`

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "parent",
    "phoneNumber": "+1234567890",
    "preferences": {
      "notifications": true,
      "emailUpdates": true
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### PUT /v1/users/me/password

**Purpose**: Change user password
**Access**: Authenticated users
**Headers**: `Authorization: Bearer <token>`

**Request Body**:

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": true,
  "message": "Password updated successfully"
}
```

## Admin Endpoints

### POST /v1/admin/users

**Purpose**: Create new user account (admin only)
**Access**: Admin role required
**Headers**: `Authorization: Bearer <admin-token>`

**Request Body**:

```json
{
  "email": "newuser@example.com",
  "password": "TempPassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "parent",
  "phoneNumber": "+1234567890"
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "id": "user-456",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "parent",
    "phoneNumber": "+1234567890",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### POST /v1/admin/generate-schedule

**Purpose**: Generate automated carpool schedule using 5-step algorithm
**Access**: Admin role required
**Headers**: `Authorization: Bearer <admin-token>`

**Request Body**:

```json
{
  "weekStartDate": "2025-01-06",
  "forceRegenerate": false
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "assignmentsCreated": 15,
    "slotsAssigned": 12,
    "unassignedSlots": 3,
    "algorithmSteps": [
      {
        "step": 1,
        "name": "Exclude Unavailable",
        "description": "Removed drivers marked as unavailable",
        "slotsProcessed": 20,
        "driversExcluded": 3
      },
      {
        "step": 2,
        "name": "Assign Preferable",
        "description": "Assigned drivers to preferred time slots",
        "slotsAssigned": 8,
        "driversAssigned": 6
      },
      {
        "step": 3,
        "name": "Assign Less-Preferable",
        "description": "Assigned drivers to less-preferred slots",
        "slotsAssigned": 4,
        "driversAssigned": 4
      },
      {
        "step": 4,
        "name": "Fill Neutral",
        "description": "Assigned remaining available drivers",
        "slotsAssigned": 0,
        "driversAssigned": 0
      },
      {
        "step": 5,
        "name": "Historical Tie-Breaking",
        "description": "Applied fair distribution based on history",
        "adjustmentsMade": 2
      }
    ],
    "weekStartDate": "2025-01-06",
    "generatedAt": "2025-01-06T10:00:00Z"
  }
}
```

## Parent Endpoints

### GET /v1/parents/weekly-preferences

**Purpose**: Retrieve parent's weekly driving preferences
**Access**: Parent role required
**Headers**: `Authorization: Bearer <parent-token>`
**Query Parameters**:

- `weekStartDate` (required): ISO date string (e.g., "2025-01-06")

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "parentId": "parent-123",
    "weekStartDate": "2025-01-06",
    "preferences": {
      "preferable": ["monday-morning", "wednesday-afternoon", "friday-morning"],
      "lessPreferable": ["tuesday-afternoon", "thursday-morning"],
      "unavailable": ["monday-afternoon", "friday-afternoon"]
    },
    "submittedAt": "2025-01-02T14:30:00Z",
    "lastModified": "2025-01-02T14:30:00Z"
  }
}
```

### POST /v1/parents/weekly-preferences

**Purpose**: Submit weekly driving preferences
**Access**: Parent role required
**Headers**: `Authorization: Bearer <parent-token>`

**Request Body**:

```json
{
  "weekStartDate": "2025-01-06",
  "preferences": {
    "preferable": ["monday-morning", "wednesday-afternoon", "friday-morning"],
    "lessPreferable": ["tuesday-afternoon", "thursday-morning"],
    "unavailable": ["monday-afternoon", "friday-afternoon"]
  }
}
```

**Business Rules Enforced**:

- Maximum 3 preferable slots per week
- Maximum 2 less-preferable slots per week
- Maximum 2 unavailable slots per week
- Submission deadline: Wednesday 5:00 PM for following week

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "parentId": "parent-123",
    "weekStartDate": "2025-01-06",
    "preferences": {
      /* Saved preferences */
    },
    "submittedAt": "2025-01-02T14:30:00Z"
  }
}
```

## Trip Endpoints

### GET /v1/trips/stats

**Purpose**: Get user's trip statistics and analytics
**Access**: Authenticated users
**Headers**: `Authorization: Bearer <token>`

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "totalTrips": 8,
    "tripsAsDriver": 5,
    "tripsAsPassenger": 3,
    "totalDistance": 1250,
    "costSavings": 245.5,
    "upcomingTrips": 2,
    "weeklySchoolTrips": 6,
    "childrenCount": 2,
    "monthlyFuelSavings": 89.25,
    "timeSavedHours": 12
  }
}
```

### GET /v1/trips

**Purpose**: List and search trips with filtering
**Access**: Authenticated users
**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `status`: Filter by trip status (planned, active, completed, cancelled)
- `date`: Filter by specific date (ISO date string)
- `destination`: Filter by destination
- `page`: Page number for pagination (default: 1)
- `limit`: Results per page (default: 10, max: 50)

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "id": "trip-123",
        "driverId": "driver-456",
        "destination": "Lincoln Elementary School",
        "pickupLocations": [
          {
            "address": "123 Oak Street",
            "time": "07:45"
          }
        ],
        "date": "2025-01-07T07:30:00Z",
        "departureTime": "07:30",
        "arrivalTime": "08:00",
        "maxPassengers": 4,
        "passengers": ["student-789"],
        "availableSeats": 3,
        "cost": 0,
        "status": "planned",
        "notes": "Morning school drop-off",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## Error Responses

All endpoints follow consistent error response format:

**4xx Client Errors**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email format is invalid",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "requestId": "req-123-abc"
}
```

**5xx Server Errors**:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Database connection failed",
    "retryAfter": 30
  },
  "requestId": "req-456-def"
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **API endpoints**: 100 requests per 15 minutes
- **Strict endpoints**: 20 requests per 15 minutes

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Security

### Authentication

- JWT tokens with 24-hour expiration
- Refresh tokens with 7-day rotation
- Secure password hashing using bcrypt (12 rounds)

### Input Validation

- All inputs validated using Zod schemas
- XSS protection via sanitization middleware
- SQL injection prevention via parameterized queries

### CORS Policy

- Configured for specific allowed origins
- Comprehensive headers including `X-Requested-With`
- Preflight handling for complex requests

## SDK Example (JavaScript/TypeScript)

```typescript
import axios from "axios";

class VCarpoolAPI {
  private baseURL = "https://vcarpool-api-prod.azurewebsites.net/api/v1";
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };
  }

  async login(email: string, password: string) {
    const response = await axios.post(
      `${this.baseURL}/auth/token`,
      {
        email,
        password,
      },
      { headers: this.getHeaders() }
    );

    if (response.data.success) {
      this.setToken(response.data.data.token);
      return response.data.data;
    }
    throw new Error(response.data.error?.message || "Login failed");
  }

  async getTripStats() {
    const response = await axios.get(`${this.baseURL}/trips/stats`, {
      headers: this.getHeaders(),
    });

    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || "Failed to fetch stats");
  }

  async generateSchedule(weekStartDate: string, forceRegenerate = false) {
    const response = await axios.post(
      `${this.baseURL}/admin/generate-schedule`,
      {
        weekStartDate,
        forceRegenerate,
      },
      { headers: this.getHeaders() }
    );

    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(
      response.data.error?.message || "Schedule generation failed"
    );
  }
}

// Usage
const api = new VCarpoolAPI();
await api.login("admin@vcarpool.com", "Admin123!");
const stats = await api.getTripStats();
const schedule = await api.generateSchedule("2025-01-06");
```

## Testing the API

### Basic Authentication Test

```bash
curl -X POST https://vcarpool-api-prod.azurewebsites.net/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vcarpool.com","password":"Admin123!"}'
```

### Get Trip Statistics

```bash
curl -X GET https://vcarpool-api-prod.azurewebsites.net/api/v1/trips/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Generate Schedule (Admin)

```bash
curl -X POST https://vcarpool-api-prod.azurewebsites.net/api/v1/admin/generate-schedule \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekStartDate":"2025-01-06","forceRegenerate":false}'
```

## Production Deployment

**Frontend**: https://lively-stone-016bfa20f.6.azurestaticapps.net/
**Backend API**: https://vcarpool-api-prod.azurewebsites.net/api/v1
**Database**: Azure Cosmos DB with 9 operational containers
**Monitoring**: Azure Application Insights integration

## Support

For API support or issues:

- **Documentation**: Complete implementation details in PROJECT_METADATA.md
- **Function Status**: All 11 functions deployed and operational
- **Health Check**: GET /api/health for system status
- **Error Tracking**: Comprehensive logging with correlation IDs

---

_Last Updated: January 2025 - API Version 1.0_
