// Generated from: tests\BDD\features\sanity\tc_san_007_complete_full_residential_ew_multiple_products_quote_journey.feature
import { test } from "playwright-bdd";

test.describe('Complete Salesforce residential England and Wales quote journey with multiple products', () => {

  test('Complete full residential England and Wales quote journey with multiple products', { tag: ['@sanity', '@E2E', '@Salesforce', '@Residential', '@EnglandAndWales', '@TC_SAN_007'] }, async ({ Given, Then, page }) => { 
    await Given('I complete residential quote journey with multiple products and return to submission for sanity 007', null, { page }); 
    await Then('residential quote journey should return to submission for sanity 007', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_007_complete_full_residential_ew_multiple_products_quote_journey.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Residential","@EnglandAndWales","@TC_SAN_007"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete residential quote journey with multiple products and return to submission for sanity 007","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then residential quote journey should return to submission for sanity 007","stepMatchArguments":[]}]},
]; // bdd-data-end