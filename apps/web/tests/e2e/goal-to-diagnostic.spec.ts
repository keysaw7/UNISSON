import { expect, test } from '@playwright/test';

/**
 * Parcours §6.1 → §6.2 : Goal Intake → confirmation des compétences → diagnostic adaptatif.
 * Nécessite l'API et le frontend démarrés (voir tests/e2e/README.md).
 */
test('objectif japonais → diagnostic démarre avec les compétences confirmées', async ({ page }) => {
  await page.goto('/goal');

  await page.getByLabel('Votre objectif').fill('je veux apprendre le japonais pour voyager');
  await page.getByRole('button', { name: 'Analyser mon objectif' }).click();

  await expect(page.getByText('Objectif compris')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Hiragana' })).toBeChecked();

  await page.getByRole('button', { name: 'Démarrer le diagnostic' }).click();

  await expect(page).toHaveURL(/\/diagnostic\?/);
  await expect(page.getByText('Question de diagnostic')).toBeVisible();
});
