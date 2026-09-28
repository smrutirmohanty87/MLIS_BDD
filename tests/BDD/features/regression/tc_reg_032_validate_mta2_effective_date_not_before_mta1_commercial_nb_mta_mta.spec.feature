@regression @E2E @TC_REG_032
Feature: Validate MTA2 effective date not before MTA1 | Commercial NB>MTA>MTA
  As an MLIS user
  I want to execute regression scenario TC_REG_032
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_032
    Given I execute regression test case "TC_REG_032" from original suite
    Then the regression test case "TC_REG_032" should complete successfully
