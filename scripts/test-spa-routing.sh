#!/bin/bash

echo "🧪 Testing SPA Routing Configuration..."
echo "========================================"

# Start preview server
echo "Starting preview server..."
npx vite preview --port 4173 > /tmp/vite-preview.log 2>&1 &
PREVIEW_PID=$!

# Wait for server to start
sleep 5

# Test root route
echo "Testing root route (/)..."
if curl -s http://localhost:4173 | grep -q "</html>"; then
    echo "✅ Root route works"
else
    echo "❌ Root route failed"
fi

# Test a nested route (simulating SPA routing)
echo "Testing nested route (/properties)..."
if curl -s http://localhost:4173/properties | grep -q "</html>"; then
    echo "✅ SPA routing works (returns index.html for nested routes)"
else
    echo "❌ SPA routing failed"
fi

# Test a deep nested route
echo "Testing deep nested route (/properties/123/edit)..."
if curl -s http://localhost:4173/properties/123/edit | grep -q "</html>"; then
    echo "✅ Deep nested routing works"
else
    echo "❌ Deep nested routing failed"
fi

# Clean up
echo "Stopping preview server..."
kill $PREVIEW_PID 2>/dev/null
wait $PREVIEW_PID 2>/dev/null

echo "========================================"
echo "SPA routing test complete!"