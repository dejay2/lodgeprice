# GitHub Actions CI/CD Pipeline

## Overview

This directory contains the GitHub Actions workflows for the Lodgeprice application. The main CI pipeline ensures code quality and prevents deployment of broken code by running automated tests on every pull request and main branch commit.

## Workflow Files

### `ci.yml` - Main CI Pipeline

The main continuous integration workflow that runs on:
- Every push to the `main` branch
- Every pull request targeting the `main` branch

#### Jobs

1. **Test and Build** (`test`)
   - Runs on `ubuntu-latest` with Node.js 20.x
   - Executes the following validation gates in sequence:
     - **Linting**: ESLint with zero warnings tolerance
     - **Type Checking**: TypeScript compilation validation
     - **Unit Tests**: Vitest unit tests with coverage reporting
     - **Integration Tests**: Supabase integration tests
     - **Build Verification**: Production build compilation
   - Uploads artifacts:
     - Coverage reports (7-day retention)
     - Build artifacts (7-day retention)
   - Comments on PRs with test results summary

2. **E2E Tests** (`e2e-tests`)
   - Runs only on main branch or when PR has `e2e-required` label
   - Executes Playwright end-to-end tests
   - Uploads test reports and results

## Environment Variables

### Required GitHub Secrets

Configure these in your repository settings under Settings → Secrets and Variables → Actions:

```bash
SUPABASE_URL=https://vehonbnvzcgcticpfsox.supabase.co
SUPABASE_ANON_KEY=[your-anon-key-from-supabase-dashboard]
```

## Local Development

### Running CI Checks Locally

To run the same checks that CI performs:

```bash
# Install dependencies
npm ci

# Run linter
npm run lint

# Run type checking
npm run typecheck

# Run unit tests with coverage
npm run test:coverage

# Run integration tests (requires SUPABASE_URL and SUPABASE_ANON_KEY in .env)
npm run test:integration

# Build production bundle
npm run build

# Run E2E tests (optional)
npm run test:e2e
```

### Fixing Common Issues

#### Linting Errors
```bash
# Auto-fix some linting issues
npx eslint . --fix

# Check remaining issues
npm run lint
```

#### TypeScript Errors
```bash
# Check for type errors
npm run typecheck

# Common fixes:
# - Add missing type annotations
# - Fix any 'any' types with proper types
# - Resolve import issues
```

#### Test Failures
```bash
# Run specific test file
npx vitest run tests/unit/pricing.test.ts

# Run tests in watch mode for development
npm run test:watch

# Debug integration tests
npm run test:integration:watch
```

## Branch Protection

To enable branch protection for the `main` branch:

1. Go to Settings → Branches in your GitHub repository
2. Add a branch protection rule for `main`
3. Enable these settings:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select "CI / Test and Build" as a required status check
   - ✅ Require conversation resolution before merging (optional)
   - ✅ Require pull request reviews before merging (optional)

## Performance Optimization

The CI pipeline is optimized for speed:

- **Dependency Caching**: Uses `actions/setup-node` with npm cache
- **Expected Times** (with caching):
  - Dependency installation: ~30 seconds
  - Linting: ~30 seconds
  - Type checking: ~45 seconds
  - Unit tests: 1-2 minutes
  - Integration tests: 2-3 minutes
  - Build: 1-2 minutes
  - **Total**: 5-8 minutes

## Troubleshooting

### Pipeline Fails with Network Errors

If Supabase integration tests fail with network errors:
1. Check if Supabase service is operational
2. Verify GitHub Secrets are correctly configured
3. The workflow includes retry logic for flaky tests (2 retries in CI)

### Cache Issues

If you suspect corrupted cache:
1. Go to Actions → Caches in your repository
2. Delete the relevant cache entries
3. Re-run the workflow

### Slow Pipeline Execution

If pipeline takes longer than 10 minutes:
1. Check for inefficient tests
2. Consider splitting tests into parallel jobs
3. Review dependency installation logs

## Artifacts

The CI pipeline produces the following artifacts:

- **Coverage Reports**: HTML and LCOV coverage data
- **Build Artifacts**: Production-ready `dist/` folder
- **Playwright Reports**: E2E test results and traces
- **Test Results**: JUnit XML format for test reporting

All artifacts are retained for 7 days and can be downloaded from the workflow run page.

## Manual Workflow Dispatch

To manually trigger the CI pipeline:
1. Go to Actions tab in GitHub
2. Select "CI" workflow
3. Click "Run workflow"
4. Select branch and run

## Contributing

When modifying the CI pipeline:

1. Test changes in a feature branch first
2. Verify all validation gates pass
3. Ensure performance targets are met (< 10 minutes)
4. Update this documentation if adding new features
5. Consider backward compatibility for existing PRs

## Related Documentation

- [Vitest Configuration](../../vitest.config.ts)
- [Playwright Configuration](../../playwright.config.ts)
- [ESLint Configuration](../../eslint.config.js)
- [TypeScript Configuration](../../tsconfig.json)