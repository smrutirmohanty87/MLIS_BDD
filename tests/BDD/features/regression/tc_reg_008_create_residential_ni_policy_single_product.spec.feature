@regression @E2E @TC_REG_008
Feature: Create Residential Northern Ireland policy (single product)
  As an MLIS user
  I want to execute regression scenario TC_REG_008
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_008
    Given I execute regression test case "TC_REG_008" from original suite
    Then the regression test case "TC_REG_008" should complete successfully
