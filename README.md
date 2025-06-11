# VCarpool

<div align="center">

![VCarpool Logo](https://img.shields.io/badge/VCarpool-School%20Carpool%20Management-blue?style=for-the-badge&logo=car&logoColor=white)

**A parent-to-parent carpool coordination platform for organizing school transportation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-0062AD?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com/en-us/services/functions/)

[🚀 Live Demo](https://lively-stone-016bfa20f.6.azurestaticapps.net) • [📚 Documentation](docs/)

</div>

---

## 🌟 Overview

VCarpool is a parent-to-parent carpool coordination platform that helps families organize carpools for their children's school transportation. Parents can create and join carpool groups, coordinate driving schedules, and track driving fairness.

### ✨ Key Features

- 👥 **Parent Groups** - Create and join carpool groups with other families going to the same school
- 📅 **Schedule Coordination** - Submit weekly driving preferences and manage trip assignments
- ⚖️ **Fairness Tracking** - Automatic tracking to ensure driving responsibilities are shared fairly
- 📱 **SMS Verification** - Verify phone numbers and emergency contacts for safety
- 🏠 **Address Validation** - Confirm home addresses for pickup route planning
- 🧳 **Traveling Parent Support** - Makeup trip options for parents who travel frequently
- 💼 **Admin Tools** - Group management dashboard for organizing carpool logistics
- 🎓 **Smart Registration** - Pre-populated school and grade dropdowns with admin configuration
- 🏫 **Multi-School Support** - Configurable for any school district with admin interface

### 🏆 Recent Achievements (June 2025)

**✅ Universal School Support** - Successfully transformed from being hardcoded for one specific school to supporting families from any school community nationwide. Currently active for Tesla STEM High School in Redmond, WA.

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
- Backend API: http://localhost:7071/api
- Health Check: http://localhost:7071/api/health

### 🌐 Live Demo

**Application**: [https://lively-stone-016bfa20f.6.azurestaticapps.net](https://lively-stone-016bfa20f.6.azurestaticapps.net)

_Note: Backend API deployment in progress_

---

## 🏗 Architecture

### Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form
- **Backend**: Azure Functions v4, Node.js 22, TypeScript
- **Database**: Azure Cosmos DB (9 containers)
- **Security**: JWT authentication, Azure Key Vault, SMS verification
- **Monitoring**: Azure Application Insights
- **Admin Tools**: School configuration interface, grade management system

### Project Structure

```
vcarpool/
├── backend/           # Azure Functions API
├── frontend/          # Next.js application
│   ├── src/
│   │   ├── app/       # Next.js App Router pages
│   │   ├── components/ # Reusable React components
│   │   │   ├── admin/ # Admin configuration interfaces
│   │   │   └── shared/ # Shared UI components (dropdowns, etc.)
│   │   └── config/    # Configuration files (schools, grades)
├── shared/            # Shared TypeScript types
├── docs/              # Documentation
└── infra/             # Azure infrastructure (Bicep)
```

---

## 📡 API Reference

### Core Endpoints (Development)

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| `GET`  | `/api/health`            | System health check |
| `POST` | `/api/auth-login-simple` | User authentication |
| `GET`  | `/api/users-me`          | Get user profile    |
| `GET`  | `/api/trips-list`        | List trips          |
| `GET`  | `/api/trips-stats`       | Trip statistics     |

## 🎓 Registration System

### Smart Registration Features

**Pre-populated Dropdowns**:

- **Grades**: 8th, 9th, 10th, 11th, 12th (Tesla STEM specific)
- **Schools**: Tesla STEM High School pre-configured as default
- **Addresses**: 15641 Bel-Red Rd, Redmond, WA 98052
- **Service Radius**: 25 miles from Tesla STEM

**Admin Configuration** (`/admin/school-config`):

- Add/edit schools with full address and grade configuration
- Activate/deactivate schools for registration
- Configure supported grades per school type
- Set service radius and geographic boundaries

**Technical Implementation**:

- Inline Zod validation to prevent import errors
- React Hook Form with Controller components
- TypeScript-first configuration system
- Reusable dropdown components

### Registration Flow

1. **Family Information**: Parent name, email, phone with validation
2. **Children Details**: Names with grade/school dropdowns (no manual typing)
3. **Validation**: Form validation with proper error messages
4. **Submission**: Secure registration with Tesla STEM defaults

### Available Functions

The backend includes 30+ Azure Functions for comprehensive carpool management:

- Authentication and user management
- Group creation and administration
- Trip scheduling and coordination
- Parent preferences and swap requests
- SMS verification and notifications

**Local Development**: Start with `npm run dev` to explore all endpoints

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

- ✅ Parent group creation and management
- ✅ Carpool schedule coordination
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
