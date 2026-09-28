@regression @E2E @TC_REG_055
Feature: NB-CNR-MTA-Cancellation | Lease - Defective Lease buildings insurance | assert CR0054 and CR0055 Any one risk
  As an MLIS user
  I want to execute regression scenario TC_REG_055
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_055
    Given I execute regression test case "TC_REG_055" from original suite
    Then the regression test case "TC_REG_055" should complete successfully
