@sanity @UI @Footer @TC_SAN_019
Feature: Verify broker portal footer links
  Scenario: Terms privacy and cookies links navigate correctly
    Given I open broker portal home page for footer validation
    Then footer terms privacy and cookies links should open expected destinations
