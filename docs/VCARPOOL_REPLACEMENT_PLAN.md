# Carpool to Carpool Rebranding - Replacement Plan

Found **211+ instances** of "carpool" that need to be updated to "carpool".

## Critical Files Requiring Updates

### 1. CI/CD and Infrastructure (High Priority)

- `.github/workflows/deploy-pipeline.yml` - 10 instances
- `infra/parameters.prod.json` - 4 instances
- `infra/parameters.dev.json` - 4 instances
- `scripts/validate-deployment.sh` - 7 instances
- Multiple deployment scripts

### 2. Configuration Files (High Priority)

- `backend/package.json` - 2 deployment script references
- Various parameter files and environment configs

### 3. Frontend Code (Medium Priority)

- Token storage references: `carpool_token` → `carpool_token`
- API endpoint references
- Component text references

### 4. Scripts and Utilities (Medium Priority)

- 30+ script files with branding references
- Database connection scripts
- Deployment automation

### 5. Documentation (Low Priority)

- README.md - GitHub URLs and resource group names
- Multiple .md files in docs/
- NOTICE file

## Replacement Strategy

1. **Phase 1**: Critical infrastructure and CI/CD files
2. **Phase 2**: Application code and configuration
3. **Phase 3**: Scripts and utilities
4. **Phase 4**: Documentation

## Risk Assessment

- **Azure Resource Names**: Some Azure resources may already exist with "carpool" names
- **Database Names**: Cosmos DB database "carpool" would need migration
- **Local Storage**: Frontend token keys need coordinated update
- **URLs**: GitHub repository URLs reference old naming

## Recommended Approach

Would you like me to:

1. **Execute all replacements automatically** (fastest, but needs testing)
2. **Execute phase by phase with your approval** (safer)
3. **Create a detailed list for manual review** (most controlled)

**Note**: This will affect production resource names and may require Azure resource migration.
