@regression @E2E @TC_REG_019
Feature: Create new policy then cancel and reissue then cancel the policy
  As an MLIS user
  I want to execute regression scenario TC_REG_019
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_019
    Given I execute regression test case "TC_REG_019" from original suite
    Then the regression test case "TC_REG_019" should complete successfully
