@sanity @E2E @Salesforce @Residential @EnglandAndWales @TC_SAN_006
Feature: Complete Salesforce residential England and Wales quote journey
  Scenario: Complete full residential England and Wales quote journey end-to-end
    Given I complete residential quote journey with one product and return to submission for sanity 006
    Then residential quote journey should return to submission for sanity 006
