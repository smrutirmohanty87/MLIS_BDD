@regression @E2E @TC_REG_044
Feature: TC_REG_044_nb_cnr_mta_cancellation_midterm_ni_commercial.spec
  As an MLIS user
  I want to execute regression scenario TC_REG_044
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_044
    Given I execute regression test case "TC_REG_044" from original suite
    Then the regression test case "TC_REG_044" should complete successfully
