@sanity @UI @Registration @TC_SAN_014
Feature: Verify user registration sign up flow
  Scenario: Broker user completes registration from sign up page
    Given I open broker portal registration page from home
    When I submit registration details with valid mandatory information
    Then broker registration should complete successfully
