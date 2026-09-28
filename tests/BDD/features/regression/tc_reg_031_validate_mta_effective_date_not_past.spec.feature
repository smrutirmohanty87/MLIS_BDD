@regression @E2E @TC_REG_031
Feature: DT-MLIS-DF25.5.0 | F-92746 | U-135531 | Validate MTA effective date cannot be prior to NB commencement date
  As an MLIS user
  I want to execute regression scenario TC_REG_031
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_031
    Given I execute regression test case "TC_REG_031" from original suite
    Then the regression test case "TC_REG_031" should complete successfully
