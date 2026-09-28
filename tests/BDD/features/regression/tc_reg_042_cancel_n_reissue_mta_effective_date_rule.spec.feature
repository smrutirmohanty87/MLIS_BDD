@regression @E2E @TC_REG_042
Feature: Cancel and reissue date today then MTA effective date cannot be yesterday
  As an MLIS user
  I want to execute regression scenario TC_REG_042
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_042
    Given I execute regression test case "TC_REG_042" from original suite
    Then the regression test case "TC_REG_042" should complete successfully
