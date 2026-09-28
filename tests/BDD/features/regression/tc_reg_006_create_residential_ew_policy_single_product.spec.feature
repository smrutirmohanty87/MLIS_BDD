@regression @E2E @TC_REG_006
Feature: Create Residential England & Wales policy (single product)
  As an MLIS user
  I want to execute regression scenario TC_REG_006
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_006
    Given I execute regression test case "TC_REG_006" from original suite
    Then the regression test case "TC_REG_006" should complete successfully
