// Generated from: tests\BDD\features\sanity\tc_san_024_complete_full_commercial_ew_quote_journey_with_cancellation.feature
import { test } from "playwright-bdd";

test.describe('Complete commercial quote journey and perform cancellation', () => {

  test('Cancellation completes after returning to submission', { tag: ['@sanity', '@E2E', '@Salesforce', '@Commercial', '@Cancellation', '@TC_SAN_024'] }, async ({ Given, When, Then, page }) => { 
    await Given('I complete commercial quote journey and return to submission for cancellation', null, { page }); 
    await When('I perform cancellation after return for commercial journey case', null, { page }); 
    await Then('commercial cancellation after return should complete', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_024_complete_full_commercial_ew_quote_journey_with_cancellation.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Commercial","@Cancellation","@TC_SAN_024"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete commercial quote journey and return to submission for cancellation","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I perform cancellation after return for commercial journey case","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then commercial cancellation after return should complete","stepMatchArguments":[]}]},
]; // bdd-data-end