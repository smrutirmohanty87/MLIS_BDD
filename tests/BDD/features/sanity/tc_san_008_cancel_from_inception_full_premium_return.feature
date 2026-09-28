@sanity @E2E @Cancellation @TC_SAN_008
Feature: Cancel policy from inception with full premium return
  As an operations user
  I want to cancel a live policy from inception in Salesforce
  So that status is updated to Cancelled

  Scenario: Cancel policy from inception after creating a fresh live policy
    Given I create a fresh residential policy from broker portal for cancellation
    And I verify the created policy is live in broker portal
    When I open the policy in Salesforce insurance policy related record
    And I complete cancel from inception with full premium return
    Then the policy should be cancelled in Salesforce
