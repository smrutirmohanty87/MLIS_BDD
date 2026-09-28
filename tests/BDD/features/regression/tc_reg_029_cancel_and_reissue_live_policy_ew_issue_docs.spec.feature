@regression @E2E @TC_REG_029
Feature: TC_REG_015_EW_DOCS | Cancel and reissue a live policy (England & Wales) with issue docs assertion
  As an MLIS user
  I want to execute regression scenario TC_REG_029
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_029
    Given I execute regression test case "TC_REG_029" from original suite
    Then the regression test case "TC_REG_029" should complete successfully
