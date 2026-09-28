// Generated from: tests\BDD\features\regression\tc_reg_042_cancel_n_reissue_mta_effective_date_rule.spec.feature
import { test } from "playwright-bdd";

test.describe('Cancel and reissue date today then MTA effective date cannot be yesterday', () => {

  test('Execute legacy regression test for TC_REG_042', { tag: ['@regression', '@E2E', '@TC_REG_042'] }, async ({ Given, Then }) => { 
    await Given('I execute regression test case "TC_REG_042" from original suite'); 
    await Then('the regression test case "TC_REG_042" should complete successfully'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\regression\\tc_reg_042_cancel_n_reissue_mta_effective_date_rule.spec.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@regression","@E2E","@TC_REG_042"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I execute regression test case \"TC_REG_042\" from original suite","stepMatchArguments":[{"group":{"start":31,"value":"\"TC_REG_042\"","children":[{"start":32,"value":"TC_REG_042","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then the regression test case \"TC_REG_042\" should complete successfully","stepMatchArguments":[{"group":{"start":25,"value":"\"TC_REG_042\"","children":[{"start":26,"value":"TC_REG_042","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end