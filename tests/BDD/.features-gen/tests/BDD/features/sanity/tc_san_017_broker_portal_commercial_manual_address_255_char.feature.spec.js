// Generated from: tests\BDD\features\sanity\tc_san_017_broker_portal_commercial_manual_address_255_char.feature
import { test } from "playwright-bdd";

test.describe('Create NI commercial policy with 255 character manual address', () => {

  test('Long address policy creation succeeds for NI commercial quote', { tag: ['@sanity', '@E2E', '@Commercial', '@NorthernIreland', '@TC_SAN_017'] }, async ({ Given, When, Then, page }) => { 
    await Given('I log in and start NI commercial quote for long address validation', null, { page }); 
    await When('I complete NI commercial flow with long manual address', null, { page }); 
    await Then('NI commercial policy should be issued and quote manager displayed', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_017_broker_portal_commercial_manual_address_255_char.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Commercial","@NorthernIreland","@TC_SAN_017"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I log in and start NI commercial quote for long address validation","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I complete NI commercial flow with long manual address","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then NI commercial policy should be issued and quote manager displayed","stepMatchArguments":[]}]},
]; // bdd-data-end