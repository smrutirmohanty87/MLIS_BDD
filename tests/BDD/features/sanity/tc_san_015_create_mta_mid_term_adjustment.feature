@sanity @E2E @MTA @TC_SAN_015
Feature: Create MTA on a live policy
  Scenario: Create and bind MTA from Salesforce policy record
    Given I create a fresh live residential policy for MTA
    When I create and bind MTA for the policy in Salesforce
    Then MTA should be bound with a valid risk identifier
