@regression @E2E @TC_REG_038
Feature: Create MTA then Change Stage to Declined and assert stage
  As an MLIS user
  I want to execute regression scenario TC_REG_038
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_038
    Given I execute regression test case "TC_REG_038" from original suite
    Then the regression test case "TC_REG_038" should complete successfully
