// Generated from: tests\BDD\features\sanity\tc_san_020_broker_portal_referral_condition_limit_product.feature
import { test } from "playwright-bdd";

test.describe('Trigger referral with high limit and contaminated land product', () => {

  test('Referral path triggers for configured limit and product condition', { tag: ['@sanity', '@E2E', '@ConditionalReferral', '@TC_SAN_020'] }, async ({ Given, When, Then, page }) => { 
    await Given('I start commercial quote with high limit and contaminated land condition', null, { page }); 
    await When('I submit the conditional referral to underwriter', null, { page }); 
    await Then('conditional referral policy should be issued and return to quote manager', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_020_broker_portal_referral_condition_limit_product.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@ConditionalReferral","@TC_SAN_020"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I start commercial quote with high limit and contaminated land condition","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I submit the conditional referral to underwriter","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then conditional referral policy should be issued and return to quote manager","stepMatchArguments":[]}]},
]; // bdd-data-end