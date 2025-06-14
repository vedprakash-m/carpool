# VCarpool Environment Variable Setup Guide

## 🔐 ADMIN_PASSWORD Configuration

### ✅ Local Development (COMPLETED)

The `ADMIN_PASSWORD` has been set for local development:

**File:** `/backend/local.settings.json`

```json
{
  "Values": {
    "ADMIN_PASSWORD": "VCarpool2025!SecureAdmin"
  }
}
```

**Shell Environment:** Added to `~/.zshrc`

```bash
export ADMIN_PASSWORD="VCarpool2025!SecureAdmin"
```

### 🚀 Production Deployment (REQUIRED)

#### Azure Functions App Configuration

Set the environment variable in Azure portal or via Azure CLI:

```bash
# Via Azure CLI
az functionapp config appsettings set \
  --name <your-function-app-name> \
  --resource-group <your-resource-group> \
  --settings ADMIN_PASSWORD="<your-secure-production-password>"
```

#### Azure Portal Steps

1. Go to Azure Portal → Function App
2. Navigate to Settings → Configuration
3. Add new Application Setting:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** `<your-secure-production-password>`
4. Click "Save"

#### GitHub Actions / CI/CD

Add to repository secrets:

1. Go to GitHub → Repository → Settings → Secrets
2. Add new secret:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** `<your-secure-production-password>`

### 🔒 Security Recommendations

#### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- No dictionary words
- Unique to this application

#### Example Strong Passwords

```bash
# Development (already set)
VCarpool2025!SecureAdmin

# Production (generate unique)
VCarpool_Prod_2025!#$
TeslaStemCarpool@2025!
SecureVCarpool#2025$
```

### 🧪 Testing Authentication

#### Local Testing

```bash
# Test with correct password
curl -X POST http://localhost:7071/api/auth-login-simple \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vcarpool.com","password":"VCarpool2025!SecureAdmin"}'

# Test with wrong password (should fail)
curl -X POST http://localhost:7071/api/auth-login-simple \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vcarpool.com","password":"wrong-password"}'
```

#### Verify Environment Variable

```bash
echo $ADMIN_PASSWORD
# Should output: VCarpool2025!SecureAdmin
```

### ⚠️ Security Warnings

#### What NOT to do:

- ❌ Never commit passwords to git
- ❌ Never use hardcoded passwords in source code
- ❌ Never use weak passwords like "password123"
- ❌ Never share production passwords via email/slack

#### What TO do:

- ✅ Use environment variables for all passwords
- ✅ Use different passwords for dev/staging/prod
- ✅ Rotate passwords regularly
- ✅ Use secure password managers
- ✅ Test authentication after deployment

### 📋 Deployment Checklist

- [x] ✅ Local development environment configured
- [x] ✅ `local.settings.json` updated
- [x] ✅ Shell environment variable set
- [ ] ⏳ Azure Function App settings configured
- [ ] ⏳ CI/CD secrets configured
- [ ] ⏳ Production testing completed
- [ ] ⏳ Password rotation schedule established

### 🔄 Next Steps After Deployment

1. **Test authentication endpoints** in production
2. **Verify Tesla STEM school dropdowns** work correctly
3. **Monitor logs** for any authentication failures
4. **Set up password rotation** schedule (quarterly recommended)
5. **Document incident response** procedures

---

**🎯 Goal Achieved:** Secure authentication system with proper environment variable configuration!
