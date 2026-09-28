@regression @E2E @TC_REG_005
Feature: Create Residential England & Wales policy (multiple products)
  As an MLIS user
  I want to execute regression scenario TC_REG_005
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_005
    Given I execute regression test case "TC_REG_005" from original suite
    Then the regression test case "TC_REG_005" should complete successfully
