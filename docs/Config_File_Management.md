# Managing Configuration Files in Docker Builds

## Overview

This document outlines how to handle configuration files that are required for application functionality but should not be committed to version control (due to sensitive data or environment-specific settings).

## The Problem

Configuration files like `local.settings.json` contain:

- 🔐 **Sensitive data** (API keys, database credentials, secrets)
- 🏠 **Environment-specific settings** (local development URLs, debug flags)
- 📝 **Personal configurations** (individual developer preferences)

These files must be:

- ✅ **Available locally** for development
- ❌ **Excluded from git** (via `.gitignore`)
- 🐳 **Handled gracefully in Docker** builds for CI/CD

## The Solution

### 1. Create Sample/Template Files

For each gitignored config file, create a corresponding `.sample` or `.template` version:

```
backend/
├── local.settings.json          # ❌ Gitignored (contains real secrets)
├── local.settings.sample.json   # ✅ Committed (safe defaults)
└── .env                         # ❌ Gitignored (if used)
    .env.sample                  # ✅ Committed (if needed)
```

### 2. Sample File Requirements

Sample files should contain:

- 🔧 **Functional defaults** that allow the application to start
- 🚫 **No real secrets** (use placeholder values)
- 📝 **Clear documentation** of what each setting does
- ✅ **Valid JSON/format** that won't cause parsing errors

**Example:**

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "NODE_ENV": "development",
    "JWT_SECRET": "sample-jwt-secret-replace-in-production",
    "COSMOS_DB_ENDPOINT": "",
    "COSMOS_DB_KEY": "",
    "FROM_EMAIL": "noreply@example.com"
  }
}
```

### 3. Docker Configuration

Configure Dockerfiles to use sample files when real ones aren't available:

```dockerfile
# Copy sample config file (always available in git)
COPY --from=backend-builder /app/backend/local.settings.sample.json ./backend/local.settings.sample.json

# Create working config from sample (safe for CI/CD)
RUN echo "Creating local.settings.json from sample template for containerized environment" && \
    cp ./backend/local.settings.sample.json ./backend/local.settings.json
```

### 4. Local Development Setup

Developers should:

1. **Copy sample to real file** on initial setup:

   ```bash
   cp backend/local.settings.sample.json backend/local.settings.json
   ```

2. **Update real file** with actual values for local development

3. **Never commit** the real file (it's gitignored)

## Validation

The local validation script (`scripts/local-ci-validation.sh`) includes checks for this pattern:

```bash
# Check for missing sample files
if [ ! -f "backend/local.settings.json" ]; then
    if [ ! -f "backend/local.settings.sample.json" ]; then
        log "❌ Missing backend/local.settings.sample.json (required for Docker build)"
        exit 1
    else
        log "⚠️  backend/local.settings.json missing (will use sample in Docker)"
    fi
fi
```

## Best Practices

### ✅ Do

- Always create `.sample` versions of gitignored config files
- Use functional defaults that allow the app to start
- Document configuration options in comments or README
- Test Docker builds without the real config files
- Include sample files in version control

### ❌ Don't

- Commit files with real secrets or credentials
- Use sample files that would cause the app to crash
- Assume all environments have the same config files
- Hardcode sensitive values in Dockerfiles
- Skip testing CI/CD environment conditions locally

## Testing Your Configuration

To test if your Docker builds will work in CI/CD:

```bash
# Run local validation with CI/CD simulation
./scripts/local-ci-validation.sh

# Or manually test Docker build without local config
mv backend/local.settings.json backend/local.settings.json.backup
docker-compose -f docker-compose.e2e.yml build --no-cache
mv backend/local.settings.json.backup backend/local.settings.json
```

## Troubleshooting

**Docker build fails with "file not found":**

- Ensure `.sample` version exists and is committed
- Check Dockerfile uses sample file when real one is missing
- Verify `.gitignore` patterns are correct

**App crashes in container with config errors:**

- Review sample file for valid JSON/format
- Ensure all required fields have functional defaults
- Test the app locally with only the sample file

**CI/CD passes but local development broken:**

- Check if you have the real config file locally
- Ensure real file has all necessary environment-specific values
- Compare real file structure with sample file

## Related Files

- `backend/local.settings.sample.json` - Azure Functions configuration template
- `e2e/docker/Dockerfile.backend-test` - Docker configuration with sample file handling
- `scripts/local-ci-validation.sh` - Validation script with config file checks
- `.gitignore` - Lists which config files are excluded from git
