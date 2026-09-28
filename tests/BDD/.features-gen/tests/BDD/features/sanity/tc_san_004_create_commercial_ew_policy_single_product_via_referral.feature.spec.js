// Generated from: tests\BDD\features\sanity\tc_san_004_create_commercial_ew_policy_single_product_via_referral.feature
import { test } from "playwright-bdd";

test.describe('Create commercial England and Wales policy with a single product via referral', () => {

  test('Create commercial England and Wales single-product policy via referral', { tag: ['@sanity', '@E2E', '@Commercial', '@EnglandAndWales', '@TC_SAN_004', '@referral'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged into MLIS commercial quote manager', null, { page }); 
    await When('I start a new commercial England and Wales quote', null, { page }); 
    await And('I enter a unique case reference with limit of indemnity 500000', null, { page }); 
    await And('I select one commercial product and proceed', null, { page }); 
    await And('I proceed with referral from statements of fact', null, { page }); 
    await And('I fill required referral details', null, { page }); 
    await And('I submit the referral to underwriter', null, { page }); 
    await Then('I should see commercial referral submitted confirmation', null, { page }); 
    await And('I should return to quote manager from referral submitted page', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_004_create_commercial_ew_policy_single_product_via_referral.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@sanity","@E2E","@Commercial","@EnglandAndWales","@TC_SAN_004","@referral"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged into MLIS commercial quote manager","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I start a new commercial England and Wales quote","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I enter a unique case reference with limit of indemnity 500000","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I select one commercial product and proceed","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I proceed with referral from statements of fact","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And I fill required referral details","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And I submit the referral to underwriter","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then I should see commercial referral submitted confirmation","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"And I should return to quote manager from referral submitted page","stepMatchArguments":[]}]},
]; // bdd-data-end