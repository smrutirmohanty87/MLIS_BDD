@regression @E2E @TC_REG_054
Feature: Complete quote journey and verify quote uplift values on Quotes tab
  As an MLIS user
  I want to execute regression scenario TC_REG_054
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_054
    Given I execute regression test case "TC_REG_054" from original suite
    Then the regression test case "TC_REG_054" should complete successfully
