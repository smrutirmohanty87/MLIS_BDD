@regression @E2E @TC_REG_060
Feature: DT-MLIS-DF29.0.0 | F-232588 | CR-232467 | Validate CR0055 Deductible or Excess Basis after NB-CNR-MTA-MTA-Cancellation
  As an MLIS user
  I want to execute regression scenario TC_REG_060
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_060
    Given I execute regression test case "TC_REG_060" from original suite
    Then the regression test case "TC_REG_060" should complete successfully
