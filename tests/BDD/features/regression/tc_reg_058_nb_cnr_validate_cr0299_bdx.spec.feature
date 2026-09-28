@regression @E2E @TC_REG_058
Feature: NB-CNR-Can | Validate CR0299 field in BDX line
  As an MLIS user
  I want to execute regression scenario TC_REG_058
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_058
    Given I execute regression test case "TC_REG_058" from original suite
    Then the regression test case "TC_REG_058" should complete successfully
