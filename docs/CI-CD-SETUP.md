# VCarpool CI/CD Pipeline Documentation

## Overview

The VCarpool project uses a comprehensive GitHub Actions CI/CD pipeline that automatically builds, tests, and deploys the application to Azure. The pipeline supports multiple environments (dev, test, prod) with infrastructure-as-code provisioning using Bicep templates.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Repo   │    │  GitHub Actions │    │     Azure       │
│                 │───▶│                 │───▶│                 │
│ - Backend (Node)│    │ - Build & Test  │    │ - Function App  │
│ - Frontend (Next│    │ - Deploy Infra  │    │ - Static Web App│
│ - Infra (Bicep) │    │ - Deploy Apps   │    │ - Cosmos DB     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### 1. Azure Setup

1. **Azure Subscription** with appropriate permissions
2. **Service Principal** with Contributor role
3. **Resource Groups** (auto-created by pipeline)

### 2. GitHub Repository Setup

1. **Repository secrets** configured
2. **Branch protection rules** (recommended)
3. **Environment protection rules** for prod

## Required GitHub Secrets

### Core Azure Credentials

```bash
AZURE_CREDENTIALS
```

**Value**: JSON object with Service Principal credentials

```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
```

**How to create**:

```bash
# Create Service Principal
az ad sp create-for-rbac --name "vcarpool-cicd" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

## Pipeline Workflows

### 1. Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

**Triggers**:

- Push to `main` (→ prod environment)
- Push to `develop` (→ test environment)
- Pull requests (→ build/test only, no deploy)
- Manual dispatch (→ choose environment)

**Jobs**:

1. **Setup**: Determine environment and deployment settings
2. **Build**: Install dependencies, lint, test, build all packages
3. **Infrastructure**: Deploy/update Azure resources via Bicep
4. **Deploy Backend**: Deploy Azure Functions
5. **Deploy Frontend**: Deploy Azure Static Web Apps
6. **Verify**: Health checks and deployment verification

### 2. Rollback Pipeline (`.github/workflows/rollback.yml`)

**Triggers**:

- Manual dispatch only

**Capabilities**:

- Rollback infrastructure, backend, frontend, or all components
- Target specific git tag/commit
- Environment-specific rollbacks
- Confirmation required

## Environment Mapping

| Git Branch | Environment | Resource Group     | Function App        | Static Web App      |
| ---------- | ----------- | ------------------ | ------------------- | ------------------- |
| `main`     | `prod`      | `vcarpool-rg-prod` | `vcarpool-api-prod` | `vcarpool-web-prod` |
| `develop`  | `test`      | `vcarpool-rg-test` | `vcarpool-api-test` | `vcarpool-web-test` |
| Feature    | `dev`       | `vcarpool-rg-dev`  | `vcarpool-api-dev`  | `vcarpool-web-dev`  |

## Deployment Process

### Automatic Deployment

1. **Push to `main`**:

   - Triggers production deployment
   - Requires all tests to pass
   - Uses production-grade resources

2. **Push to `develop`**:

   - Triggers test environment deployment
   - Used for integration testing
   - Mirrors production configuration

3. **Pull Requests**:
   - Runs build and tests only
   - No deployment occurs
   - Must pass before merge

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **VCarpool CI/CD Pipeline**
3. Click **Run workflow**
4. Choose environment (dev/test/prod)
5. Click **Run workflow**

## Infrastructure Resources

The pipeline creates/manages these Azure resources:

### Core Resources

- **Resource Group**: Environment-specific container
- **Function App**: Node.js 22 backend (Azure Functions)
- **Static Web App**: Next.js frontend with CDN
- **App Service Plan**: Compute for Function App

### Data & Monitoring

- **Cosmos DB**: NoSQL database with containers
- **Application Insights**: Monitoring and telemetry
- **Log Analytics**: Centralized logging
- **Key Vault**: Secrets management

### Containers in Cosmos DB

- `users`: User profiles and authentication
- `trips`: Carpool trip data
- `schedules`: Recurring trip schedules
- `swap-requests`: Trip swap requests
- `email-templates`: Email template storage

## Rollback Procedures

### When to Rollback

- Critical bugs in production
- Performance degradation
- Data corruption risks
- Security vulnerabilities

### How to Rollback

1. **Identify Target**:

   - Find the last known good git tag/commit
   - Check deployment history in Azure

2. **Execute Rollback**:

   - Go to Actions → VCarpool Rollback Pipeline
   - Select environment
   - Choose component (all/backend/frontend/infrastructure)
   - Enter target git tag/commit
   - Type "CONFIRM" and run

3. **Verify Rollback**:
   - Check application functionality
   - Monitor logs and metrics
   - Validate data integrity

### Rollback Components

- **All**: Complete rollback of infrastructure and applications
- **Backend**: Function App code only
- **Frontend**: Static Web App content only
- **Infrastructure**: Bicep template rollback

## Monitoring & Troubleshooting

### Pipeline Monitoring

**GitHub Actions**:

- Job status and logs
- Deployment summaries
- Artifact storage

**Azure Portal**:

- Function App logs
- Static Web App deployment history
- Application Insights telemetry

### Common Issues

#### 1. Azure Login Failures

```
Error: Failed to login to Azure
```

**Solution**: Check `AZURE_CREDENTIALS` secret format and permissions

#### 2. Resource Group Creation

```
Error: Resource group already exists
```

**Solution**: Normal - pipeline creates if needed, updates if exists

#### 3. Bicep Deployment Failures

```
Error: Template deployment failed
```

**Solution**: Check Bicep syntax and Azure resource limits

#### 4. Function Deployment Issues

```
Error: Package deployment failed
```

**Solution**: Verify build artifacts and Function App configuration

#### 5. Static Web App Deployment

```
Error: SWA deployment token invalid
```

**Solution**: Token auto-retrieved from Azure, check resource permissions

### Health Checks

**Backend Health**:

```bash
curl https://vcarpool-api-{env}.azurewebsites.net/api/health
```

**Frontend Health**:

```bash
curl https://vcarpool-web-{env}.azurestaticapps.net
```

### Performance Monitoring

- **Application Insights**: Real-time metrics
- **Function App Metrics**: Execution times and error rates
- **Static Web App Analytics**: Page loads and user metrics

## Security Considerations

### Secrets Management

- All secrets stored in GitHub encrypted secrets
- Azure Key Vault integration for application secrets
- Service Principal with minimal required permissions

### Network Security

- HTTPS enforced on all endpoints
- CORS properly configured
- Function App and Static Web App integration

### Access Control

- Environment-based protection rules
- Required reviews for production deployments
- Branch protection on main/develop

## Cost Optimization

### Resource Tiers by Environment

**Development**:

- Function App: Consumption plan
- Cosmos DB: Free tier
- Static Web App: Free tier

**Test**:

- Function App: Basic plan
- Cosmos DB: Serverless
- Static Web App: Standard

**Production**:

- Function App: Premium plan
- Cosmos DB: Provisioned throughput
- Static Web App: Standard with custom domain

## Maintenance

### Regular Tasks

1. **Security Updates**:

   - Update GitHub Actions versions
   - Rotate Service Principal credentials
   - Review Azure resource configurations

2. **Performance Review**:

   - Monitor deployment times
   - Optimize build processes
   - Review resource utilization

3. **Cost Management**:
   - Review Azure spending
   - Optimize resource tiers
   - Clean up unused resources

### Updating the Pipeline

1. **Test Changes**: Always test in dev environment first
2. **Gradual Rollout**: Deploy to test before production
3. **Monitor Impact**: Watch for performance/reliability changes
4. **Document Changes**: Update this documentation

## Support & Escalation

### Level 1: Self-Service

- Check GitHub Actions logs
- Review Azure resource status
- Consult this documentation

### Level 2: Team Support

- Create GitHub issue with logs
- Tag relevant team members
- Include environment and error details

### Level 3: Emergency

- Use rollback procedures
- Contact Azure support if needed
- Document incident for post-mortem

---

## Quick Reference

### Useful Commands

```bash
# Check deployment status
az deployment group show --resource-group vcarpool-rg-prod --name {deployment-name}

# View Function App logs
az webapp log tail --name vcarpool-api-prod --resource-group vcarpool-rg-prod

# Get Static Web App URL
az staticwebapp show --name vcarpool-web-prod --resource-group vcarpool-rg-prod --query "defaultHostname"
```

### Important URLs

- **GitHub Actions**: `https://github.com/{org}/vcarpool/actions`
- **Azure Portal**: `https://portal.azure.com`
- **Application Insights**: Check Azure Portal → Application Insights
- **Production App**: `https://vcarpool-web-prod.azurestaticapps.net`

---

_Last updated: [Current Date]_
_Pipeline version: v2.0_
