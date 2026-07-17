/**
 * OAMS Improvements — E2E Tests
 *
 * Covers:
 *   OAMS-257 — View Condition Images in Asset History (History Log timeline)
 *   OAMS-262 — Assignment History tab shows condition images
 *   OAMS-263 — Cost Summary tab with total cost breakdown
 *   OAMS-265 — Cost Breakdown Detail — filter, sort, reference links
 *
 * Prerequisites:
 *   - App running at BASE_URL (default http://localhost:3000)
 *   - Backend running at http://localhost:4000
 *   - Admin account set via ADMIN_EMAIL / ADMIN_PASSWORD env vars
 *   - At least one asset registered in the system with assignment history
 *     OR set ASSET_ID env var to a known asset UUID
 *
 * Run:
 *   ADMIN_EMAIL=admin@oams.com ADMIN_PASSWORD=Admin@123 npx playwright test tests/improvements/oams-257-265.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ── Configuration ──────────────────────────────────────────────────────────────

const BASE_URL       = process.env.BASE_URL       ?? 'http://localhost:3000';
const API_URL        = process.env.API_URL        ?? 'http://localhost:4000';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@oams.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';
// If provided, tests use this asset instead of creating one.
const SEED_ASSET_ID  = process.env.ASSET_ID       ?? '';

const SUFFIX = Date.now().toString().slice(-6);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/dashboard|inventory/i, { timeout: 15_000 });
}

/** Create a small PNG file in a temp directory and return its path. */
function makePng(name: string): string {
  // Minimal 1×1 red PNG (89 bytes, valid file)
  const PNG_1X1 = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e0000000c4944415478016360f8cfc00000000200014a54a9000000000049454e44ae426082',
    'hex',
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oams-'));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, PNG_1X1);
  return filePath;
}

/** Navigate to the first asset in the inventory list, or SEED_ASSET_ID if set. */
async function goToAsset(page: Page): Promise<string> {
  if (SEED_ASSET_ID) {
    await page.goto(`${BASE_URL}/admin/inventory/${SEED_ASSET_ID}`);
    return SEED_ASSET_ID;
  }
  await page.goto(`${BASE_URL}/admin/inventory`);
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: 10_000 });
  const link = firstRow.locator('a, [data-link]').first();
  await link.click();
  await page.waitForURL(/\/inventory\/.+/, { timeout: 10_000 });
  return page.url().split('/').pop() ?? '';
}

// ── API helpers (used to seed assignment + upload images directly) ─────────────

let _token: string | null = null;
async function apiToken(): Promise<string> {
  if (_token) return _token;
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  _token = data.accessToken;
  return _token!;
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await apiToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  return res.json();
}

// ── State shared between tests ─────────────────────────────────────────────────

let assetId = SEED_ASSET_ID;
let assignmentId = '';

// ══════════════════════════════════════════════════════════════════════════════
// Setup — ensure we have an asset with an assignment
// ══════════════════════════════════════════════════════════════════════════════

test.beforeAll(async () => {
  if (!assetId) {
    // Find first available asset from API
    const result = await apiFetch('/assets?status=Available&limit=1');
    if (result?.data?.[0]) {
      assetId = result.data[0].id;
    } else {
      throw new Error('No available assets in DB. Create one or set ASSET_ID env var.');
    }
  }
  // Find or create an employee to assign to
  const users = await apiFetch('/users?role=Employee&status=Active&limit=1');
  const employeeId = users?.data?.[0]?.id;
  if (!employeeId) {
    throw new Error('No active employees in DB to use for assignment.');
  }
  // Create an assignment
  const today = new Date().toISOString().split('T')[0];
  const assignment = await apiFetch('/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, assigneeId: employeeId, assignmentDate: today }),
  });
  assignmentId = assignment?.id ?? '';
});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-257: View Condition Images in Asset History timeline
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-257 – View Images in History Log timeline', () => {
  test('upload condition images via API then verify View Images button appears in History Log', async ({ page }) => {
    test.skip(!assignmentId, 'Assignment not created — skipping');

    // Upload a condition image via the API directly
    const pngPath = makePng('condition-assign.png');
    const formData = new FormData();
    formData.append('files', new Blob([fs.readFileSync(pngPath)], { type: 'image/png' }), 'condition-assign.png');
    const token = await apiToken();
    await fetch(`${API_URL}/assignments/${assignmentId}/condition-images?type=assigned`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // Switch to History Log tab
    await page.getByRole('button', { name: /history log/i }).click();

    // Wait for timeline to load and find an "assigned" event row
    await expect(page.getByText(/asset assigned|assigned to/i).first()).toBeVisible({ timeout: 10_000 });

    // "View Images" button should be present for the assigned event
    const viewImagesBtn = page.getByRole('button', { name: /view images/i }).first();
    await expect(viewImagesBtn).toBeVisible({ timeout: 5_000 });

    // Clicking it should open the lightbox
    await viewImagesBtn.click();
    // The lightbox overlays the page — look for a full-screen overlay or image
    await expect(page.locator('img[src*="cloudinary"], img[src*="res.cloudinary"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-262: Assignment History tab shows images
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-262 – Assignment History tab condition images', () => {
  test('Assignment History tab renders rows with View Images link when images exist', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // Assignment History is the default tab — check the table renders
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // At least one row
    const rows = table.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // If condition images were uploaded (from OAMS-257 test above), View Images
    // link should appear in the Condition (Assign) column.
    const viewLinks = page.getByRole('button', { name: /view images/i });
    const count = await viewLinks.count();
    if (count > 0) {
      // Click the first one — it should open a lightbox
      await viewLinks.first().click();
      await expect(page.locator('img').first()).toBeVisible({ timeout: 8_000 });
      // Close lightbox via Escape
      await page.keyboard.press('Escape');
    } else {
      // No images uploaded — verify the column structure still exists
      const headers = table.locator('th');
      const headerTexts = await headers.allTextContents();
      expect(headerTexts.some((h) => /condition.*(assign)/i.test(h))).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-263: Cost Summary tab – totals
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-263 – Cost Summary tab', () => {
  test('Cost Summary tab is present and shows Purchase Cost, Upgrade Cost, Total Cost cards', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);

    // Click the Cost Summary tab
    const costTab = page.getByRole('button', { name: /cost summary/i });
    await expect(costTab).toBeVisible({ timeout: 8_000 });
    await costTab.click();

    // Wait for the summary cards to load
    await expect(page.getByText(/purchase cost/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/upgrade cost/i)).toBeVisible();
    await expect(page.getByText(/total cost/i)).toBeVisible();
  });

  test('Total cost = Purchase cost + Upgrade cost (numeric check)', async ({ page }) => {
    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    const expected = summary.purchaseCost + summary.upgradeCost;
    expect(Math.abs(summary.totalCost - expected)).toBeLessThan(0.01);

    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /cost summary/i }).click();

    // The rendered total should match
    await expect(page.getByText(/total cost/i)).toBeVisible({ timeout: 8_000 });
    const totalFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.totalCost);
    await expect(page.getByText(totalFmt)).toBeVisible({ timeout: 5_000 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// OAMS-265: Cost Breakdown detail – filter by category
// ══════════════════════════════════════════════════════════════════════════════

test.describe('OAMS-265 – Cost Breakdown detail', () => {
  test('Cost Breakdown table renders with correct columns', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /cost summary/i }).click();

    // Table should have the required columns
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10_000 });
    const headers = table.locator('th');
    const texts = await headers.allTextContents();
    expect(texts.join(' ')).toMatch(/cost category/i);
    expect(texts.join(' ')).toMatch(/date/i);
    expect(texts.join(' ')).toMatch(/description/i);
    expect(texts.join(' ')).toMatch(/vendor/i);
    expect(texts.join(' ')).toMatch(/cost/i);
    expect(texts.join(' ')).toMatch(/reference/i);
  });

  test('Filter dropdown appears and filters rows to "Purchase" category', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/admin/inventory/${assetId}`);
    await page.getByRole('button', { name: /cost summary/i }).click();

    // Wait for table
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });

    // Open filter dropdown
    const filterBtn = page.getByRole('button', { name: /all categories|filter/i }).first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Select "Purchase"
    const purchaseOption = page.getByRole('button', { name: /^purchase$/i });
    if (await purchaseOption.isVisible()) {
      await purchaseOption.click();

      // All visible rows should have the "Purchase" badge
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      for (let i = 0; i < rowCount; i++) {
        const badge = rows.nth(i).locator('span').filter({ hasText: 'Purchase' });
        await expect(badge).toBeVisible();
      }
    }
  });

  test('Rows are sorted newest first by default', async ({ page }) => {
    const summary = await apiFetch(`/assets/${assetId}/cost-summary`);
    if (!summary?.breakdown || summary.breakdown.length < 2) {
      test.skip(true, 'Not enough breakdown rows to test sort order');
      return;
    }
    // Verify API returns newest first
    const dates = summary.breakdown.map((r: { date: string }) => r.date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(new Date(dates[i + 1]).getTime());
    }
  });
});
