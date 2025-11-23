#!/bin/bash
set -e

# PayBot E2E Test Suite
# Runs full end-to-end tests with Docker Compose

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Cleanup function
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    docker-compose down -v 2>/dev/null || true
    exit ${1:-0}
}

# Trap errors and interrupts
trap 'cleanup 1' ERR INT TERM

# Print step
step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Print success
success() {
    echo -e "${GREEN}✓${NC} $1"
    ((++TESTS_PASSED))
}

# Print error
error() {
    echo -e "${RED}✗${NC} $1"
    ((++TESTS_FAILED))
}

# Wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=60
    local attempt=0

    step "Waiting for $service to be healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            success "$service is healthy"
            return 0
        fi
        sleep 2
        ((attempt++))
    done

    error "$service failed to become healthy"
    return 1
}

# Test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_code=${2:-200}
    local description=$3

    step "Testing: $description"

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ]; then
        success "GET $url returned $response"
    else
        error "GET $url returned $response (expected $expected_code)"
    fi
}

# Test facilitator health
test_facilitator_health() {
    step "Testing facilitator health endpoint"

    response=$(curl -s http://localhost:8403/health 2>/dev/null || echo "error")

    if echo "$response" | grep -q "ok"; then
        success "Facilitator health check passed"
    else
        error "Facilitator health check failed: $response"
    fi
}

# Test resource server health
test_resource_health() {
    step "Testing resource server health endpoint"

    response=$(curl -s http://localhost:8404/health 2>/dev/null || echo "error")

    if echo "$response" | grep -q "ok"; then
        success "Resource server health check passed"
    else
        error "Resource server health check failed: $response"
    fi
}

# Test blockchain RPC
test_blockchain_rpc() {
    step "Testing blockchain RPC endpoint"

    response=$(curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        2>/dev/null || echo "error")

    if echo "$response" | grep -q "result"; then
        success "Blockchain RPC responding"
    else
        error "Blockchain RPC not responding: $response"
    fi
}

# Test contract deployment
test_contracts() {
    step "Testing smart contracts compilation and tests"

    cd packages/contracts

    if bun run test 2>&1 | grep -q "passing"; then
        success "Contract tests passed"
    else
        error "Contract tests failed"
    fi

    cd ../..
}

# Main test execution
main() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   PayBot E2E Test Suite (Headless)    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

    # Check prerequisites
    step "Checking prerequisites"

    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose not found"
        exit 1
    fi
    success "docker-compose found"

    if ! command -v bun &> /dev/null; then
        error "bun not found"
        exit 1
    fi
    success "bun found"

    if ! command -v curl &> /dev/null; then
        error "curl not found"
        exit 1
    fi
    success "curl found"

    # Ensure clean state
    step "Ensuring clean state"
    docker-compose down -v 2>/dev/null || true
    success "Cleaned up previous containers"

    # Start services
    step "Starting Docker Compose services"
    docker-compose up -d --build
    success "Docker Compose started"

    # Wait for services
    wait_for_service "hardhat-node"
    wait_for_service "x402-facilitator"
    wait_for_service "resource-server"

    # Give web service time to start (no health check)
    step "Waiting for web service to start"
    sleep 10
    success "Web service should be ready"

    # Run tests
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}         Running E2E Tests              ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"

    # Test blockchain
    test_blockchain_rpc

    # Test backend services
    test_facilitator_health
    test_resource_health

    # Test endpoints
    test_endpoint "http://localhost:8545" 200 "Hardhat node HTTP"
    test_endpoint "http://localhost:8403/health" 200 "Facilitator health"
    test_endpoint "http://localhost:8404/health" 200 "Resource server health"
    test_endpoint "http://localhost:5173" 200 "Web application"

    # Test smart contracts
    test_contracts

    # Display results
    echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}           Test Results                 ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"

    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"

    # Show service status
    echo -e "\n${BLUE}Service Status:${NC}"
    docker-compose ps

    # Cleanup
    if [ "$1" != "--no-cleanup" ]; then
        cleanup 0
    else
        echo -e "\n${YELLOW}Skipping cleanup (--no-cleanup flag)${NC}"
        echo -e "Services are still running. Use 'docker-compose down' to stop them."
    fi

    # Exit with appropriate code
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "\n${RED}E2E tests failed!${NC}"
        exit 1
    else
        echo -e "\n${GREEN}All E2E tests passed!${NC}"
        exit 0
    fi
}

# Run main
main "$@"
