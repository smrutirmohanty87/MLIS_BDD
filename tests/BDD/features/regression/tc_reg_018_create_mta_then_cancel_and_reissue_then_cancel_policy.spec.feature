@regression @E2E @TC_REG_018
Feature: Create MTA then cancel and reissue then cancel the policy
  As an MLIS user
  I want to execute regression scenario TC_REG_018
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_018
    Given I execute regression test case "TC_REG_018" from original suite
    Then the regression test case "TC_REG_018" should complete successfully
