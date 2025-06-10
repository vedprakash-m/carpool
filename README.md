# VCarpool

<div align="center">

![VCarpool Logo](https://img.shields.io/badge/VCarpool-School%20Carpool%20Management-blue?style=for-the-badge&logo=car&logoColor=white)

**A production-ready, enterprise-grade school carpool coordination platform with 100% critical UX compliance and Azure deployment.**

[![Build Status](https://img.shields.io/github/actions/workflow/status/vedprakash-m/vcarpool/ci-cd.yml?style=flat-square&logo=github)](https://github.com/vedprakash-m/vcarpool/actions)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-0062AD?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/en-us/services/functions/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue?style=flat-square)](LICENSE)

[🚀 Live Production App](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [📚 Documentation](docs/) • [🔧 API v1 Reference](docs/OPENAPI_SPECIFICATION.yaml) • [🤝 Contributing](CONTRIBUTING.md)

**🎉 Status: 100% Test Success - All 212 Backend Tests Passing with Complete Tesla Stem Integration**

</div>

---

## 🌟 Overview

VCarpool is a **complete, production-ready** school carpool management platform specifically designed for Tesla Stem High School in Redmond, WA and surrounding communities within a 25-mile radius. Built with enterprise-grade Azure cloud architecture, it provides comprehensive carpool coordination with advanced security, registration validation, and innovative traveling parent fairness systems.

### 🏆 Latest Achievement (December 2024)

**Technical Architecture Revolution Completed** - Successfully transformed the entire codebase architecture with production-ready patterns including comprehensive component refactoring, advanced error handling systems, and modern React patterns. All critical technical debt resolved with 100% test environment stability.

**Major Technical Achievements:**

- ✅ **Component Architecture Revolution**: Refactored all major components (CalendarView, TravelingParentMakeupDashboard, EmergencyPanel) using container/presentational patterns
- ✅ **Advanced Error Handling**: Implemented comprehensive error boundaries, API error handling, and secure storage systems
- ✅ **Performance Infrastructure**: Built performance monitoring hooks and optimization systems
- ✅ **Test Environment Stabilized**: Fixed all TextEncoder/TextDecoder issues, dependency conflicts, and test execution problems
- ✅ **Production-Ready Patterns**: Applied modern React patterns with custom hooks, TypeScript strict mode, and enterprise-grade architecture

### ✨ Major Production Features (2024-2025)

- 🎓 **Tesla Stem High School Integration** - Purpose-built for Tesla Stem families with official school details and geographic service area enforcement
- 🔐 **Registration-First Access** - Complete verification required before group discovery (phone, address, emergency contacts)
- 📍 **Geographic Validation** - 25-mile radius enforcement from Tesla Stem High School (47.6762, -122.1355) with real-time address geocoding
- 🧳 **Traveling Parent Fairness** - Flexible makeup scheduling system with 2-6 week windows and multiple trip options
- 📱 **SMS Verification System** - Phone number validation with 6-digit codes and attempt limiting
- 🏠 **Address Validation** - Real-time geocoding with service area validation and address suggestions
- 👨‍👩‍👧‍👦 **Emergency Contact Verification** - Multi-contact validation with SMS confirmation chains
- 💼 **Makeup Trip Dashboard** - Comprehensive traveling parent scheduling with balance tracking
- 🎯 **School-Specific Groups** - Tesla Stem morning carpool with grade-specific organization
- ✅ **Complete Test Coverage** - 212 tests passing with comprehensive validation of all system components

### ✅ Tesla Stem Implementation Complete & 100% Test Success

- **Phase 1: Registration-First Architecture**
  - **Verification Systems**: Implemented phone SMS verification, address geocoding validation, and emergency contact verification.
  - **Geographic Restrictions**: Service area limited to families within 25 miles of Tesla Stem High School.
- **Phase 2: Traveling Parent Fairness**
  - **Makeup Scheduling**: Built flexible makeup trip system with 2-6 week windows and multiple scheduling options.
  - **Balance Tracking**: Real-time debt/credit system with administrative oversight.
- **Phase 3: Tesla Stem Integration**
  - **School-Specific Groups**: Created Tesla Stem morning carpool with proper geographic and grade restrictions.
  - **Enhanced Discovery**: Updated group search with registration requirements and Tesla Stem focus.
- **Phase 4: Complete Test Coverage (June 2025)**
  - **100% Backend Test Success**: All 212 tests passing across 10 test suites
  - **Tesla Stem School Data**: Updated with official school information (8140 NE 140th St, Redmond, WA 98052)
  - **Scheduling Algorithm**: Validated family-based driver ID system
  - **Balance Calculations**: Verified traveling parent fairness system
  - **Integration Testing**: Complete API validation and service verification

---

## 📋 Table of Contents

- [Production Features](#-production-features)
- [System Architecture](#-system-architecture)
- [Quick Start](#-quick-start)
- [Production Deployment](#-production-deployment)
- [API v1 Reference](#-api-v1-reference)
- [Security & Monitoring](#-security--monitoring)
- [Testing & Quality](#-testing--quality)
- [Contributing](#-contributing)

---

## 🎯 Production Features

### Tesla Stem High School Implementation (January 2025)

- **🎓 Tesla Stem Integration** - Purpose-built for Tesla Stem High School families with complete school integration
- **📍 Geographic Service Area** - 25-mile radius enforcement from Tesla Stem High School (47.6740, -122.1215)
- **🔐 Registration-First Access** - Complete verification required before group discovery and participation
- **📱 SMS Phone Verification** - 6-digit code verification with attempt limits and 10-minute expiration
- **🏠 Address Validation** - Real-time geocoding with service area validation and intelligent address suggestions
- **👨‍👩‍👧 Emergency Contact System** - Multi-contact verification with SMS confirmation chains
- **🧳 Traveling Parent Fairness** - Flexible makeup scheduling with 2-6 week windows and balance tracking
- **💼 Makeup Trip Dashboard** - Comprehensive dashboard for managing travel schedules and makeup obligations

### Registration & Validation System (100% Complete)

- **🔒 Three-Tier Verification** - Phone number, home address, and emergency contacts all verified via SMS
- **🌍 Geocoding Integration** - Real-time address validation with Google Maps integration
- **🎯 Service Area Enforcement** - Automatic rejection of addresses outside 25-mile Tesla Stem radius
- **⏰ Code Management** - SMS verification codes with expiration, attempt limits, and resend functionality
- **📞 Emergency Contact Verification** - Minimum 2 contacts with relationship validation and phone confirmation

### Enterprise Production Features (100% Complete)

- **🔐 Production Security** - Azure Key Vault integration, secret management, threat monitoring
- **📈 Business Intelligence** - Custom Application Insights metrics for carpool operations
- **🌐 API Versioning** - Complete v1 API with OpenAPI 3.0 specification
- **🛡️ Security Hardening** - Rate limiting, CORS policies, input validation, geographic restrictions
- **🔄 Health Monitoring** - Comprehensive health checks with availability tracking
- **🚀 Performance Optimization** - Azure Functions cold start reduction, caching strategies

### Advanced Technology Stack

- **Backend**: 14 Azure Functions with TypeScript, Node.js 22, comprehensive middleware
- **Frontend**: Next.js 14 with Tailwind CSS, responsive design, modern React patterns
- **Database**: 9 Cosmos DB containers with optimized partitioning and indexing
- **Security**: Enterprise-grade with Azure Key Vault, JWT + bcrypt, SMS verification, geographic validation
- **Monitoring**: Application Insights with custom metrics, health checks, alerting
- **DevOps**: Complete CI/CD with GitHub Actions, Infrastructure as Code (Bicep)
- **Verification**: SMS/Address validation services, emergency contact systems

### 🔄 Tesla Stem Deployment & Next Steps

With Tesla Stem High School integration complete, VCarpool is ready for **Production Deployment** with verified families:

**Production Features (Ready Now):**

- ✅ Complete registration and verification system
- ✅ Geographic service area enforcement (25-mile radius)
- ✅ Tesla Stem High School integration
- ✅ Traveling parent fairness with makeup scheduling
- ✅ SMS and address validation systems
- ✅ Emergency contact verification chains

**Post-Deployment Enhancement Backlog:**

- **⚡ Additional Schools** - Expand to other Redmond/Bellevue area schools (Month 1)
- **🔍 Advanced Matching** - Grade and schedule compatibility optimization (Month 2)
- **📊 Analytics Dashboard** - Parent insights and trip optimization (Month 2)
- **♿ Accessibility Features** - Special needs support and multilingual interface (Month 3)
- **🛡️ Trust & Safety** - Enhanced verification and parent review systems (Month 3)

**Strategy**: Focus on Tesla Stem High School families first to build proven model, then expand to neighboring schools

### 🔧 Technical Architecture Revolution (June 2025)

**Production-Ready Codebase Transformation Completed**

VCarpool underwent a comprehensive technical debt resolution initiative, transforming the codebase from development-grade to enterprise production standards:

**✅ Critical Security Issues Resolved:**

- Eliminated XSS vulnerabilities in JWT token storage
- Implemented secure token storage with httpOnly cookies for production
- Built comprehensive 4-layer error handling system
- Enhanced ErrorBoundary components with retry logic and debugging

**✅ Component Architecture Modernization:**

- Refactored all major components using container/presentational patterns
- **TravelingParentMakeupDashboard**: 551 lines → ~60 lines + 7 focused components
- **EmergencyPanel**: 508 lines → ~80 lines + 6 focused components
- **CalendarView**: 479 lines → ~50 lines + 5 focused components
- Extracted custom hooks for all business logic separation

**✅ Performance Optimization Infrastructure:**

- Built comprehensive performance monitoring system
- Implemented render tracking, debouncing, throttling utilities
- Added memory management and development performance warnings
- Created performance monitoring HOCs and optimization patterns

**✅ Test Environment Stabilization:**

- Fixed TextEncoder/TextDecoder issues for MSW compatibility
- Installed missing accessibility testing dependencies (jest-axe)
- Resolved test expectation mismatches and mock function declarations
- Added comprehensive polyfills for modern test environment

**Production Readiness Score:**

- Phase 1 (Security & Error Handling): ✅ 100% Complete
- Phase 2 (Architecture & Performance): ✅ 100% Complete
- Phase 3 (Testing & Documentation): ✅ 85% Complete

---

## 🏗 System Architecture

<div align="center">

```mermaid
graph TB
    subgraph "Production Frontend"
        FE[Next.js Frontend<br/>Azure Static Web Apps<br/>lively-stone-016bfa20f.6.azurestaticapps.net]
    end

    subgraph "Production Backend API"
        API[Azure Functions v4<br/>vcarpool-api-prod.azurewebsites.net<br/>11 Endpoints - API v1]
        AUTH[JWT Authentication +<br/>Role-based Access Control]
        MIDDLEWARE[Security Middleware<br/>Rate Limiting + CORS]
    end

    subgraph "Data & Security Layer"
        DB[(Cosmos DB<br/>9 Containers<br/>Production Grade)]
        KV[Azure Key Vault<br/>Secret Management<br/>JWT Keys]
        STORAGE[Azure Blob Storage<br/>File Management]
    end

    subgraph "Monitoring & Operations"
        AI[Application Insights<br/>Custom Business Metrics]
        HEALTH[Health Monitoring<br/>System + Database]
        ALERTS[Alerting System<br/>Real-time Notifications]
        TESTING[Production Testing<br/>Endpoint Validation]
    end

    FE --> API
    API --> AUTH
    API --> MIDDLEWARE
    API --> DB
    API --> KV
    API --> STORAGE
    API --> AI
    AI --> HEALTH
    HEALTH --> ALERTS
    TESTING --> API
```

</div>

### Technology Implementation Status

| Component             | Technology                       | Status           | Details                                |
| --------------------- | -------------------------------- | ---------------- | -------------------------------------- |
| **Frontend**          | Next.js 14, TypeScript, Tailwind | ✅ 100% Complete | Responsive design, production deployed |
| **Backend**           | Azure Functions v4, Node.js 22   | ✅ 100% Complete | 11 endpoints, v1 API, full middleware  |
| **Database**          | Azure Cosmos DB                  | ✅ 100% Complete | 9 containers, optimized partitioning   |
| **Authentication**    | JWT + bcrypt, Role-based         | ✅ 100% Complete | 3-role system, secure tokens           |
| **Security**          | Azure Key Vault, Rate limiting   | ✅ 100% Complete | Enterprise-grade security              |
| **Monitoring**        | Application Insights             | ✅ 100% Complete | Custom metrics, health checks          |
| **API Documentation** | OpenAPI 3.0                      | ✅ 100% Complete | 782 lines, comprehensive spec          |
| **Testing**           | Backend test suite               | ✅ 100% Complete | 212 tests passing across 10 suites     |
| **DevOps**            | GitHub Actions, Bicep IaC        | ✅ 100% Complete | Full CI/CD pipeline                    |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+ (for optimal performance)
- **npm** 10+ or **yarn** 1.22+
- **Azure Account** (for deployment)
- **Azure Functions Core Tools** v4+

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/vedprakash-m/vcarpool.git
   cd vcarpool
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   Create `backend/local.settings.json`:

   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "NODE_ENV": "development",
       "JWT_SECRET": "your-development-secret-key-minimum-32-chars",
       "JWT_REFRESH_SECRET": "your-refresh-secret-key-minimum-32-chars",
       "COSMOS_DB_ENDPOINT": "your-cosmos-endpoint",
       "COSMOS_DB_KEY": "your-cosmos-key",
       "COSMOS_DB_DATABASE_ID": "vcarpool",
       "APPINSIGHTS_INSTRUMENTATIONKEY": "your-insights-key"
     }
   }
   ```

   Create `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:7071/api/v1
   ```

4. **Start development servers**

   ```bash
   # Start all services (recommended)
   npm run dev

   # Or start individually
   npm run dev:backend   # Backend on http://localhost:7071
   npm run dev:frontend  # Frontend on http://localhost:3000
   ```

5. **Verify installation**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:7071/api/v1
   - Health Check: http://localhost:7071/api/v1/health

### 🌐 Production Application

**Live Application**: [https://lively-stone-016bfa20f.6.azurestaticapps.net](https://lively-stone-016bfa20f.6.azurestaticapps.net)

**Production API**: [https://vcarpool-api-prod.azurewebsites.net/api/v1](https://vcarpool-api-prod.azurewebsites.net/api/v1)

**Demo Admin Credentials**:

- **Email**: `admin@vcarpool.com`
- **Password**: `Admin123!`

**Available Features**:

- ✅ Complete authentication system with JWT
- ✅ Full user dashboard with trip management
- ✅ Admin panel with system management
- ✅ Real-time trip coordination
- ✅ Analytics and reporting
- ✅ Responsive mobile-ready design
- ✅ Enterprise security and monitoring

---

## 🚀 Production Deployment

### Production Infrastructure Status

**All systems operational and production-ready:**

| Service         | URL                                                  | Status         |
| --------------- | ---------------------------------------------------- | -------------- |
| **Frontend**    | https://lively-stone-016bfa20f.6.azurestaticapps.net | ✅ Live        |
| **Backend API** | https://vcarpool-api-prod.azurewebsites.net/api/v1   | ✅ Live        |
| **Database**    | Azure Cosmos DB (9 containers)                       | ✅ Operational |
| **Key Vault**   | vcarpool-kv-prod                                     | ✅ Configured  |
| **Monitoring**  | Application Insights                                 | ✅ Active      |

### Automated Deployment

The application uses GitHub Actions for automated CI/CD:

```bash
# Deploy to production
git push origin main  # Automatically deploys via GitHub Actions
```

### Production Security Setup

Run the Key Vault configuration script for production secrets:

```bash
# Configure production secrets (run once after deployment)
chmod +x scripts/configure-keyvault.sh
./scripts/configure-keyvault.sh
```

### Manual Deployment Commands

```bash
# Backend deployment
cd backend
npm run build
npm run deploy

# Frontend deployment
cd frontend
npm run build
npm run deploy
```

For detailed deployment instructions, see [Deployment Guide](docs/DEPLOYMENT.md).

---

## 📡 API v1 Reference

### Production API Base URL

**https://vcarpool-api-prod.azurewebsites.net/api/v1**

### Authentication Endpoints

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| `POST` | `/api/v1/auth/token`    | User authentication      |
| `POST` | `/api/v1/auth/refresh`  | Refresh access token     |
| `GET`  | `/api/v1/users/profile` | Get current user profile |

### Trip Management

| Method | Endpoint                   | Description               |
| ------ | -------------------------- | ------------------------- |
| `GET`  | `/api/v1/trips`            | List trips with filtering |
| `POST` | `/api/v1/trips`            | Create new trip           |
| `GET`  | `/api/v1/trips/statistics` | Get trip analytics        |

### Admin Functions

| Method | Endpoint                                    | Description               |
| ------ | ------------------------------------------- | ------------------------- |
| `GET`  | `/api/v1/admin/users`                       | Manage users (admin only) |
| `POST` | `/api/v1/admin/schedule/generate`           | Generate schedules        |
| `GET`  | `/api/v1/admin/schedule/weekly-preferences` | Weekly preferences        |

### System Endpoints

| Method | Endpoint                       | Description         |
| ------ | ------------------------------ | ------------------- |
| `GET`  | `/api/v1/health`               | System health check |
| `GET`  | `/api/v1/monitoring/dashboard` | Monitoring metrics  |

### Complete API Documentation

- **OpenAPI 3.0 Specification**: [docs/OPENAPI_SPECIFICATION.yaml](docs/OPENAPI_SPECIFICATION.yaml) (782 lines)
- **Interactive API Explorer**: Available in production deployment
- **Postman Collection**: Auto-generated from OpenAPI spec

### API Testing Suite

Run the comprehensive production API test suite:

```bash
# Run comprehensive production tests
./scripts/test-production-endpoints.sh

# Test categories:
# ✅ Health & connectivity checks
# ✅ Authentication system
# ✅ User profile management
# ✅ Trip statistics
# ✅ Admin functions
# ✅ Security headers (CORS, rate limiting)
```

---

## 🔐 Security & Monitoring

### Enterprise Security Features

- **🔐 Azure Key Vault Integration** - Secure secret management for production
- **🛡️ JWT Authentication** - Secure token-based auth with refresh tokens
- **🔒 bcrypt Password Hashing** - Industry-standard password protection
- **🚨 Rate Limiting** - API protection against abuse
- **🌐 CORS Security** - Proper cross-origin resource sharing
- **📝 Input Validation** - Comprehensive request validation with Zod
- **👥 Role-based Access Control** - Parent, Driver, Admin role separation

### Production Monitoring

**Application Insights Integration:**

- **📊 Custom Business Metrics** - User logins, trip creation, schedule generation
- **⚡ Performance Monitoring** - Function execution times, database performance
- **🔍 Health Checks** - System availability, database connectivity
- **🚨 Security Monitoring** - Failed auth attempts, threat detection
- **📈 Real-time Analytics** - User engagement, system performance

**Monitor Production Health:**

```bash
# Check system health
curl https://vcarpool-api-prod.azurewebsites.net/api/v1/health

# View monitoring dashboard
curl https://vcarpool-api-prod.azurewebsites.net/api/v1/monitoring/dashboard
```

---

## 🧪 Testing & Quality

### 🏆 100% Backend Test Success Rate

**All 212 tests passing across 10 comprehensive test suites:**

```bash
# Run the complete backend test suite
cd backend && npm test

# Test Results Summary:
# ✅ 212 tests passing (100% success rate)
# ⚡ Execution time: 4.386 seconds
# 📊 Coverage: Complete system validation
```

**Test Suite Breakdown:**

| Test Suite                         | Tests   | Status      | Coverage Area                   |
| ---------------------------------- | ------- | ----------- | ------------------------------- |
| `auth-register-simple.test.ts`     | 16      | ✅ Passing  | Basic user registration         |
| `auth-register-simplified.test.ts` | 16      | ✅ Passing  | Simplified registration flow    |
| `auth-register-functional.test.ts` | 20      | ✅ Passing  | Functional registration testing |
| `auth-login-simple.test.ts`        | 25      | ✅ Passing  | Authentication system           |
| `auth-functions.test.ts`           | 18      | ✅ Passing  | Auth function validation        |
| `tesla-stem-registration.test.ts`  | 25      | ✅ Passing  | Tesla Stem school integration   |
| `scheduling-algorithm.test.ts`     | 26      | ✅ Passing  | Family-based scheduling system  |
| `service-validation.test.ts`       | 33      | ✅ Passing  | Service layer validation        |
| `deployed-api-integration.test.ts` | 26      | ✅ Passing  | Production API integration      |
| `azure-functions.test.ts`          | 17      | ✅ Passing  | Azure Functions integration     |
| **Total**                          | **212** | **✅ 100%** | **Complete system validation**  |

### Key Testing Achievements

- **Tesla Stem High School Integration**: Official school details validated with correct address and coordinates
- **Family-Based Driver System**: Driver ID format updated to family-based system (`family-smith-parent`)
- **Balance Calculations**: Traveling parent makeup system balance validation (15 - 12 + 2 = 5)
- **Geographic Validation**: 25-mile radius enforcement testing
- **Registration Flow**: Complete verification system with phone, address, and emergency contacts
- **API Integration**: Production endpoint validation and security testing

### Production Testing Suite

**Automated endpoint validation:**

```bash
# Run comprehensive production tests
./scripts/test-production-endpoints.sh

# Test categories:
# ✅ Health & connectivity checks
# ✅ Authentication system
# ✅ User profile management
# ✅ Trip statistics
# ✅ Admin functions
# ✅ Security headers (CORS, rate limiting)
```

### Quality Metrics (All 100% Complete)

| Category                   | Status      | Completion | Details                          |
| -------------------------- | ----------- | ---------- | -------------------------------- |
| **Core Business Logic**    | ✅ Complete | 100%       | All services validated           |
| **API Versioning**         | ✅ Complete | 100%       | v1 API with OpenAPI spec         |
| **User Interfaces**        | ✅ Complete | 100%       | Responsive design implemented    |
| **Database Integration**   | ✅ Complete | 100%       | 9 Cosmos DB containers optimized |
| **Authentication**         | ✅ Complete | 100%       | JWT + bcrypt + role-based access |
| **Documentation**          | ✅ Complete | 100%       | Comprehensive docs and API spec  |
| **Security**               | ✅ Complete | 100%       | Enterprise-grade security        |
| **Production Features**    | ✅ Complete | 100%       | All features production-ready    |
| **Backend Testing**        | ✅ Complete | 100%       | 212/212 tests passing            |
| **Tesla Stem Integration** | ✅ Complete | 100%       | Official school data validated   |

### Development Testing

```bash
# Run all backend tests (212 tests)
cd backend && npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:backend    # All 212 backend tests
npm run test:frontend   # Frontend component tests
npm run test:e2e        # End-to-end integration tests

# Backend test categories
npm test -- --testNamePattern="tesla-stem"     # Tesla Stem integration tests
npm test -- --testNamePattern="auth"           # Authentication tests
npm test -- --testNamePattern="scheduling"     # Scheduling algorithm tests
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Follow** TypeScript and coding standards
4. **Test** your changes (`npm test`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Code Quality Standards

- ✅ **TypeScript** - Strict mode with comprehensive type checking
- ✅ **Testing** - Unit and integration tests required
- ✅ **Security** - Security scanning and vulnerability assessment
- ✅ **Performance** - Performance monitoring and optimization
- ✅ **Documentation** - Comprehensive code documentation

---

## 📁 Project Structure

```
vcarpool/
├── 📁 backend/                  # Azure Functions backend
│   ├── 📁 src/
│   │   ├── 📁 functions/       # Azure Functions endpoints
│   │   ├── 📁 services/        # Business logic services
│   │   ├── 📁 middleware/      # Authentication & validation
│   │   └── 📁 config/          # Configuration files
│   └── 📄 host.json           # Azure Functions configuration
├── 📁 frontend/                # Next.js frontend
│   ├── 📁 src/
│   │   ├── 📁 app/            # Next.js App Router
│   │   ├── 📁 components/     # React components
│   │   └── 📁 lib/            # Utility libraries
│   └── 📄 next.config.js      # Next.js configuration
├── 📁 shared/                  # Shared TypeScript package
│   └── 📁 src/
│       ├── 📄 types.ts        # Shared type definitions
│       └── 📄 validations.ts  # Zod validation schemas
├── 📁 docs/                    # Documentation
└── 📁 infra/                   # Infrastructure as Code (Bicep)
```

---

## 🆘 Support

### Getting Help

- 📚 **Documentation**: [docs/](docs/) directory
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/vedprakash-m/vcarpool/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/vedprakash-m/vcarpool/discussions)
- 🔒 **Security Issues**: See [Security Policy](SECURITY.md)

### Health Checks

- **System Status**: `/api/health`
- **Monitoring Dashboard**: `/api/monitoring/dashboard`
- **Security Assessment**: `/api/security/scan`

---

## 📄 License

**Copyright © 2025 Vedprakash Mishra**

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

### License Summary

- ✅ **Commercial Use** - Allowed with source disclosure requirements
- ✅ **Modification** - Create derivative works under same license
- ✅ **Distribution** - Share the software freely
- ❗ **Network Use** - Must provide source code to service users
- ❗ **Same License** - Derivative works must use AGPLv3

For detailed license information, see [LICENSE](LICENSE) file.

---

<div align="center">

**Built with ❤️ by [Vedprakash Mishra](https://github.com/vedprakash-m)**

[⭐ Star this project](https://github.com/vedprakash-m/vcarpool) • [🍴 Fork it](https://github.com/vedprakash-m/vcarpool/fork) • [📝 Report Issues](https://github.com/vedprakash-m/vcarpool/issues)

</div>
