// Generated from: tests\BDD\features\sanity\tc_san_006_complete_full_residential_ew_quote_journey.feature
import { test } from "playwright-bdd";

test.describe('Complete Salesforce residential England and Wales quote journey', () => {

  test('Complete full residential England and Wales quote journey end-to-end', { tag: ['@sanity', '@E2E', '@Salesforce', '@Residential', '@EnglandAndWales', '@TC_SAN_006'] }, async ({ Given, Then, page }) => { 
    await Given('I complete residential quote journey with one product and return to submission for sanity 006', null, { page }); 
    await Then('residential quote journey should return to submission for sanity 006', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_006_complete_full_residential_ew_quote_journey.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Residential","@EnglandAndWales","@TC_SAN_006"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete residential quote journey with one product and return to submission for sanity 006","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then residential quote journey should return to submission for sanity 006","stepMatchArguments":[]}]},
]; // bdd-data-end