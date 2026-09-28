// Generated from: tests\BDD\features\sanity\tc_san_013_verify_dual_share_gwp_consistency_ew_residential.feature
import { test } from "playwright-bdd";

test.describe('Verify DUAL Share GWP consistency on insurance policy details', () => {

  test('DUAL Share GWP values are consistent across details view', { tag: ['@sanity', '@E2E', '@Residential', '@Salesforce', '@TC_SAN_013'] }, async ({ Given, Then, And, page }) => { 
    await Given('I create a fresh EW residential policy for dual share verification', null, { page }); 
    await And('I open the created policy insurance details in Salesforce', null, { page }); 
    await Then('all visible DUAL Share GWP values should be consistent', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_013_verify_dual_share_gwp_consistency_ew_residential.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@Residential","@Salesforce","@TC_SAN_013"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I create a fresh EW residential policy for dual share verification","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"And I open the created policy insurance details in Salesforce","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then all visible DUAL Share GWP values should be consistent","stepMatchArguments":[]}]},
]; // bdd-data-end