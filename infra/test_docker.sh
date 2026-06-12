#!/bin/bash
# Docker Test Script - Verify all services are working correctly

set -e

echo "=========================================="
echo "Docker Services Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if containers are running
echo "Test 1: Checking container status..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
else
    echo -e "${RED}✗ Containers are not running${NC}"
    exit 1
fi
echo ""

# Test 2: Check MongoDB health
echo "Test 2: Testing MongoDB connection..."
if docker-compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MongoDB is healthy${NC}"
else
    echo -e "${RED}✗ MongoDB is not responding${NC}"
    exit 1
fi
echo ""

# Test 3: Check backend health endpoint
echo "Test 3: Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Check backend through nginx proxy
echo "Test 4: Testing API proxy (nginx -> backend)..."
PROXY_RESPONSE=$(curl -s http://localhost/api/health)
if echo "$PROXY_RESPONSE" | grep -q "OK"; then
    echo -e "${GREEN}✓ API proxy is working${NC}"
    echo "   Response: $PROXY_RESPONSE"
else
    echo -e "${RED}✗ API proxy failed${NC}"
    echo "   Response: $PROXY_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Check frontend is serving
echo "Test 5: Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is serving (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}✗ Frontend returned HTTP $FRONTEND_STATUS${NC}"
    exit 1
fi
echo ""

# Test 6: Check protected endpoint (should fail without auth)
echo "Test 6: Testing protected endpoint (should require authentication)..."
AUTH_RESPONSE=$(curl -s http://localhost/api/auth/me)
if echo "$AUTH_RESPONSE" | grep -q "Not authenticated"; then
    echo -e "${GREEN}✓ Authentication protection is working${NC}"
    echo "   Response: $AUTH_RESPONSE"
else
    echo -e "${YELLOW}⚠ Unexpected response from protected endpoint${NC}"
    echo "   Response: $AUTH_RESPONSE"
fi
echo ""

# Test 7: Check MongoDB replica set
echo "Test 7: Checking MongoDB replica set..."
RS_STATUS=$(docker-compose exec -T mongo mongosh --quiet --eval "rs.status().ok" 2>/dev/null || echo "0")
if [ "$RS_STATUS" = "1" ]; then
    echo -e "${GREEN}✓ Replica set is initialized${NC}"
else
    echo -e "${YELLOW}⚠ Replica set may not be initialized${NC}"
    echo "   This is required for transactions to work"
fi
echo ""

# Test 8: Check environment variables
echo "Test 8: Checking critical environment variables..."
if docker-compose exec -T backend env | grep -q "GOOGLE_CLIENT_ID="; then
    CLIENT_ID=$(docker-compose exec -T backend env | grep "GOOGLE_CLIENT_ID=" | cut -d'=' -f2)
    if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "your-google-client-id-here" ]; then
        echo -e "${GREEN}✓ GOOGLE_CLIENT_ID is set${NC}"
    else
        echo -e "${YELLOW}⚠ GOOGLE_CLIENT_ID is not configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ GOOGLE_CLIENT_ID not found${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All basic tests passed!${NC}"
echo "=========================================="
echo ""
echo "Next steps for manual testing:"
echo "1. Open http://localhost in your browser"
echo "2. Try creating an account (signup)"
echo "3. Try logging in with email/password"
echo "4. Try logging in with Google OAuth"
echo "5. Verify you can access the dashboard"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"

