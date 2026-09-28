@regression @E2E @TC_REG_041
Feature: Assert Debit Note premium before and after MTA from Source Submission
  As an MLIS user
  I want to execute regression scenario TC_REG_041
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_041
    Given I execute regression test case "TC_REG_041" from original suite
    Then the regression test case "TC_REG_041" should complete successfully
