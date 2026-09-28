@regression @E2E @TC_REG_035
Feature: Residential CnR then assert Policy Settlement Type is Broker Settled on Details tab
  As an MLIS user
  I want to execute regression scenario TC_REG_035
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_035
    Given I execute regression test case "TC_REG_035" from original suite
    Then the regression test case "TC_REG_035" should complete successfully
