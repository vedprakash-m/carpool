# VCarpool

<div align="center">

![VCarpool Logo](https://img.shields.io/badge/VCarpool-School%20Carpool%20Management-blue?style=for-the-badge&logo=car&logoColor=white)

**A modern, scalable carpool coordination platform connecting families for safe school transportation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-0062AD?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/en-us/services/functions/)
[![Test Coverage](https://img.shields.io/badge/Coverage-212%20Tests-green?style=flat-square&logo=jest)](./backend/coverage/)
[![License](https://img.shields.io/badge/License-AGPL%20v3-blue?style=flat-square)](LICENSE)

[🚀 Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [📚 Documentation](docs/) • [🔧 API Reference](#-api-reference)

</div>

---

## 🌟 Overview

VCarpool simplifies school transportation by connecting parents through an intelligent carpool coordination system. Built with modern web technologies and enterprise-grade security, it enables families to organize safe, reliable carpools while ensuring fair distribution of driving responsibilities.

### ✨ Core Features

**🏫 Multi-School Platform**

- Universal support for any school district nationwide
- Configurable school profiles with custom grade levels
- Geographic service radius management
- Currently serving Tesla STEM High School, Redmond WA

**👥 Smart Group Management**

- Intelligent parent matching based on location and schedules
- Automated fairness tracking for driving responsibilities
- Flexible group administration with role-based access
- Real-time coordination and communication tools

**📅 Advanced Scheduling**

- Weekly preference submission with conflict resolution
- Automatic schedule generation and optimization
- Support for traveling parents with makeup trip options
- Emergency contact verification and backup arrangements

**🔒 Enterprise Security**

- JWT-based authentication with secure token management
- SMS verification for phone numbers and emergency contacts
- Address validation with geographic boundary enforcement
- Comprehensive audit logging and monitoring

**📱 Modern User Experience**

- Responsive design optimized for mobile and desktop
- Progressive Web App (PWA) capabilities
- Real-time notifications and updates
- Intuitive admin dashboard for school coordinators

### 🚀 What Makes VCarpool Different

- **Type-Safe Architecture**: Full TypeScript implementation across frontend and backend
- **Cloud-Native Design**: Built for Azure with serverless functions and global scalability
- **Production Ready**: 212 automated tests ensuring reliability and performance
- **Developer Friendly**: Comprehensive API, clear documentation, and modular architecture

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** - Latest LTS recommended
- **Azure Account** - For cloud deployment
- **Azure Functions Core Tools v4+** - For local development

### Local Development

```bash
# Clone the repository
git clone https://github.com/vedprakash-m/vcarpool.git
cd vcarpool

# Install dependencies
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

## 🏗 Architecture & Technology

### Modern Technology Stack

**Frontend**

- **Next.js 14** with App Router for optimal performance
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** for responsive, modern UI design
- **React Hook Form** with Zod validation

**Backend**

- **Azure Functions v4** with Node.js 22 runtime
- **TypeScript** for consistent development experience
- **JWT Authentication** with secure token management
- **RESTful API** design with comprehensive endpoints

**Database & Infrastructure**

- **Azure Cosmos DB** with 9 optimized containers
- **Azure Storage Account** with flexible deployment options (dedicated storage RG support)
- **Azure Key Vault** for secrets management
- **Azure Application Insights** for monitoring and analytics
- **Azure Static Web Apps** for global content delivery

### Project Architecture

```
vcarpool/
├── 🔧 backend/           # Azure Functions API (30+ endpoints)
├── 🌐 frontend/          # Next.js React application
│   ├── src/app/          # Next.js App Router pages
│   ├── components/       # Reusable React components
│   │   ├── admin/        # Admin configuration interfaces
│   │   └── shared/       # UI component library
│   └── config/           # School and grade configurations
├── 🔗 shared/            # Shared TypeScript types & utilities
├── 📚 docs/              # Technical documentation
├── ☁️ infra/            # Azure Bicep infrastructure templates
│   ├── database.bicep    # Database resources (Cosmos DB)
│   ├── main-compute.bicep # Compute resources (Functions, Web App)
│   ├── storage.bicep     # Dedicated storage account template
│   └── main.bicep        # Legacy single-RG template
└── 🔨 scripts/          # Deployment and utility scripts
    ├── deploy-multi-rg.sh      # Multi-resource group deployment
    ├── deploy-storage.sh       # Storage account deployment
    ├── migrate-storage-account.sh # Storage migration tools
    └── cost-optimize.sh        # Cost optimization management
```

### Enterprise-Grade Features

- **🔒 Security**: JWT authentication, SMS verification, role-based access control
- **📊 Monitoring**: Real-time application insights and performance tracking
- **🧪 Testing**: 212 automated tests with comprehensive coverage
- **⚡ Performance**: Serverless architecture with global CDN distribution
- **🔄 CI/CD**: Automated deployment pipeline with GitHub Actions

---

## 📡 API Reference

### Core Endpoints

VCarpool provides a comprehensive REST API with 30+ endpoints for complete carpool management:

| Endpoint                     | Method     | Description              | Authentication |
| ---------------------------- | ---------- | ------------------------ | -------------- |
| `/api/health`                | `GET`      | System health and status | None           |
| `/api/auth-login-simple`     | `POST`     | User authentication      | None           |
| `/api/auth-register-simple`  | `POST`     | User registration        | None           |
| `/api/users-me`              | `GET`      | Current user profile     | JWT            |
| `/api/trips-list`            | `GET`      | List user's trips        | JWT            |
| `/api/trips-stats`           | `GET`      | Trip statistics          | JWT            |
| `/api/admin-carpool-groups`  | `GET/POST` | Manage carpool groups    | Admin          |
| `/api/parent-group-creation` | `POST`     | Create parent groups     | JWT            |

### API Categories

**🔐 Authentication & Users**

- User registration with SMS verification
- JWT-based login and token refresh
- Profile management and preferences

**👥 Group Management**

- Carpool group creation and administration
- Parent group search and join requests
- Role-based access control

**📅 Trip Coordination**

- Weekly schedule management
- Trip assignment and optimization
- Swap request handling

**🏫 School Administration**

- Multi-school configuration
- Grade level management
- Address validation and service areas

**📱 Communication**

- SMS verification and notifications
- Emergency contact management
- Real-time status updates

### Development API

Start the development server to explore all endpoints:

```bash
npm run dev
# API available at http://localhost:7071/api
```

---

## 🎓 Smart Registration System

### Intelligent User Onboarding

**Pre-configured School Support**

- Dynamic grade level dropdowns (8th-12th for Tesla STEM)
- Automatic school address validation
- Configurable service radius (25 miles default)
- Real-time address verification

**Admin Configuration Portal** (`/admin/school-config`)

- Add/edit schools with full address details
- Configure grade levels per school type
- Set geographic boundaries and service areas
- Activate/deactivate schools for registration

**Technical Implementation**

- **Type Safety**: Inline Zod validation with TypeScript
- **Form Management**: React Hook Form with Controller components
- **Validation**: Real-time form validation with error handling
- **UI Components**: Reusable dropdown and input components

### Registration Workflow

1. **📋 Family Information** - Parent details with phone/email validation
2. **👶 Children Details** - Names with intelligent grade/school selection
3. **🏠 Address Verification** - Automatic validation within service radius
4. **✅ Submission** - Secure registration with school-specific defaults

### Developer Features

**Local Development**

```bash
npm run dev
# Access registration at http://localhost:3000/register
```

**Backend Functions**

- 30+ Azure Functions for complete carpool management
- Authentication, group management, scheduling, and notifications
- Comprehensive test coverage with 212 passing tests

---

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite

**Test Coverage: 212 Tests Passing** ✅

- **Backend**: Complete API endpoint testing
- **Frontend**: Component and integration testing
- **E2E**: Critical user journey validation
- **Security**: Authentication and authorization testing

```bash
# Run all tests
npm test

# Specific test suites
cd backend && npm test      # Backend API tests
cd frontend && npm test     # Frontend component tests

# Coverage reports
npm run test:coverage       # Generate detailed coverage
```

### Quality Metrics

**✅ Core Functionality**

- Parent group creation and management
- Carpool schedule coordination and optimization
- Authentication and authorization systems
- SMS verification and address validation

**✅ Advanced Features**

- Family-based scheduling algorithms
- Production API integration testing
- Role-based access control validation
- Geographic boundary enforcement

**✅ Performance & Security**

- Load testing for Azure Functions
- JWT token security validation
- Database query optimization
- Error handling and recovery

### Development Standards

- **TypeScript Strict Mode** - Enhanced type safety
- **Code Coverage** - Minimum 80% coverage requirement
- **Security First** - Comprehensive input validation
- **Performance** - Optimized for mobile and desktop

---

## 🚀 Deployment & Infrastructure

### Cloud-Native Architecture

VCarpool leverages Azure's serverless platform for scalability and reliability:

**🔄 Automated Deployment**

```bash
# Deploy via GitHub Actions (Recommended)
git push origin main
```

**🛠 Manual Deployment**

```bash
# Complete infrastructure deployment
./scripts/deploy-multi-rg.sh

# Specific deployment options
./scripts/deploy-multi-rg.sh deploy    # Full deployment
./scripts/deploy-multi-rg.sh verify    # Verify deployment
./scripts/deploy-multi-rg.sh outputs   # Get deployment info
```

### Multi-Resource Group Strategy

**Database Tier** (`vcarpool-db-rg`)

- Azure Cosmos DB with global distribution
- Persistent data storage and backup
- High availability and disaster recovery

**Application Tier** (`vcarpool-rg`)

- Azure Function App (serverless backend)
- Azure Static Web App (global CDN)
- Application Insights, Key Vault, Storage

### Production Infrastructure

- **🌐 Frontend**: Azure Static Web Apps with global CDN
- **⚡ Backend**: Azure Functions with auto-scaling
- **🗄️ Database**: Azure Cosmos DB with multi-region support
- **🔒 Security**: Azure Key Vault for secrets management
- **📊 Monitoring**: Application Insights for real-time analytics

### Infrastructure as Code

All infrastructure is defined using **Azure Bicep** templates for:

- Reproducible deployments
- Version-controlled infrastructure
- Automated resource provisioning
- Environment consistency

---

## 💡 Resource Management

For development teams working with Azure resources, VCarpool includes cost-effective resource management:

**📋 Resource Management Scripts**

```bash
# Resource status and analysis
./scripts/cost-optimize.sh analyze

# Temporary resource management (development)
./scripts/cost-optimize.sh delete     # Remove compute resources
./scripts/cost-optimize.sh restore    # Restore resources quickly
./scripts/cost-optimize.sh status     # Check resource status
```

## 🌐 Deployment & Infrastructure

### Multi-Resource Group Architecture

VCarpool uses a sophisticated multi-resource group architecture for optimal cost management and operational flexibility:

#### 🗄️ Database Resource Group (`vcarpool-db-rg`)

**Always Running - Contains Persistent Data**

- **Azure Cosmos DB** (`vcarpool-cosmos-prod`) - Main database
- **Database**: `vcarpool` with 9 optimized containers
- **Cost**: ~$24/month (400 RU/s provisioned throughput)
- **Purpose**: Persistent storage that never gets deleted

#### ⚡ Compute Resource Group (`vcarpool-rg`)

**Can Be Deleted for Cost Savings**

- **Function App** (`vcarpool-api-prod`) - Backend API with 30+ endpoints
- **Static Web App** (`vcarpool-web-prod`) - Frontend application
- **Storage Account** (`vcarpoolsaprod`) - Function storage and deployment artifacts
- **Application Insights** - Performance monitoring and diagnostics
- **Key Vault** - Secrets and configuration management
- **Cost**: ~$50-100/month (varies by usage)
- **Purpose**: Application runtime that can be recreated from templates

#### 🗄️ Optional: Dedicated Storage Resource Group (`vcarpool-storage-rg`)

**For Advanced Storage Management**

- **Dedicated Storage Account** - Separated from compute resources
- **Purpose**: Isolate storage for better management and potential cost optimization
- **Migration Tools**: Complete migration scripts provided

### Storage Account Flexibility

VCarpool now supports multiple storage deployment architectures:

1. **Default**: Storage in compute resource group (`vcarpool-rg`)
2. **Consolidated**: Storage in database resource group (`vcarpool-db-rg`)
3. **Dedicated**: Storage in separate resource group (`vcarpool-storage-rg`)

**Migration Tools Available:**

```bash
# Plan storage account migration
./scripts/migrate-storage-account.sh plan --target-name vcarpoolsanew --target-rg vcarpool-storage-rg --target-location eastus2

# Deploy new storage account
./scripts/deploy-storage.sh deploy --resource-group vcarpool-storage-rg --location eastus2

# Migrate data and update configuration
./scripts/migrate-storage-account.sh migrate-data --target-name vcarpoolsanew --target-rg vcarpool-storage-rg
./scripts/migrate-storage-account.sh update-config --target-name vcarpoolsanew --target-rg vcarpool-storage-rg
```

### 💰 Cost Optimization Strategy

**Active Development**: ~$75-125/month (all resource groups running)
**Inactive Period**: ~$24/month (70% savings by deleting compute resources)

```bash
# Analyze current costs
./scripts/cost-optimize.sh analyze

# Delete compute resources (save ~$50-100/month)
./scripts/cost-optimize.sh delete

# Restore when needed (5-minute deployment)
./scripts/cost-optimize.sh restore
```

**🔒 Data Safety**: Database resources remain protected during any optimization operations.

---

## 🤝 Contributing

We welcome contributions from developers, school administrators, and community members!

### Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally: `git clone https://github.com/your-username/vcarpool.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Make** your changes following our development standards
5. **Add** comprehensive tests for new functionality
6. **Commit** with clear messages: `git commit -m 'Add: Amazing new feature'`
7. **Push** to your branch: `git push origin feature/amazing-feature`
8. **Submit** a Pull Request with detailed description

### Development Guidelines

**🔧 Technical Standards**

- **TypeScript Strict Mode** - All code must be type-safe
- **Testing Required** - New features need corresponding tests
- **Documentation** - Update README and docs for significant changes
- **Performance First** - Consider impact on mobile users

**🛡 Security Standards**

- **Input Validation** - All user inputs must be validated
- **Authentication** - Follow JWT best practices
- **Data Privacy** - Ensure COPPA compliance for school applications
- **Audit Trail** - Maintain logs for administrative actions

**🎨 Code Style**

- **ESLint Configuration** - Follow project linting rules
- **Prettier Formatting** - Consistent code formatting
- **Component Structure** - Follow established patterns
- **Commit Messages** - Use conventional commit format

### Contribution Areas

**🌟 High-Impact Contributions**

- New school district integrations
- Mobile app development (React Native)
- Advanced scheduling algorithms
- Internationalization (i18n) support

**🔧 Technical Improvements**

- Performance optimizations
- Test coverage improvements
- Accessibility enhancements
- Developer tooling

**📚 Documentation & Community**

- API documentation improvements
- Tutorial creation
- Bug reports and feature requests
- User experience feedback

### Code Review Process

All contributions go through thorough code review:

- **Automated Testing** - All tests must pass
- **Security Review** - Security-focused code analysis
- **Performance Check** - Impact assessment on application performance
- **Documentation Review** - Ensure changes are properly documented

---

## 📄 License & Legal

### Open Source License

This project is licensed under the **[GNU Affero General Public License v3.0](LICENSE)**.

**Key Points:**

- ✅ **Commercial Use** - Permitted with AGPL compliance
- ✅ **Modification** - Encouraged with source sharing requirements
- ✅ **Distribution** - Allowed with license preservation
- ✅ **Private Use** - No restrictions for personal/internal use
- ⚠️ **Network Use** - AGPL requires source sharing for network services

### Attribution

**Original Development**: [Vedprakash Mishra](https://github.com/vedprakash-m)

**Community**: Built with contributions from parents, developers, and school administrators committed to safe, efficient student transportation.

### Third-Party Libraries

VCarpool builds upon excellent open-source projects:

- **Next.js** - React framework for production
- **Azure Functions** - Serverless compute platform
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework

---

<div align="center">

### 🎯 Ready to Transform School Transportation?

**Get Started Today** • **Join the Community** • **Make School Commutes Better**

[⭐ Star this project](https://github.com/vedprakash-m/vcarpool) • [🚀 Try Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [🐛 Report Issues](https://github.com/vedprakash-m/vcarpool/issues) • [💡 Request Features](https://github.com/vedprakash-m/vcarpool/issues/new)

**Built with ❤️ for safer, smarter school transportation**

</div>
