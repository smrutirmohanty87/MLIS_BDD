@regression @E2E @TC_REG_030
Feature: Create 2 MTA and assert premiums from Source Submission Quotes tab
  As an MLIS user
  I want to execute regression scenario TC_REG_030
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_030
    Given I execute regression test case "TC_REG_030" from original suite
    Then the regression test case "TC_REG_030" should complete successfully
