#!/bin/bash

# Regression Tests Runner Script for CI/CD
# This script runs regression test suite

set -e  # Exit on error

echo "================================================"
echo "Regression Test Suite Runner"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
BROWSER=${1:-chrome}

# Function to run tests
run_tests() {
    local browser_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running Regression tests on $browser_name...${NC}"
    if npm run $test_command; then
        echo -e "${GREEN}✓ Regression tests on $browser_name passed${NC}"
        return 0
    else
        echo -e "${RED}✗ Regression tests on $browser_name failed${NC}"
        return 1
    fi
}

# Main execution
case $BROWSER in
    chrome)
        echo "Running Regression tests on Chrome..."
        run_tests "Chrome" "test:regression:chrome"
        ;;
    all)
        echo "Running Regression tests in locked mode (Chrome only)..."
        CHROME_RESULT=0
        
        run_tests "Chrome" "test:regression:chrome" || CHROME_RESULT=$?
        
        echo ""
        echo "================================================"
        echo "Regression Test Execution Summary:"
        echo "================================================"
        
        if [ $CHROME_RESULT -eq 0 ]; then
            echo -e "${GREEN}✓ Chrome: PASSED${NC}"
        else
            echo -e "${RED}✗ Chrome: FAILED${NC}"
        fi
        
        if [ $CHROME_RESULT -ne 0 ]; then
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid browser: $BROWSER${NC}"
        echo "Usage: $0 [chrome|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Regression Tests Completed Successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
