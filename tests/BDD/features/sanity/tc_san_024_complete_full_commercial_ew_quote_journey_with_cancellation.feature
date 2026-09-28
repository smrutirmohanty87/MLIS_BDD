@sanity @E2E @Salesforce @Commercial @Cancellation @TC_SAN_024
Feature: Complete commercial quote journey and perform cancellation
  Scenario: Cancellation completes after returning to submission
    Given I complete commercial quote journey and return to submission for cancellation
    When I perform cancellation after return for commercial journey case
    Then commercial cancellation after return should complete
