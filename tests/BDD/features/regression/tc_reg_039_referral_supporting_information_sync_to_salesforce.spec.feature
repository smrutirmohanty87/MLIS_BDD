@regression @E2E @TC_REG_039
Feature: Assert Referral Supporting Information matches Broker Portal referral text
  As an MLIS user
  I want to execute regression scenario TC_REG_039
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_039
    Given I execute regression test case "TC_REG_039" from original suite
    Then the regression test case "TC_REG_039" should complete successfully
