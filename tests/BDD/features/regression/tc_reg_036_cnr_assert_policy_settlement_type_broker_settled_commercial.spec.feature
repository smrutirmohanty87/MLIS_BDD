@regression @E2E @TC_REG_036
Feature: Commercial CnR then assert Policy Settlement Type is Broker Settled on Details tab (Commercial)
  As an MLIS user
  I want to execute regression scenario TC_REG_036
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_036
    Given I execute regression test case "TC_REG_036" from original suite
    Then the regression test case "TC_REG_036" should complete successfully
