@regression @E2E @TC_REG_052
Feature: Continue to summary, save and exit, search ref on home and in Salesforce global search, add terms and save
  As an MLIS user
  I want to execute regression scenario TC_REG_052
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_052
    Given I execute regression test case "TC_REG_052" from original suite
    Then the regression test case "TC_REG_052" should complete successfully
