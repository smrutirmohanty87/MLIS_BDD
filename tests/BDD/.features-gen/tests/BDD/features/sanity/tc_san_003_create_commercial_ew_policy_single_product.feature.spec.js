// Generated from: tests\BDD\features\sanity\tc_san_003_create_commercial_ew_policy_single_product.feature
import { test } from "playwright-bdd";

test.describe('Create commercial England and Wales policy with a single product', () => {

  test('Create commercial England and Wales policy with one product', { tag: ['@sanity', '@E2E', '@Commercial', '@EnglandAndWales', '@TC_SAN_003'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged into MLIS commercial quote manager', null, { page }); 
    await When('I start a new commercial England and Wales quote', null, { page }); 
    await And('I enter a unique case reference with limit of indemnity 500000', null, { page }); 
    await And('I select one commercial product and proceed', null, { page }); 
    await And('I confirm all statements of fact and proceed', null, { page }); 
    await And('I select the first available commercial quote', null, { page }); 
    await And('I enter required final policy details and proceed', null, { page }); 
    await Then('I should see the commercial summary with case and premium details', null, { page }); 
    await When('I place the commercial order using today\'s date', null, { page }); 
    await Then('the commercial policy is issued and I am returned to quote manager', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_003_create_commercial_ew_policy_single_product.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@sanity","@E2E","@Commercial","@EnglandAndWales","@TC_SAN_003"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged into MLIS commercial quote manager","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I start a new commercial England and Wales quote","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I enter a unique case reference with limit of indemnity 500000","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I select one commercial product and proceed","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And I confirm all statements of fact and proceed","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And I select the first available commercial quote","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And I enter required final policy details and proceed","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then I should see the commercial summary with case and premium details","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I place the commercial order using today's date","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then the commercial policy is issued and I am returned to quote manager","stepMatchArguments":[]}]},
]; // bdd-data-end