// Generated from: tests\BDD\features\sanity\tc_san_018_quote_journey_open_policy_perform_mta_cnr_cancellation.feature
import { test } from "playwright-bdd";

test.describe('Commercial quote journey then perform MTA CNR and cancellation', () => {

  test('Open policy after quote journey and perform lifecycle actions', { tag: ['@sanity', '@E2E', '@Salesforce', '@Commercial', '@TC_SAN_018'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I complete commercial quote journey and return to submission', null, { page }); 
    await When('I perform MTA after return for commercial quote journey', null, { page }); 
    await And('I perform CNR after return for commercial quote journey', null, { page }); 
    await And('I perform cancellation after return for commercial quote journey', null, { page }); 
    await Then('commercial lifecycle actions should complete from quote journey context', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_018_quote_journey_open_policy_perform_mta_cnr_cancellation.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Salesforce","@Commercial","@TC_SAN_018"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I complete commercial quote journey and return to submission","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I perform MTA after return for commercial quote journey","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"And I perform CNR after return for commercial quote journey","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"And I perform cancellation after return for commercial quote journey","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then commercial lifecycle actions should complete from quote journey context","stepMatchArguments":[]}]},
]; // bdd-data-end