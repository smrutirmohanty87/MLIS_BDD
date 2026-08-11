# Regression Tests Runner Script for CI/CD (PowerShell)
# This script runs regression test suite

param(
    [ValidateSet('chrome', 'all')]
    [string]$Browser = 'chrome'
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Regression Test Suite Runner" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Run-Tests {
    param(
        [string]$BrowserName,
        [string]$TestCommand
    )
    
    Write-Host "Running Regression tests on $BrowserName..." -ForegroundColor Yellow
    
    try {
        npm run $TestCommand
        Write-Host "✓ Regression tests on $BrowserName passed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "✗ Regression tests on $BrowserName failed" -ForegroundColor Red
        return $false
    }
}

# Main execution
$chromeResult = $true

switch ($Browser) {
    'chrome' {
        Write-Host "Running Regression tests on Chrome..." -ForegroundColor Cyan
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:regression:chrome"
        if (-not $chromeResult) { exit 1 }
    }
    'all' {
        Write-Host "Running Regression tests in locked mode (Chrome only)..." -ForegroundColor Cyan
        $chromeResult = Run-Tests -BrowserName "Chrome" -TestCommand "test:regression:chrome"
        
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host "Regression Test Execution Summary:" -ForegroundColor Cyan
        Write-Host "================================================" -ForegroundColor Cyan
        
        if ($chromeResult) {
            Write-Host "✓ Chrome: PASSED" -ForegroundColor Green
        } else {
            Write-Host "✗ Chrome: FAILED" -ForegroundColor Red
        }
        
        if (-not $chromeResult) {
            exit 1
        }
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Regression Tests Completed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
