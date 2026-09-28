// Generated from: tests\BDD\features\sanity\tc_san_015_create_mta_mid_term_adjustment.feature
import { test } from "playwright-bdd";

test.describe('Create MTA on a live policy', () => {

  test('Create and bind MTA from Salesforce policy record', { tag: ['@sanity', '@E2E', '@MTA', '@TC_SAN_015'] }, async ({ Given, When, Then, page }) => { 
    await Given('I create a fresh live residential policy for MTA', null, { page }); 
    await When('I create and bind MTA for the policy in Salesforce', null, { page }); 
    await Then('MTA should be bound with a valid risk identifier', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_015_create_mta_mid_term_adjustment.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@E2E","@MTA","@TC_SAN_015"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I create a fresh live residential policy for MTA","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I create and bind MTA for the policy in Salesforce","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then MTA should be bound with a valid risk identifier","stepMatchArguments":[]}]},
]; // bdd-data-end