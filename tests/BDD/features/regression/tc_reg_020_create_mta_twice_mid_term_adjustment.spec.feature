@regression @E2E @TC_REG_020
Feature: Create MTA twice (NB â†’ MTA â†’ MTA)
  As an MLIS user
  I want to execute regression scenario TC_REG_020
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_020
    Given I execute regression test case "TC_REG_020" from original suite
    Then the regression test case "TC_REG_020" should complete successfully
