import { createBdd, test } from 'playwright-bdd';
import { CommercialProductSelectionPage, CommercialStatementsOfFactPage } from '../../../../src/pages/mlis-portal-commercial';

const { When } = createBdd(test);

When('I select one commercial product and proceed', async ({ page }) => {
  const productSelection = new CommercialProductSelectionPage(page);
  const statements = new CommercialStatementsOfFactPage(page);

  await productSelection.selectProductsByIndex([1]);
  await productSelection.proceed();
  await statements.expectLoaded();
});
