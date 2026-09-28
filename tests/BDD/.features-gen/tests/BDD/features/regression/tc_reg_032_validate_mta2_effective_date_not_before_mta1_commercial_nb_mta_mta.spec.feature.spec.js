// Generated from: tests\BDD\features\regression\tc_reg_032_validate_mta2_effective_date_not_before_mta1_commercial_nb_mta_mta.spec.feature
import { test } from "playwright-bdd";

test.describe('Validate MTA2 effective date not before MTA1 | Commercial NB>MTA>MTA', () => {

  test('Execute legacy regression test for TC_REG_032', { tag: ['@regression', '@E2E', '@TC_REG_032'] }, async ({ Given, Then }) => { 
    await Given('I execute regression test case "TC_REG_032" from original suite'); 
    await Then('the regression test case "TC_REG_032" should complete successfully'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\regression\\tc_reg_032_validate_mta2_effective_date_not_before_mta1_commercial_nb_mta_mta.spec.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":7,"tags":["@regression","@E2E","@TC_REG_032"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I execute regression test case \"TC_REG_032\" from original suite","stepMatchArguments":[{"group":{"start":31,"value":"\"TC_REG_032\"","children":[{"start":32,"value":"TC_REG_032","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":9,"keywordType":"Outcome","textWithKeyword":"Then the regression test case \"TC_REG_032\" should complete successfully","stepMatchArguments":[{"group":{"start":25,"value":"\"TC_REG_032\"","children":[{"start":26,"value":"TC_REG_032","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end