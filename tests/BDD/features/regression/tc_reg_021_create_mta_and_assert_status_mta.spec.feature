@regression @E2E @TC_REG_021
Feature: Create MTA (Mid-Term Adjustment) and assert policy status is MTA
  As an MLIS user
  I want to execute regression scenario TC_REG_021
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_021
    Given I execute regression test case "TC_REG_021" from original suite
    Then the regression test case "TC_REG_021" should complete successfully
