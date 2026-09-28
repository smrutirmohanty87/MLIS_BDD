@regression @E2E @TC_REG_003
Feature: Create Commercial Scotland policy (multiple products)
  As an MLIS user
  I want to execute regression scenario TC_REG_003
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_003
    Given I execute regression test case "TC_REG_003" from original suite
    Then the regression test case "TC_REG_003" should complete successfully
