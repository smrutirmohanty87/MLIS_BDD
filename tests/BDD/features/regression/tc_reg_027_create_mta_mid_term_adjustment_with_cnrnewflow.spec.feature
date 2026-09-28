@regression @E2E @TC_REG_027
Feature: Create MTA then start cancel and reissue with return-and-bind at final policy details
  As an MLIS user
  I want to execute regression scenario TC_REG_027
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_027
    Given I execute regression test case "TC_REG_027" from original suite
    Then the regression test case "TC_REG_027" should complete successfully
