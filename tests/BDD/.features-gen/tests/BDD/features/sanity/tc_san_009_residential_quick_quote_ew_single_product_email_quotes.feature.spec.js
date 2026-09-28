// Generated from: tests\BDD\features\sanity\tc_san_009_residential_quick_quote_ew_single_product_email_quotes.feature
import { test } from "playwright-bdd";

test.describe('Residential quick quote England and Wales single product', () => {

  test('Send England and Wales quick quote for single product by email', { tag: ['@sanity', '@E2E', '@QuickQuote', '@Residential', '@EnglandAndWales', '@TC_SAN_009'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I start residential quick quote for England and Wales', null, { page }); 
    await When('I complete quick quote step 1 with England and Wales details', null, { page }); 
    await And('I select one product and proceed to quick quote step 3', null, { page }); 
    await And('I email quick quote results', null, { page }); 
    await Then('quick quote email confirmation should be shown and closed', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_009_residential_quick_quote_ew_single_product_email_quotes.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@sanity","@E2E","@QuickQuote","@Residential","@EnglandAndWales","@TC_SAN_009"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I start residential quick quote for England and Wales","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I complete quick quote step 1 with England and Wales details","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And I select one product and proceed to quick quote step 3","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I email quick quote results","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then quick quote email confirmation should be shown and closed","stepMatchArguments":[]}]},
]; // bdd-data-end