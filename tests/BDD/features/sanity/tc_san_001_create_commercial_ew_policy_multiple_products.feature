@sanity @E2E @Commercial @EnglandAndWales @TC_SAN_001
Feature: Create commercial England and Wales policy with multiple products
  As a broker user
  I want to create a commercial quote with multiple products
  So that I can issue a valid commercial policy

  Scenario: Create commercial England and Wales policy with four products
    Given I am logged into MLIS commercial quote manager
    When I start a new commercial England and Wales quote
    And I enter a unique case reference with limit of indemnity 500000
    And I select four commercial products and proceed
    And I confirm all statements of fact and proceed
    And I select the first available commercial quote
    And I enter required final policy details and proceed
    Then I should see the commercial summary with case and premium details
    When I place the commercial order using today's date
    Then the commercial policy is issued and I am returned to quote manager
