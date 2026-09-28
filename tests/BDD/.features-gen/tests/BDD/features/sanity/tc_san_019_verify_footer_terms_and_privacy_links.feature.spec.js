// Generated from: tests\BDD\features\sanity\tc_san_019_verify_footer_terms_and_privacy_links.feature
import { test } from "playwright-bdd";

test.describe('Verify broker portal footer links', () => {

  test('Terms privacy and cookies links navigate correctly', { tag: ['@sanity', '@UI', '@Footer', '@TC_SAN_019'] }, async ({ Given, Then, context, page }) => { 
    await Given('I open broker portal home page for footer validation', null, { page }); 
    await Then('footer terms privacy and cookies links should open expected destinations', null, { context, page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_019_verify_footer_terms_and_privacy_links.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@UI","@Footer","@TC_SAN_019"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I open broker portal home page for footer validation","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then footer terms privacy and cookies links should open expected destinations","stepMatchArguments":[]}]},
]; // bdd-data-end