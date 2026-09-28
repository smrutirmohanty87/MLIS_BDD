@regression @E2E @TC_REG_013
Feature: Open Notes & Attachments in Salesforce (Commercial Scotland policy)
  As an MLIS user
  I want to execute regression scenario TC_REG_013
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_013
    Given I execute regression test case "TC_REG_013" from original suite
    Then the regression test case "TC_REG_013" should complete successfully
