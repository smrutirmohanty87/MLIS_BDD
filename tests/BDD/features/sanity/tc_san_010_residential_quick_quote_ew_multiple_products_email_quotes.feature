@sanity @E2E @QuickQuote @Residential @EnglandAndWales @TC_SAN_010
Feature: Residential quick quote England and Wales multiple products
  As a portal user
  I want to request quick quote email for multiple products
  So that I can receive quote details for all selected products

  Scenario: Send England and Wales quick quote for multiple products by email
    Given I start residential quick quote for England and Wales
    When I complete quick quote step 1 with England and Wales details
    And I select four products and proceed to quick quote step 3
    And I email quick quote results
    Then quick quote email confirmation should be shown and closed
