@regression @E2E @TC_REG_057
Feature: NB Clauses are correctly generated .
  As an MLIS user
  I want to execute regression scenario TC_REG_057
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_057
    Given I execute regression test case "TC_REG_057" from original suite
    Then the regression test case "TC_REG_057" should complete successfully
