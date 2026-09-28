@regression @E2E @TC_REG_026
Feature: Verify DUAL Share GWP and BDX values through full cancellation flow
  As an MLIS user
  I want to execute regression scenario TC_REG_026
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_026
    Given I execute regression test case "TC_REG_026" from original suite
    Then the regression test case "TC_REG_026" should complete successfully
