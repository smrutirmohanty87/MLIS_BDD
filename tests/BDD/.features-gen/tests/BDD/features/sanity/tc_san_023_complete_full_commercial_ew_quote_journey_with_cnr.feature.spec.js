// Generated from: tests\BDD\features\sanity\tc_san_023_complete_full_commercial_ew_quote_journey_with_cnr.feature
import { test } from "playwright-bdd";

test.describe('Complete commercial quote journey and perform CNR', () => {

  test('CNR completes after returning to submission', { tag: ['@sanity', '@E2E', '@Salesforce', '@Commercial', '@CNR', '@TC_SAN_023'] }, async ({ Given, When, Then, page }) => { 
    await Given('I complete commercial quote journey and return to submission for CNR', null, { page }); 
    await When('I perform CNR after return for commercial journey case', null, { page }); 
    await Then('commercial CNR after return should complete', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_023_complete_full_commercial_ew_quote_journey_with_cnr.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Commercial","@CNR","@TC_SAN_023"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete commercial quote journey and return to submission for CNR","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I perform CNR after return for commercial journey case","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then commercial CNR after return should complete","stepMatchArguments":[]}]},
]; // bdd-data-end