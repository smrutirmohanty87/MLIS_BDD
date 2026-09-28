@regression @E2E @TC_REG_059
Feature: NB-CNR-Can | Validate CR0299 field for paid and written BDX lines
  As an MLIS user
  I want to execute regression scenario TC_REG_059
  So that the expected regression behavior is validated

  Scenario: Execute legacy regression test for TC_REG_059
    Given I execute regression test case "TC_REG_059" from original suite
    Then the regression test case "TC_REG_059" should complete successfully
