# VCarpool

<div align="center">

![VCarpool Logo](https://img.shields.io/badge/VCarpool-School%20Carpool%20Management-blue?style=for-the-badge&logo=car&logoColor=white)

**A universal school carpool coordination platform with smart registration and automatic school detection.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-0062AD?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/en-us/services/functions/)

[🚀 Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [📚 Documentation](docs/) • [🔧 API Reference](docs/OPENAPI_SPECIFICATION.yaml)

</div>

---

## 🌟 Overview

VCarpool is a school carpool management platform that helps school communities coordinate carpools efficiently. Built with modern TypeScript and Azure cloud services, it provides smart registration with automatic school detection and intelligent form automation.

### ✨ Key Features

- 🎓 **Universal School Support** - Works with any school through intelligent detection and configurable service areas
- 🔐 **Smart Registration** - Automatic school detection and grade inference reduces manual form fields by 70%
- 📍 **Geographic Validation** - Real-time address validation with automatic service area detection
- 📱 **SMS Verification** - Phone number and emergency contact verification system
- 🧳 **Traveling Parent Fairness** - Makeup trip scheduling system with balance tracking
- 💼 **Admin Dashboard** - Comprehensive management tools for school administrators

### 🏆 Recent Achievement (June 2025)

**Universal School Platform Completed** - Successfully transformed from Tesla Stem-specific to universal school carpool management platform with smart registration automation and intelligent school detection.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Azure Account (for deployment)
- Azure Functions Core Tools v4+

### Installation

```bash
# Clone and install
git clone https://github.com/vedprakash-m/vcarpool.git
cd vcarpool
npm install

# Setup environment
cp backend/local.settings.json.example backend/local.settings.json
cp frontend/.env.local.example frontend/.env.local
# Edit with your configuration

# Start development
npm run dev
```

**Development URLs:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:7071/api/v1
- Health Check: http://localhost:7071/api/v1/health

### 🌐 Live Demo

**Application**: [https://lively-stone-016bfa20f.6.azurestaticapps.net](https://lively-stone-016bfa20f.6.azurestaticapps.net)

**API**: [https://vcarpool-api-prod.azurewebsites.net/api/v1](https://vcarpool-api-prod.azurewebsites.net/api/v1)

---

## 🏗 Architecture

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Azure Functions v4, Node.js 22, TypeScript
- **Database**: Azure Cosmos DB (9 containers)
- **Security**: JWT authentication, Azure Key Vault, SMS verification
- **Monitoring**: Azure Application Insights

### Project Structure

```
vcarpool/
├── backend/           # Azure Functions API
├── frontend/          # Next.js application
├── shared/            # Shared TypeScript types
├── docs/              # Documentation
└── infra/             # Azure infrastructure (Bicep)
```

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| `POST` | `/api/v1/auth/token`    | User authentication |
| `GET`  | `/api/v1/users/profile` | Get user profile    |
| `GET`  | `/api/v1/trips`         | List trips          |
| `POST` | `/api/v1/trips`         | Create trip         |
| `GET`  | `/api/v1/health`        | System health check |

**Complete Documentation**: [OpenAPI Specification](docs/OPENAPI_SPECIFICATION.yaml)

---

## 🧪 Testing

### Test Results

**Backend**: 212 tests passing across 10 test suites (100% success rate)

```bash
# Run tests
npm test                    # All tests
cd backend && npm test      # Backend tests only
cd frontend && npm test     # Frontend tests only
```

### Key Test Coverage

- ✅ Universal school integration and detection
- ✅ Smart registration with automatic school detection
- ✅ Authentication and authorization system
- ✅ Family-based scheduling algorithms
- ✅ SMS verification and address validation
- ✅ Production API integration

---

## 🚀 Deployment

### Automated Deployment

```bash
# Deploy via GitHub Actions
git push origin main
```

### Manual Deployment

```bash
# Backend
cd backend && npm run deploy

# Frontend
cd frontend && npm run build && npm run deploy
```

**Production Infrastructure:**

- Frontend: Azure Static Web Apps
- Backend: Azure Functions
- Database: Azure Cosmos DB
- Secrets: Azure Key Vault

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for your changes
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Development Standards

- TypeScript strict mode
- Comprehensive testing required
- Security-first approach
- Performance optimization

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

---

<div align="center">

**Built with ❤️ by [Vedprakash Mishra](https://github.com/vedprakash-m)**

[⭐ Star this project](https://github.com/vedprakash-m/vcarpool) • [🐛 Report Issues](https://github.com/vedprakash-m/vcarpool/issues)

</div>
