# 🚀 Deployment Setup Guide - vCarpool

## 🔧 **IMMEDIATE FIX: Azure Static Web Apps Deployment**

### **Problem**

Frontend deployment failing with: "No matching Static Web App was found or the api key was invalid"

### **Root Cause**

Missing or invalid `AZURE_STATIC_WEB_APPS_TOKEN` GitHub secret.

### **✅ SOLUTION**

#### **Step 1: Add GitHub Secret**

1. **Copy this deployment token**:

   ```
   285838d87780e8964537e24f4e72484267f6b33bce5c1b0fab59af0ee9984cfa06-af739ff9-23df-4491-98b7-44ba1987b01e00f21040a867680f
   ```

2. **Go to GitHub Repository**:

   - Navigate to: https://github.com/vedprakash-m/vcarpool
   - Go to **Settings** → **Secrets and variables** → **Actions**

3. **Add/Update Secret**:
   - **Name**: `AZURE_STATIC_WEB_APPS_TOKEN`
   - **Value**: Paste the token from step 1
   - Click **"Add secret"** or **"Update secret"**

#### **Step 2: Verify Infrastructure**

✅ **Infrastructure Status**:

- Resource Group: `vcarpool-rg-dev` ✅
- Function App: `vcarpool-api-prod` ✅
- Static Web App: `vcarpool-web-prod` ✅
- Storage Account: `vcarpoolsaprod` ✅

#### **Step 3: Test Deployment**

After adding the secret, trigger a new deployment:

```bash
# Push any small change to trigger CI/CD
git commit --allow-empty -m "trigger: test deployment after fixing secrets"
git push origin main
```

---

## 🔧 **ALTERNATIVE: Manual Token Retrieval**

If you prefer to get the token yourself:

```bash
# Get the Static Web App deployment token
az staticwebapp secrets list \
  --name vcarpool-web-prod \
  --resource-group vcarpool-rg-dev \
  --query "properties.apiKey" \
  --output tsv
```

---

## 🌍 **ENVIRONMENT CONFIGURATION**

### **Current Infrastructure Map**

```
📦 vcarpool-rg-dev (Resource Group)
├── 🌐 vcarpool-web-prod (Static Web App)
│   └── 🔗 https://vcarpool-web-prod.azurestaticapps.net
├── ⚡ vcarpool-api-prod (Function App)
│   └── 🔗 https://vcarpool-api-prod.azurewebsites.net/api
├── 📊 vcarpool-plan-prod (App Service Plan)
└── 💾 vcarpoolsaprod (Storage Account)
```

### **GitHub Actions Environment Detection**

The CI/CD pipeline automatically detects environment based on branch:

- `main` branch → `prod` environment → `vcarpool-rg-dev`
- `develop` branch → `dev` environment → `rg-vcarpool-dev`

**Current Issue**: Branch `main` expects `prod` resources but they're deployed with `prod` suffix in `vcarpool-rg-dev` group.

---

## 🔄 **CI/CD WORKFLOW FIXES**

### **Fix 1: Environment Variable Alignment**

The resources exist but naming doesn't align perfectly with the CI/CD expectations.

**Current Resources**:

- Static Web App: `vcarpool-web-prod`
- Function App: `vcarpool-api-prod`
- Resource Group: `vcarpool-rg-dev`

**Expected by CI/CD**:

- Resource Group: `rg-vcarpool-prod` (for main branch)

### **Fix 2: Update Resource Group Reference**

Update the GitHub Actions workflow to use the correct resource group:

```yaml
# In .github/workflows/ci-cd.yml
# Change the resource group naming logic to match existing resources
```

---

## 🧪 **VERIFICATION CHECKLIST**

After applying fixes:

- [ ] **GitHub Secret Added**: `AZURE_STATIC_WEB_APPS_TOKEN` configured
- [ ] **Resource Group Exists**: `vcarpool-rg-dev` ✅
- [ ] **Static Web App Exists**: `vcarpool-web-prod` ✅
- [ ] **Function App Exists**: `vcarpool-api-prod` ✅
- [ ] **Deployment Triggered**: New commit pushed to `main`
- [ ] **Build Succeeds**: Frontend build creates `out/` directory
- [ ] **Artifacts Uploaded**: `frontend-dist` artifact contains static files
- [ ] **Deployment Succeeds**: Azure Static Web Apps accepts upload

---

## 🚨 **TROUBLESHOOTING**

### **If Deployment Still Fails**

1. **Check Resource Group Naming**:

   ```bash
   # Verify exact resource group name
   az group show --name vcarpool-rg-dev
   ```

2. **Verify Static Web App Status**:

   ```bash
   # Check if Static Web App is running
   az staticwebapp show --name vcarpool-web-prod --resource-group vcarpool-rg-dev
   ```

3. **Test Token Manually**:

   ```bash
   # Test deployment with Azure CLI
   az staticwebapp environment functions link \
     --name vcarpool-web-prod \
     --resource-group vcarpool-rg-dev \
     --function-app-resource-id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/vcarpool-rg-dev/providers/Microsoft.Web/sites/vcarpool-api-prod"
   ```

4. **Check GitHub Actions Logs**:
   - Go to Actions tab in GitHub repository
   - Look for detailed error messages in frontend-deploy step

---

## 📞 **NEXT STEPS**

1. **✅ IMMEDIATE**: Add the GitHub secret with the deployment token
2. **🔄 TEST**: Trigger a new deployment
3. **🔍 MONITOR**: Watch GitHub Actions for success
4. **🌐 VERIFY**: Check that the app deploys to https://vcarpool-web-prod.azurestaticapps.net

After successful deployment, you can continue with the development priorities outlined in `NEXT-STEPS.md`.

---

**🔑 Remember**: Keep the deployment token secure and rotate it if it's ever exposed!
