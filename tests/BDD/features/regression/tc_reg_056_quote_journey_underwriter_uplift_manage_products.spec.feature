@regression @E2E @TC_REG_056
Feature: Complete quote journey, manage products, and verify quote uplift values on Quotes tab
  As an MLIS user
  I want to execute regression scenario TC_REG_056
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_056
    Given I execute regression test case "TC_REG_056" from original suite
    Then the regression test case "TC_REG_056" should complete successfully
