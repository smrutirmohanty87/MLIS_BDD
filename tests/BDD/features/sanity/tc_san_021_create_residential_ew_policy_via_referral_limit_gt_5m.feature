@sanity @E2E @Residential @Referral @TC_SAN_021
Feature: Create residential EW policy via referral when limit exceeds 5M
  Scenario: Referral submitted with valid DA quote number for high limit policy
    Given I start residential referral quote with limit above 5 million
    When I submit residential high limit referral to underwriter
    Then residential referral should be submitted with valid DA quote number
