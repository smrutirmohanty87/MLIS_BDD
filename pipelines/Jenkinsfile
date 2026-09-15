// =============================================================================
// MLIS Test Automation Framework — Jenkins Pipeline
//
// Prerequisites — configure in Jenkins Credentials Store:
//   UAT2_MLIS_PORTAL_URL         (Secret text)
//   UAT2_SALESFORCE_LIGHTNING_URL (Secret text)
//   UAT2_BROKER_USERNAME          (Secret text)
//   UAT2_BROKER_PASSWORD          (Secret text)
//   UAT2_SALESFORCE_USERNAME      (Secret text)
//   UAT2_SALESFORCE_PASSWORD      (Secret text)
//   SIT2_MLIS_PORTAL_URL          (Secret text)
//   SIT2_SALESFORCE_LIGHTNING_URL (Secret text)
//   SIT2_BROKER_USERNAME          (Secret text)
//   SIT2_BROKER_PASSWORD          (Secret text)
//   SIT2_SALESFORCE_USERNAME      (Secret text)
//   SIT2_SALESFORCE_PASSWORD      (Secret text)
//
// Use the NodeJS plugin and configure an installation named "NodeJS 18".
// =============================================================================

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 4, unit: 'HOURS')
        disableConcurrentBuilds()
    }

    environment {
        CI           = 'true'
        NODE_VERSION = '18'
    }

    parameters {
        choice(
            name: 'TEST_ENV',
            choices: ['UAT2', 'SIT2'],
            description: 'Target environment. UAT2 uses unprefixed credentials; SIT2 uses SIT2_* credentials.'
        )
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'sanity', 'regression', 'bdx'],
            description: 'Which test suite(s) to run.'
        )
        choice(
            name: 'BROWSER',
            choices: ['chrome', 'chromium', 'msedge'],
            description: 'Browser to run tests on.'
        )
    }

    stages {
        // -----------------------------------------------------------------
        // Setup
        // -----------------------------------------------------------------
        stage('Setup') {
            steps {
                script {
                    echo "======================================"
                    echo "  MLIS Test Automation — Jenkins"
                    echo "======================================"
                    echo "  Environment : ${params.TEST_ENV}"
                    echo "  Suite       : ${params.TEST_SUITE}"
                    echo "  Browser     : ${params.BROWSER}"
                    echo "======================================"
                }
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    sh 'node --version'
                    sh 'npm --version'
                }
            }
        }

        // -----------------------------------------------------------------
        // Install Dependencies
        // -----------------------------------------------------------------
        stage('Install Dependencies') {
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    sh 'npm ci'
                    sh "npx playwright install --with-deps ${params.BROWSER}"
                }
            }
        }

        // -----------------------------------------------------------------
        // Sanity Tests (12 tests)
        // -----------------------------------------------------------------
        stage('Sanity Tests') {
            when {
                expression { params.TEST_SUITE == 'sanity' || params.TEST_SUITE == 'all' }
            }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    withCredentials([
                        string(credentialsId: 'UAT2_MLIS_PORTAL_URL',          variable: 'UAT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'UAT2_SALESFORCE_LIGHTNING_URL',  variable: 'UAT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'UAT2_BROKER_USERNAME',           variable: 'UAT2_BROKER_USERNAME'),
                        string(credentialsId: 'UAT2_BROKER_PASSWORD',           variable: 'UAT2_BROKER_PASSWORD'),
                        string(credentialsId: 'UAT2_SALESFORCE_USERNAME',       variable: 'UAT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'UAT2_SALESFORCE_PASSWORD',       variable: 'UAT2_SALESFORCE_PASSWORD'),
                        string(credentialsId: 'SIT2_MLIS_PORTAL_URL',          variable: 'SIT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'SIT2_SALESFORCE_LIGHTNING_URL',  variable: 'SIT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'SIT2_BROKER_USERNAME',           variable: 'SIT2_BROKER_USERNAME'),
                        string(credentialsId: 'SIT2_BROKER_PASSWORD',           variable: 'SIT2_BROKER_PASSWORD'),
                        string(credentialsId: 'SIT2_SALESFORCE_USERNAME',       variable: 'SIT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'SIT2_SALESFORCE_PASSWORD',       variable: 'SIT2_SALESFORCE_PASSWORD')
                    ]) {
                        script {
                            // Map credential vars to the names envManager.ts expects
                            def envMap = resolveEnvVars(params.TEST_ENV)
                            withEnv(envMap) {
                                sh """
                                    set +e
                                    npx playwright test tests/sanity/ \\
                                        --project=${params.BROWSER} \\
                                        --workers=1 \\
                                        --reporter=list,html
                                    EXIT_CODE=\$?
                                    set -e
                                    exit \$EXIT_CODE
                                """
                            }
                        }
                    }
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                        reportDir: 'playwright-report', reportFiles: 'index.html',
                        reportName: "Sanity Report — ${params.TEST_ENV}"
                    ])
                    archiveArtifacts artifacts: 'test-results/**,reports/**', allowEmptyArchive: true
                }
            }
        }

        // -----------------------------------------------------------------
        // Regression Tests (19 tests — TC_REG_001 to TC_REG_019)
        // -----------------------------------------------------------------
        stage('Regression Tests') {
            when {
                expression { params.TEST_SUITE == 'regression' || params.TEST_SUITE == 'all' }
            }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    withCredentials([
                        string(credentialsId: 'UAT2_MLIS_PORTAL_URL',          variable: 'UAT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'UAT2_SALESFORCE_LIGHTNING_URL',  variable: 'UAT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'UAT2_BROKER_USERNAME',           variable: 'UAT2_BROKER_USERNAME'),
                        string(credentialsId: 'UAT2_BROKER_PASSWORD',           variable: 'UAT2_BROKER_PASSWORD'),
                        string(credentialsId: 'UAT2_SALESFORCE_USERNAME',       variable: 'UAT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'UAT2_SALESFORCE_PASSWORD',       variable: 'UAT2_SALESFORCE_PASSWORD'),
                        string(credentialsId: 'SIT2_MLIS_PORTAL_URL',          variable: 'SIT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'SIT2_SALESFORCE_LIGHTNING_URL',  variable: 'SIT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'SIT2_BROKER_USERNAME',           variable: 'SIT2_BROKER_USERNAME'),
                        string(credentialsId: 'SIT2_BROKER_PASSWORD',           variable: 'SIT2_BROKER_PASSWORD'),
                        string(credentialsId: 'SIT2_SALESFORCE_USERNAME',       variable: 'SIT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'SIT2_SALESFORCE_PASSWORD',       variable: 'SIT2_SALESFORCE_PASSWORD')
                    ]) {
                        script {
                            def envMap = resolveEnvVars(params.TEST_ENV)
                            withEnv(envMap) {
                                sh """
                                    set +e
                                    npx playwright test tests/regression/ \\
                                        --project=${params.BROWSER} \\
                                        --workers=1 \\
                                        --reporter=list,html
                                    EXIT_CODE=\$?
                                    set -e
                                    exit \$EXIT_CODE
                                """
                            }
                        }
                    }
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                        reportDir: 'playwright-report', reportFiles: 'index.html',
                        reportName: "Regression Report — ${params.TEST_ENV}"
                    ])
                    archiveArtifacts artifacts: 'test-results/**,reports/**', allowEmptyArchive: true
                }
            }
        }

        // -----------------------------------------------------------------
        // BDX Core Tests (TC_BDX_001–004)
        // -----------------------------------------------------------------
        stage('BDX Core Tests (001-004)') {
            when {
                expression { params.TEST_SUITE == 'bdx' || params.TEST_SUITE == 'all' }
            }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    withCredentials([
                        string(credentialsId: 'UAT2_MLIS_PORTAL_URL',          variable: 'UAT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'UAT2_SALESFORCE_LIGHTNING_URL',  variable: 'UAT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'UAT2_BROKER_USERNAME',           variable: 'UAT2_BROKER_USERNAME'),
                        string(credentialsId: 'UAT2_BROKER_PASSWORD',           variable: 'UAT2_BROKER_PASSWORD'),
                        string(credentialsId: 'UAT2_SALESFORCE_USERNAME',       variable: 'UAT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'UAT2_SALESFORCE_PASSWORD',       variable: 'UAT2_SALESFORCE_PASSWORD'),
                        string(credentialsId: 'SIT2_MLIS_PORTAL_URL',          variable: 'SIT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'SIT2_SALESFORCE_LIGHTNING_URL',  variable: 'SIT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'SIT2_BROKER_USERNAME',           variable: 'SIT2_BROKER_USERNAME'),
                        string(credentialsId: 'SIT2_BROKER_PASSWORD',           variable: 'SIT2_BROKER_PASSWORD'),
                        string(credentialsId: 'SIT2_SALESFORCE_USERNAME',       variable: 'SIT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'SIT2_SALESFORCE_PASSWORD',       variable: 'SIT2_SALESFORCE_PASSWORD')
                    ]) {
                        script {
                            def envMap = resolveEnvVars(params.TEST_ENV)
                            withEnv(envMap) {
                                sh """
                                    set +e
                                    npx playwright test \\
                                        tests/BDX/TC_BDX_001_INTRO_cancel_full_premium_return.spec.ts \\
                                        tests/BDX/TC_BDX_002_INTER_COMM_policy_bdx_lines.spec.ts \\
                                        tests/BDX/TC_BDX_003_BDE_COMM_policy_bdx_lines.spec.ts \\
                                        tests/BDX/TC_BDX_004_NO_COMM_policy_bdx_lines.spec.ts \\
                                        --project=${params.BROWSER} \\
                                        --workers=1 \\
                                        --reporter=list,html
                                    EXIT_CODE=\$?
                                    set -e
                                    exit \$EXIT_CODE
                                """
                            }
                        }
                    }
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                        reportDir: 'playwright-report', reportFiles: 'index.html',
                        reportName: "BDX Core Report (001-004) — ${params.TEST_ENV}"
                    ])
                    archiveArtifacts artifacts: 'test-results/**,reports/**', allowEmptyArchive: true
                }
            }
        }

        // -----------------------------------------------------------------
        // BDX Advanced Tests (TC_BDX_005–006)
        // -----------------------------------------------------------------
        stage('BDX Advanced Tests (005-006)') {
            when {
                expression { params.TEST_SUITE == 'bdx' || params.TEST_SUITE == 'all' }
            }
            steps {
                nodejs(nodeJSInstallationName: "NodeJS ${NODE_VERSION}") {
                    withCredentials([
                        string(credentialsId: 'UAT2_MLIS_PORTAL_URL',          variable: 'UAT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'UAT2_SALESFORCE_LIGHTNING_URL',  variable: 'UAT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'UAT2_BROKER_USERNAME',           variable: 'UAT2_BROKER_USERNAME'),
                        string(credentialsId: 'UAT2_BROKER_PASSWORD',           variable: 'UAT2_BROKER_PASSWORD'),
                        string(credentialsId: 'UAT2_SALESFORCE_USERNAME',       variable: 'UAT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'UAT2_SALESFORCE_PASSWORD',       variable: 'UAT2_SALESFORCE_PASSWORD'),
                        string(credentialsId: 'SIT2_MLIS_PORTAL_URL',          variable: 'SIT2_MLIS_PORTAL_URL'),
                        string(credentialsId: 'SIT2_SALESFORCE_LIGHTNING_URL',  variable: 'SIT2_SALESFORCE_LIGHTNING_URL'),
                        string(credentialsId: 'SIT2_BROKER_USERNAME',           variable: 'SIT2_BROKER_USERNAME'),
                        string(credentialsId: 'SIT2_BROKER_PASSWORD',           variable: 'SIT2_BROKER_PASSWORD'),
                        string(credentialsId: 'SIT2_SALESFORCE_USERNAME',       variable: 'SIT2_SALESFORCE_USERNAME'),
                        string(credentialsId: 'SIT2_SALESFORCE_PASSWORD',       variable: 'SIT2_SALESFORCE_PASSWORD')
                    ]) {
                        script {
                            def envMap = resolveEnvVars(params.TEST_ENV)
                            withEnv(envMap) {
                                sh """
                                    set +e
                                    npx playwright test \\
                                        tests/BDX/TC_BDX_005_NB_MTA_Cancellation_mid_term_adjustment.spec.ts \\
                                        tests/BDX/TC_BDX_006_BDE_new_cancel_and_reissue_then_cancel_policy.spec.ts \\
                                        --project=${params.BROWSER} \\
                                        --workers=1 \\
                                        --reporter=list,html
                                    EXIT_CODE=\$?
                                    set -e
                                    exit \$EXIT_CODE
                                """
                            }
                        }
                    }
                }
            }
            post {
                always {
                    publishHTML([
                        allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                        reportDir: 'playwright-report', reportFiles: 'index.html',
                        reportName: "BDX Advanced Report (005-006) — ${params.TEST_ENV}"
                    ])
                    archiveArtifacts artifacts: 'test-results/**,reports/**', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Pipeline finished. Archiving dashboard and cleaning up..."
            }
            publishHTML([
                allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true,
                reportDir: 'reports/dashboard', reportFiles: 'index.html',
                reportName: 'Test Dashboard'
            ])
            archiveArtifacts artifacts: 'playwright-report/**,test-results/**,reports/**', allowEmptyArchive: true
            cleanWs(
                deleteDirs: true,
                disableDeferredWipeout: true,
                notFailBuild: true,
                patterns: [
                    [pattern: 'node_modules', type: 'INCLUDE'],
                    [pattern: 'test-results',  type: 'INCLUDE']
                ]
            )
        }
        success {
            echo "All selected tests passed for ${params.TEST_ENV} on ${params.BROWSER}."
        }
        failure {
            echo "One or more tests failed. Check the HTML reports in the build artifacts."
        }
    }
}

// =============================================================================
// Helper: map Jenkins credential variables to the names envManager.ts expects
//
//   UAT2 -> unprefixed keys  (MLIS_PORTAL_URL, BROKER_USERNAME, etc.)
//   SIT2 -> SIT2_* prefixed keys (SIT2_MLIS_PORTAL_URL, etc.)
// =============================================================================
def resolveEnvVars(String envName) {
    if (envName == 'SIT2') {
        return [
            "TEST_ENV=SIT2",
            "SIT2_MLIS_PORTAL_URL=${SIT2_MLIS_PORTAL_URL}",
            "SIT2_SALESFORCE_LIGHTNING_URL=${SIT2_SALESFORCE_LIGHTNING_URL}",
            "SIT2_BROKER_USERNAME=${SIT2_BROKER_USERNAME}",
            "SIT2_BROKER_PASSWORD=${SIT2_BROKER_PASSWORD}",
            "SIT2_SALESFORCE_USERNAME=${SIT2_SALESFORCE_USERNAME}",
            "SIT2_SALESFORCE_PASSWORD=${SIT2_SALESFORCE_PASSWORD}"
        ]
    }
    // Default: UAT2 — map UAT2_* creds to unprefixed names
    return [
        "TEST_ENV=UAT2",
        "MLIS_PORTAL_URL=${UAT2_MLIS_PORTAL_URL}",
        "SALESFORCE_LIGHTNING_URL=${UAT2_SALESFORCE_LIGHTNING_URL}",
        "BROKER_USERNAME=${UAT2_BROKER_USERNAME}",
        "BROKER_PASSWORD=${UAT2_BROKER_PASSWORD}",
        "SALESFORCE_USERNAME=${UAT2_SALESFORCE_USERNAME}",
        "SALESFORCE_PASSWORD=${UAT2_SALESFORCE_PASSWORD}"
    ]
}
