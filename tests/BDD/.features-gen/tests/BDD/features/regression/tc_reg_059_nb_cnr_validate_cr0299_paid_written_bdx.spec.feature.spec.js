// Generated from: tests\BDD\features\regression\tc_reg_059_nb_cnr_validate_cr0299_paid_written_bdx.spec.feature
import { test } from "playwright-bdd";

test.describe('NB-CNR-Can | Validate CR0299 field for paid and written BDX lines', () => {

  test('Execute legacy regression test for TC_REG_059', { tag: ['@regression', '@E2E', '@TC_REG_059'] }, async ({ Given, Then }) => { 
    await Given('I execute regression test case "TC_REG_059" from original suite'); 
    await Then('the regression test case "TC_REG_059" should complete successfully'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\regression\\tc_reg_059_nb_cnr_validate_cr0299_paid_written_bdx.spec.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@regression","@E2E","@TC_REG_059"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I execute regression test case \"TC_REG_059\" from original suite","stepMatchArguments":[{"group":{"start":31,"value":"\"TC_REG_059\"","children":[{"start":32,"value":"TC_REG_059","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then the regression test case \"TC_REG_059\" should complete successfully","stepMatchArguments":[{"group":{"start":25,"value":"\"TC_REG_059\"","children":[{"start":26,"value":"TC_REG_059","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end