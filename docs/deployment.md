# Deployment Guide for Lodgeprice 2.0

## Overview

This guide covers the deployment process for the Lodgeprice 2.0 React application to production hosting platforms. The application is configured to deploy to either **Vercel** or **Netlify** with automated CI/CD pipelines.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Platform Selection](#platform-selection)
3. [Environment Variables](#environment-variables)
4. [Vercel Deployment](#vercel-deployment)
5. [Netlify Deployment](#netlify-deployment)
6. [Staging Environment](#staging-environment)
7. [Build Optimization](#build-optimization)
8. [Monitoring and Logs](#monitoring-and-logs)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Repository**: Code must be pushed to a GitHub repository
2. **Supabase Credentials**: Access to your Supabase project dashboard
3. **Platform Account**: Either Vercel or Netlify account (free tier is sufficient)
4. **Environment Variables**: All required values from `.env.example`

## Platform Selection

### Choose Vercel if you need:
- Edge network performance optimization
- Automatic framework detection for Vite
- Built-in analytics and performance monitoring
- Serverless functions support (future expansion)

### Choose Netlify if you need:
- Simple file-based configuration
- Built-in form handling
- Split testing capabilities
- Extensive plugin ecosystem

Both platforms offer excellent support for React SPAs with similar performance characteristics.

## Environment Variables

### Required Variables

All deployments require these environment variables:

```bash
VITE_SUPABASE_URL=https://vehonbnvzcgcticpfsox.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Optional Variables

Configure based on environment:

```bash
VITE_LOG_LEVEL=WARN                          # WARN for production, DEBUG for development
VITE_ENABLE_PERFORMANCE_MONITORING=true      # Enable performance tracking
VITE_DEVELOPMENT_MODE=false                  # Must be false for production
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`vehonbnvzcgcticpfsox`)
3. Navigate to **Settings → API**
4. Copy the **Project URL** and **anon public** key

## Vercel Deployment

### Initial Setup

1. **Connect GitHub Repository**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   ```

2. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Framework will be auto-detected as "Vite"

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add each variable from `.env.production.example`
   - Select "Production" environment
   - Click "Save"

5. **Deploy**
   ```bash
   # Automatic deployment on git push
   git push origin main
   
   # Manual deployment via CLI
   vercel --prod
   ```

### Vercel Configuration File

The `vercel.json` file in the project root handles:
- SPA routing configuration
- Security headers
- Cache control for assets
- Build optimization settings

### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatic

## Netlify Deployment

### Initial Setup

1. **Connect GitHub Repository**
   ```bash
   # Install Netlify CLI (optional)
   npm i -g netlify-cli
   
   # Login to Netlify
   netlify login
   ```

2. **Create New Site**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   - Configure build settings

3. **Build Settings**
   - Base directory: (leave empty)
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions` (if using)

4. **Set Environment Variables**
   - Go to Site Settings → Environment Variables
   - Click "Add a variable"
   - Add each variable from `.env.production.example`
   - Deploy contexts: "Production"

5. **Deploy**
   ```bash
   # Automatic deployment on git push
   git push origin main
   
   # Manual deployment via CLI
   netlify deploy --prod
   ```

### Netlify Configuration Files

- **`netlify.toml`**: Main configuration for build settings, headers, and redirects
- **`public/_redirects`**: SPA routing fallback configuration

### Custom Domain Setup

1. Go to Site Settings → Domain Management
2. Add custom domain
3. Configure DNS (Netlify DNS or external)
4. HTTPS is automatic with Let's Encrypt

## Staging Environment

### Vercel Preview Deployments

Preview deployments are automatically created for:
- Pull requests
- Branch pushes (non-main)

Configure preview environment variables:
1. Project Settings → Environment Variables
2. Add variables for "Preview" environment
3. Use `.env.staging.example` values

### Netlify Deploy Previews

Deploy previews are automatically created for:
- Pull requests
- Branch deploys

Configure in `netlify.toml`:
```toml
[context.deploy-preview]
  environment = { VITE_LOG_LEVEL = "DEBUG" }
```

### Creating a Persistent Staging Environment

1. Create a `staging` branch
2. Configure branch-specific environment variables
3. Access via:
   - Vercel: `https://your-app-staging.vercel.app`
   - Netlify: `https://staging--your-app.netlify.app`

## Build Optimization

### Performance Optimizations

The build process includes:

1. **Code Splitting**
   - Vendor chunks for better caching
   - Lazy loading for routes
   - Dynamic imports for large components

2. **Asset Optimization**
   - Image compression
   - Font subsetting
   - CSS/JS minification

3. **Caching Strategy**
   - Immutable cache for hashed assets
   - Short cache for index.html
   - CDN distribution

### Build Performance Metrics

Target metrics:
- Build time: < 5 minutes
- Bundle size: < 500KB (gzipped)
- Lighthouse score: > 90

Monitor via:
- Vercel: Analytics dashboard
- Netlify: Deploy summary

## Monitoring and Logs

### Vercel Monitoring

1. **Build Logs**
   - Project Dashboard → Deployments → View logs
   - Real-time build output
   - Error diagnostics

2. **Function Logs** (if using)
   - Functions tab → View logs
   - Request/response details
   - Error tracking

3. **Analytics**
   - Analytics tab for performance metrics
   - Web Vitals tracking
   - User analytics

### Netlify Monitoring

1. **Deploy Logs**
   - Deploys tab → View deploy log
   - Detailed build process
   - Error messages

2. **Function Logs** (if using)
   - Functions tab → View logs
   - Execution details
   - Error tracking

3. **Analytics** (requires upgrade)
   - Site analytics
   - Performance monitoring
   - Error tracking

## Rollback Procedures

### Immediate Rollback

#### Vercel
1. Go to Deployments tab
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"
4. Confirms within seconds

#### Netlify
1. Go to Deploys tab
2. Find previous working deploy
3. Click "Publish deploy"
4. Live within seconds

### Git-based Rollback

```bash
# Revert the problematic commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### Emergency Procedures

1. **Critical Production Issue**
   - Use platform instant rollback
   - Investigate in staging environment
   - Fix and redeploy

2. **Environment Variable Issues**
   - Update variables in platform dashboard
   - Trigger rebuild (no code changes needed)
   - Verify in deployment logs

3. **Build Failures**
   - Check build logs for errors
   - Validate environment variables
   - Test locally with production build

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures

**Error**: `Missing required environment variables`
```bash
# Solution: Add variables in platform dashboard
VITE_SUPABASE_URL=https://vehonbnvzcgcticpfsox.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

**Error**: `Module not found`
```bash
# Solution: Clear cache and rebuild
npm ci
npm run build
```

#### 2. SPA Routing Issues

**Problem**: 404 errors on direct URL access

**Vercel Solution**: Verify `vercel.json` exists with:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify Solution**: Verify `public/_redirects` exists with:
```
/* /index.html 200
```

#### 3. Environment Variable Access

**Problem**: Variables undefined in production

**Check**:
- Variables use `VITE_` prefix
- Access via `import.meta.env.VITE_*`
- Set in correct environment (Production vs Preview)
- Rebuild after adding variables

#### 4. Performance Issues

**Problem**: Slow initial load

**Solutions**:
- Enable compression in platform settings
- Implement code splitting
- Optimize images and assets
- Use CDN for static assets

#### 5. Supabase Connection Issues

**Problem**: Cannot connect to database

**Check**:
- Correct Supabase URL format
- Valid anon key
- Network connectivity
- CORS settings in Supabase

### Debug Commands

```bash
# Test production build locally
npm run build
npm run preview

# Check environment variables
echo $VITE_SUPABASE_URL

# Validate build output
ls -la dist/

# Test with production variables
NODE_ENV=production npm run build
```

### Getting Help

1. **Platform Documentation**
   - [Vercel Docs](https://vercel.com/docs)
   - [Netlify Docs](https://docs.netlify.com)

2. **Framework Resources**
   - [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
   - [React Router Deployment](https://reactrouter.com/docs/en/v6/guides/deployment)

3. **Community Support**
   - Platform Discord/Slack communities
   - Stack Overflow
   - GitHub Issues

## Security Considerations

### Best Practices

1. **Environment Variables**
   - Only use `VITE_` prefixed variables in client code
   - Never expose service role keys
   - Rotate keys periodically

2. **Headers and CSP**
   - Security headers configured in platform files
   - Content Security Policy restricts resource loading
   - HSTS enabled for HTTPS enforcement

3. **Build Security**
   - Dependencies regularly updated
   - Security audits via `npm audit`
   - No sensitive data in build artifacts

### Security Checklist

- [ ] All environment variables properly configured
- [ ] No secrets in version control
- [ ] HTTPS enforced
- [ ] Security headers enabled
- [ ] Build artifacts don't contain sensitive data
- [ ] Dependencies up to date
- [ ] Error messages don't expose system details

## Deployment Checklist

Before deploying to production:

### Code Readiness
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build succeeds locally (`npm run build`)

### Configuration
- [ ] Environment variables set in platform
- [ ] Deployment configuration files committed
- [ ] Custom domain configured (if applicable)
- [ ] SSL/HTTPS enabled

### Testing
- [ ] Preview deployment tested
- [ ] SPA routing verified
- [ ] Supabase connection confirmed
- [ ] Performance acceptable

### Documentation
- [ ] Deployment documented
- [ ] Team notified
- [ ] Rollback plan ready

## Maintenance

### Regular Tasks

**Weekly**:
- Review deployment logs
- Check performance metrics
- Monitor error rates

**Monthly**:
- Update dependencies
- Security audit
- Performance review

**Quarterly**:
- Platform feature updates
- Infrastructure review
- Cost optimization

### Keeping Up to Date

1. **Platform Updates**
   - Subscribe to platform changelogs
   - Review new features
   - Update configurations as needed

2. **Dependency Updates**
   ```bash
   # Check for updates
   npm outdated
   
   # Update dependencies
   npm update
   
   # Audit for vulnerabilities
   npm audit
   ```

3. **Framework Updates**
   - Monitor Vite releases
   - Review React updates
   - Test in staging first

## Conclusion

This deployment pipeline provides:
- Automated CI/CD from GitHub
- Optimized production builds
- Staging environment for testing
- Quick rollback capabilities
- Comprehensive monitoring

For additional support or questions, refer to the platform documentation or contact the development team.