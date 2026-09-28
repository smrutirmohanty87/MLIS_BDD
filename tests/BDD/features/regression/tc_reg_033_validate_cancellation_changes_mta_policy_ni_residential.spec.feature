@regression @E2E @TC_REG_033
Feature: DT-MLIS-DF25.5.0 | F-92746 | U-231622 | Verify user able to validate the cancellations changes on MTA Policy_NI Residential_Cancel the policy Midterm_NB->MTA->MTA->Cancellation
  As an MLIS user
  I want to execute regression scenario TC_REG_033
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_033
    Given I execute regression test case "TC_REG_033" from original suite
    Then the regression test case "TC_REG_033" should complete successfully
