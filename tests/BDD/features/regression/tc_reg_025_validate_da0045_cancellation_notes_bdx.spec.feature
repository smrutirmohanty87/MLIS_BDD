@regression @E2E @TC_REG_025
Feature: Validate DA0045 Cancellation Notes field in BDX cancellation line
  As an MLIS user
  I want to execute regression scenario TC_REG_025
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_025
    Given I execute regression test case "TC_REG_025" from original suite
    Then the regression test case "TC_REG_025" should complete successfully
