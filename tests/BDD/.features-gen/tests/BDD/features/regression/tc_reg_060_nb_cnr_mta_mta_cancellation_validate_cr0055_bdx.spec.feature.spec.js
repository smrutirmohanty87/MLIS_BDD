// Generated from: tests\BDD\features\regression\tc_reg_060_nb_cnr_mta_mta_cancellation_validate_cr0055_bdx.spec.feature
import { test } from "playwright-bdd";

test.describe('DT-MLIS-DF29.0.0 | F-232588 | CR-232467 | Validate CR0055 Deductible or Excess Basis after NB-CNR-MTA-MTA-Cancellation', () => {

  test('Execute legacy regression test for TC_REG_060', { tag: ['@regression', '@E2E', '@TC_REG_060'] }, async ({ Given, Then }) => { 
    await Given('I execute regression test case "TC_REG_060" from original suite'); 
    await Then('the regression test case "TC_REG_060" should complete successfully'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\regression\\tc_reg_060_nb_cnr_mta_mta_cancellation_validate_cr0055_bdx.spec.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@regression","@E2E","@TC_REG_060"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I execute regression test case \"TC_REG_060\" from original suite","stepMatchArguments":[{"group":{"start":31,"value":"\"TC_REG_060\"","children":[{"start":32,"value":"TC_REG_060","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then the regression test case \"TC_REG_060\" should complete successfully","stepMatchArguments":[{"group":{"start":25,"value":"\"TC_REG_060\"","children":[{"start":26,"value":"TC_REG_060","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end