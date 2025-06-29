# Microsoft Entra ID Production Configuration Guide

## Overview

This guide provides the complete configuration setup for Microsoft Entra ID integration in the Carpool application for production deployment.

## Environment Variables

### Backend Configuration

Add these environment variables to your Azure Function App settings:

```bash
# Microsoft Entra ID Configuration
ENTRA_TENANT_ID=vedid.onmicrosoft.com
ENTRA_CLIENT_ID=your-client-id-here
ENTRA_CLIENT_SECRET=your-client-secret-here
ENTRA_JWKS_URI=https://login.microsoftonline.com/vedid.onmicrosoft.com/discovery/v2.0/keys

# Legacy JWT Configuration (during migration period)
JWT_SECRET=your-existing-jwt-secret
JWT_EXPIRES_IN=24h

# Database Configuration
COSMOS_DB_ENDPOINT=your-cosmos-endpoint
COSMOS_DB_KEY=your-cosmos-key
COSMOS_DB_DATABASE_NAME=carpool

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=your-app-insights-connection-string
```

### Frontend Configuration

Add these environment variables to your Static Web App or hosting platform:

```bash
# Microsoft Entra ID Configuration
NEXT_PUBLIC_ENTRA_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_ENTRA_AUTHORITY=https://login.microsoftonline.com/vedid.onmicrosoft.com

# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.azurewebsites.net/api

# Application Configuration
NEXT_PUBLIC_APP_NAME=Carpool
NEXT_PUBLIC_ENVIRONMENT=production
```

## Azure AD App Registration

### Create App Registration

1. Navigate to Azure Active Directory in Azure Portal
2. Go to "App registrations" → "New registration"
3. Configure the following:

```
Name: Carpool Production
Supported account types: Accounts in this organizational directory only (Single tenant)
Redirect URI:
  - Type: Single-page application (SPA)
  - URI: https://your-domain.com/
  - Additional URIs: https://your-domain.com/auth/callback
```

### API Permissions

Configure the following permissions:

```
Microsoft Graph (Delegated):
- openid
- profile
- email
- User.Read

Optional (for advanced features):
- User.ReadBasic.All (for user directory lookups)
- Group.Read.All (for group-based access)
```

### Authentication Configuration

```
Platform configurations:
- Single-page application: https://your-domain.com/
- Redirect URIs: https://your-domain.com/auth/callback

Logout URL: https://your-domain.com/auth/logout

Token configuration:
- Access tokens: Enabled
- ID tokens: Enabled

Advanced settings:
- Allow public client flows: No
- Treat application as public client: No
```

### Certificates & Secrets

Create a new client secret:

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Set description: "Carpool Production Secret"
4. Set expiration: 24 months
5. Copy the secret value (use as ENTRA_CLIENT_SECRET)

## Azure Key Vault Configuration

Store sensitive configuration in Azure Key Vault:

### Secret Names and Values

```
entra-client-id: your-client-id-here
entra-client-secret: your-client-secret-here
entra-tenant-id: vedid.onmicrosoft.com
jwt-secret: your-existing-jwt-secret
cosmos-db-key: your-cosmos-key
cosmos-db-endpoint: your-cosmos-endpoint
```

### Function App Key Vault References

Configure Function App settings to reference Key Vault:

```bash
ENTRA_CLIENT_ID=@Microsoft.KeyVault(VaultName=your-vault;SecretName=entra-client-id)
ENTRA_CLIENT_SECRET=@Microsoft.KeyVault(VaultName=your-vault;SecretName=entra-client-secret)
ENTRA_TENANT_ID=@Microsoft.KeyVault(VaultName=your-vault;SecretName=entra-tenant-id)
JWT_SECRET=@Microsoft.KeyVault(VaultName=your-vault;SecretName=jwt-secret)
```

## Security Configuration

### CORS Settings

Configure CORS for your Function App:

```json
{
  "supportCredentials": false,
  "allowedOrigins": ["https://your-domain.com", "https://www.your-domain.com"],
  "allowedMethods": ["GET", "POST", "OPTIONS"],
  "allowedHeaders": ["Content-Type", "Authorization", "x-requested-with"],
  "maxAge": 3600
}
```

### Authentication Provider Settings

Configure the authentication flow:

```json
{
  "platform": {
    "enabled": true
  },
  "globalValidation": {
    "requireAuthentication": false,
    "unauthenticatedClientAction": "AllowAnonymous"
  },
  "identityProviders": {
    "azureActiveDirectory": {
      "enabled": true,
      "registration": {
        "openIdIssuer": "https://login.microsoftonline.com/vedid.onmicrosoft.com/v2.0",
        "clientId": "your-client-id-here",
        "clientSecretSettingName": "ENTRA_CLIENT_SECRET"
      },
      "validation": {
        "allowedAudiences": ["your-client-id-here"]
      }
    }
  }
}
```

## DNS and Domain Configuration

### Custom Domain Setup

1. Configure custom domain in Azure Static Web Apps or App Service
2. Set up SSL certificate (Let's Encrypt or Azure managed)
3. Update DNS records:

```
Type: CNAME
Name: your-subdomain
Value: your-azure-app.azurestaticapps.net
```

### Redirect URI Updates

Update all redirect URIs to use production domain:

- Azure AD App Registration
- MSAL configuration in frontend
- CORS settings in backend
- Any hardcoded URLs in configuration

## Monitoring and Logging

### Application Insights Configuration

```bash
# Function App
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=your-key;IngestionEndpoint=your-endpoint

# Additional Settings
APPINSIGHTS_INSTRUMENTATIONKEY=your-instrumentation-key
FUNCTIONS_EXTENSION_VERSION=~4
```

### Custom Telemetry

Track authentication events:

```typescript
// Backend
appInsights.trackEvent({
  name: 'EntraAuthentication',
  properties: {
    method: 'entra',
    success: true,
    userId: user.id,
    timestamp: new Date().toISOString(),
  },
});

// Frontend
appInsights.trackPageView({
  name: 'LoginPage',
  properties: {
    authMethod: 'entra',
  },
});
```

## Health Checks and Monitoring

### Backend Health Check

Create a health check endpoint:

```typescript
// /api/health
export async function healthCheck(): Promise<HttpResponseInit> {
  const checks = {
    timestamp: new Date().toISOString(),
    entra: await validateEntraConfiguration(),
    database: await validateDatabaseConnection(),
    keyVault: await validateKeyVaultAccess(),
  };

  const healthy = Object.values(checks).every((check) =>
    typeof check === 'boolean' ? check : true,
  );

  return {
    status: healthy ? 200 : 503,
    jsonBody: {
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
    },
  };
}
```

### Frontend Health Check

Monitor authentication state:

```typescript
// Monitor MSAL instance health
const healthCheck = {
  msalInitialized: !!msalInstance,
  hasActiveAccount: !!msalInstance?.getActiveAccount(),
  networkAvailable: navigator.onLine,
  timestamp: new Date().toISOString(),
};
```

## Deployment Checklist

### Pre-Deployment

- [ ] Azure AD App Registration created and configured
- [ ] Client ID and secret stored in Key Vault
- [ ] Environment variables configured in Function App
- [ ] CORS settings updated for production domain
- [ ] SSL certificate configured
- [ ] DNS records updated
- [ ] Application Insights enabled

### Post-Deployment

- [ ] Test Microsoft authentication flow
- [ ] Verify legacy authentication still works
- [ ] Test user data migration (dry run)
- [ ] Validate health check endpoints
- [ ] Monitor authentication success rates
- [ ] Verify SSO functionality across apps

### Migration Day

- [ ] Execute user data migration script
- [ ] Monitor error rates and authentication failures
- [ ] Verify user accounts are properly migrated
- [ ] Test rollback procedures (if needed)
- [ ] Communicate status to users
- [ ] Update documentation with final configuration

## Troubleshooting

### Common Issues

1. **CORS Errors**: Verify allowed origins in Function App CORS settings
2. **Authentication Loops**: Check redirect URIs match exactly
3. **Token Validation Failures**: Verify JWKS endpoint accessibility
4. **Key Vault Access**: Ensure Function App managed identity has access
5. **User Migration Issues**: Check database connectivity and user data integrity

### Debug Commands

```bash
# Test auth endpoint
curl -X POST https://your-api.azurewebsites.net/api/auth-entra-unified \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-test-token" \
  -d '{"authMethod": "entra"}'

# Test health check
curl https://your-api.azurewebsites.net/api/health

# Validate JWKS endpoint
curl https://login.microsoftonline.com/vedid.onmicrosoft.com/discovery/v2.0/keys
```

## Support and Maintenance

### Regular Tasks

- Monitor Key Vault secret expiration dates
- Review Application Insights authentication metrics
- Update client secrets before expiration
- Monitor authentication success/failure rates
- Regular security assessments

### Emergency Procedures

- Rollback to legacy authentication if needed
- Disable Entra ID integration temporarily
- Restore user data from migration backups
- Emergency contact procedures for Microsoft support

## Additional Resources

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Azure Functions Security Best Practices](https://docs.microsoft.com/en-us/azure/azure-functions/security-concepts)
- [Carpool Internal Documentation](../README.md)
