@regression @E2E @TC_REG_007
Feature: Create Residential Northern Ireland policy (multiple products)
  As an MLIS user
  I want to execute regression scenario TC_REG_007
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_007
    Given I execute regression test case "TC_REG_007" from original suite
    Then the regression test case "TC_REG_007" should complete successfully
