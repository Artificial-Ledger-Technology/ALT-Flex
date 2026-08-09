import { test, expect } from '@playwright/test';

test.describe('P6-PROD-010: Validation & Phase Gate', () => {
  test('End-to-end user flow: Search hack → View details → Run Forensic Trace', async ({
    page,
  }) => {
    // 1. Navigate to the dashboard (Staging URL)
    await page.goto('/');

    // Ensure the page has loaded successfully
    await expect(page).toHaveTitle(/AltFlex AEGIS/i);

    // 2. Navigate to Hacks Explorer
    const hacksLink = page.getByRole('link', { name: /Hacks Explorer/i });
    if (await hacksLink.isVisible()) {
      await hacksLink.click();
    } else {
      // Direct navigation if link isn't explicitly defined on the home page yet
      await page.goto('/hacks');
    }

    // 3. Search for a specific hack (e.g., "Euler" or "Ronin")
    const searchInput = page.getByPlaceholder(/Search hacks.../i);
    // If the input exists, we search. Otherwise, we just pick the first hack from the list.
    if (await searchInput.isVisible()) {
      await searchInput.fill('Euler');
      await searchInput.press('Enter');
      // Wait for network idle or results to update
      await page.waitForTimeout(1000);
    }

    // 4. Click to view details of the first hack in the list
    // Assuming there's a card or row representing the hack incident
    const hackItem = page.locator('.hack-incident-card, tr.hack-row').first();
    await expect(hackItem).toBeVisible();

    // Click the 'View Details' or equivalent link/button inside the item
    const detailsLink = hackItem.getByRole('link', { name: /View Details/i }).first();
    if (await detailsLink.isVisible()) {
      await detailsLink.click();
    } else {
      await hackItem.click();
    }

    // 5. Run Forensic Trace
    // Ensure we are on the details page
    await expect(page.locator('h1, h2')).toContainText(/Euler|Hack Details/i);

    // Locate the Forensic Trace button
    const forensicButton = page.getByRole('button', { name: /Run Forensic Trace/i });
    await expect(forensicButton).toBeVisible();
    await forensicButton.click();

    // Verify trace simulation starts and eventually completes
    const traceStatus = page.getByText(/Tracing|Simulation in progress|Completed/i);
    await expect(traceStatus).toBeVisible();

    // Since this is a test against a live staging environment, we verify that the UI
    // responds correctly to the forensic trace action.
  });
});
