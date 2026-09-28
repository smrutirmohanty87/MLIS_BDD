@regression @E2E @TC_REG_051
Feature: TC_REG_051_nb_mta_negative_premium_bind_validation_ni_commercial.spec
  As an MLIS user
  I want to execute regression scenario TC_REG_051
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_051
    Given I execute regression test case "TC_REG_051" from original suite
    Then the regression test case "TC_REG_051" should complete successfully
