@sanity @E2E @Residential @Salesforce @TC_SAN_013
Feature: Verify DUAL Share GWP consistency on insurance policy details
  Scenario: DUAL Share GWP values are consistent across details view
    Given I create a fresh EW residential policy for dual share verification
    And I open the created policy insurance details in Salesforce
    Then all visible DUAL Share GWP values should be consistent
