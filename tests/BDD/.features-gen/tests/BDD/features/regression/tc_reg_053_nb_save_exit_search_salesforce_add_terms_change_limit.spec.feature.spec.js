// Generated from: tests\BDD\features\regression\tc_reg_053_nb_save_exit_search_salesforce_add_terms_change_limit.spec.feature
import { test } from "playwright-bdd";

test.describe('Continue to summary, save and exit, search ref on home and in Salesforce global search, add terms, then change limit and save and rate', () => {

  test('Execute legacy regression test for TC_REG_053', { tag: ['@regression', '@E2E', '@TC_REG_053'] }, async ({ Given, Then }) => { 
    await Given('I execute regression test case "TC_REG_053" from original suite'); 
    await Then('the regression test case "TC_REG_053" should complete successfully'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\regression\\tc_reg_053_nb_save_exit_search_salesforce_add_terms_change_limit.spec.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@regression","@E2E","@TC_REG_053"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I execute regression test case \"TC_REG_053\" from original suite","stepMatchArguments":[{"group":{"start":31,"value":"\"TC_REG_053\"","children":[{"start":32,"value":"TC_REG_053","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then the regression test case \"TC_REG_053\" should complete successfully","stepMatchArguments":[{"group":{"start":25,"value":"\"TC_REG_053\"","children":[{"start":26,"value":"TC_REG_053","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end