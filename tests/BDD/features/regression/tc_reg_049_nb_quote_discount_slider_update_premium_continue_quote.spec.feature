@regression @E2E @TC_REG_049
Feature: Save and exit quote, then update discount on Salesforce Quotes tab and continue quote
  As an MLIS user
  I want to execute regression scenario TC_REG_049
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_049
    Given I execute regression test case "TC_REG_049" from original suite
    Then the regression test case "TC_REG_049" should complete successfully
