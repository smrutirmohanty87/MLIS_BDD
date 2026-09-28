@sanity @E2E @Commercial @EnglandAndWales @TC_SAN_002 @referral
Feature: Create commercial England and Wales policy with multiple products via referral
  As a broker user
  I want to refer a commercial quote to underwriter
  So that a valid referred policy can be issued

  Scenario: Create commercial England and Wales policy via referral with four products
    Given I am logged into MLIS commercial quote manager
    When I start a new commercial England and Wales quote
    And I enter a unique case reference with limit of indemnity 500000
    And I select four commercial products and proceed
    And I proceed with referral from statements of fact
    And I fill required referral details
    And I submit the referral to underwriter
    Then I should see a referred commercial policy issued
    And I should return to commercial quote manager
