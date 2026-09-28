@sanity @E2E @Commercial @EnglandAndWales @TC_SAN_004 @referral
Feature: Create commercial England and Wales policy with a single product via referral
  As a broker user
  I want to refer a single-product commercial quote
  So that it is submitted to underwriter successfully

  Scenario: Create commercial England and Wales single-product policy via referral
    Given I am logged into MLIS commercial quote manager
    When I start a new commercial England and Wales quote
    And I enter a unique case reference with limit of indemnity 500000
    And I select one commercial product and proceed
    And I proceed with referral from statements of fact
    And I fill required referral details
    And I submit the referral to underwriter
    Then I should see commercial referral submitted confirmation
    And I should return to quote manager from referral submitted page
