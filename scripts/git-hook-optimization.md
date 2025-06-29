# Git Hook Optimization Strategy

## Current Issue

- Pre-commit and pre-push hooks have overlapping checks (type checking, linting)
- This wastes developer time by running the same checks twice

## Optimized Strategy

### Pre-commit (Fast - 10-30 seconds)

**Purpose**: Catch obvious issues early, before they're committed
**Checks**:

- ✅ Type checking (TypeScript compilation check only)
- ✅ Linting (ESLint/Prettier)
- ✅ Quick format validation
- ❌ No tests (too slow for commit workflow)
- ❌ No builds (too slow for commit workflow)

### Pre-push (Comprehensive - 2-5 minutes)

**Purpose**: Ensure all code being pushed is production-ready
**Checks**:

- ⚠️ **Skip** type checking and linting (already done in pre-commit)
- ✅ Full build validation
- ✅ Comprehensive test suite
- ✅ E2E tests
- ✅ Brand consistency checks
- ✅ Test isolation validation
- ✅ Cross-package validation

### Benefits

1. **Faster commits**: Developers get quick feedback without waiting for full test suite
2. **No redundancy**: Each check runs only once in the appropriate hook
3. **Early failure**: Obvious issues (types, lint) caught before expensive operations
4. **Comprehensive push validation**: Ensures no broken code reaches remote repository

### Implementation Notes

- Use environment variables to track which checks have been run
- Add fallback mechanism if pre-commit was bypassed (git commit --no-verify)
- Include timestamps to ensure checks are recent enough
