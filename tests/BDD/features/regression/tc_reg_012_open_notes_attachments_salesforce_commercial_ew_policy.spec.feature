@regression @E2E @TC_REG_012
Feature: Open Notes & Attachments in Salesforce (Commercial EW policy)
  As an MLIS user
  I want to execute regression scenario TC_REG_012
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_012
    Given I execute regression test case "TC_REG_012" from original suite
    Then the regression test case "TC_REG_012" should complete successfully
