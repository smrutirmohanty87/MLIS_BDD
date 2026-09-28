// Generated from: tests\BDD\features\sanity\tc_san_022_verify_broker_portal_home_menu_navigation.feature
import { test } from "playwright-bdd";

test.describe('Verify broker portal home menu navigation', () => {

  test('Each visible home menu link navigates to expected destination', { tag: ['@sanity', '@UI', '@Navigation', '@TC_SAN_022'] }, async ({ Given, Then, context, page }) => { 
    await Given('I open broker portal home page for menu validation', null, { page }); 
    await Then('each visible home menu item should navigate to expected URL', null, { context, page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests\\BDD\\features\\sanity\\tc_san_022_verify_broker_portal_home_menu_navigation.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":["@sanity","@UI","@Navigation","@TC_SAN_022"],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given I open broker portal home page for menu validation","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Outcome","textWithKeyword":"Then each visible home menu item should navigate to expected URL","stepMatchArguments":[]}]},
]; // bdd-data-end