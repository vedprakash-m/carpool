# VCarpool

<div align="center">

![VCarpool Logo](https://img.shields.io/badge/VCarpool-School%20Carpool%20Management-blue?style=for-the-badge&logo=car&logoColor=white)

**A modern, enterprise-grade carpool coordination platform connecting families for safe school transportation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-0062AD?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/en-us/services/functions/)
[![Test Coverage](https://img.shields.io/badge/Coverage-212%20Tests-green?style=flat-square&logo=jest)](./backend/coverage/)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue?style=flat-square)](LICENSE)

[![CI](https://github.com/vedprakash-m/vcarpool/actions/workflows/ci.yml/badge.svg)](https://github.com/vedprakash-m/vcarpool/actions/workflows/ci.yml)
[![Deploy](https://github.com/vedprakash-m/vcarpool/actions/workflows/deploy.yml/badge.svg)](https://github.com/vedprakash-m/vcarpool/actions/workflows/deploy.yml)
[![Security](https://github.com/vedprakash-m/vcarpool/actions/workflows/security-scan.yml/badge.svg)](https://github.com/vedprakash-m/vcarpool/actions/workflows/security-scan.yml)

[🚀 Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [📚 Documentation](docs/) • [🔧 Developer Guide](#-developer-setup)

</div>

---

## 🌟 What is VCarpool?

VCarpool is a comprehensive, cloud-native carpool management platform designed specifically for school communities. Built with modern web technologies and enterprise-grade security, it connects families to organize safe, reliable carpools while ensuring fair distribution of driving responsibilities.

**Currently serving**: Tesla STEM High School, Redmond, WA (25-mile service radius)

### ✨ Key Features

**🏫 Multi-School Platform**

- Universal support for any school district nationwide
- Configurable school profiles with custom grade levels
- Geographic service radius management (currently 25-mile radius enforcement)
- Real-time address validation with intelligent geocoding

**👥 Smart Group Management**

- Intelligent parent matching based on location and schedules
- Automated fairness tracking for driving responsibilities
- Flexible group administration with role-based access
- Real-time coordination and communication tools

**📅 Advanced Scheduling**

- Weekly preference submission with conflict resolution
- Automatic schedule generation and optimization
- Support for traveling parents with makeup trip options (2-6 week flexible window)
- Emergency contact verification and backup arrangements

**🔒 Enterprise Security**

- JWT-based authentication with secure token management
- Three-tier verification: SMS, address geocoding, emergency contacts
- Rate limiting and comprehensive input validation
- GDPR/COPPA compliant privacy design

**📱 Modern User Experience**

- Progressive Web App (PWA) with offline capabilities
- Responsive design optimized for mobile and desktop
- Multi-step registration with validation gates
- Intuitive admin dashboard for school coordinators

### 🚀 What Makes VCarpool Different

- **Type-Safe Architecture**: Full TypeScript implementation across frontend and backend
- **Cloud-Native Design**: Built for Azure with serverless functions and global scalability
- **Production Ready**: 212 automated tests with 70% coverage requirement
- **Cost Optimized**: Multi-resource group architecture enabling 70% cost savings during inactive periods
- **Developer Friendly**: Comprehensive APIs, clear documentation, and modular architecture

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** (LTS recommended)
- **Azure Account** (for cloud deployment)
- **Azure Functions Core Tools v4+** (for local development)

### Local Development

```bash
# Clone the repository
git clone https://github.com/vedprakash-m/vcarpool.git
cd vcarpool

# Install all dependencies (uses npm workspaces)
npm install

# Configure environment variables
cp backend/local.settings.json.example backend/local.settings.json
cp frontend/.env.local.example frontend/.env.local
# Edit configuration files with your settings

# Start development servers
npm run dev
```

**Development Environment:**

- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:7071/api
- ❤️ **Health Check**: http://localhost:7071/api/health

### 🌐 Live Demo

Experience VCarpool in action: [**https://lively-stone-016bfa20f.6.azurestaticapps.net**](https://lively-stone-016bfa20f.6.azurestaticapps.net)

---

## 🏗️ Technology Stack

### Core Technologies

**Frontend**

- **Next.js 14+** with App Router for optimal performance
- **TypeScript 5.0** for type safety and developer experience
- **Tailwind CSS** for responsive, modern UI design
- **Zustand** for state management
- **React Hook Form** with Zod validation

**Backend**

- **Azure Functions v4** with Node.js 22 runtime
- **TypeScript** for consistent development experience
- **JWT Authentication** with secure token management
- **RESTful API** design with 30+ endpoints

**Database & Infrastructure**

- **Azure Cosmos DB** (NoSQL, serverless) with optimized containers
- **Azure Storage Account** with flexible deployment options
- **Azure Key Vault** for secrets management
- **Azure Application Insights** for monitoring and analytics
- **Azure Static Web Apps** for global CDN delivery

### Architecture Patterns

```
vcarpool/
├── 🌐 frontend/          # Next.js React application
│   ├── src/app/          # App Router pages and layouts
│   ├── components/       # Reusable React components
│   └── types/            # Frontend TypeScript types
├── 🔧 backend/           # Azure Functions API (30+ endpoints)
│   ├── src/              # Shared services and utilities
│   ├── auth-*/           # Authentication endpoints
│   ├── admin-*/          # Administrative functions
│   └── parent-*/         # Parent workflow functions
├── 🔗 shared/            # Shared TypeScript types & validation
├── ☁️ infra/            # Azure Bicep infrastructure templates
│   ├── database.bicep    # Database tier (persistent)
│   ├── main-compute.bicep # Compute tier (can be deleted for cost savings)
│   └── storage.bicep     # Optional dedicated storage
├── 🧪 e2e/              # End-to-end tests with Playwright
├── 🔨 scripts/          # Deployment and automation scripts
└── 📚 docs/             # Comprehensive documentation
```

### Quality & Testing

- **212 Automated Tests**: Comprehensive unit, integration, and E2E testing
- **70% Coverage Minimum**: Enforced by CI/CD pipeline
- **Performance Gates**: Sub-150ms API response times under load
- **Security Scanning**: ESLint security plugin + npm audit integration
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

---

## 🚀 Deployment & Infrastructure

### Multi-Resource Group Architecture

VCarpool implements a **cost-optimized multi-resource group architecture** that separates persistent storage from compute resources:

#### 🗄️ Database Resource Group (`vcarpool-db-rg`)

- **Purpose**: Persistent data storage (always running)
- **Resources**: Azure Cosmos DB with all user data
- **Cost**: ~$24/month
- **Data Safety**: Never deleted during cost optimization

#### ⚡ Compute Resource Group (`vcarpool-rg`)

- **Purpose**: Application runtime (can be deleted/recreated)
- **Resources**: Functions, Static Web App, Storage, Key Vault, Monitoring
- **Cost**: ~$50-100/month
- **Optimization**: Delete when inactive, restore in 5 minutes

### Deployment Options

**🔄 Automated Deployment (Recommended)**

```bash
# Deploy via GitHub Actions
git push origin main
```

**🛠️ Manual Deployment**

```bash
# Complete infrastructure deployment
./scripts/deploy-multi-rg.sh

# Cost optimization management
./scripts/cost-optimize.sh analyze    # Show current costs
./scripts/cost-optimize.sh delete     # Save 70% during inactive periods
./scripts/cost-optimize.sh restore    # Restore in 5 minutes
```

### CI/CD Pipeline

Modern 3-pipeline architecture with quality gates:

- **CI Pipeline**: Fail-fast validation, parallel builds, security scanning
- **Deploy Pipeline**: Progressive deployment with health checks and rollback
- **Maintenance Pipeline**: Scheduled security scans and performance monitoring

---

## 🔧 Developer Setup

### Development Commands

```bash
# Development
npm run dev                    # Start all services
npm run dev:backend           # Backend only
npm run dev:frontend          # Frontend only

# Building
npm run build                 # Build all packages
npm run build:fast           # Parallel build

# Testing
npm test                      # Run all tests
npm run test:ci              # CI-friendly test run
npm run test:e2e             # End-to-end tests
npm run perf:test            # Performance testing

# Code Quality
npm run lint                  # Lint all packages
npm run lint:fix             # Auto-fix linting issues
npm run type-check           # TypeScript validation

# Security
npm run security:scan        # Security vulnerability scan
npm run security:secrets     # Check for exposed secrets
```

### Project Setup Scripts

```bash
# Complete local setup
npm run setup                # Interactive setup wizard

# Validation
./scripts/validate-local.sh  # Validate local environment
./scripts/validate-dependencies.js # Check dependencies
```

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

**Development Process:**

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run quality checks: `npm run lint && npm test`
5. Submit a pull request

---

## 📡 API Reference

### Core Endpoints

| Endpoint                     | Method     | Description                         | Auth  |
| ---------------------------- | ---------- | ----------------------------------- | ----- |
| `/api/health`                | `GET`      | System health check                 | None  |
| `/api/auth-login-simple`     | `POST`     | User authentication                 | None  |
| `/api/auth-register-simple`  | `POST`     | User registration with verification | None  |
| `/api/users-me`              | `GET`      | Current user profile                | JWT   |
| `/api/trips-list`            | `GET`      | User's trip history                 | JWT   |
| `/api/admin-carpool-groups`  | `GET/POST` | Manage carpool groups               | Admin |
| `/api/parent-group-creation` | `POST`     | Create parent groups                | JWT   |

### API Categories

**🔐 Authentication & Users**

- Multi-step registration with address validation
- JWT-based login with refresh tokens
- Profile management and preferences
- SMS verification and emergency contacts

**👥 Group Management**

- Smart group matching and creation
- Role-based access control (Admin, Parent, Student)
- Group lifecycle management
- Join request processing

**📅 Scheduling & Coordination**

- Weekly preference submission
- Traveling parent makeup scheduling
- Automated schedule generation
- Trip statistics and reporting

**🛡️ Admin Functions**

- School management and configuration
- User role management
- System monitoring and health checks
- Performance analytics

---

## 🎯 Current Status

### ✅ Production Ready Features

- **Core Functionality**: Complete carpool management system
- **Security**: Enterprise-grade authentication and validation
- **Performance**: Sub-150ms API responses, optimized for scale
- **Testing**: 212 automated tests with comprehensive coverage
- **Infrastructure**: Multi-resource group architecture with cost optimization
- **Monitoring**: Real-time application insights and health checks

### 🚀 Recent Achievements (June 2025)

- **Password Security Enhancement**: Comprehensive weak password detection
- **Address Validation Overhaul**: Multi-provider geocoding with privacy focus
- **CI/CD Modernization**: 50% complexity reduction with quality gates
- **Cost Optimization**: 70% savings during inactive development periods
- **Technical Debt Reduction**: 85% complete with unified patterns

### 🎯 Roadmap

**Phase 6: Feature Completion** (In Progress)

- Enhanced admin dashboard features
- Real-time notification system
- Advanced reporting and analytics

**Phase 7: Scale & Expansion** (Planned)

- Multi-school support architecture
- AI-powered route optimization
- Mobile app with offline capabilities
- Integration with school management systems

---

## 📞 Support & Community

### Getting Help

- **📚 Documentation**: Comprehensive guides in [docs/](docs/)
- **🐛 Issues**: [GitHub Issues](https://github.com/vedprakash-m/vcarpool/issues) for bugs and feature requests
- **💡 Discussions**: [GitHub Discussions](https://github.com/vedprakash-m/vcarpool/discussions) for questions
- **🔒 Security**: Report security issues privately via email

### Community

- **Current Deployment**: Tesla STEM High School, Redmond, WA
- **Contributors**: Parents, developers, and school administrators
- **Mission**: Making school transportation safer, more efficient, and equitable

---

## 📄 License

This project is licensed under the **[GNU Affero General Public License v3.0](LICENSE)**.

**Key Points:**

- ✅ Commercial use permitted with AGPL compliance
- ✅ Modification encouraged with source sharing requirements
- ✅ Distribution allowed with license preservation
- ⚠️ Network use requires source sharing (AGPL requirement)

### Attribution

**Original Development**: [Vedprakash Mishra](https://github.com/vedprakash-m)

**Built with**: Next.js, Azure Functions, TypeScript, Tailwind CSS, and the dedication of families committed to safer school transportation.

---

<div align="center">

### 🎯 Ready to Transform School Transportation?

**Make carpooling safe, fair, and efficient for your school community**

[⭐ Star this Project](https://github.com/vedprakash-m/vcarpool) • [🚀 Try Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [🐛 Report Issues](https://github.com/vedprakash-m/vcarpool/issues) • [💡 Request Features](https://github.com/vedprakash-m/vcarpool/discussions)

**Built with ❤️ for safer, smarter, more sustainable school transportation**

</div>
