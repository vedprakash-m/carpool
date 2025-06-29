# Microsoft Entra ID Migration Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Microsoft Entra ID authentication integration to production in a safe, controlled manner.

## Deployment Strategy: Blue-Green with Rollback

### Phase 1: Pre-Production Validation (1-2 days)

#### Day -2: Environment Preparation

1. **Azure Resource Preparation**

   ```bash
   # Create production Azure AD App Registration
   az ad app create --display-name "Carpool Production" \
     --sign-in-audience AzureADMyOrg \
     --web-redirect-uris "https://vcarpool.com/" \
     --spa-redirect-uris "https://vcarpool.com/auth/callback"

   # Configure API permissions
   az ad app permission add --id {app-id} --api 00000003-0000-0000-c000-000000000000 \
     --api-permissions 14dad69e-099b-42c9-810b-d002981feec1=Scope
   ```

2. **Key Vault Configuration**

   ```bash
   # Store production secrets
   az keyvault secret set --vault-name vcarpool-vault --name entra-client-id --value {client-id}
   az keyvault secret set --vault-name vcarpool-vault --name entra-client-secret --value {client-secret}
   az keyvault secret set --vault-name vcarpool-vault --name entra-tenant-id --value vedid.onmicrosoft.com
   ```

3. **Function App Configuration**
   ```bash
   # Update production function app settings
   az functionapp config appsettings set -g vcarpool-prod -n vcarpool-api \
     --settings \
     ENTRA_CLIENT_ID="@Microsoft.KeyVault(VaultName=vcarpool-vault;SecretName=entra-client-id)" \
     ENTRA_CLIENT_SECRET="@Microsoft.KeyVault(VaultName=vcarpool-vault;SecretName=entra-client-secret)" \
     ENTRA_TENANT_ID="@Microsoft.KeyVault(VaultName=vcarpool-vault;SecretName=entra-tenant-id)"
   ```

#### Day -1: Staging Deployment and Testing

1. **Deploy to Staging Environment**

   ```bash
   cd /Users/vedprakashmishra/vcarpool

   # Build and deploy backend
   cd backend
   npm run build
   func azure functionapp publish vcarpool-api-staging

   # Build and deploy frontend
   cd ../frontend
   npm run build
   swa deploy ./out --env staging
   ```

2. **Run Validation Tests**

   ```bash
   # Backend integration tests
   cd backend
   npm run test:integration

   # Frontend component tests
   cd ../frontend
   npm test

   # E2E tests against staging
   cd ../e2e
   npm run test:staging

   # Migration validation
   ts-node scripts/validate-entra-migration.ts
   ```

3. **Manual Testing Checklist**
   - [ ] Microsoft login flow works in staging
   - [ ] Legacy login still functional
   - [ ] User data integrity maintained
   - [ ] SSO functionality verified
   - [ ] Error handling tested
   - [ ] Performance acceptable

### Phase 2: Production Deployment (Day 0)

#### Pre-Deployment Checklist

- [ ] All staging tests passing
- [ ] Production secrets configured
- [ ] DNS records prepared
- [ ] Monitoring alerts configured
- [ ] Rollback plan confirmed
- [ ] Team on standby

#### Deployment Window: Low-Traffic Hours (2-4 AM)

**Step 1: Database Migration (30 minutes)**

```bash
# Create database backup
cd /Users/vedprakashmishra/vcarpool/backend
node scripts/migrate-users.ts --dry-run

# Execute migration with backup
node scripts/migrate-users.ts --backup-path ./migration-backups
```

**Step 2: Backend Deployment (15 minutes)**

```bash
# Deploy new backend with Entra ID support
cd backend
npm run build
func azure functionapp publish vcarpool-api-prod

# Verify deployment
curl https://vcarpool-api.azurewebsites.net/api/health
```

**Step 3: Frontend Deployment (15 minutes)**

```bash
# Deploy frontend with MSAL integration
cd frontend
npm run build
swa deploy ./out --env production

# Verify deployment
curl https://vcarpool.com/health
```

**Step 4: DNS and Traffic Routing (10 minutes)**

```bash
# Update DNS to point to new deployment
az network dns record-set cname set-record \
  --resource-group vcarpool-prod \
  --zone-name vcarpool.com \
  --record-set-name www \
  --cname vcarpool-prod.azurestaticapps.net
```

#### Post-Deployment Validation (30 minutes)

1. **Automated Health Checks**

   ```bash
   # Backend health
   curl https://vcarpool-api.azurewebsites.net/api/health

   # Frontend health
   curl https://vcarpool.com/api/health

   # Authentication endpoints
   curl -X POST https://vcarpool-api.azurewebsites.net/api/auth-entra-unified \
     -H "Content-Type: application/json" \
     -d '{"authMethod": "legacy", "email": "test@example.com", "password": "test"}'
   ```

2. **Manual Smoke Tests**

   - [ ] Homepage loads correctly
   - [ ] Microsoft login button visible
   - [ ] Legacy login toggle works
   - [ ] Existing user can login with legacy credentials
   - [ ] Error handling displays properly

3. **Monitor Key Metrics**
   - Authentication success/failure rates
   - Page load times
   - API response times
   - Error rates and exceptions

### Phase 3: Gradual Rollout (Days 1-7)

#### Day 1: Monitor and Communicate

1. **User Communication**

   ```
   Subject: New Login Option Available - Microsoft Account Integration

   Dear Carpool Users,

   We're excited to announce that you can now sign in to Carpool using your Microsoft account!
   This provides enhanced security and convenience.

   What's New:
   - Sign in with your Microsoft account
   - Your existing account remains unchanged
   - All your data and preferences are preserved

   How to Use:
   1. Visit vcarpool.com
   2. Click "Continue with Microsoft" for the new experience
   3. Or use "Email & Password" for the existing login method

   Questions? Contact support@vcarpool.com

   Best regards,
   The Carpool Team
   ```

2. **Monitor Metrics**
   - 0-20% Microsoft auth adoption expected
   - Monitor authentication error rates
   - Watch for user support tickets
   - Track performance metrics

#### Days 2-7: Progressive Adoption

1. **Daily Monitoring Tasks**

   ```bash
   # Check authentication metrics
   az monitor metrics list \
     --resource vcarpool-api \
     --metric "AuthenticationSuccessRate" \
     --interval PT1H

   # Review Application Insights logs
   az monitor app-insights query \
     --app vcarpool-insights \
     --analytics-query "requests | where name contains 'auth' | summarize count() by resultCode"
   ```

2. **User Support Tasks**
   - Monitor support channels for auth-related issues
   - Document common problems and solutions
   - Update FAQ with Microsoft login instructions
   - Provide user training if needed

### Phase 4: Migration Completion (Days 8-30)

#### Week 2: Encourage Migration

1. **Enhanced User Communication**

   - In-app notifications about Microsoft login benefits
   - Email reminders about new authentication option
   - Optional migration prompts during login

2. **Analytics and Reporting**

   ```bash
   # Generate migration report
   ts-node scripts/generate-migration-report.ts

   # Sample report data:
   # - Total users: 5,000
   # - Microsoft auth users: 2,500 (50%)
   # - Legacy auth users: 2,500 (50%)
   # - Migration success rate: 99.8%
   ```

#### Weeks 3-4: Legacy Deprecation Planning

1. **User Data Analysis**

   - Identify users who haven't migrated
   - Send targeted migration assistance
   - Plan for legacy system sunset

2. **Prepare for Legacy Removal**

   ```bash
   # Identify legacy-only users
   node scripts/analyze-legacy-users.ts

   # Plan migration assistance
   node scripts/generate-migration-assistance-plan.ts
   ```

### Rollback Procedures

#### When to Rollback

- Authentication failure rate > 5%
- Critical bugs affecting user access
- Database integrity issues
- Performance degradation > 50%

#### Immediate Rollback (< 30 minutes)

1. **DNS Rollback**

   ```bash
   # Point DNS back to previous version
   az network dns record-set cname set-record \
     --resource-group vcarpool-prod \
     --zone-name vcarpool.com \
     --record-set-name www \
     --cname vcarpool-legacy.azurestaticapps.net
   ```

2. **Database Rollback**

   ```bash
   # Restore from migration backup
   node scripts/migrate-users.ts --rollback --backup-path ./migration-backups
   ```

3. **Application Rollback**
   ```bash
   # Deploy previous version
   func azure functionapp publish vcarpool-api-prod --slot staging
   az functionapp deployment slot swap -g vcarpool-prod -n vcarpool-api --slot staging
   ```

#### Post-Rollback Actions

1. **Communication**

   - Notify users of temporary service restoration
   - Explain issue and resolution timeline
   - Provide alternative access methods if needed

2. **Investigation**
   - Analyze logs and metrics to identify root cause
   - Document lessons learned
   - Plan remediation and re-deployment

### Success Metrics

#### Technical KPIs

- **Authentication Success Rate**: > 99.5%
- **Page Load Time**: < 3 seconds
- **API Response Time**: < 200ms
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

#### Business KPIs

- **Microsoft Auth Adoption**: 70% within 30 days
- **User Support Tickets**: < 5% increase
- **User Satisfaction**: > 4.5/5 rating
- **Security Incidents**: 0

#### Migration KPIs

- **Data Integrity**: 100% preserved
- **Migration Success Rate**: > 99.5%
- **Rollback Events**: 0
- **Deployment Time**: < 2 hours

### Monitoring and Alerting

#### Critical Alerts

```yaml
alerts:
  - name: Authentication Failure Rate High
    condition: auth_failure_rate > 5%
    action: Page on-call engineer

  - name: Database Migration Error
    condition: migration_errors > 0
    action: Immediate escalation

  - name: Application Downtime
    condition: availability < 99%
    action: Page on-call engineer

  - name: Performance Degradation
    condition: response_time > 5s
    action: Alert development team
```

#### Dashboard Metrics

- Real-time authentication rates
- User adoption of Microsoft login
- System performance metrics
- Error rates and incident counts
- Migration progress tracking

### Post-Deployment Activities

#### Week 1: Monitoring and Support

- Daily review of authentication metrics
- Active monitoring of user feedback
- Support team training on new authentication flows
- Documentation updates based on user experience

#### Month 1: Optimization

- Performance tuning based on production data
- User experience improvements
- Security assessment and hardening
- Plan for legacy authentication sunset

#### Quarter 1: Full Migration

- Complete migration to Microsoft authentication
- Remove legacy authentication code
- Security audit and compliance review
- Performance optimization and scaling

## Emergency Contacts

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Product Manager**: +1-XXX-XXX-XXXX
- **Microsoft Support**: Enterprise support case
- **Azure Support**: Priority support case

## Documentation References

- [Production Configuration Guide](./entra-production-config.md)
- [Apps Auth Requirements](./Apps_Auth_Requirement.md)
- [Migration Validation Script](../scripts/validate-entra-migration.ts)
- [User Migration Script](../backend/scripts/migrate-users.ts)

---

**Migration Team**: Development, DevOps, Product, Support
**Approval**: Technical Lead, Product Manager, Security Team
**Last Updated**: June 29, 2025
