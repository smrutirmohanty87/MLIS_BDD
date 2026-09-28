@regression @E2E @TC_REG_037
Feature: Commercial CnR then assert Policy Settlement Type is Over Settled on Details tab
  As an MLIS user
  I want to execute regression scenario TC_REG_037
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_037
    Given I execute regression test case "TC_REG_037" from original suite
    Then the regression test case "TC_REG_037" should complete successfully
