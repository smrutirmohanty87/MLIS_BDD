// Generated from: tests\BDD\features\sanity\tc_san_021_create_residential_ew_policy_via_referral_limit_gt_5m.feature
import { test } from "playwright-bdd";

test.describe('Create residential EW policy via referral when limit exceeds 5M', () => {

  test('Referral submitted with valid DA quote number for high limit policy', { tag: ['@sanity', '@E2E', '@Residential', '@Referral', '@TC_SAN_021'] }, async ({ Given, When, Then, page }) => { 
    await Given('I start residential referral quote with limit above 5 million', null, { page }); 
    await When('I submit residential high limit referral to underwriter', null, { page }); 
    await Then('residential referral should be submitted with valid DA quote number', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_021_create_residential_ew_policy_via_referral_limit_gt_5m.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Residential","@Referral","@TC_SAN_021"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I start residential referral quote with limit above 5 million","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I submit residential high limit referral to underwriter","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then residential referral should be submitted with valid DA quote number","stepMatchArguments":[]}]},
]; // bdd-data-end