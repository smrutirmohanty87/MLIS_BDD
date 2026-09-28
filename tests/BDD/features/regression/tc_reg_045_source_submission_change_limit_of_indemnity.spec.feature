@regression @E2E @TC_REG_045
Feature: Clear MTA flow on a live policy
  As an MLIS user
  I want to execute regression scenario TC_REG_045
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_045
    Given I execute regression test case "TC_REG_045" from original suite
    Then the regression test case "TC_REG_045" should complete successfully
