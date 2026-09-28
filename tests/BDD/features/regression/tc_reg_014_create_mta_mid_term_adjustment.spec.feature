@regression @E2E @TC_REG_014
Feature: Create MTA (Mid-Term Adjustment) on a live policy
  As an MLIS user
  I want to execute regression scenario TC_REG_014
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_014
    Given I execute regression test case "TC_REG_014" from original suite
    Then the regression test case "TC_REG_014" should complete successfully
