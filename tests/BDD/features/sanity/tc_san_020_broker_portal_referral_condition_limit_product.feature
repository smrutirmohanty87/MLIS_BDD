@sanity @E2E @ConditionalReferral @TC_SAN_020
Feature: Trigger referral with high limit and contaminated land product
  Scenario: Referral path triggers for configured limit and product condition
    Given I start commercial quote with high limit and contaminated land condition
    When I submit the conditional referral to underwriter
    Then conditional referral policy should be issued and return to quote manager
