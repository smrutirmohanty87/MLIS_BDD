@sanity @E2E @QuickQuote @Residential @EnglandAndWales @TC_SAN_009
Feature: Residential quick quote England and Wales single product
  As a portal user
  I want to request quick quote email for one product
  So that I can receive quote details and continue from step 3

  Scenario: Send England and Wales quick quote for single product by email
    Given I start residential quick quote for England and Wales
    When I complete quick quote step 1 with England and Wales details
    And I select one product and proceed to quick quote step 3
    And I email quick quote results
    Then quick quote email confirmation should be shown and closed
