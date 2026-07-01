import { test, expect } from '@playwright/test';

/**
 * Parcours produit complet : Goal → Diagnostic → Plan → Session → Maîtrise.
 * S'appuie sur l'API en mémoire (stub LLM) — aucune clé API requise.
 */
test.describe('Boucle d’apprentissage', () => {
  test('Goal → Diagnostic → Plan → Session → Maîtrise', async ({ page }) => {
    await page.goto('/goal');

    await page.getByLabel('Votre objectif').fill('je veux apprendre le japonais pour voyager');
    await page.getByRole('button', { name: 'Analyser mon objectif' }).click();

    await expect(page.getByText('Objectif compris')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('domaine : japanese')).toBeVisible();

    await page.getByRole('button', { name: 'Démarrer le diagnostic' }).click();
    await expect(page.getByText('Question de diagnostic')).toBeVisible({ timeout: 30_000 });

    // Répondre jusqu'à convergence (budget max 12 pour rester rapide en CI).
    for (let i = 0; i < 12; i++) {
      const done = page.getByText('Diagnostic terminé');
      if (await done.isVisible().catch(() => false)) break;
      const mastered = page.getByRole('button', { name: 'Je maîtrise' });
      if (await mastered.isVisible().catch(() => false)) {
        await mastered.click();
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

    await expect(page.getByText('Diagnostic terminé')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('link', { name: 'Construire mon plan' }).click();

    await expect(page.getByRole('heading', { name: 'Plan' })).toBeVisible();
    await page.getByRole('button', { name: 'Générer mon plan' }).click({ timeout: 15_000 }).catch(async () => {
      // Plan peut déjà exister si reprise automatique.
      await expect(page.getByText(/Compétences du parcours|skillOrder/i)).toBeVisible({ timeout: 15_000 });
    });

    await expect(page.getByRole('link', { name: /Session|Pratique|Commencer/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/mastery');
    await expect(page.getByRole('heading', { name: /Maîtrise/i })).toBeVisible();
  });
});
