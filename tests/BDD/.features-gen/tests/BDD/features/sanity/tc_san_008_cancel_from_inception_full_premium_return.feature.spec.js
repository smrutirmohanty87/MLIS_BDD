// Generated from: tests\BDD\features\sanity\tc_san_008_cancel_from_inception_full_premium_return.feature
import { test } from "playwright-bdd";

test.describe('Cancel policy from inception with full premium return', () => {

  test('Cancel policy from inception after creating a fresh live policy', { tag: ['@sanity', '@E2E', '@Cancellation', '@TC_SAN_008'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I create a fresh residential policy from broker portal for cancellation', null, { page }); 
    await And('I verify the created policy is live in broker portal', null, { page }); 
    await When('I open the policy in Salesforce insurance policy related record', null, { page }); 
    await And('I complete cancel from inception with full premium return', null, { page }); 
    await Then('the policy should be cancelled in Salesforce', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_008_cancel_from_inception_full_premium_return.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@sanity","@E2E","@Cancellation","@TC_SAN_008"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I create a fresh residential policy from broker portal for cancellation","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And I verify the created policy is live in broker portal","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I open the policy in Salesforce insurance policy related record","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I complete cancel from inception with full premium return","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then the policy should be cancelled in Salesforce","stepMatchArguments":[]}]},
]; // bdd-data-end