@regression @E2E @TC_REG_043
Feature: Create MTA then Cancel and Reissue then Create MTA
  As an MLIS user
  I want to execute regression scenario TC_REG_043
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_043
    Given I execute regression test case "TC_REG_043" from original suite
    Then the regression test case "TC_REG_043" should complete successfully
