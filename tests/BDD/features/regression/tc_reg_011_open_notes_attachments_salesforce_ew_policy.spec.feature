@regression @E2E @TC_REG_011
Feature: Open Notes & Attachments in Salesforce (England & Wales policy)
  As an MLIS user
  I want to execute regression scenario TC_REG_011
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_011
    Given I execute regression test case "TC_REG_011" from original suite
    Then the regression test case "TC_REG_011" should complete successfully
