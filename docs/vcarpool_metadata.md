# VCarpool Project Metadata

## 🎯 Project Overview

**VCarpool** is a comprehensive carpool management application designed specifically for school communities, starting with Tesla Stem High School in Redmond, WA. The platform connects families within a 25-mile radius for organized, safe, and reliable carpooling arrangements.

### Key Goals

- **Primary**: Enable safe, organized carpool management for Tesla Stem High School families
- **Geographic**: Serve families within 25 miles of Tesla Stem High School in Redmond, WA
- **Fairness**: Implement traveling parent support with flexible makeup scheduling
- **Technical**: Deliver a scalable, secure TypeScript-based application on Azure

## 🏗️ System Architecture

### Tech Stack

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, Azure Static Web Apps
- **Backend**: Node.js 22+, Azure Functions v4, TypeScript
- **Database**: Azure Cosmos DB (NoSQL, serverless), Redis (caching)
- **Infrastructure**: Azure Functions, Static Web Apps, Bicep templates
- **Shared**: npm workspaces, TypeScript types, Zod validation

### Core Components

1. **Frontend (Next.js)** - User interface, client-side routing, authentication flows
2. **Backend (Azure Functions)** - REST API, business logic, data validation
3. **Shared Package** - Common TypeScript types, validation schemas, utilities
4. **Database Layer** - Cosmos DB for persistence, Redis for sessions/caching

## ✅ Core Features (Implemented)

### 1. Tesla Stem Registration & Validation System

- **Registration-First Access**: Complete registration required before group discovery
- **Geographic Restriction**: 25-mile radius enforcement from Tesla Stem High School
- **Three-Tier Verification**: Phone (SMS), address (geocoding), emergency contacts
- **Implementation**: `phone-verification`, `address-validation`, `emergency-contact-verification` functions

### 2. Traveling Parent Fairness System

- **Makeup Trip Scheduling**: Flexible 2-6 week makeup window
- **Balance Tracking**: Real-time debt/credit system for trip obligations
- **Multiple Makeup Options**: Extra weeks, split weeks, weekend trips
- **Admin Oversight**: Group admin approval system for makeup proposals

### 3. Authentication & User Management

- **JWT-based Authentication**: 24h expiration, 7d refresh tokens
- **Security**: bcrypt password hashing (12 rounds), rate limiting
- **Role-based Access**: admin, parent, student, trip_admin roles
- **Enhanced Validation**: Registration completion middleware

### 4. Trip Management

- **CRUD Operations**: Create, read, update, delete trips with validation
- **Passenger Management**: Join/leave with seat tracking and pickup locations
- **Search & Filter**: By destination, date, capacity
- **Status Management**: planned, active, cancelled, completed states

### 5. Security & Monitoring

- **Rate Limiting**: Auth (5/15min), API (100/15min), Strict (20/15min)
- **Input Validation**: XSS prevention, SQL injection protection
- **Health Monitoring**: Application health checks and logging
- **Geographic Enforcement**: Service area validation

### 6. Family Unit Model

- **Single Group Membership**: Each child in one carpool group at a time
- **Family Cohesion**: Carpool memberships operate at family level
- **Driving Parent Cascade**: When driving parent leaves, entire family exits

## 🚧 Partially Implemented Features

### Communication System

- **Backend**: Complete messaging service with chat room creation
- **Frontend**: Integration pending for rich chat interface
- **Strategy**: Progressive migration from WhatsApp to in-app communication

### Dual Driving Parents

- **Enhanced Family Model**: Both parents can be designated as drivers
- **Child-Based Load Distribution**: Trip assignments based on child count
- **Intra-Family Reassignment**: Spouses can reassign trips without approval

## 🎨 User Experience & Roles

### Role Structure

- **Parent**: Register family, join groups, manage trips
- **Group Admin**: Manage group membership, approve requests, generate schedules
- **Trip Admin**: Day-to-day trip coordination and updates
- **Super Admin**: Platform administration and user management
- **Student**: Self-registration workflow (invitation-based)

### User Journeys

1. **New Parent**: School selection → Group discovery → Registration → Verification → Group joining
2. **Group Admin**: Group creation → Member approval → Schedule generation → Trip coordination
3. **Emergency Coordination**: Crisis alerts without safety claims (coordination tool only)

## 📊 Implementation Status

### ✅ Completed (Production Ready)

- Core user management and authentication
- Trip CRUD operations with business rules
- Tesla Stem registration and validation system
- Traveling parent fairness mechanism
- Security framework with rate limiting
- CI/CD pipeline with Azure deployment
- Health monitoring and error handling

### 🔄 In Progress

- Frontend-backend integration completion
- Real-time WebSocket infrastructure
- Voice message transcription
- Mobile app service worker

### 📋 Planned

- Real-time coordination with traffic integration
- Enhanced discovery with compatibility matching
- Advanced analytics and performance insights
- Accessibility features and multilingual support

## 🔒 Security Framework

### Authentication & Authorization

- **JWT Tokens**: 24h expiration with 7d refresh tokens
- **Password Security**: bcrypt hashing (12 rounds)
- **Rate Limiting**: Multi-tier protection
  - Auth endpoints: 5 requests per 15 minutes
  - API endpoints: 100 requests per 15 minutes
  - Strict endpoints: 20 requests per 15 minutes

### Data Protection & Validation

- **Input Validation**: Zod schemas with XSS prevention and sanitization
- **Database Security**: Parameterized queries preventing SQL injection
- **Content Security**: CSP headers and request sanitization
- **Monitoring**: Structured logging with correlation IDs and error tracking

### Development Security

- **Secret Management**: Zero tolerance policy for committed secrets
- **Pre-commit Hooks**: Automated secret detection and validation
- **Environment Security**: Secure environment variable handling
- **Azure Key Vault**: Production secret management

### Threat Mitigation

- Account takeover prevention with session management
- Data injection protection with input validation
- Cross-site scripting prevention with content sanitization
- API abuse protection with comprehensive rate limiting

## 🚀 Deployment & Operations

### Production Environment

- **Frontend**: Azure Static Web Apps (https://lively-stone-016bfa20f.6.azurestaticapps.net)
- **Backend**: Azure Functions with Node.js 22
- **Database**: Azure Cosmos DB with Redis caching
- **CI/CD**: GitHub Actions with automated deployment
- **Base API URL**: `https://vcarpool-api-prod.azurewebsites.net/api/v1`

### Deployment Process

**Automated CI/CD Pipeline**:

1. **Build Phase**: Backend functions + Frontend static export + All tests pass
2. **Infrastructure Phase**: Azure resources via Bicep + Database provisioning
3. **Application Deployment**: Functions + Static Web Apps + Health check validation

**Pre-Deployment Checklist**:

- Node.js 22+ and npm 10+ verified
- Clean dependency installation and successful builds
- All tests passing and TypeScript compilation clean
- GitHub Actions workflows passing with environment secrets configured

### Monitoring & Operations

- Application Insights integration with structured logging
- Health check endpoints with retry logic (90-120s cold start tolerance)
- Performance metrics and alerting with correlation IDs
- Error tracking and diagnostics with automatic rollback capabilities

## 📈 Performance Requirements

### Targets

- API response time: <2 seconds
- Database queries: <500ms
- Authentication: <1 second
- Cold start mitigation: 90-120 seconds wait

### Scalability

- Azure Functions consumption plan
- Cosmos DB serverless scaling
- Redis caching for performance
- Static asset optimization

## 🧪 Testing Strategy

### Current Coverage Status

- **Backend**: ~45% coverage with 51 passing tests
  - AuthService: ~75% coverage (10 tests)
  - TripService: ~60% coverage (18 tests)
  - Auth-Login-Simple: 100% complete (18 comprehensive tests)
- **Frontend**: ~12% coverage with 162 passing tests
  - Authentication Store: 82.94% coverage
  - Trip Store: 57.63% coverage
  - Navigation Component: 100% coverage

### Test Architecture

- **Unit Tests**: Business logic with Jest framework
- **Integration Tests**: API endpoints with mock Azure services
- **Component Tests**: React components with testing library
- **E2E Tests**: Critical user flows with Playwright

### Quality Gates & CI/CD

- TypeScript compilation without errors (strict mode)
- ESLint rules compliance with Prettier enforcement
- Test coverage thresholds (85%+ goal for core business logic)
- Deployment verification success with health check validation
- Pre-commit hooks with secret detection and validation

## 📝 Development Standards

### Code Quality & Architecture

- **Strict TypeScript Mode**: Complete type safety with ESLint and Prettier enforcement
- **Repository Pattern**: Data access layer with service layer for business logic
- **Dependency Injection**: Container pattern for service management
- **Conventional Commits**: Clear, descriptive commit messages with atomic changes

### Workflow & CI/CD

- **Branch Strategy**: Main branch protection with required reviews
- **Pull Requests**: Automated CI checks and peer review requirements
- **GitHub Actions**: Automated pipeline with build, test, and deploy phases
- **Azure Infrastructure**: Bicep templates for infrastructure-as-code

### Security Requirements

- **Pre-commit Hooks**: Mandatory secret detection and validation
- **Environment Management**: No secrets in committed files policy
- **Rate Limiting**: Multi-tier API protection with monitoring
- **Input Validation**: Comprehensive sanitization and XSS prevention

## 🛠️ Development Setup

### Prerequisites

- **Node.js 22+** and npm 10+ installed
- **Azure CLI** for local development and deployment
- **Git hooks** configured with pre-commit secret detection

### Local Development

```bash
# Install dependencies
npm install

# Start backend functions
npm run dev

# Start frontend
cd frontend && npm run dev

# Run tests
npm test
```

### Required Environment Variables

- `COSMOS_DB_CONNECTION_STRING`: Azure Cosmos DB connection
- `JWT_SECRET`: Token signing secret
- `AZURE_STORAGE_CONNECTION_STRING`: Blob storage connection
- `REDIS_CONNECTION_STRING`: Cache connection string

## 🏁 Current Focus Areas

### Phase 1: Foundation (Current - 3 months)

- Core user management ✅
- Emergency coordination ✅
- Progressive onboarding ✅
- Basic group creation ✅
- Simple scheduling ✅
- PWA mobile experience ✅
- Communication system enhancement 🔄

### Next Phase Priorities

1. Complete frontend-backend integration
2. Real-time communication features
3. Enhanced mobile experience
4. Advanced analytics dashboard
5. Trust and community features

## 🔗 Key Resources

### Production Access

- **Frontend**: https://lively-stone-016bfa20f.6.azurestaticapps.net
- **API Base URL**: https://vcarpool-api-prod.azurewebsites.net/api/v1
- **Admin Access**: admin@vcarpool.com / Admin123! (development)

### API Documentation

- **Authentication**: `/api/v1/auth/token` (login), `/api/v1/auth/register` (signup)
- **Trip Management**: CRUD operations with passenger management
- **User Management**: Profile management with role-based access
- **Admin Functions**: Group management, scheduling, and analytics

### Development Resources

- **Repository**: Tesla Stem High School focused carpool management
- **Documentation**: PROJECT_METADATA.md (comprehensive source of truth)
- **OpenAPI Spec**: Complete API specification with rate limiting details
- **Security Guide**: Pre-commit hooks and secret management procedures

---

_Last Updated: June 2025 | Status: Production-ready core features with ongoing enhancements_
