@sanity @E2E @Commercial @NorthernIreland @TC_SAN_017
Feature: Create NI commercial policy with 255 character manual address
  Scenario: Long address policy creation succeeds for NI commercial quote
    Given I log in and start NI commercial quote for long address validation
    When I complete NI commercial flow with long manual address
    Then NI commercial policy should be issued and quote manager displayed
