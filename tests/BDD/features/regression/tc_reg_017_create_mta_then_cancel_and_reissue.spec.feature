@regression @E2E @TC_REG_017
Feature: Create MTA (Mid-Term Adjustment) then cancel and reissue the policy
  As an MLIS user
  I want to execute regression scenario TC_REG_017
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_017
    Given I execute regression test case "TC_REG_017" from original suite
    Then the regression test case "TC_REG_017" should complete successfully
