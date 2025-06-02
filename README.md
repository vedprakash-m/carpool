# VCarpool - Carpool Management Application

A comprehensive carpool management application built with Node.js TypeScript backend on Azure Functions and Next.js frontend, featuring enterprise-grade security, monitoring, and performance optimization.

## 🚗 Features

### Core Features

- **User Management**: Registration, authentication, and profile management with password reset
- **Trip Management**: Create, search, join, and manage carpool trips with advanced filtering
- **Real-time Communication**: Instant notifications and trip updates
- **Swap Requests**: Easy trip swapping between users
- **Analytics**: Trip statistics and cost savings tracking
- **Security**: Enterprise-grade security with JWT authentication and role-based access

### Advanced Features

- **Real-time Monitoring**: Comprehensive system health monitoring and alerting
- **Security Scanner**: Advanced threat detection and vulnerability assessment
- **Performance Optimization**: Intelligent caching, database optimization, and API performance tuning
- **Infrastructure Monitoring**: Memory optimization, connection pooling, and cold start reduction
- **Advanced Analytics Dashboard**: Real-time metrics, trends, and business insights

## 🏗️ Architecture

### Backend (Azure Functions + TypeScript)

- **Runtime**: Node.js 22+ with TypeScript
- **Database**: Azure Cosmos DB with query optimization
- **Authentication**: JWT-based auth with refresh tokens and role-based access control
- **Email**: Nodemailer for notifications
- **Caching**: Multi-layer caching with intelligent invalidation
- **Monitoring**: Advanced monitoring with Application Insights integration
- **Security**: Comprehensive security scanning and threat detection
- **Performance**: API optimization, request batching, and response compression
- **Deployment**: Azure Functions with infrastructure optimization

### Frontend (Next.js + TypeScript)

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Deployment**: Azure Static Web Apps

### Shared Package

- **Types**: Shared TypeScript interfaces
- **Validation**: Zod schemas for API validation
- **Utilities**: Common helper functions

### Monitoring & Security Stack

- **Application Insights**: Azure-native monitoring with custom telemetry
- **Real-time Dashboard**: Comprehensive metrics visualization
- **Health Checks**: Automated system health monitoring
- **Security Scanner**: Advanced threat detection and vulnerability assessment
- **Performance Monitoring**: API performance tracking and optimization
- **Infrastructure Monitoring**: Memory, CPU, and resource optimization

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version requirements depend on deployment target:
  - **Development & Backend**: Node.js 22+ (LTS recommended)
  - **Frontend (Azure SWA)**: Node.js 20+ (Azure SWA limitation)
  - **Compatibility**: The codebase is compatible with Node.js 20-22
- **npm**: 10+ or yarn
- **Azure Account**: For deployment
- **Azure Functions Core Tools**: For local backend development

### Installation

1. **Clone and install dependencies**:

```bash
git clone <repository-url>
cd vcarpool
npm install
```

2. **Install workspace dependencies**:

```bash
# Install shared package dependencies
cd shared && npm install && npm run build

# Install backend dependencies
cd ../backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

3. **Set up environment variables**:

Backend (`backend/local.settings.json`):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "development",
    "JWT_SECRET": "your-jwt-secret-key",
    "JWT_REFRESH_SECRET": "your-jwt-refresh-secret-key",
    "COSMOS_DB_ENDPOINT": "your-cosmos-db-endpoint",
    "COSMOS_DB_KEY": "your-cosmos-db-key",
    "COSMOS_DB_DATABASE_ID": "vcarpool",
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "your-email@gmail.com",
    "SMTP_PASS": "your-app-password",
    "CORS_ORIGIN": "http://localhost:3000",
    "APPINSIGHTS_CONNECTION_STRING": "your-app-insights-connection-string",
    "ENABLE_MONITORING": "true",
    "ENABLE_SECURITY_SCANNER": "true",
    "CACHE_TTL": "300000",
    "MAX_CACHE_SIZE": "100"
  }
}
```

Frontend (`.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:7071/api
```

### Development

1. **Start the shared package in watch mode**:

```bash
cd shared && npm run dev
```

2. **Start the backend**:

```bash
cd backend && npm run dev
```

3. **Start the frontend**:

```bash
cd frontend && npm run dev
```

Or run everything concurrently from the root:

```bash
npm run dev
```

## 📁 Project Structure

```
vcarpool/
├── package.json              # Root workspace configuration
├── backend/                  # Azure Functions backend
│   ├── src/
│   │   ├── functions/       # Azure Functions
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express-like middleware
│   │   ├── config/          # Configuration files
│   │   ├── monitoring/      # Advanced monitoring dashboard
│   │   ├── security/        # Security scanner and threat detection
│   │   └── utils/           # Utility modules (caching, optimization, etc.)
│   ├── host.json           # Azure Functions host config
│   └── local.settings.json # Local environment variables
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   ├── lib/            # Utility libraries
│   │   └── store/          # Zustand stores
│   └── tailwind.config.js  # Tailwind configuration
├── shared/                  # Shared TypeScript package
│   └── src/
│       ├── types.ts        # Shared type definitions
│       ├── validations.ts  # Zod validation schemas
│       └── utils.ts        # Utility functions
└── docs/                    # Documentation
    └── README.md           # Comprehensive project documentation
```

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run all tests
npm test
```

## 🚀 Deployment

### Backend (Azure Functions)

```bash
cd backend

# Build the project
npm run build

# Deploy with monitoring enabled
npm run deploy

# Deploy with enhanced monitoring and security
ENABLE_MONITORING=true ENABLE_SECURITY_SCANNER=true npm run deploy
```

### Frontend (Azure Static Web Apps)

```bash
cd frontend

# Build for production
npm run build

# Deploy to Azure Static Web Apps
npm run deploy
```

### Production Configuration

#### Azure Functions Host Configuration

The application includes optimized `host.json` configuration for production:

- **Performance Tuning**: Optimized timeout, retry, and concurrency settings
- **Health Monitoring**: Built-in health check endpoints
- **Logging**: Structured logging with Application Insights integration
- **Security**: Enhanced security headers and CORS configuration

#### Environment Variables (Production)

```bash
# Core Application
NODE_ENV=production
JWT_SECRET=<secure-production-secret>
JWT_REFRESH_SECRET=<secure-refresh-secret>

# Database
COSMOS_DB_ENDPOINT=<production-cosmos-endpoint>
COSMOS_DB_KEY=<production-cosmos-key>
COSMOS_DB_DATABASE_ID=vcarpool-prod

# Monitoring
APPINSIGHTS_CONNECTION_STRING=<production-app-insights>
ENABLE_MONITORING=true
ENABLE_SECURITY_SCANNER=true

# Performance
CACHE_TTL=900000
MAX_CACHE_SIZE=1000
ENABLE_COMPRESSION=true

# Security
ENABLE_RATE_LIMITING=true
SECURITY_SCAN_INTERVAL=3600000
```

## 📈 Monitoring & Troubleshooting

### Accessing Monitoring Dashboard

The application provides comprehensive monitoring through multiple interfaces:

#### Local Development

```bash
# Start monitoring dashboard
cd backend
npm run start:monitoring

# Access health check endpoint
curl http://localhost:7071/api/monitoring/health

# View performance metrics
curl http://localhost:7071/api/monitoring/dashboard
```

#### Production Monitoring

- **Application Insights**: Real-time telemetry and performance monitoring
- **Health Endpoints**: Automated health checks with detailed system status
- **Custom Dashboard**: Advanced monitoring dashboard with business metrics
- **Alerting**: Configurable alerts for system health and performance issues

### Key Metrics to Monitor

#### System Health

- **Memory Usage**: Heap usage percentage and trends
- **Response Times**: P95/P99 response times across endpoints
- **Error Rates**: Request error rates and failure patterns
- **Cache Performance**: Hit rates and cache efficiency

#### Business Metrics

- **User Activity**: Daily/weekly/monthly active users
- **Trip Statistics**: Created trips, completed rides, user engagement
- **System Performance**: Function executions, cold starts, resource usage

### Troubleshooting Common Issues

#### High Memory Usage

```bash
# Check memory stats
curl http://localhost:7071/api/monitoring/performance

# Review memory optimization
# - Cache size limits
# - Connection pool configuration
# - Memory cleanup intervals
```

#### Slow Response Times

```bash
# Analyze performance metrics
curl http://localhost:7071/api/monitoring/dashboard

# Check database optimization
# - Query performance
# - Index usage
# - Connection pooling
```

#### Security Alerts

```bash
# Review security scan results
curl http://localhost:7071/api/security/scan

# Check for:
# - Failed authentication attempts
# - Suspicious request patterns
# - Vulnerability assessments
```

## 🔧 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration with validation
- `POST /api/auth/login` - User login with security monitoring
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Secure logout

### Users

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users/:id` - Get user by ID (with permissions)

### Trips

- `GET /api/trips` - List trips with advanced filtering
- `POST /api/trips` - Create new trip with optimization
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Cancel trip
- `POST /api/trips/:id/join` - Join trip with validation
- `POST /api/trips/:id/leave` - Leave trip

### Schedules

- `GET /api/schedules` - Get user schedules
- `POST /api/schedules` - Create recurring schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Monitoring & Admin

- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/dashboard` - Monitoring dashboard metrics
- `GET /api/monitoring/performance` - Performance metrics
- `GET /api/security/scan` - Security scan report
- `GET /api/admin/metrics` - Admin-only system metrics

## 📊 Enhanced Features

### Advanced Monitoring & Analytics

The application includes a comprehensive monitoring system with:

#### Real-time Dashboard

- **System Metrics**: CPU, memory, disk usage, and network statistics
- **Performance Metrics**: Response times, throughput, error rates, and cache hit rates
- **Business Metrics**: Active users, trip statistics, user engagement metrics
- **Security Metrics**: Threat detection, risk scoring, failed auth attempts

#### Health Monitoring

- **Automated Health Checks**: Cache, memory, database, and connection pool monitoring
- **Performance Alerts**: Configurable thresholds for response times and error rates
- **Infrastructure Monitoring**: Cold start optimization and resource usage tracking

### Security & Threat Detection

Advanced security features including:

#### Security Scanner

- **Vulnerability Assessment**: Automated scanning for security vulnerabilities
- **Threat Detection**: Real-time analysis of security threats
- **Risk Scoring**: Dynamic risk assessment and mitigation recommendations
- **Compliance Monitoring**: Security best practices and compliance checking

#### Access Control

- **Role-based Access Control (RBAC)**: Admin, Parent, Student roles
- **JWT Security**: Secure token management with refresh tokens
- **Input Validation**: Comprehensive request validation and sanitization

### Performance Optimization

Comprehensive performance enhancements:

#### Caching Strategy

- **Multi-layer Caching**: Memory and distributed caching with intelligent invalidation
- **Query Optimization**: Database query optimization and connection pooling
- **Response Compression**: Automatic response compression and optimization

#### API Optimization

- **Request Batching**: Bulk operations for improved throughput
- **Response Optimization**: Pagination, filtering, and data optimization
- **Performance Monitoring**: Real-time tracking of API performance metrics

### Infrastructure Optimization

Azure Functions optimization features:

#### Cold Start Optimization

- **Pre-warming**: Automatic function pre-warming to reduce cold starts
- **Memory Management**: Intelligent memory optimization and cleanup
- **Connection Pooling**: Efficient database and external service connections

#### Resource Management

- **Graceful Shutdown**: Proper resource cleanup on function termination
- **Memory Monitoring**: Automatic memory usage monitoring and optimization
- **Performance Tuning**: Continuous performance monitoring and optimization

## 🤝 Contributing

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed information on how to contribute to this project.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the TypeScript coding standards and best practices
4. Ensure all tests pass (`npm test`)
5. Verify monitoring and security checks pass
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Quality Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Testing**: Unit tests for business logic, integration tests for APIs
- **Security**: Security scanning and vulnerability assessment
- **Performance**: Performance monitoring and optimization
- **Documentation**: Comprehensive code documentation and API specs

### Testing Enhanced Features

```bash
# Run all tests including monitoring and security
npm run test:full

# Test monitoring dashboard
npm run test:monitoring

# Test security scanner
npm run test:security

# Performance testing
npm run test:performance
```

## 🆘 Support

For support with the enhanced vCarpool application:

### Documentation

- **API Documentation**: Comprehensive API documentation with monitoring endpoints
- **Monitoring Guide**: Detailed monitoring and troubleshooting guide
- **Security Guide**: Security best practices and threat mitigation

### Contact

- **Email**: support@vcarpool.com
- **Issues**: Create an issue in the repository for bugs or feature requests
- **Monitoring Issues**: Use the built-in monitoring dashboard for system health
- **Security Concerns**: Report security issues through the security scanner or contact directly

### Monitoring & Health Checks

- **Health Endpoint**: `/api/monitoring/health` for real-time system status
- **Dashboard**: `/api/monitoring/dashboard` for comprehensive metrics
- **Security Scanner**: `/api/security/scan` for security assessment

---

## 🔍 Architecture Notes

This application represents a comprehensive, enterprise-grade carpool management system with:

- **Scalable Architecture**: Designed for high availability and performance
- **Security-First Approach**: Comprehensive security monitoring and threat detection
- **Observability**: Full-stack monitoring with detailed metrics and alerting
- **Performance Optimization**: Multi-layer optimization from database to API responses
- **Infrastructure Management**: Intelligent resource management and optimization

The enhanced monitoring, security, and performance features make this suitable for production environments with enterprise-level requirements for reliability, security, and observability.

---

## 📄 License

**Copyright (C) 2025 Vedprakash Mishra**

This project is licensed under the **GNU Affero General Public License version 3 (AGPLv3)**.

### Key License Terms

- **Free Software**: You can redistribute and/or modify this software under the terms of the AGPLv3
- **Network Copyleft**: If you run this software on a server and provide it as a service to users over a network, you must make the source code available to those users
- **No Warranty**: This software is provided "as is" without warranty of any kind
- **Commercial Use**: Allowed under AGPLv3 terms, but source code disclosure requirements still apply

### Quick Summary

- ✅ **Use** - for any purpose, including commercial
- ✅ **Modify** - create derivative works
- ✅ **Distribute** - share the software
- ✅ **Private Use** - use privately without disclosure
- ❗ **Network Use** - must provide source code to users of network services
- ❗ **License and Copyright Notice** - must include license and copyright
- ❗ **Same License** - derivative works must use AGPLv3
- ❗ **State Changes** - must document modifications

### Important Notice for Service Providers

The AGPLv3 license includes specific provisions for software used to provide network services. If you:

- Run this software on a server
- Allow users to interact with it over a network (web, API, etc.)
- Have made modifications to the code

**Then you must provide the source code** (including your modifications) to the users of your service.

### Files

- **Full License Text**: [LICENSE](LICENSE)
- **License Summary**: [NOTICE](NOTICE)
- **Contributing Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)

For questions about licensing or commercial use, please contact the copyright holder.

### Why AGPLv3?

This project uses AGPLv3 to ensure that improvements to the software remain available to the community, even when the software is used to provide services over a network. This promotes collaboration and prevents proprietary forks that don't contribute back to the open source community.

---

**⚖️ License Compliance**: By using, modifying, or distributing this software, you agree to comply with the terms of the GNU Affero General Public License version 3.
