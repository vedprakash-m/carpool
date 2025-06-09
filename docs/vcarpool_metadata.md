# VCarpool Project Metadata

## 🎯 Project Overview

**VCarpool** is a compr### 6. Security & Monitoring

- **Rate Limiting**: Auth (5/15min), API (100/15min), Strict (20/15min)
- **Input Validation**: XSS prevention, SQL injection protection
- **Health Monitoring**: Application health checks and logging
- **Geographic Enforcement**: Service area validation

### 7. Family Unit Model carpool management application designed specifically for school communities, starting with Tesla Stem High School in Redmond, WA. The platform connects families within a 25-mile radius for organized, safe, and reliable carpooling arrangements.

### Key Goals

- **Primary**: Enable safe, organized carpool management for Tesla Stem High School families
- **Geographic**: Serve families within 25 miles of Tesla Stem High School in Redmond, WA
- **Environmental Focus**: Promote sustainability through miles saved and time efficiency (not cost savings)
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
- **Search & Filter**: By destination, date, capacity (cost filters removed)
- **Status Management**: planned, active, cancelled, completed states
- **Environmental Metrics**: Miles saved (60% of total miles) and time saved (30min per trip)

### 5. Simplified User Experience (NEW - June 2025)

- **Cost-Free Operations**: All payment/cost functionality removed for simplified UX
- **Environmental Focus**: Dashboard shows miles saved and time efficiency benefits
- **Streamlined Forms**: Trip creation without cost fields or payment complexity
- **Clear Value Proposition**: Focus on environmental impact and time savings

### 5. Simplified User Experience (NEW - June 2025)

- **Cost-Free Operations**: All payment/cost functionality removed for simplified UX
- **Environmental Focus**: Dashboard shows miles saved and time efficiency benefits
- **Streamlined Forms**: Trip creation without cost fields or payment complexity
- **Clear Value Proposition**: Focus on environmental impact and time savings

### 6. Security & Monitoring

- **Rate Limiting**: Auth (5/15min), API (100/15min), Strict (20/15min)
- **Input Validation**: XSS prevention, SQL injection protection
- **Health Monitoring**: Application health checks and logging
- **Geographic Enforcement**: Service area validation

### 7. Family Unit Model

- **Single Group Membership**: Each child in one carpool group at a time
- **Family Cohesion**: Carpool memberships operate at family level
- **Driving Parent Cascade**: When driving parent leaves, entire family exits

## 🔄 Recent Major Changes (June 2025)

### Cost/Payment System Removal (Completed - June 8, 2025)

**Decision**: Removed all cost/payment functionality to simplify user experience and focus on environmental benefits

**Rationale**:

- Eliminate payment processing complexity and maintenance burden
- Focus on environmental impact and time savings rather than financial incentives
- Provide cleaner, more mission-focused user experience for school communities
- Reduce liability and compliance requirements

**Implementation Details**:

- **Backend**: Removed cost fields from trip creation, statistics calculations, service logic
- **Frontend**: Replaced cost displays with miles/time savings, removed payment forms
- **Type System**: Updated interfaces to replace `costSavings` with `milesSaved`
- **Calculations**: Miles saved = 60% of total carpooling miles, Time saved = 30min per trip
- **UI Changes**: Replaced currency icons with map icons, updated all text references

**Impact**:

- Simplified trip creation and management workflows
- Dashboard now shows environmental benefits instead of cost savings
- No breaking changes to existing user data
- Cleaner value proposition for families

**Files Modified**: 45 files across backend services, frontend components, type definitions, and documentation

## 📋 Key Decisions & Architecture Changes

### 1. Environmental Focus Over Financial Incentives (June 2025)

**Decision**: Completely remove payment/cost system in favor of environmental benefits tracking

**Rationale**:

- School carpool programs should focus on community and environmental benefits
- Payment processing adds complexity, liability, and maintenance overhead
- Families prefer simplified coordination without financial transactions
- Environmental metrics (miles saved, time saved) provide clearer value proposition

**Technical Impact**:

- Simplified data models without cost fields
- Cleaner user interfaces without payment forms
- Reduced security surface area (no payment data handling)
- Better focus on core carpooling functionality

### 2. Registration-First Access Model

**Decision**: Require complete registration before group discovery or search

**Rationale**:

- Ensures data quality and commitment from users
- Protects member privacy from casual browsers
- Creates verified community of engaged families
- Enables proper geographic restriction enforcement

### 3. Family-Centric Group Model

**Decision**: Single carpool group membership per family unit

**Rationale**:

- Prevents scheduling conflicts between multiple groups
- Simplifies fairness algorithms and trip assignments
- Maintains family cohesion in carpool arrangements
- Reduces administrative complexity for group management

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
- **Cost/Payment System Removal** (June 8, 2025) - Complete environmental focus transition

### 🔄 In Progress

- Frontend-backend integration completion
- Real-time WebSocket infrastructure
- Voice message transcription
- Mobile app service worker

### 📋 Planned (Updated June 2025)

- Real-time coordination with traffic integration
- Enhanced discovery with compatibility matching
- Advanced analytics and performance insights (environmental metrics focus)
- Accessibility features and multilingual support
- Enhanced mobile PWA experience

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

## 🏁 Current Focus Areas & Next Steps

### Recently Completed (June 2025)

1. **✅ Cost/Payment System Removal** - Complete transition to environmental benefits focus
2. **✅ UI/UX Simplification** - Streamlined forms and cleaner user experience
3. **✅ Documentation Updates** - Updated gap analysis, implementation plans, and completion reports

### Phase 1: Foundation (Current - 3 months)

- Core user management ✅
- Emergency coordination ✅
- Progressive onboarding ✅
- Basic group creation ✅
- Simple scheduling ✅
- PWA mobile experience ✅
- **Environmental focus implementation** ✅
- Communication system enhancement 🔄

### Immediate Next Priorities (June-July 2025)

1. **Complete Real-time Communication System**

   - WebSocket/SignalR implementation for live updates
   - Push notifications for schedule changes
   - Emergency broadcast functionality

2. **Enhanced Mobile Experience**

   - Service worker improvements
   - Offline capability for core features
   - Better touch interface optimization

3. **Advanced Analytics Dashboard**
   - Environmental impact tracking (miles saved, carbon footprint)
   - Group performance metrics
   - Usage analytics and insights

### Next Phase Priorities (August-September 2025)

1. Enhanced frontend-backend integration
2. Voice message transcription features
3. Advanced scheduling algorithms
4. Trust and community features
5. Accessibility improvements

## 🔗 Key Resources

### Production Access

- **Frontend**: https://lively-stone-016bfa20f.6.azurestaticapps.net
- **API Base URL**: https://vcarpool-api-prod.azurewebsites.net/api/v1
- **Admin Access**: admin@vcarpool.com / Admin123! (development)

### API Documentation

- **Authentication**: `/api/v1/auth/token` (login), `/api/v1/auth/register` (signup)
- **Trip Management**: CRUD operations with passenger management (cost fields removed)
- **User Management**: Profile management with role-based access
- **Admin Functions**: Group management, scheduling, and analytics
- **Statistics**: Environmental metrics (miles saved, time saved) instead of cost savings

### Development Resources

- **Repository**: Tesla Stem High School focused carpool management
- **Documentation**: PROJECT_METADATA.md (comprehensive source of truth)
- **OpenAPI Spec**: Complete API specification with rate limiting details
- **Security Guide**: Pre-commit hooks and secret management procedures

---

_Last Updated: June 8, 2025 | Status: Production-ready core features with environmental focus | Recent: Cost/payment system removal completed_
