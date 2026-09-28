@regression @E2E @TC_REG_023
Feature: Create  MTAs CNR and MTA assert premiums on Quotes tab
  As an MLIS user
  I want to execute regression scenario TC_REG_023
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_023
    Given I execute regression test case "TC_REG_023" from original suite
    Then the regression test case "TC_REG_023" should complete successfully
