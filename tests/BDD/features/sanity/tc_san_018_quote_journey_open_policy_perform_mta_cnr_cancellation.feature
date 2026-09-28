@sanity @E2E @Salesforce @Commercial @TC_SAN_018
Feature: Commercial quote journey then perform MTA CNR and cancellation
  Scenario: Open policy after quote journey and perform lifecycle actions
    Given I complete commercial quote journey and return to submission
    When I perform MTA after return for commercial quote journey
    And I perform CNR after return for commercial quote journey
    And I perform cancellation after return for commercial quote journey
    Then commercial lifecycle actions should complete from quote journey context
