// Generated from: tests\BDD\features\sanity\tc_san_014_verify_user_registration_sign_up_flow.feature
import { test } from "playwright-bdd";

test.describe('Verify user registration sign up flow', () => {

  test('Broker user completes registration from sign up page', { tag: ['@sanity', '@UI', '@Registration', '@TC_SAN_014'] }, async ({ Given, When, Then, page }) => { 
    await Given('I open broker portal registration page from home', null, { page }); 
    await When('I submit registration details with valid mandatory information', null, { page }); 
    await Then('broker registration should complete successfully', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_014_verify_user_registration_sign_up_flow.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@UI","@Registration","@TC_SAN_014"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I open broker portal registration page from home","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I submit registration details with valid mandatory information","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then broker registration should complete successfully","stepMatchArguments":[]}]},
]; // bdd-data-end