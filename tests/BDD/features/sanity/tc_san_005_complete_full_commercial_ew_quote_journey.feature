@sanity @E2E @Salesforce @Commercial @EnglandAndWales @TC_SAN_005
Feature: Complete Salesforce commercial England and Wales quote journey
  Scenario: Complete full commercial England and Wales quote journey end-to-end
    Given I complete commercial quote journey and return to submission
    Then commercial quote journey should return to submission for sanity 005
