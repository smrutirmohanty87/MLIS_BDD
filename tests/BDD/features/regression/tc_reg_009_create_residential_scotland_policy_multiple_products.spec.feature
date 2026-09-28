@regression @E2E @TC_REG_009
Feature: Create Residential Scotland policy (multiple products)
  As an MLIS user
  I want to execute regression scenario TC_REG_009
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_009
    Given I execute regression test case "TC_REG_009" from original suite
    Then the regression test case "TC_REG_009" should complete successfully
