@regression @E2E @TC_REG_028
Feature: TC_REG_015_SCOT_DOCS | Cancel and reissue a live policy (Scotland) with issue docs assertion
  As an MLIS user
  I want to execute regression scenario TC_REG_028
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_028
    Given I execute regression test case "TC_REG_028" from original suite
    Then the regression test case "TC_REG_028" should complete successfully
