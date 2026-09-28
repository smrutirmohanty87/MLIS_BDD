@regression @E2E @TC_REG_022
Feature: Create 2 MTAs and assert premiums on Quotes tab
  As an MLIS user
  I want to execute regression scenario TC_REG_022
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_022
    Given I execute regression test case "TC_REG_022" from original suite
    Then the regression test case "TC_REG_022" should complete successfully
