#!/bin/bash

# Deployment Validation Script for Lodgeprice 2.0
# This script validates that the deployment configuration is correct

set -e

echo "🔍 Validating Deployment Configuration..."
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((SUCCESS++))
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
        ((ERRORS++))
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
        ((WARNINGS++))
    elif [ "$1" = "info" ]; then
        echo -e "${BLUE}ℹ️  $2${NC}"
    else
        echo "$2"
    fi
}

# Check project structure
echo "📁 Checking project structure..."

if [ -f "package.json" ]; then
    print_status "success" "package.json found"
else
    print_status "error" "package.json not found"
fi

if [ -f "vite.config.ts" ]; then
    print_status "success" "vite.config.ts found"
else
    print_status "error" "vite.config.ts not found"
fi

if [ -d "src" ]; then
    print_status "success" "src directory found"
else
    print_status "error" "src directory not found"
fi

if [ -d "public" ]; then
    print_status "success" "public directory found"
else
    print_status "warning" "public directory not found - creating it"
    mkdir -p public
fi

# Check deployment configurations
echo ""
echo "🚀 Checking deployment configurations..."

# Vercel configuration
if [ -f "vercel.json" ]; then
    print_status "success" "vercel.json found"
    
    # Validate vercel.json structure
    if command -v jq >/dev/null 2>&1; then
        if jq empty vercel.json 2>/dev/null; then
            print_status "success" "vercel.json is valid JSON"
            
            # Check for required fields
            if jq -e '.rewrites' vercel.json >/dev/null 2>&1; then
                print_status "success" "SPA rewrites configured in vercel.json"
            else
                print_status "warning" "No rewrites found in vercel.json"
            fi
        else
            print_status "error" "vercel.json is not valid JSON"
        fi
    else
        print_status "info" "jq not installed - skipping JSON validation"
    fi
else
    print_status "warning" "vercel.json not found (needed for Vercel deployment)"
fi

# Netlify configuration
if [ -f "netlify.toml" ]; then
    print_status "success" "netlify.toml found"
else
    print_status "warning" "netlify.toml not found (needed for Netlify deployment)"
fi

if [ -f "public/_redirects" ]; then
    print_status "success" "_redirects file found for Netlify SPA routing"
    
    # Check content
    if grep -q "/\* /index.html 200" public/_redirects; then
        print_status "success" "SPA redirect rule configured correctly"
    else
        print_status "warning" "SPA redirect rule may be incorrect"
    fi
else
    print_status "warning" "_redirects file not found (needed for Netlify SPA routing)"
fi

# Check environment configuration
echo ""
echo "🔐 Checking environment configuration..."

if [ -f ".env.example" ]; then
    print_status "success" ".env.example found"
else
    print_status "warning" ".env.example not found"
fi

if [ -f ".env.production.example" ]; then
    print_status "success" ".env.production.example found"
else
    print_status "warning" ".env.production.example not found"
fi

if [ -f ".env.staging.example" ]; then
    print_status "success" ".env.staging.example found"
else
    print_status "info" ".env.staging.example not found (optional)"
fi

# Check for .env in git (should not be there)
if git ls-files --error-unmatch .env 2>/dev/null; then
    print_status "error" ".env file is tracked in git (security risk!)"
else
    print_status "success" ".env file is not tracked in git"
fi

# Check build configuration
echo ""
echo "🔨 Checking build configuration..."

# Check package.json scripts
if [ -f "package.json" ]; then
    if grep -q '"build":' package.json; then
        print_status "success" "Build script found in package.json"
        BUILD_CMD=$(grep '"build":' package.json | cut -d'"' -f4)
        print_status "info" "Build command: $BUILD_CMD"
    else
        print_status "error" "No build script in package.json"
    fi
    
    if grep -q '"typecheck":' package.json; then
        print_status "success" "Typecheck script found"
    else
        print_status "warning" "No typecheck script found"
    fi
    
    if grep -q '"lint":' package.json; then
        print_status "success" "Lint script found"
    else
        print_status "warning" "No lint script found"
    fi
fi

# Check Node version
echo ""
echo "📦 Checking Node.js environment..."

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    print_status "success" "Node.js installed: $NODE_VERSION"
    
    # Extract major version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        print_status "success" "Node.js version is 18 or higher"
    else
        print_status "warning" "Node.js version should be 18 or higher for optimal compatibility"
    fi
else
    print_status "error" "Node.js not installed"
fi

# Test build process
echo ""
echo "🧪 Testing build process..."

if [ -f "package.json" ]; then
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_status "info" "Dependencies not installed - run 'npm install' first"
    else
        # Try a test build
        print_status "info" "Attempting test build..."
        if npm run build 2>/dev/null; then
            print_status "success" "Build completed successfully"
            
            # Check build output
            if [ -d "dist" ]; then
                print_status "success" "Build output directory 'dist' created"
                
                # Check for index.html
                if [ -f "dist/index.html" ]; then
                    print_status "success" "index.html generated in dist"
                else
                    print_status "error" "index.html not found in dist"
                fi
                
                # Check build size
                if command -v du >/dev/null 2>&1; then
                    BUILD_SIZE=$(du -sh dist | cut -f1)
                    print_status "info" "Build size: $BUILD_SIZE"
                fi
            else
                print_status "error" "Build output directory 'dist' not found"
            fi
        else
            print_status "warning" "Build failed - check error messages above"
        fi
    fi
fi

# Check for common issues
echo ""
echo "🐛 Checking for common issues..."

# Check if using correct environment variable prefix
if grep -r "process.env.REACT_APP_" src/ 2>/dev/null; then
    print_status "error" "Found REACT_APP_ prefix - should use VITE_ for Vite projects"
    echo "    Files with incorrect prefix:"
    grep -l "process.env.REACT_APP_" src/* 2>/dev/null | head -5
else
    print_status "success" "No legacy REACT_APP_ prefixes found"
fi

# Check for correct environment variable access
if grep -r "import.meta.env.VITE_" src/ 2>/dev/null | head -1 >/dev/null; then
    print_status "success" "Using correct import.meta.env for Vite"
else
    print_status "warning" "No VITE_ environment variables found in source"
fi

# Summary
echo ""
echo "========================================="
echo "📊 Validation Summary"
echo "========================================="
echo -e "${GREEN}✅ Successful checks: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"

if [ $ERRORS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment configuration is valid!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Set up environment variables in your deployment platform"
    echo "  2. Connect your GitHub repository"
    echo "  3. Deploy using platform dashboard or CLI"
    
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Note: Review warnings above for optimal configuration${NC}"
    fi
else
    echo ""
    echo -e "${RED}❗ Please fix the errors above before deploying${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Platform-specific deployment commands:"
echo "  Vercel:  vercel --prod"
echo "  Netlify: netlify deploy --prod"
echo "========================================="