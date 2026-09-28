@sanity @E2E @QuickQuote @Residential @Scotland @TC_SAN_011
Feature: Residential quick quote Scotland single product with manual address
  As a portal user
  I want to request quick quote email using manual Scottish address entry
  So that I can receive quote details for one product

  Scenario: Send Scotland quick quote for single product by email with manual address
    Given I start residential quick quote for Scotland
    When I complete quick quote step 1 with Scotland manual address details
    And I select one product and proceed to quick quote step 3
    And I email quick quote results
    Then quick quote email confirmation should be shown and closed
