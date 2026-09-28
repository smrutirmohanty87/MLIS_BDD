// Generated from: tests\BDD\features\sanity\tc_san_016_cancel_and_reissue_live_policy.feature
import { test } from "playwright-bdd";

test.describe('Cancel and reissue a live policy', () => {

  test('Cancel and reissue flow completes from Salesforce', { tag: ['@sanity', '@E2E', '@Cancellation', '@CNR', '@TC_SAN_016'] }, async ({ Given, When, Then, page }) => { 
    await Given('I create a fresh live residential policy for cancel and reissue', null, { page }); 
    await When('I perform cancel and reissue for the policy in Salesforce', null, { page }); 
    await Then('cancel and reissue should complete with policy issued view', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_016_cancel_and_reissue_live_policy.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Cancellation","@CNR","@TC_SAN_016"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I create a fresh live residential policy for cancel and reissue","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I perform cancel and reissue for the policy in Salesforce","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then cancel and reissue should complete with policy issued view","stepMatchArguments":[]}]},
]; // bdd-data-end