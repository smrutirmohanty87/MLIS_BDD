@regression @E2E @TC_REG_002
Feature: Create Commercial Northern Ireland policy (single product)
  As an MLIS user
  I want to execute regression scenario TC_REG_002
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_002
    Given I execute regression test case "TC_REG_002" from original suite
    Then the regression test case "TC_REG_002" should complete successfully
