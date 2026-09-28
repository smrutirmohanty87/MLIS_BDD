@sanity @E2E @QuickQuote @Residential @Scotland @TC_SAN_012
Feature: Residential quick quote Scotland multiple products with manual address
  As a portal user
  I want to request quick quote email using manual Scottish address entry
  So that I can receive quote details for multiple products

  Scenario: Send Scotland quick quote for multiple products by email with manual address
    Given I start residential quick quote for Scotland
    When I complete quick quote step 1 with Scotland manual address details
    And I select four products and proceed to quick quote step 3
    And I email quick quote results
    Then quick quote email confirmation should be shown and closed
