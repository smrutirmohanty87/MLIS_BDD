@sanity @E2E @Salesforce @Commercial @CNR @TC_SAN_023
Feature: Complete commercial quote journey and perform CNR
  Scenario: CNR completes after returning to submission
    Given I complete commercial quote journey and return to submission for CNR
    When I perform CNR after return for commercial journey case
    Then commercial CNR after return should complete
