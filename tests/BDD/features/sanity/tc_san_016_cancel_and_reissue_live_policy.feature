@sanity @E2E @Cancellation @CNR @TC_SAN_016
Feature: Cancel and reissue a live policy
  Scenario: Cancel and reissue flow completes from Salesforce
    Given I create a fresh live residential policy for cancel and reissue
    When I perform cancel and reissue for the policy in Salesforce
    Then cancel and reissue should complete with policy issued view
