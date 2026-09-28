@sanity @UI @Navigation @TC_SAN_022
Feature: Verify broker portal home menu navigation
  Scenario: Each visible home menu link navigates to expected destination
    Given I open broker portal home page for menu validation
    Then each visible home menu item should navigate to expected URL
