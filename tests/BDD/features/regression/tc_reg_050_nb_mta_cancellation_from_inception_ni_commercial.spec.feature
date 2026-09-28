@regression @E2E @TC_REG_050
Feature: TC_REG_050_nb_mta_cancellation_from_inception_ni_commercial.spec
  As an MLIS user
  I want to execute regression scenario TC_REG_050
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_050
    Given I execute regression test case "TC_REG_050" from original suite
    Then the regression test case "TC_REG_050" should complete successfully
