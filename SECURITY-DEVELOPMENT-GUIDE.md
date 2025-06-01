# 🔐 Secure Development Guide - vCarpool

## 🎯 **NEVER COMMIT SECRETS POLICY**

### **🚨 ZERO TOLERANCE for Secret Leaks**

- **NO REAL SECRETS** in any committed files
- **NO PERSONAL INFORMATION** in code repositories
- **NO PRODUCTION CREDENTIALS** in development environments
- **IMMEDIATE REMEDIATION** required for any accidental exposure

---

## 🛠 **PRE-COMMIT SETUP (MANDATORY)**

### **1. Install Pre-commit Hooks**

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Test the setup
pre-commit run --all-files
```

### **2. Setup Git Hooks**

```bash
# Create git hooks directory if not exists
mkdir -p .git/hooks

# Make scripts executable
chmod +x scripts/check-secrets.sh
chmod +x scripts/validate-env-files.sh

# Test secret detection
./scripts/check-secrets.sh
```

### **3. Verify Protection**

```bash
# Test that secrets would be caught
echo "api_key=real-secret-key-12345" > test-secret.js
git add test-secret.js
git commit -m "test" # Should be blocked
rm test-secret.js
```

---

## 🔒 **SECRET MANAGEMENT BEST PRACTICES**

### **✅ APPROVED Methods**

#### **Environment Variables**

```bash
# Local development (.env.local - gitignored)
JWT_SECRET=your-local-secret-here
COSMOS_DB_KEY=your-local-cosmos-key

# Production (Azure App Settings)
# Set via Azure Portal or CLI
az webapp config appsettings set --name vcarpool --resource-group rg-vcarpool --settings JWT_SECRET="prod-secret"
```

#### **Placeholder Values in Code**

```typescript
// ✅ GOOD: Use placeholders
const jwtSecret = process.env.JWT_SECRET || "your-jwt-secret-here";
const cosmosKey = process.env.COSMOS_DB_KEY || "your-cosmos-key-here";

// ✅ GOOD: Clear documentation
/*
 * Configure these environment variables:
 * - JWT_SECRET: Strong random string (min 32 chars)
 * - COSMOS_DB_KEY: Your Azure Cosmos DB primary key
 */
```

#### **Azure Key Vault (Production)**

```typescript
// ✅ GOOD: Key Vault integration
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  "https://vcarpool-keyvault.vault.azure.net/",
  credential
);

const jwtSecret = await client.getSecret("jwt-secret");
```

### **❌ NEVER DO THIS**

```typescript
// ❌ NEVER: Real secrets in code
const jwtSecret = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // REAL TOKEN

// ❌ NEVER: Production credentials
const cosmosKey =
  "DefaultEndpointsProtocol=https;AccountName=vcarpool;AccountKey=AbCd...";

// ❌ NEVER: Personal information
const testUser = {
  email: "vedprakash@gmail.com", // REAL EMAIL
  phone: "+1-555-123-4567", // REAL PHONE
};

// ❌ NEVER: API keys
const sendGridKey = "SG.abc123def456..."; // REAL API KEY
```

---

## 📋 **ENVIRONMENT FILE STRATEGY**

### **File Structure**

```
.env.example        # Template with placeholders (COMMITTED)
.env.local         # Your local secrets (GITIGNORED)
.env.development   # Development settings (GITIGNORED)
.env.test          # Test environment (GITIGNORED)
.env.production    # Production settings (NEVER EXISTS)
```

### **Template File (.env.example)**

```bash
# vCarpool Environment Configuration Template
# Copy this file to .env.local and fill in your values

# Database Configuration
COSMOS_DB_CONNECTION_STRING=your-cosmos-connection-string-here
COSMOS_DB_DATABASE_NAME=vcarpool-dev

# Authentication
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Service
SENDGRID_API_KEY=your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourdomain.com

# Application Settings
NODE_ENV=development
PORT=7071
NEXT_PUBLIC_API_URL=http://localhost:7071/api

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here

# Monitoring
APPLICATION_INSIGHTS_KEY=your-app-insights-key-here
```

### **Local Development (.env.local)**

```bash
# Local development configuration
# This file is gitignored and should contain your local secrets

COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
JWT_SECRET=local-development-secret-minimum-32-characters
SENDGRID_API_KEY=test-key-for-local-development
```

---

## 🔍 **DETECTION & MONITORING**

### **Automated Scanning**

- **Pre-commit hooks**: Block secrets before commit
- **GitHub Actions**: Scan on every push/PR
- **Dependency audits**: Check for vulnerable packages
- **CodeQL scanning**: Static analysis for security issues

### **Manual Verification**

```bash
# Run secret detection manually
./scripts/check-secrets.sh

# Check specific files
./scripts/check-secrets.sh src/config.ts

# Validate environment files
./scripts/validate-env-files.sh .env.example
```

### **Regular Security Audits**

```bash
# Weekly dependency check
npm audit

# Check for outdated packages
npm outdated

# Security-focused linting
npx eslint . --ext .js,.ts,.tsx --no-eslintrc --config .eslintrc.security.js
```

---

## 🚨 **INCIDENT RESPONSE**

### **If Secrets Are Accidentally Committed**

#### **IMMEDIATE Actions (< 5 minutes)**

1. **DO NOT PUSH** if you haven't already
2. **Remove the secret** from your working directory
3. **Reset the commit** if local only:
   ```bash
   git reset --soft HEAD~1
   # Edit files to remove secrets
   git add .
   git commit -m "Remove accidentally committed secrets"
   ```

#### **If Already Pushed (< 30 minutes)**

1. **Rotate the compromised secret immediately**
2. **Force push to remove from history** (if no one else has pulled):

   ```bash
   # Remove from history
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/secret-file' \
     --prune-empty --tag-name-filter cat -- --all

   # Force push
   git push origin --force --all
   git push origin --force --tags
   ```

3. **Notify team members** to delete and re-clone repository

#### **Recovery Process**

1. **Generate new secrets** for all compromised credentials
2. **Update production systems** with new secrets
3. **Update team members** with new development credentials
4. **Document the incident** for future prevention
5. **Review and improve** security processes

---

## 🔐 **SECRET TYPES & HANDLING**

### **High-Risk Secrets**

- **Database connection strings**
- **API keys (SendGrid, Google Maps, etc.)**
- **JWT signing secrets**
- **Cloud provider credentials**
- **Private keys and certificates**

**Handling**: Never in code, Azure Key Vault only

### **Medium-Risk Secrets**

- **Service endpoints**
- **Non-sensitive configuration**
- **Public API keys (with restrictions)**

**Handling**: Environment variables with placeholders

### **Low-Risk Information**

- **Public URLs**
- **Non-sensitive feature flags**
- **Development-only settings**

**Handling**: Can be in code with clear documentation

---

## 👥 **TEAM COLLABORATION**

### **Code Review Checklist**

- [ ] No real secrets in any files
- [ ] Environment variables used for configuration
- [ ] Placeholder values have clear documentation
- [ ] Test data doesn't contain real personal information
- [ ] Database queries use parameterized statements

### **Onboarding New Developers**

1. **Setup pre-commit hooks** immediately
2. **Share .env.local template** securely (not via git)
3. **Verify their local security setup**
4. **Review secret management practices**

### **Regular Team Reviews**

- **Monthly security reviews** of new code
- **Quarterly credential rotation**
- **Annual security training updates**

---

## 🔧 **TOOLS & AUTOMATION**

### **Required Tools**

- **detect-secrets**: Pre-commit secret scanning
- **GitGuardian**: GitHub secret monitoring
- **npm audit**: Dependency vulnerability checking
- **CodeQL**: Static security analysis

### **Recommended Tools**

- **Azure Key Vault**: Production secret management
- **1Password/Bitwarden**: Team password sharing
- **Snyk**: Advanced dependency scanning
- **SonarCloud**: Code quality and security

### **VS Code Extensions**

- **GitLens**: Visualize code history for secret leaks
- **ESLint**: Security-focused linting
- **Azure Account**: Secure Azure integration
- **Better Comments**: Highlight security TODOs

---

## 📞 **EMERGENCY CONTACTS**

### **Security Incident Response**

- **Primary**: Vedprakash Mishra
- **Email**: [security contact]
- **Phone**: [emergency contact]

### **Escalation Process**

1. **Immediate notification** to security team
2. **Create incident ticket** with details
3. **Execute recovery procedures**
4. **Post-incident review** and improvements

---

## 📚 **ADDITIONAL RESOURCES**

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

**Remember**: When in doubt, DON'T COMMIT. Ask for review first! 🔒
