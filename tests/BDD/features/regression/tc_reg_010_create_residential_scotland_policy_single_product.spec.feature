@regression @E2E @TC_REG_010
Feature: Create Residential Scotland policy (single product)
  As an MLIS user
  I want to execute regression scenario TC_REG_010
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_010
    Given I execute regression test case "TC_REG_010" from original suite
    Then the regression test case "TC_REG_010" should complete successfully
