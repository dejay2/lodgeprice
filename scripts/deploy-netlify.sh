#!/bin/bash

# Netlify Deployment Script for Lodgeprice 2.0
# This script handles the deployment process to Netlify with validation

set -e  # Exit on error

echo "🚀 Starting Netlify Deployment Process..."
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    else
        echo "$2"
    fi
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    print_status "error" "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_status "error" "npm is not installed"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_status "warning" "Node.js version should be 18 or higher. Current: $(node -v)"
fi

# Check for required files
if [ ! -f "netlify.toml" ]; then
    print_status "error" "netlify.toml not found"
    exit 1
fi

if [ ! -f "public/_redirects" ]; then
    print_status "warning" "_redirects file not found - SPA routing may not work"
fi

print_status "success" "Prerequisites check passed"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci || npm install
    print_status "success" "Dependencies installed"
fi

# Run quality checks
echo "🔍 Running quality checks..."

# Type checking
echo "  → Running type check..."
if npm run typecheck; then
    print_status "success" "Type checking passed"
else
    print_status "error" "Type checking failed"
    exit 1
fi

# Linting
echo "  → Running linter..."
if npm run lint; then
    print_status "success" "Linting passed"
else
    print_status "error" "Linting failed"
    exit 1
fi

# Run tests if they exist
if npm run test 2>/dev/null; then
    echo "  → Running tests..."
    if npm test; then
        print_status "success" "Tests passed"
    else
        print_status "warning" "Some tests failed - continuing anyway"
    fi
fi

# Build the project
echo "🔨 Building the project..."
if npm run build; then
    print_status "success" "Build completed successfully"
    
    # Check build output
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        FILE_COUNT=$(find dist -type f | wc -l)
        print_status "success" "Build size: $BUILD_SIZE"
        print_status "success" "Files generated: $FILE_COUNT"
    fi
else
    print_status "error" "Build failed"
    exit 1
fi

# Check for Netlify CLI
if command_exists netlify; then
    echo "📤 Deploying to Netlify..."
    
    # Check if site is linked
    if netlify status 2>/dev/null; then
        print_status "success" "Site is linked"
    else
        print_status "warning" "Site not linked. Run: netlify link"
    fi
    
    # Check if we're in a CI environment
    if [ -n "$CI" ]; then
        # CI deployment
        print_status "info" "Running in CI environment"
        netlify deploy --prod --dir=dist
    else
        # Local deployment
        print_status "info" "Running local deployment"
        echo "Choose deployment target:"
        echo "  1) Production"
        echo "  2) Draft (Preview)"
        read -p "Enter choice (1 or 2): " choice
        
        case $choice in
            1)
                echo "⚠️  Deploying to PRODUCTION"
                read -p "Are you sure? (y/N): " confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    netlify deploy --prod --dir=dist
                else
                    print_status "info" "Deployment cancelled"
                    exit 0
                fi
                ;;
            2)
                netlify deploy --dir=dist
                ;;
            *)
                print_status "error" "Invalid choice"
                exit 1
                ;;
        esac
    fi
    
    print_status "success" "Deployment completed!"
else
    print_status "warning" "Netlify CLI not installed"
    echo "Install with: npm i -g netlify-cli"
    echo "Then run: netlify login"
    echo "And link site: netlify link"
    echo ""
    echo "Manual deployment steps:"
    echo "1. Push your code to GitHub"
    echo "2. Connect repository in Netlify dashboard"
    echo "3. Configure environment variables"
    echo "4. Deploy from dashboard"
fi

echo ""
echo "========================================="
echo "📝 Post-deployment checklist:"
echo "  □ Verify deployment at provided URL"
echo "  □ Test SPA routing (direct URL access)"
echo "  □ Check Supabase connection"
echo "  □ Review browser console for errors"
echo "  □ Test critical user flows"
echo "  □ Check Lighthouse scores (if configured)"
echo "========================================="