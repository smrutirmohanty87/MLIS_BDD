// Generated from: tests\BDD\features\sanity\tc_san_005_complete_full_commercial_ew_quote_journey.feature
import { test } from "playwright-bdd";

test.describe('Complete Salesforce commercial England and Wales quote journey', () => {

  test('Complete full commercial England and Wales quote journey end-to-end', { tag: ['@sanity', '@E2E', '@Salesforce', '@Commercial', '@EnglandAndWales', '@TC_SAN_005'] }, async ({ Given, Then, page }) => { 
    await Given('I complete commercial quote journey and return to submission', null, { page }); 
    await Then('commercial quote journey should return to submission for sanity 005', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_005_complete_full_commercial_ew_quote_journey.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Commercial","@EnglandAndWales","@TC_SAN_005"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete commercial quote journey and return to submission","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then commercial quote journey should return to submission for sanity 005","stepMatchArguments":[]}]},
]; // bdd-data-end