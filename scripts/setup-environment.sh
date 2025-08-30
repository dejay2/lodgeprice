#!/bin/bash

# Environment Setup Script for Lodgeprice 2.0
# This script helps set up environment variables for different deployment targets

set -e

echo "🔧 Lodgeprice 2.0 Environment Setup"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}❌ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
    elif [ "$1" = "info" ]; then
        echo -e "${BLUE}ℹ️  $2${NC}"
    else
        echo "$2"
    fi
}

# Function to validate Supabase URL
validate_supabase_url() {
    if [[ $1 =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate anon key
validate_anon_key() {
    if [[ ${#1} -gt 30 ]]; then
        return 0
    else
        return 1
    fi
}

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    print_status "error" ".env.example not found!"
    exit 1
fi

# Select environment
echo ""
echo "Select environment to configure:"
echo "  1) Development (local)"
echo "  2) Staging"
echo "  3) Production"
echo ""
read -p "Enter choice (1-3): " ENV_CHOICE

case $ENV_CHOICE in
    1)
        ENV_TYPE="development"
        ENV_FILE=".env"
        TEMPLATE_FILE=".env.example"
        ;;
    2)
        ENV_TYPE="staging"
        ENV_FILE=".env.staging"
        TEMPLATE_FILE=".env.staging.example"
        ;;
    3)
        ENV_TYPE="production"
        ENV_FILE=".env.production"
        TEMPLATE_FILE=".env.production.example"
        ;;
    *)
        print_status "error" "Invalid choice"
        exit 1
        ;;
esac

print_status "info" "Configuring $ENV_TYPE environment"

# Check if environment file already exists
if [ -f "$ENV_FILE" ]; then
    print_status "warning" "$ENV_FILE already exists"
    read -p "Do you want to overwrite it? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        print_status "info" "Setup cancelled"
        exit 0
    fi
fi

# Copy template
if [ -f "$TEMPLATE_FILE" ]; then
    cp "$TEMPLATE_FILE" "$ENV_FILE"
    print_status "success" "Created $ENV_FILE from $TEMPLATE_FILE"
else
    cp ".env.example" "$ENV_FILE"
    print_status "info" "Created $ENV_FILE from .env.example"
fi

echo ""
echo "Enter your Supabase configuration:"
echo ""

# Get Supabase URL
while true; do
    read -p "Supabase URL (e.g., https://vehonbnvzcgcticpfsox.supabase.co): " SUPABASE_URL
    if validate_supabase_url "$SUPABASE_URL"; then
        print_status "success" "Valid Supabase URL format"
        break
    else
        print_status "error" "Invalid URL format. Expected: https://your-project-id.supabase.co"
    fi
done

# Get Supabase Anon Key
while true; do
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    if validate_anon_key "$SUPABASE_ANON_KEY"; then
        print_status "success" "Valid anon key format"
        break
    else
        print_status "error" "Invalid key format (too short)"
    fi
done

# Update environment file
sed -i.bak "s|VITE_SUPABASE_URL=.*|VITE_SUPABASE_URL=$SUPABASE_URL|" "$ENV_FILE"
sed -i.bak "s|VITE_SUPABASE_ANON_KEY=.*|VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" "$ENV_FILE"

# Set environment-specific values
case $ENV_TYPE in
    development)
        sed -i.bak "s|VITE_LOG_LEVEL=.*|VITE_LOG_LEVEL=DEBUG|" "$ENV_FILE"
        sed -i.bak "s|VITE_DEVELOPMENT_MODE=.*|VITE_DEVELOPMENT_MODE=true|" "$ENV_FILE"
        ;;
    staging)
        sed -i.bak "s|VITE_LOG_LEVEL=.*|VITE_LOG_LEVEL=INFO|" "$ENV_FILE"
        sed -i.bak "s|VITE_DEVELOPMENT_MODE=.*|VITE_DEVELOPMENT_MODE=false|" "$ENV_FILE"
        ;;
    production)
        sed -i.bak "s|VITE_LOG_LEVEL=.*|VITE_LOG_LEVEL=WARN|" "$ENV_FILE"
        sed -i.bak "s|VITE_DEVELOPMENT_MODE=.*|VITE_DEVELOPMENT_MODE=false|" "$ENV_FILE"
        ;;
esac

# Clean up backup files
rm -f "${ENV_FILE}.bak"

print_status "success" "Environment configuration complete!"

echo ""
echo "Configuration saved to: $ENV_FILE"
echo ""

# Test the configuration
echo "Would you like to test the configuration?"
read -p "Test build with these settings? (Y/n): " TEST_BUILD

if [ "$TEST_BUILD" != "n" ] && [ "$TEST_BUILD" != "N" ]; then
    print_status "info" "Testing build configuration..."
    
    # Try to build
    if npm run build; then
        print_status "success" "Build successful with new configuration!"
        
        # Offer to test preview
        echo ""
        read -p "Start preview server to test? (Y/n): " TEST_PREVIEW
        if [ "$TEST_PREVIEW" != "n" ] && [ "$TEST_PREVIEW" != "N" ]; then
            print_status "info" "Starting preview server on http://localhost:4173"
            print_status "info" "Press Ctrl+C to stop"
            npm run preview
        fi
    else
        print_status "error" "Build failed - check configuration and try again"
    fi
fi

echo ""
echo "===================================="
echo "Next steps:"
echo ""

case $ENV_TYPE in
    development)
        echo "1. Run 'npm run dev' to start development server"
        echo "2. Visit http://localhost:3000"
        ;;
    staging|production)
        echo "1. Set these environment variables in your deployment platform:"
        echo "   - Vercel: Project Settings → Environment Variables"
        echo "   - Netlify: Site Settings → Environment Variables"
        echo ""
        echo "2. Variables to set:"
        echo "   VITE_SUPABASE_URL=$SUPABASE_URL"
        echo "   VITE_SUPABASE_ANON_KEY=***${SUPABASE_ANON_KEY: -4}"
        echo "   VITE_LOG_LEVEL=$(grep VITE_LOG_LEVEL "$ENV_FILE" | cut -d'=' -f2)"
        echo "   VITE_DEVELOPMENT_MODE=$(grep VITE_DEVELOPMENT_MODE "$ENV_FILE" | cut -d'=' -f2)"
        echo ""
        echo "3. Deploy using:"
        echo "   - Vercel: 'vercel --prod' or push to main branch"
        echo "   - Netlify: 'netlify deploy --prod' or push to main branch"
        ;;
esac

echo ""
print_status "success" "Setup complete!"