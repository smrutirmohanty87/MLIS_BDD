@regression @E2E @TC_REG_046
Feature: Create MTA without bind, assert Insurance Policies (0) and Quotes (1), open Quote
  As an MLIS user
  I want to execute regression scenario TC_REG_046
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_046
    Given I execute regression test case "TC_REG_046" from original suite
    Then the regression test case "TC_REG_046" should complete successfully
