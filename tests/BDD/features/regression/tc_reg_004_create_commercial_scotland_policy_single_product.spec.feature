@regression @E2E @TC_REG_004
Feature: Create Commercial Scotland policy (single product)
  As an MLIS user
  I want to execute regression scenario TC_REG_004
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_004
    Given I execute regression test case "TC_REG_004" from original suite
    Then the regression test case "TC_REG_004" should complete successfully
